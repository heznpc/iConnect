import SwiftUI
import UserNotifications

@main
struct iConnectApp: App {
    @State private var serverManager = ServerManager()
    @State private var permissionManager = PermissionManager()
    @State private var configManager = ConfigManager()
    @State private var setupManager = SetupManager()
    @State private var hitlManager = HitlManager()
    @State private var hitlInitialized = false

    private let notificationDelegate: HitlNotificationDelegate

    init() {
        let delegate = HitlNotificationDelegate { requestId, approved in
            Task { @MainActor in
                NotificationCenter.default.post(
                    name: .hitlNotificationResponse,
                    object: nil,
                    userInfo: ["id": requestId, "approved": approved]
                )
            }
        }
        self.notificationDelegate = delegate
        UNUserNotificationCenter.current().delegate = delegate
    }

    var body: some Scene {
        MenuBarExtra("iConnect", systemImage: "apple.terminal") {
            MenuContent(
                serverManager: serverManager,
                permissionManager: permissionManager,
                configManager: configManager,
                setupManager: setupManager,
                hitlManager: hitlManager
            )
            .onAppear {
                serverManager.startPolling()
                if !hitlInitialized {
                    hitlInitialized = true
                    setupHitl()
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .hitlNotificationResponse)) { notification in
                guard let userInfo = notification.userInfo,
                      let requestId = userInfo["id"] as? String,
                      let approved = userInfo["approved"] as? Bool
                else { return }
                let tool = hitlManager.pendingTools[requestId] ?? "unknown"
                hitlManager.respond(id: requestId, approved: approved, tool: tool)
            }
        }
        .menuBarExtraStyle(.menu)
    }

    private func setupHitl() {
        HitlManager.requestNotificationPermission()
        HitlManager.registerNotificationCategory()
        hitlManager.timeoutSeconds = configManager.hitlTimeout
        if configManager.hitlLevel != "off" {
            hitlManager.startListening()
        }
    }
}

extension Notification.Name {
    static let hitlNotificationResponse = Notification.Name("hitlNotificationResponse")
}
