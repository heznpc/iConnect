import SwiftUI
import WidgetKit

// MARK: - Small Widget

struct BriefingSmallView: View {
    let entry: BriefingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            headerRow
            Spacer(minLength: 2)

            if !entry.hasCalendarAccess {
                accessDeniedView
            } else if let next = nextEvent {
                nextEventView(next)
            } else {
                noEventsView
            }

            Spacer(minLength: 2)

            if entry.overdueCount > 0 {
                Label("\(entry.overdueCount) overdue", systemImage: "exclamationmark.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(.red)
            } else if !entry.reminders.isEmpty {
                Label("\(entry.reminders.count) reminders", systemImage: "checklist")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
    }

    private var headerRow: some View {
        HStack {
            Image(systemName: "a.square.fill")
                .font(.caption)
                .foregroundStyle(.blue)
            Text(dayString)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var nextEvent: BriefingEvent? {
        entry.events.first { $0.endDate > entry.date || $0.isAllDay }
    }

    private func nextEventView(_ event: BriefingEvent) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Next")
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(event.calendarColor)
                    .frame(width: 3)
                VStack(alignment: .leading, spacing: 1) {
                    Text(event.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(2)
                    Text(event.isAllDay ? "All day" : event.timeString)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var noEventsView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("No more events")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("today")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    private var accessDeniedView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Image(systemName: "lock.shield")
                .foregroundStyle(.secondary)
            Text("Grant calendar access in System Settings")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var dayString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "E, MMM d"
        return fmt.string(from: entry.date)
    }
}

// MARK: - Medium Widget

struct BriefingMediumView: View {
    let entry: BriefingEntry

    var body: some View {
        HStack(spacing: 12) {
            // Left: Events
            VStack(alignment: .leading, spacing: 4) {
                dateHeader
                if !entry.hasCalendarAccess {
                    Spacer()
                    accessLabel("Calendar access required")
                    Spacer()
                } else if entry.events.isEmpty {
                    Spacer()
                    Text("No events today")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                } else {
                    ForEach(Array(entry.events.prefix(4).enumerated()), id: \.offset) { _, event in
                        eventRow(event)
                    }
                    if entry.events.count > 4 {
                        Text("+\(entry.events.count - 4) more")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right: Reminders summary
            VStack(alignment: .leading, spacing: 4) {
                Label("Reminders", systemImage: "checklist")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                if !entry.hasReminderAccess {
                    accessLabel("Access required")
                } else if entry.reminders.isEmpty {
                    Text("All clear")
                        .font(.caption)
                        .foregroundStyle(.green)
                } else {
                    if entry.overdueCount > 0 {
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.caption2)
                                .foregroundStyle(.red)
                            Text("\(entry.overdueCount) overdue")
                                .font(.caption2)
                                .foregroundStyle(.red)
                        }
                    }
                    ForEach(Array(entry.reminders.prefix(3).enumerated()), id: \.offset) { _, reminder in
                        reminderRow(reminder)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(width: 100)
        }
        .padding(12)
    }

    private var dateHeader: some View {
        HStack(spacing: 4) {
            Image(systemName: "a.square.fill")
                .font(.caption2)
                .foregroundStyle(.blue)
            Text(dateString)
                .font(.caption)
                .fontWeight(.semibold)
        }
    }

    private func eventRow(_ event: BriefingEvent) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 1.5)
                .fill(event.calendarColor)
                .frame(width: 3, height: 20)
            VStack(alignment: .leading, spacing: 0) {
                Text(event.title)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .lineLimit(1)
                HStack(spacing: 3) {
                    Text(event.timeString)
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                    if !event.location.isEmpty {
                        Text(event.location)
                            .font(.system(size: 9))
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
                }
            }
        }
    }

    private func reminderRow(_ reminder: BriefingReminder) -> some View {
        HStack(spacing: 3) {
            Image(systemName: reminder.isOverdue ? "circle.badge.exclamationmark" : "circle")
                .font(.system(size: 8))
                .foregroundStyle(reminder.isOverdue ? .red : .secondary)
            Text(reminder.title)
                .font(.system(size: 9))
                .lineLimit(1)
                .foregroundStyle(reminder.isOverdue ? .primary : .secondary)
        }
    }

    private func accessLabel(_ text: String) -> some View {
        Label(text, systemImage: "lock.shield")
            .font(.caption2)
            .foregroundStyle(.secondary)
    }

    private var dateString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "EEEE, MMM d"
        return fmt.string(from: entry.date)
    }
}

// MARK: - Large Widget

struct BriefingLargeView: View {
    let entry: BriefingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "a.square.fill")
                    .foregroundStyle(.blue)
                Text("Daily Briefing")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Text(dateString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            if !entry.hasCalendarAccess && !entry.hasReminderAccess {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "lock.shield")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                    Text("Grant Calendar & Reminders access\nin System Settings > Privacy")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                // Events section
                eventsSection

                Divider()

                // Reminders section
                remindersSection

                // Tomorrow preview
                if !entry.tomorrowEvents.isEmpty {
                    Divider()
                    tomorrowSection
                }

                Spacer(minLength: 0)
            }
        }
        .padding(14)
    }

    private var eventsSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Today", systemImage: "calendar")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            if entry.events.isEmpty {
                Text("No events scheduled")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .padding(.leading, 8)
            } else {
                ForEach(Array(entry.events.prefix(5).enumerated()), id: \.offset) { _, event in
                    largeEventRow(event)
                }
                if entry.events.count > 5 {
                    Text("+\(entry.events.count - 5) more events")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.leading, 8)
                }
            }
        }
    }

    private var remindersSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Label("Reminders", systemImage: "checklist")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                if entry.overdueCount > 0 {
                    Spacer()
                    Text("\(entry.overdueCount) overdue")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(.red)
                }
            }

            if entry.reminders.isEmpty {
                Text("All clear")
                    .font(.caption)
                    .foregroundStyle(.green)
                    .padding(.leading, 8)
            } else {
                ForEach(Array(entry.reminders.prefix(5).enumerated()), id: \.offset) { _, reminder in
                    largeReminderRow(reminder)
                }
            }
        }
    }

    private var tomorrowSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Tomorrow", systemImage: "sunrise")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            ForEach(Array(entry.tomorrowEvents.prefix(3).enumerated()), id: \.offset) { _, event in
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(event.calendarColor)
                        .frame(width: 3, height: 16)
                    Text(event.timeString)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .frame(width: 36, alignment: .leading)
                    Text(event.title)
                        .font(.caption2)
                        .lineLimit(1)
                }
            }
        }
    }

    private func largeEventRow(_ event: BriefingEvent) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(event.calendarColor)
                .frame(width: 3, height: 28)

            VStack(alignment: .leading, spacing: 1) {
                Text(event.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    if event.isAllDay {
                        Text("All day")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("\(event.timeString) - \(event.endTimeString)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if !event.location.isEmpty {
                        HStack(spacing: 1) {
                            Image(systemName: "mappin")
                                .font(.system(size: 7))
                            Text(event.location)
                                .lineLimit(1)
                        }
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer(minLength: 0)
        }
    }

    private func largeReminderRow(_ reminder: BriefingReminder) -> some View {
        HStack(spacing: 6) {
            Image(systemName: reminder.isOverdue ? "exclamationmark.circle.fill" : "circle")
                .font(.caption2)
                .foregroundStyle(reminder.isOverdue ? .red : .secondary)
            VStack(alignment: .leading, spacing: 0) {
                Text(reminder.title)
                    .font(.caption)
                    .lineLimit(1)
                    .foregroundStyle(reminder.isOverdue ? .primary : .secondary)
                if let due = reminder.dueDate {
                    Text(relativeDateString(due))
                        .font(.system(size: 9))
                        .foregroundStyle(reminder.isOverdue ? Color.red : Color.secondary)
                }
            }
        }
        .padding(.leading, 4)
    }

    private func relativeDateString(_ date: Date) -> String {
        let rel = RelativeDateTimeFormatter()
        rel.unitsStyle = .abbreviated
        return rel.localizedString(for: date, relativeTo: entry.date)
    }

    private var dateString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "EEEE, MMM d"
        return fmt.string(from: entry.date)
    }
}

// MARK: - Widget Entry View (size dispatcher)

struct BriefingWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: BriefingEntry

    var body: some View {
        switch family {
        case .systemSmall:
            BriefingSmallView(entry: entry)
        case .systemMedium:
            BriefingMediumView(entry: entry)
        case .systemLarge, .systemExtraLarge:
            BriefingLargeView(entry: entry)
        @unknown default:
            BriefingMediumView(entry: entry)
        }
    }
}
