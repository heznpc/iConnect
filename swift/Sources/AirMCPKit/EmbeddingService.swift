// AirMCPKit — On-device NLContextualEmbedding service shared between macOS and iOS.

import Foundation
import NaturalLanguage
import Accelerate

public struct EmbeddingService: Sendable {
    public init() {}

    public func detectLanguage(_ text: String) -> NLLanguage {
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(text)
        return recognizer.dominantLanguage ?? .english
    }

    public func nlLanguageFromCode(_ code: String?) -> NLLanguage? {
        guard let code = code else { return nil }
        switch code {
        case "ko": return .korean
        case "en": return .english
        case "ja": return .japanese
        case "zh": return .simplifiedChinese
        case "fr": return .french
        case "de": return .german
        case "es": return .spanish
        case "it": return .italian
        case "pt": return .portuguese
        default: return NLLanguage(rawValue: code)
        }
    }

    public func embedText(_ text: String, language: NLLanguage) throws -> [Double] {
        guard let embedding = NLContextualEmbedding(language: language) else {
            throw AirMCPKitError.unsupported("NLContextualEmbedding unavailable for language: \(language.rawValue)")
        }
        try embedding.load()
        return try pooledVector(for: text, language: language, embedding: embedding)
    }

    /// Embed multiple texts with a single model load per language (avoids N model loads for N texts).
    public func embedBatch(_ texts: [String], language: NLLanguage? = nil) throws -> [[Double]] {
        let langs = texts.map { language ?? detectLanguage($0) }
        var modelCache: [NLLanguage: NLContextualEmbedding] = [:]

        return try texts.enumerated().map { (i, text) in
            let lang = langs[i]
            let embedding: NLContextualEmbedding
            if let cached = modelCache[lang] {
                embedding = cached
            } else {
                guard let e = NLContextualEmbedding(language: lang) else {
                    throw AirMCPKitError.unsupported("NLContextualEmbedding unavailable for language: \(lang.rawValue)")
                }
                try e.load()
                modelCache[lang] = e
                embedding = e
            }
            return try pooledVector(for: text, language: lang, embedding: embedding)
        }
    }

    // MARK: - Private

    private func pooledVector(for text: String, language: NLLanguage, embedding: NLContextualEmbedding) throws -> [Double] {
        guard let result = try? embedding.embeddingResult(for: text, language: language) else {
            throw AirMCPKitError.unsupported("Failed to generate embedding for text")
        }
        var tokenVectors: [[Double]] = []
        result.enumerateTokenVectors(in: text.startIndex..<text.endIndex) { vector, _ in
            tokenVectors.append(vector)
            return true
        }
        guard !tokenVectors.isEmpty else {
            throw AirMCPKitError.unsupported("No token vectors generated")
        }
        let dim = tokenVectors[0].count
        var sumVector = [Double](repeating: 0.0, count: dim)
        for tv in tokenVectors {
            vDSP_vaddD(sumVector, 1, tv, 1, &sumVector, 1, vDSP_Length(dim))
        }
        var count = Double(tokenVectors.count)
        vDSP_vsdivD(sumVector, 1, &count, &sumVector, 1, vDSP_Length(dim))
        return sumVector
    }
}
