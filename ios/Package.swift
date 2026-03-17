// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "AirMCPiOS",
    platforms: [.iOS(.v16)],
    dependencies: [
        .package(path: "../swift"),
    ],
    targets: [
        .executableTarget(
            name: "AirMCPiOS",
            dependencies: [
                .product(name: "AirMCPKit", package: "AirMcpBridge"),
            ],
            path: "Sources/AirMCPiOS"
        ),
    ]
)
