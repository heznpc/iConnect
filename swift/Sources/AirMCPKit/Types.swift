// AirMCPKit — Shared types for macOS bridge and iOS app.
// These types define the JSON contract between the Node.js MCP server (or iOS MCP server)
// and the native Swift layer.

import Foundation

// MARK: - Common I/O

public struct AirMCPOutput: Encodable, Sendable {
    public let output: String
    public init(output: String) { self.output = output }
}

public struct AirMCPError: Encodable, Sendable {
    public let error: String
    public init(error: String) { self.error = error }
}

// MARK: - EventKit

public struct RecurrenceInput: Decodable, Sendable {
    public let frequency: String // daily, weekly, monthly, yearly
    public let interval: Int
    public let endDate: String?
    public let count: Int?
    public let daysOfWeek: [Int]? // 1=Sun..7=Sat
}

public struct RecurringEventInput: Decodable, Sendable {
    public let title: String
    public let startDate: String
    public let endDate: String
    public let calendar: String?
    public let location: String?
    public let notes: String?
    public let recurrence: RecurrenceInput
}

public struct RecurringReminderInput: Decodable, Sendable {
    public let title: String
    public let list: String?
    public let notes: String?
    public let dueDate: String?
    public let priority: Int?
    public let recurrence: RecurrenceInput
}

public struct EventOutput: Encodable, Sendable {
    public let id: String
    public let title: String
    public let recurring: Bool
    public init(id: String, title: String, recurring: Bool) {
        self.id = id; self.title = title; self.recurring = recurring
    }
}

public struct ReminderOutput: Encodable, Sendable {
    public let id: String
    public let title: String
    public let recurring: Bool
    public init(id: String, title: String, recurring: Bool) {
        self.id = id; self.title = title; self.recurring = recurring
    }
}

// MARK: - PhotoKit

public struct PhotoQueryInput: Decodable, Sendable {
    public let mediaType: String?
    public let startDate: String?
    public let endDate: String?
    public let favorites: Bool?
    public let limit: Int?
}

public struct PhotoInfo: Encodable, Sendable {
    public let identifier: String
    public let filename: String?
    public let creationDate: String?
    public let mediaType: String
    public let isFavorite: Bool
    public let width: Int
    public let height: Int
    public init(identifier: String, filename: String?, creationDate: String?,
                mediaType: String, isFavorite: Bool, width: Int, height: Int) {
        self.identifier = identifier; self.filename = filename; self.creationDate = creationDate
        self.mediaType = mediaType; self.isFavorite = isFavorite; self.width = width; self.height = height
    }
}

public struct PhotoQueryOutput: Encodable, Sendable {
    public let photos: [PhotoInfo]
    public let total: Int
    public init(photos: [PhotoInfo], total: Int) {
        self.photos = photos; self.total = total
    }
}

public struct ImportPhotoInput: Decodable, Sendable {
    public let filePath: String
    public let albumName: String?
}

public struct DeletePhotosInput: Decodable, Sendable {
    public let identifiers: [String]
}

// MARK: - CoreLocation

public struct LocationOutput: Encodable, Sendable {
    public let latitude: Double
    public let longitude: Double
    public let altitude: Double
    public let horizontalAccuracy: Double
    public let verticalAccuracy: Double
    public let timestamp: String
    public init(latitude: Double, longitude: Double, altitude: Double,
                horizontalAccuracy: Double, verticalAccuracy: Double, timestamp: String) {
        self.latitude = latitude; self.longitude = longitude; self.altitude = altitude
        self.horizontalAccuracy = horizontalAccuracy; self.verticalAccuracy = verticalAccuracy
        self.timestamp = timestamp
    }
}

// MARK: - Vision

public struct ClassifyImageInput: Decodable, Sendable {
    public let imagePath: String
    public let maxResults: Int?
}

public struct ImageLabel: Encodable, Sendable {
    public let identifier: String
    public let confidence: Double
    public init(identifier: String, confidence: Double) {
        self.identifier = identifier; self.confidence = confidence
    }
}

// MARK: - Embedding

public struct EmbedTextInput: Decodable, Sendable {
    public let text: String
    public let language: String?
}

public struct EmbedBatchInput: Decodable, Sendable {
    public let texts: [String]
    public let language: String?
}

public struct EmbedTextOutput: Encodable, Sendable {
    public let vector: [Double]
    public let dimension: Int
    public init(vector: [Double], dimension: Int) {
        self.vector = vector; self.dimension = dimension
    }
}

// MARK: - Apple Intelligence

public struct GenerateTextInput: Decodable, Sendable {
    public let prompt: String
    public let systemInstruction: String?
    public let temperature: Double?
}

public struct AiStatusOutput: Encodable, Sendable {
    public let available: Bool
    public let message: String
    public let macOSVersion: String
    public let hasAppleSilicon: Bool
    public let foundationModelsSupported: Bool
    public init(available: Bool, message: String, macOSVersion: String,
                hasAppleSilicon: Bool, foundationModelsSupported: Bool) {
        self.available = available; self.message = message; self.macOSVersion = macOSVersion
        self.hasAppleSilicon = hasAppleSilicon; self.foundationModelsSupported = foundationModelsSupported
    }
}

// MARK: - EventKit (Calendar CRUD)

public struct ListCalendarsInput: Decodable, Sendable {}

public struct CalendarInfo: Encodable, Sendable {
    public let id: String
    public let name: String
    public let color: String?
    public let writable: Bool
    public init(id: String, name: String, color: String?, writable: Bool) {
        self.id = id; self.name = name; self.color = color; self.writable = writable
    }
}

public struct ListEventsInput: Decodable, Sendable {
    public let startDate: String
    public let endDate: String
    public let calendar: String?
    public let limit: Int?
    public let offset: Int?
}

public struct EventListItem: Encodable, Sendable {
    public let id: String
    public let summary: String
    public let startDate: String
    public let endDate: String
    public let allDay: Bool
    public let calendar: String
    public init(id: String, summary: String, startDate: String, endDate: String, allDay: Bool, calendar: String) {
        self.id = id; self.summary = summary; self.startDate = startDate; self.endDate = endDate
        self.allDay = allDay; self.calendar = calendar
    }
}

public struct EventListOutput: Encodable, Sendable {
    public let total: Int
    public let offset: Int
    public let returned: Int
    public let events: [EventListItem]
    public init(total: Int, offset: Int, returned: Int, events: [EventListItem]) {
        self.total = total; self.offset = offset; self.returned = returned; self.events = events
    }
}

public struct ReadEventInput: Decodable, Sendable {
    public let id: String
}

public struct AttendeeInfo: Encodable, Sendable {
    public let name: String
    public let email: String
    public let status: String
    public init(name: String, email: String, status: String) {
        self.name = name; self.email = email; self.status = status
    }
}

public struct EventDetail: Encodable, Sendable {
    public let id: String
    public let summary: String
    public let description: String
    public let location: String
    public let startDate: String
    public let endDate: String
    public let allDay: Bool
    public let recurrence: String
    public let url: String
    public let calendar: String
    public let attendees: [AttendeeInfo]
    public init(id: String, summary: String, description: String, location: String,
                startDate: String, endDate: String, allDay: Bool, recurrence: String,
                url: String, calendar: String, attendees: [AttendeeInfo]) {
        self.id = id; self.summary = summary; self.description = description; self.location = location
        self.startDate = startDate; self.endDate = endDate; self.allDay = allDay
        self.recurrence = recurrence; self.url = url; self.calendar = calendar; self.attendees = attendees
    }
}

public struct CreateEventInput: Decodable, Sendable {
    public let title: String
    public let startDate: String
    public let endDate: String
    public let location: String?
    public let notes: String?
    public let calendar: String?
    public let allDay: Bool?
}

public struct MutationOutput: Encodable, Sendable {
    public let id: String
    public let summary: String
    public init(id: String, summary: String) {
        self.id = id; self.summary = summary
    }
}

public struct UpdateEventInput: Decodable, Sendable {
    public let id: String
    public let title: String?
    public let startDate: String?
    public let endDate: String?
    public let location: String?
    public let notes: String?
}

public struct DeleteEventInput: Decodable, Sendable {
    public let id: String
}

public struct DeleteEventOutput: Encodable, Sendable {
    public let deleted: Bool
    public let summary: String
    public init(deleted: Bool, summary: String) {
        self.deleted = deleted; self.summary = summary
    }
}

public struct SearchEventsInput: Decodable, Sendable {
    public let query: String
    public let startDate: String
    public let endDate: String
    public let limit: Int?
}

public struct SearchEventsOutput: Encodable, Sendable {
    public let total: Int
    public let returned: Int
    public let events: [EventListItem]
    public init(total: Int, returned: Int, events: [EventListItem]) {
        self.total = total; self.returned = returned; self.events = events
    }
}

public struct UpcomingEventsInput: Decodable, Sendable {
    public let limit: Int?
    public init(limit: Int? = nil) { self.limit = limit }
}

public struct UpcomingEventsOutput: Encodable, Sendable {
    public let total: Int
    public let returned: Int
    public let events: [UpcomingEventItem]
    public init(total: Int, returned: Int, events: [UpcomingEventItem]) {
        self.total = total; self.returned = returned; self.events = events
    }
}

public struct UpcomingEventItem: Encodable, Sendable {
    public let id: String
    public let summary: String
    public let startDate: String
    public let endDate: String
    public let allDay: Bool
    public let location: String
    public let calendar: String
    public init(id: String, summary: String, startDate: String, endDate: String,
                allDay: Bool, location: String, calendar: String) {
        self.id = id; self.summary = summary; self.startDate = startDate; self.endDate = endDate
        self.allDay = allDay; self.location = location; self.calendar = calendar
    }
}

public struct TodayEventsInput: Decodable, Sendable {}

public struct TodayEventsOutput: Encodable, Sendable {
    public let total: Int
    public let returned: Int
    public let events: [UpcomingEventItem]
    public init(total: Int, returned: Int, events: [UpcomingEventItem]) {
        self.total = total; self.returned = returned; self.events = events
    }
}

// MARK: - Helpers

public func formatISO8601(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.string(from: date)
}

public func parseISO8601(_ string: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: string) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: string)
}
