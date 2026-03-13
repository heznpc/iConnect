import { runSwift, checkSwiftBridge } from "../shared/swift.js";

interface EmbedTextResult {
  vector: number[];
  dimension: number;
}

interface EmbedBatchResult {
  vectors: number[][];
  dimension: number;
  count: number;
}

// -- Gemini Embedding API types --

interface GeminiEmbedResponse {
  embedding: { values: number[] };
}

interface GeminiBatchEmbedResponse {
  embeddings: Array<{ values: number[] }>;
}

// -- Provider detection --

export type EmbeddingProvider = "gemini" | "swift" | "none";

/**
 * Detect which embedding provider is available.
 * Pure async check with no global state -- caller is responsible for caching.
 */
export async function detectProvider(): Promise<EmbeddingProvider> {
  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  const err = await checkSwiftBridge();
  return err === null ? "swift" : "none";
}

// -- Gemini Embedding API --

const GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
const GEMINI_BATCH_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";
const GEMINI_DIMENSION = 768; // good balance of quality vs storage

async function geminiEmbed(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: "SEMANTIC_SIMILARITY",
      outputDimensionality: GEMINI_DIMENSION,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as GeminiEmbedResponse;
  return data.embedding.values;
}

async function geminiBatchEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Gemini batch API: max 100 per request
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    chunks.push(texts.slice(i, i + 100));
  }

  const allVectors: number[][] = [];

  for (const chunk of chunks) {
    const res = await fetch(`${GEMINI_BATCH_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: chunk.map((text) => ({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: GEMINI_DIMENSION,
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini batch API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as GeminiBatchEmbedResponse;
    allVectors.push(...data.embeddings.map((e) => e.values));
  }

  return allVectors;
}

// -- Public API (auto-selects provider) --

/** Embed a single text. Uses Gemini if GEMINI_API_KEY is set, otherwise Swift bridge. */
export async function embedText(text: string, provider: EmbeddingProvider, language?: string): Promise<number[]> {
  if (provider === "gemini") {
    return geminiEmbed(text);
  }

  if (provider === "swift") {
    const result = await runSwift<EmbedTextResult>(
      "embed-text",
      JSON.stringify({ text, language }),
    );
    return result.vector;
  }

  throw new Error("No embedding backend available. Set GEMINI_API_KEY or run 'npm run swift-build'.");
}

/** Embed multiple texts. Uses Gemini batch API if available, otherwise Swift bridge. */
export async function embedBatch(texts: string[], provider: EmbeddingProvider, language?: string): Promise<number[][]> {
  if (provider === "gemini") {
    return geminiBatchEmbed(texts);
  }

  if (provider === "swift") {
    const result = await runSwift<EmbedBatchResult>(
      "embed-batch",
      JSON.stringify({ texts, language }),
    );
    return result.vectors;
  }

  throw new Error("No embedding backend available. Set GEMINI_API_KEY or run 'npm run swift-build'.");
}

/** Cosine similarity between two vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
