import WidgetKit
import EventKit

// Bridges non-Sendable closures into Task contexts (Swift 6 strict concurrency).
private struct UncheckedSendable<T>: @unchecked Sendable {
    let value: T
}

// MARK: - Timeline Provider

struct BriefingProvider: TimelineProvider {
    // EKEventStore is thread-safe but not Sendable. Use nonisolated(unsafe) like AirMCPKit.
    nonisolated(unsafe) private static let eventStore = EKEventStore()

    func placeholder(in context: Context) -> BriefingEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (BriefingEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let cb = UncheckedSendable(value: completion)
        Task {
            let entry = await Self.fetchBriefing()
            cb.value(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BriefingEntry>) -> Void) {
        let cb = UncheckedSendable(value: completion)
        Task {
            let entry = await Self.fetchBriefing()
            let refreshDate = Self.nextRefreshDate(after: entry.date, events: entry.events)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            cb.value(timeline)
        }
    }

    // MARK: - Data fetching (all static to avoid capturing self)

    private static func fetchBriefing() async -> BriefingEntry {
        let now = Date()
        let cal = Calendar.current

        let hasCalendar = await authorizeCalendar()
        let hasReminder = await authorizeReminders()

        let events: [BriefingEvent] = hasCalendar ? fetchTodayEvents(now: now, cal: cal) : []
        let tomorrowEvents: [BriefingEvent] = hasCalendar ? fetchTomorrowEvents(now: now, cal: cal) : []
        let (reminders, overdueCount) = hasReminder ? await fetchActiveReminders(now: now) : ([], 0)

        return BriefingEntry(
            date: now,
            events: events,
            reminders: reminders,
            overdueCount: overdueCount,
            tomorrowEvents: tomorrowEvents,
            hasCalendarAccess: hasCalendar,
            hasReminderAccess: hasReminder
        )
    }

    // MARK: - Calendar events

    private static func fetchTodayEvents(now: Date, cal: Calendar) -> [BriefingEvent] {
        let start = cal.startOfDay(for: now)
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        return fetchEvents(from: start, to: end, limit: 8)
    }

    private static func fetchTomorrowEvents(now: Date, cal: Calendar) -> [BriefingEvent] {
        let start = cal.startOfDay(for: now)
        guard let tomorrowStart = cal.date(byAdding: .day, value: 1, to: start),
              let tomorrowEnd = cal.date(byAdding: .day, value: 2, to: start)
        else { return [] }
        return fetchEvents(from: tomorrowStart, to: tomorrowEnd, limit: 3)
    }

    private static func fetchEvents(from start: Date, to end: Date, limit: Int) -> [BriefingEvent] {
        let predicate = eventStore.predicateForEvents(withStart: start, end: end, calendars: nil)
        let ekEvents = eventStore.events(matching: predicate)
            .sorted { $0.startDate < $1.startDate }
            .prefix(limit)

        return ekEvents.map { ev in
            BriefingEvent(
                title: ev.title ?? "",
                startDate: ev.startDate,
                endDate: ev.endDate,
                isAllDay: ev.isAllDay,
                location: ev.location ?? "",
                calendarColorHex: cgColorToHex(ev.calendar.cgColor),
                calendarName: ev.calendar.title
            )
        }
    }

    // MARK: - Reminders

    private static func fetchActiveReminders(now: Date) async -> ([BriefingReminder], Int) {
        let predicate = eventStore.predicateForReminders(in: nil)

        // Bridge callback-based API to async. EKReminder is not Sendable,
        // so extract the data we need inside the callback closure.
        let (items, overdueCount): ([(String, Date?, Bool, String, Int)], Int) = await withCheckedContinuation { continuation in
            eventStore.fetchReminders(matching: predicate) { result in
                let all = result ?? []
                let incomplete = all.filter { !$0.isCompleted }

                var overdue = 0
                var extracted: [(title: String, due: Date?, isOverdue: Bool, list: String, priority: Int)] = []

                for r in incomplete {
                    let dueDate = r.dueDateComponents.flatMap { Calendar.current.date(from: $0) }
                    let isOverdue = dueDate.map { $0 < now } ?? false
                    if isOverdue { overdue += 1 }
                    extracted.append((r.title ?? "", dueDate, isOverdue, r.calendar.title, r.priority))
                }

                // Sort: overdue first, then by due date
                extracted.sort { a, b in
                    if a.isOverdue != b.isOverdue { return a.isOverdue }
                    if let ad = a.due, let bd = b.due { return ad < bd }
                    if a.due != nil { return true }
                    return false
                }

                let limited = Array(extracted.prefix(8))
                continuation.resume(returning: (limited, overdue))
            }
        }

        let reminders = items.map { item in
            BriefingReminder(
                title: item.0,
                dueDate: item.1,
                isOverdue: item.2,
                listName: item.3,
                priority: item.4
            )
        }

        return (reminders, overdueCount)
    }

    // MARK: - Authorization

    private static func authorizeCalendar() async -> Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        switch status {
        case .authorized, .fullAccess:
            return true
        case .notDetermined:
            return (try? await eventStore.requestFullAccessToEvents()) ?? false
        default:
            return false
        }
    }

    private static func authorizeReminders() async -> Bool {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        switch status {
        case .authorized, .fullAccess:
            return true
        case .notDetermined:
            return (try? await eventStore.requestFullAccessToReminders()) ?? false
        default:
            return false
        }
    }

    // MARK: - Helpers

    private static func cgColorToHex(_ cgColor: CGColor) -> String? {
        guard let components = cgColor.components, components.count >= 3 else { return nil }
        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }

    /// Calculate next refresh: after the next event boundary, or 30 min from now.
    private static func nextRefreshDate(after now: Date, events: [BriefingEvent]) -> Date {
        let thirtyMin = Calendar.current.date(byAdding: .minute, value: 30, to: now)!

        let boundaries = events.flatMap { [$0.startDate, $0.endDate] }
            .filter { $0 > now }
            .sorted()

        if let next = boundaries.first {
            let afterBoundary = Calendar.current.date(byAdding: .minute, value: 1, to: next)!
            return min(afterBoundary, thirtyMin)
        }

        return thirtyMin
    }
}
