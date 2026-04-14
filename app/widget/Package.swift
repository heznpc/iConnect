// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "AirMCPWidget",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "AirMCPWidget",
            path: "Sources",
            linkerSettings: [
                .linkedFramework("WidgetKit"),
                .linkedFramework("SwiftUI"),
                .linkedFramework("EventKit"),
            ]
        ),
    ]
)
