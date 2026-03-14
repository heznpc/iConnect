// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "ImcpBridge",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "ImcpBridge",
            path: "Sources/ImcpBridge"
        ),
    ]
)
