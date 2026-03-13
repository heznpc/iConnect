// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "ImcpBridge",
    platforms: [.macOS(.v26)],
    targets: [
        .executableTarget(
            name: "ImcpBridge",
            path: "Sources/ImcpBridge",
            swiftSettings: [.enableExperimentalFeature("FoundationModels")]
        ),
    ]
)
