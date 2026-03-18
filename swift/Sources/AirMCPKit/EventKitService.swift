// AirMCPKit — EventKit service shared between macOS and iOS.
// Handles recurring events and reminders via native EventKit framework.

import EventKit
import Foundation

public struct EventKitService: Sendable {
    public init() {}

    public func buildRecurrenceRule(_ input: RecurrenceInput) throws -> EKRecurrenceRule {
        let freq: EKRecurrenceFrequency
        switch input.frequency {
        case "daily": freq = .daily
        case "weekly": freq = .weekly
        case "monthly": freq = .monthly
        case "yearly": freq = .yearly
        default: throw AirMCPKitError.invalidInput("Unknown recurrence frequency: \(input.frequency). Use: daily, weekly, monthly, yearly")
        }

        var end: EKRecurrenceEnd? = nil
        if let endDateStr = input.endDate, let endDate = parseISO8601(endDateStr) {
            end = EKRecurrenceEnd(end: endDate)
        } else if let count = input.count {
            end = EKRecurrenceEnd(occurrenceCount: count)
        }

        var daysOfWeek: [EKRecurrenceDayOfWeek]? = nil
        if let days = input.daysOfWeek {
            daysOfWeek = days.compactMap { day in
                guard (1...7).contains(day) else { return nil }
                return EKRecurrenceDayOfWeek(EKWeekday(rawValue: day)!)
            }
        }

        return EKRecurrenceRule(
            recurrenceWith: freq,
            interval: input.interval,
            daysOfTheWeek: daysOfWeek,
            daysOfTheMonth: nil,
            monthsOfTheYear: nil,
            weeksOfTheYear: nil,
            daysOfTheYear: nil,
            setPositions: nil,
            end: end
        )
    }

    // MARK: - EventKit authorization helper

    private func authorizedEventStore() async throws -> EKEventStore {
        let store = EKEventStore()
        let granted: Bool
        if #available(macOS 14.0, iOS 17.0, *) {
            granted = try await store.requestFullAccessToEvents()
        } else {
            granted = try await store.requestAccess(to: .event)
        }
        guard granted else { throw AirMCPKitError.permissionDenied("Calendar access denied") }
        return store
    }

    // MARK: - Calendar CRUD

    public func listCalendars() async throws -> [CalendarInfo] {
        let store = try await authorizedEventStore()
        let cals = store.calendars(for: .event)
        return cals.map { cal in
            let colorStr = cgColorToHex(cal.cgColor)
            return CalendarInfo(
                id: cal.calendarIdentifier,
                name: cal.title,
                color: colorStr,
                writable: cal.allowsContentModifications
            )
        }
    }

    public func listEvents(_ input: ListEventsInput) async throws -> EventListOutput {
        let store = try await authorizedEventStore()
        guard let start = parseISO8601(input.startDate) else { throw AirMCPKitError.invalidInput("Invalid startDate") }
        guard let end = parseISO8601(input.endDate) else { throw AirMCPKitError.invalidInput("Invalid endDate") }
        let limit = input.limit ?? 100
        let offset = input.offset ?? 0

        var calendars: [EKCalendar]? = nil
        if let calName = input.calendar {
            let matches = store.calendars(for: .event).filter { $0.title == calName }
            guard !matches.isEmpty else { throw AirMCPKitError.notFound("Calendar not found: \(calName)") }
            calendars = matches
        }

        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: calendars)
        let events = store.events(matching: predicate).sorted { $0.startDate < $1.startDate }
        let total = events.count
        let s = min(offset, total)
        let e = min(s + limit, total)
        let slice = events[s..<e]

        let items = slice.map { ev in
            EventListItem(
                id: ev.eventIdentifier,
                summary: ev.title ?? "",
                startDate: formatISO8601(ev.startDate),
                endDate: formatISO8601(ev.endDate),
                allDay: ev.isAllDay,
                calendar: ev.calendar.title
            )
        }
        return EventListOutput(total: total, offset: s, returned: items.count, events: items)
    }

    public func readEvent(_ input: ReadEventInput) async throws -> EventDetail {
        let store = try await authorizedEventStore()
        guard let event = store.event(withIdentifier: input.id) else {
            throw AirMCPKitError.notFound("Event not found: \(input.id)")
        }
        var attendees: [AttendeeInfo] = []
        if let ekAttendees = event.attendees {
            attendees = ekAttendees.map { a in
                AttendeeInfo(
                    name: a.name ?? "",
                    email: a.url.absoluteString.replacingOccurrences(of: "mailto:", with: ""),
                    status: participationStatusString(a.participantStatus)
                )
            }
        }
        var recurrenceStr = ""
        if let rules = event.recurrenceRules, let rule = rules.first {
            recurrenceStr = rule.description
        }
        return EventDetail(
            id: event.eventIdentifier,
            summary: event.title ?? "",
            description: event.notes ?? "",
            location: event.location ?? "",
            startDate: formatISO8601(event.startDate),
            endDate: formatISO8601(event.endDate),
            allDay: event.isAllDay,
            recurrence: recurrenceStr,
            url: event.url?.absoluteString ?? "",
            calendar: event.calendar.title,
            attendees: attendees
        )
    }

    public func createEvent(_ input: CreateEventInput) async throws -> MutationOutput {
        let store = try await authorizedEventStore()
        guard let start = parseISO8601(input.startDate) else { throw AirMCPKitError.invalidInput("Invalid startDate") }
        guard let end = parseISO8601(input.endDate) else { throw AirMCPKitError.invalidInput("Invalid endDate") }

        let event = EKEvent(eventStore: store)
        event.title = input.title
        event.startDate = start
        event.endDate = end
        event.location = input.location
        event.notes = input.notes
        if let allDay = input.allDay { event.isAllDay = allDay }

        if let calName = input.calendar {
            guard let cal = store.calendars(for: .event).first(where: { $0.title == calName }) else {
                throw AirMCPKitError.notFound("Calendar not found: \(calName)")
            }
            event.calendar = cal
        } else {
            // Find first writable calendar, or fall back to default
            if let writable = store.calendars(for: .event).first(where: { $0.allowsContentModifications }) {
                event.calendar = writable
            } else {
                event.calendar = store.defaultCalendarForNewEvents
            }
        }

        try store.save(event, span: .thisEvent)
        return MutationOutput(id: event.eventIdentifier, summary: event.title ?? "")
    }

    public func updateEvent(_ input: UpdateEventInput) async throws -> MutationOutput {
        let store = try await authorizedEventStore()
        guard let event = store.event(withIdentifier: input.id) else {
            throw AirMCPKitError.notFound("Event not found: \(input.id)")
        }
        if let title = input.title { event.title = title }
        if let startStr = input.startDate, let start = parseISO8601(startStr) { event.startDate = start }
        if let endStr = input.endDate, let end = parseISO8601(endStr) { event.endDate = end }
        if let loc = input.location { event.location = loc }
        if let notes = input.notes { event.notes = notes }
        try store.save(event, span: .thisEvent)
        return MutationOutput(id: event.eventIdentifier, summary: event.title ?? "")
    }

    public func deleteEvent(_ input: DeleteEventInput) async throws -> DeleteEventOutput {
        let store = try await authorizedEventStore()
        guard let event = store.event(withIdentifier: input.id) else {
            throw AirMCPKitError.notFound("Event not found: \(input.id)")
        }
        let summary = event.title ?? ""
        try store.remove(event, span: .thisEvent)
        return DeleteEventOutput(deleted: true, summary: summary)
    }

    public func searchEvents(_ input: SearchEventsInput) async throws -> SearchEventsOutput {
        let store = try await authorizedEventStore()
        guard let start = parseISO8601(input.startDate) else { throw AirMCPKitError.invalidInput("Invalid startDate") }
        guard let end = parseISO8601(input.endDate) else { throw AirMCPKitError.invalidInput("Invalid endDate") }
        let limit = input.limit ?? 50
        let query = input.query.lowercased()

        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        let events = store.events(matching: predicate)
            .filter { ev in
                let title = (ev.title ?? "").lowercased()
                let notes = (ev.notes ?? "").lowercased()
                return title.contains(query) || notes.contains(query)
            }
            .sorted { $0.startDate < $1.startDate }

        let total = events.count
        let limited = Array(events.prefix(limit))
        let items = limited.map { ev in
            EventListItem(
                id: ev.eventIdentifier,
                summary: ev.title ?? "",
                startDate: formatISO8601(ev.startDate),
                endDate: formatISO8601(ev.endDate),
                allDay: ev.isAllDay,
                calendar: ev.calendar.title
            )
        }
        return SearchEventsOutput(total: total, returned: items.count, events: items)
    }

    public func getUpcomingEvents(_ input: UpcomingEventsInput) async throws -> UpcomingEventsOutput {
        let store = try await authorizedEventStore()
        let now = Date()
        let end = Calendar.current.date(byAdding: .day, value: 30, to: now)!
        let limit = input.limit ?? 10

        let predicate = store.predicateForEvents(withStart: now, end: end, calendars: nil)
        let events = store.events(matching: predicate).sorted { $0.startDate < $1.startDate }

        let total = events.count
        let limited = Array(events.prefix(limit))
        let items = limited.map { ev in
            UpcomingEventItem(
                id: ev.eventIdentifier,
                summary: ev.title ?? "",
                startDate: formatISO8601(ev.startDate),
                endDate: formatISO8601(ev.endDate),
                allDay: ev.isAllDay,
                location: ev.location ?? "",
                calendar: ev.calendar.title
            )
        }
        return UpcomingEventsOutput(total: total, returned: items.count, events: items)
    }

    public func todayEvents() async throws -> TodayEventsOutput {
        let store = try await authorizedEventStore()
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        let end = cal.date(byAdding: .day, value: 1, to: start)!

        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        let events = store.events(matching: predicate).sorted { $0.startDate < $1.startDate }

        let items = events.map { ev in
            UpcomingEventItem(
                id: ev.eventIdentifier,
                summary: ev.title ?? "",
                startDate: formatISO8601(ev.startDate),
                endDate: formatISO8601(ev.endDate),
                allDay: ev.isAllDay,
                location: ev.location ?? "",
                calendar: ev.calendar.title
            )
        }
        return TodayEventsOutput(total: items.count, returned: items.count, events: items)
    }

    // MARK: - Helpers

    private func cgColorToHex(_ cgColor: CGColor) -> String? {
        guard let components = cgColor.components, components.count >= 3 else { return nil }
        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }

    private func participationStatusString(_ status: EKParticipantStatus) -> String {
        switch status {
        case .accepted: return "accepted"
        case .declined: return "declined"
        case .tentative: return "tentative"
        case .pending: return "pending"
        case .delegated: return "delegated"
        case .completed: return "completed"
        case .inProcess: return "in process"
        default: return "unknown"
        }
    }

    // MARK: - Recurring Events

    public func createRecurringEvent(_ input: RecurringEventInput) async throws -> EventOutput {
        let store = try await authorizedEventStore()
        let event = EKEvent(eventStore: store)
        event.title = input.title
        guard let start = parseISO8601(input.startDate) else { throw AirMCPKitError.invalidInput("Invalid startDate") }
        guard let end = parseISO8601(input.endDate) else { throw AirMCPKitError.invalidInput("Invalid endDate") }
        event.startDate = start
        event.endDate = end
        event.location = input.location
        event.notes = input.notes

        if let calName = input.calendar {
            guard let cal = store.calendars(for: .event).first(where: { $0.title == calName }) else {
                throw AirMCPKitError.notFound("Calendar not found: \(calName)")
            }
            event.calendar = cal
        } else {
            event.calendar = store.defaultCalendarForNewEvents
        }

        event.addRecurrenceRule(try buildRecurrenceRule(input.recurrence))
        try store.save(event, span: .futureEvents)

        return EventOutput(id: event.eventIdentifier, title: event.title, recurring: true)
    }

    public func createRecurringReminder(_ input: RecurringReminderInput) async throws -> ReminderOutput {
        let store = EKEventStore()
        let granted: Bool
        if #available(macOS 14.0, iOS 17.0, *) {
            granted = try await store.requestFullAccessToReminders()
        } else {
            granted = try await store.requestAccess(to: .reminder)
        }
        guard granted else { throw AirMCPKitError.permissionDenied("Reminders access denied") }

        let reminder = EKReminder(eventStore: store)
        reminder.title = input.title
        reminder.notes = input.notes
        if let p = input.priority { reminder.priority = p }

        if let dueDateStr = input.dueDate, let dueDate = parseISO8601(dueDateStr) {
            reminder.dueDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute], from: dueDate
            )
        }

        if let listName = input.list {
            guard let list = store.calendars(for: .reminder).first(where: { $0.title == listName }) else {
                throw AirMCPKitError.notFound("Reminder list not found: \(listName)")
            }
            reminder.calendar = list
        } else {
            reminder.calendar = store.defaultCalendarForNewReminders()
        }

        reminder.addRecurrenceRule(try buildRecurrenceRule(input.recurrence))
        try store.save(reminder, commit: true)

        return ReminderOutput(id: reminder.calendarItemIdentifier, title: reminder.title ?? "", recurring: true)
    }
}

// MARK: - Errors

public enum AirMCPKitError: Error, LocalizedError {
    case permissionDenied(String)
    case invalidInput(String)
    case notFound(String)
    case unsupported(String)

    public var errorDescription: String? {
        switch self {
        case .permissionDenied(let msg): return msg
        case .invalidInput(let msg): return msg
        case .notFound(let msg): return msg
        case .unsupported(let msg): return msg
        }
    }
}
