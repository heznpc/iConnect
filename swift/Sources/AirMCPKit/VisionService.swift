// AirMCPKit — Vision framework service shared between macOS and iOS.

import Foundation
import Vision

public struct VisionService: Sendable {
    public init() {}

    public func classifyImage(path: String, maxResults: Int = 10) throws -> [ImageLabel] {
        let imageURL = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: path) else {
            throw AirMCPKitError.notFound("Image file not found: \(path)")
        }

        let request = VNClassifyImageRequest()
        let handler = VNImageRequestHandler(url: imageURL, options: [:])
        try handler.perform([request])

        let observations = (request.results ?? [])
            .filter { $0.confidence > 0.1 }
            .sorted { $0.confidence > $1.confidence }
            .prefix(maxResults)

        return observations.map { ImageLabel(identifier: $0.identifier, confidence: Double($0.confidence)) }
    }

    @available(macOS 14, iOS 16, *)
    public func scanDocument(path: String) throws -> [(type: String, text: String, confidence: Double)] {
        let imageURL = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: path) else {
            throw AirMCPKitError.notFound("Image file not found: \(path)")
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(url: imageURL, options: [:])
        try handler.perform([request])

        return (request.results ?? []).map { obs in
            let text = obs.topCandidates(1).first?.string ?? ""
            return (type: "text", text: text, confidence: Double(obs.confidence))
        }
    }
}
