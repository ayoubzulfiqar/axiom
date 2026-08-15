import bus from './bus'
import type { ChunkRecord } from '../lib/db'

export interface IngestProgress {
  file: string
  stage: 'parse' | 'chunk' | 'embed'
  pct: number
}

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 0.15
const OVERLAP_CHARS = Math.floor(CHUNK_SIZE * CHUNK_OVERLAP)

export function chunkText(text: string, sourceFile: string): Array<{ text: string; sourceFile: string; chunkIndex: number }> {
  const cleaned = text.replace(/\r\n/g, '\n').trim()
  if (cleaned.length === 0) return []
  const chunks: Array<{ text: string; sourceFile: string; chunkIndex: number }> = []
  let index = 0
  while (index < cleaned.length) {
    const end = Math.min(index + CHUNK_SIZE, cleaned.length)
    const slice = cleaned.slice(index, end)
    chunks.push({ text: slice, sourceFile, chunkIndex: chunks.length })
    if (end >= cleaned.length) break
    index = end - OVERLAP_CHARS
    if (index < 0) index = 0
  }
  return chunks
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function embedText(text: string): number[] {
  const dim = 384
  const embedding = new Array(dim).fill(0)
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const word = words[i] || ' '
    let h = 0
    for (let j = 0; j < word.length; j++) {
      h = ((h << 5) - h + word.charCodeAt(j)) | 0
    }
    const idx = Math.abs(h) % dim
    embedding[idx] += 1
  }
  const max = Math.max(...embedding, 1)
  for (let i = 0; i < embedding.length; i++) embedding[i] = embedding[i] / max
  return embedding
}

export async function rankChunks(query: string, chunks: ChunkRecord[], topK = 5): Promise<ChunkRecord[]> {
  const queryEmbed = embedText(query)
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbed, chunk.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).map((s) => s.chunk)
}

export function parseFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function emitIngestProgress(file: string, stage: IngestProgress['stage'], pct: number) {
  bus.emit({ type: 'rag-ingest-progress', file, stage, pct })
}

export function emitRagReady(chunks: number) {
  bus.emit({ type: 'rag-ready', chunks })
}
