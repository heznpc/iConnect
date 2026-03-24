import SwiftUI

struct LogViewer: View {
    let logManager: LogManager

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text(L("log.title"))
                    .font(.headline)
                Spacer()
                Text(L("log.lineCount", logManager.entries.count))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button(L("log.clear")) {
                    logManager.clear()
                }
                .font(.caption)
                .buttonStyle(.plain)
                .foregroundStyle(Color.accentColor)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // Log entries
            if logManager.entries.isEmpty {
                VStack {
                    Spacer()
                    Text(L("log.empty"))
                        .foregroundStyle(.secondary)
                    Text(L("log.emptyHint"))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        ForEach(logManager.entries) { entry in
                            logEntryRow(entry)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                }
            }
        }
        .frame(width: 480, height: 320)
    }

    @ViewBuilder
    private func logEntryRow(_ entry: LogManager.LogEntry) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Text(entry.timestamp, format: .dateTime.hour().minute().second())
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(width: 60, alignment: .leading)

            Text(entry.message)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(entry.isError ? .red : .primary)
                .textSelection(.enabled)
        }
    }
}
