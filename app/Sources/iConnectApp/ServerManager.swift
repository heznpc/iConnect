import Foundation

@MainActor
@Observable
final class ServerManager {

    enum Status: Sendable, Equatable {
        case running
        case stopped
        case checking
    }

    var status: Status = .checking
    private var timer: Timer?
    private var serverProcess: Process?

    // MARK: - Polling

    func startPolling() {
        guard timer == nil else { return }
        checkStatus()
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkStatus()
            }
        }
    }

    func stopPolling() {
        timer?.invalidate()
        timer = nil
    }

    func checkStatus() {
        Task.detached {
            let isRunning = Self.pgrepIConnect()
            let newStatus: Status = isRunning ? .running : .stopped
            await MainActor.run { [weak self] in
                guard self?.status != newStatus else { return }
                self?.status = newStatus
            }
        }
    }

    // MARK: - Server Control

    func startServer() {
        guard status != .running else { return }
        status = .checking

        Task {
            let process = await Self.launchServer()
            if let process {
                serverProcess = process
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                checkStatus()
            } else {
                status = .stopped
            }
        }
    }

    func stopServer() {
        status = .checking

        if let process = serverProcess, process.isRunning {
            process.terminate()
            serverProcess = nil
            Task {
                try? await Task.sleep(nanoseconds: 500_000_000)
                checkStatus()
            }
        } else {
            // Kill externally started processes
            Task {
                await Self.performPkill()
                try? await Task.sleep(nanoseconds: 500_000_000)
                status = .stopped
            }
        }
    }

    // MARK: - Static Process Launchers (nonisolated)

    private nonisolated static let nodeSearchPaths: [String] = {
        let home = NSHomeDirectory()
        return [
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "\(home)/n/bin",
            "\(home)/.volta/bin",
        ]
    }()

    private static func launchServer() async -> Process? {
        await withCheckedContinuation { continuation in
            DispatchQueue.global().async {
                let npxPath = findNpx()
                guard let npxPath else {
                    continuation.resume(returning: nil)
                    return
                }

                let process = Process()
                process.executableURL = URL(fileURLWithPath: npxPath)
                process.arguments = ["-y", IConnectConstants.npmPackageName]
                process.standardOutput = FileHandle.nullDevice
                process.standardError = FileHandle.nullDevice

                var env = ProcessInfo.processInfo.environment
                let currentPath = env["PATH"] ?? "/usr/bin:/bin"
                env["PATH"] = (nodeSearchPaths + [currentPath]).joined(separator: ":")
                process.environment = env

                do {
                    try process.run()
                    continuation.resume(returning: process)
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }

    private static func performPkill() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            DispatchQueue.global().async {
                pkillIConnect()
                continuation.resume()
            }
        }
    }

    // MARK: - Process Utilities

    private nonisolated static func pgrepIConnect() -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/pgrep")
        process.arguments = ["-f", "node.*iconnect"]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()
            return process.terminationStatus == 0
        } catch {
            return false
        }
    }

    private nonisolated static func pkillIConnect() {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/pkill")
        process.arguments = ["-f", "node.*iconnect"]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            // Ignore errors
        }
    }

    private nonisolated static func findNpx() -> String? {
        let candidates = nodeSearchPaths.map { $0 + "/npx" }

        for path in candidates {
            if FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["npx"]
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()
            if process.terminationStatus == 0 {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let path = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                if let path, !path.isEmpty {
                    return path
                }
            }
        } catch {
            // fall through
        }

        return nil
    }

    // MARK: - Display Helpers

    var statusLabel: String {
        switch status {
        case .running: "Server Running"
        case .stopped: "Server Stopped"
        case .checking: "Checking..."
        }
    }

    var statusIcon: String {
        switch status {
        case .running: "circle.fill"
        case .stopped: "circle"
        case .checking: "circle.dotted"
        }
    }
}
