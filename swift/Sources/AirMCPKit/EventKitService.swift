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

    public func createRecurringEvent(_ input: RecurringEventInput) async throws -> EventOutput {
        let store = EKEventStore()
        let granted: Bool
        if #available(macOS 14.0, iOS 17.0, *) {
            granted = try await store.requestFullAccessToEvents()
        } else {
            granted = try await store.requestAccess(to: .event)
        }
        guard granted else { throw AirMCPKitError.permissionDenied("Calendar access denied") }

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
