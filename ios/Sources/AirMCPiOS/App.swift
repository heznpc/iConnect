// AirMCP iOS — SwiftUI app entry point.
// Phase 1: EventKit, Contacts, Photos, Location, Weather modules.

import SwiftUI
import AirMCPKit

@main
struct AirMCPiOSApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Modules") {
                    Label("Calendar", systemImage: "calendar")
                    Label("Reminders", systemImage: "checklist")
                    Label("Contacts", systemImage: "person.crop.circle")
                    Label("Photos", systemImage: "photo.on.rectangle")
                    Label("Location", systemImage: "location")
                    Label("Weather", systemImage: "cloud.sun")
                }
                Section("Status") {
                    Label("MCP Server: Ready", systemImage: "server.rack")
                        .foregroundStyle(.green)
                }
            }
            .navigationTitle("AirMCP")
        }
    }
}
