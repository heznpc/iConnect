import Foundation

@MainActor
@Observable
final class UpdateManager {

    var availableVersion: String?
    var isUpdating = false
    var updateError: String?

    private var timer: Timer?
    private static let checkInterval: TimeInterval = 3600 // 1 hour
    private let currentVersion = "0.1.2"

    // MARK: - Periodic Check

    func startPeriodicChecks() {
        checkForUpdate()
        timer = Timer.scheduledTimer(withTimeInterval: Self.checkInterval, repeats: true) {
            [weak self] _ in
            Task { @MainActor in
                self?.checkForUpdate()
            }
        }
    }

    func stopPeriodicChecks() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: - Check

    func checkForUpdate() {
        Task {
            let latest = await Self.fetchLatestVersion()
            guard let latest else { return }
            if latest != currentVersion && Self.isNewer(latest, than: currentVersion) {
                availableVersion = latest
            } else {
                availableVersion = nil
            }
        }
    }

    // MARK: - Update

    func performUpdate() {
        guard !isUpdating else { return }
        isUpdating = true
        updateError = nil

        Task {
            let success = await Self.runNpmInstall()
            if success {
                availableVersion = nil
            } else {
                updateError = "Update failed. Run manually: npm install -g iconnect-mcp@latest"
            }
            isUpdating = false
        }
    }

    // MARK: - Static Helpers (nonisolated)

    private nonisolated static let nodeSearchPaths: [String] = {
        let home = NSHomeDirectory()
        return [
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "\(home)/n/bin",
            "\(home)/.volta/bin",
        ]
    }()

    private nonisolated static func buildEnv() -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        let currentPath = env["PATH"] ?? "/usr/bin:/bin"
        env["PATH"] = (nodeSearchPaths + [currentPath]).joined(separator: ":")
        return env
    }

    private nonisolated static func findNpm() -> String? {
        let candidates = nodeSearchPaths.map { $0 + "/npm" }
        for path in candidates {
            if FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["npm"]
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

    private nonisolated static func fetchLatestVersion() async -> String? {
        await withCheckedContinuation { continuation in
            DispatchQueue.global().async {
                guard let npmPath = findNpm() else {
                    continuation.resume(returning: nil)
                    return
                }

                let process = Process()
                process.executableURL = URL(fileURLWithPath: npmPath)
                process.arguments = ["view", IConnectConstants.npmPackageName, "version"]
                process.environment = buildEnv()

                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice

                do {
                    try process.run()
                    process.waitUntilExit()
                    if process.terminationStatus == 0 {
                        let data = pipe.fileHandleForReading.readDataToEndOfFile()
                        let version = String(data: data, encoding: .utf8)?
                            .trimmingCharacters(in: .whitespacesAndNewlines)
                        continuation.resume(returning: version)
                    } else {
                        continuation.resume(returning: nil)
                    }
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }

    private nonisolated static func runNpmInstall() async -> Bool {
        await withCheckedContinuation { continuation in
            DispatchQueue.global().async {
                guard let npmPath = findNpm() else {
                    continuation.resume(returning: false)
                    return
                }

                let process = Process()
                process.executableURL = URL(fileURLWithPath: npmPath)
                process.arguments = ["install", "-g", "\(IConnectConstants.npmPackageName)@latest"]
                process.environment = buildEnv()
                process.standardOutput = FileHandle.nullDevice
                process.standardError = FileHandle.nullDevice

                do {
                    try process.run()
                    process.waitUntilExit()
                    continuation.resume(returning: process.terminationStatus == 0)
                } catch {
                    continuation.resume(returning: false)
                }
            }
        }
    }

    /// Simple semver comparison: returns true if `a` is newer than `b`.
    private static func isNewer(_ a: String, than b: String) -> Bool {
        let aParts = a.split(separator: ".").compactMap { Int($0) }
        let bParts = b.split(separator: ".").compactMap { Int($0) }

        for i in 0..<max(aParts.count, bParts.count) {
            let av = i < aParts.count ? aParts[i] : 0
            let bv = i < bParts.count ? bParts[i] : 0
            if av > bv { return true }
            if av < bv { return false }
        }
        return false
    }
}
