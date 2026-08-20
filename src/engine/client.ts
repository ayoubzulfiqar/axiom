import bus from './bus'
import { abortAll } from './orchestrator'
import { resetCost } from './cost'
import { ChunkStore } from './storage'
import { chunkText, embedText, rankChunks, emitIngestProgress, emitRagReady } from './rag'
import { db } from '../lib/db'

export interface ClientMissionInput {
  id: string
  objective: string
  signal?: AbortSignal
  shape?: string
}

let worker: Worker | null = null
let useFallback = false
const running = new Map<string, AbortController>()

function createWorker(): Worker | null {
  try {
    return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

function initWorker() {
  if (worker) return
  worker = createWorker()
  if (!worker) {
    useFallback = true
    return
  }
  worker.onmessage = (e: MessageEvent) => {
    const ev = e.data
    if (!ev || typeof ev !== 'object') return
    bus.emit(ev)
  }
}

export function isUsingFallback(): boolean {
  return useFallback
}

export async function runMission(input: ClientMissionInput): Promise<void> {
  initWorker()
  resetCost()

  if (useFallback || !worker) {
    const ac = new AbortController()
    running.set(input.id, ac)
    try {
      const { runMission: run } = await import('./orchestrator')
      const final = await run(input.objective, ac, input.shape ?? 'standard')
      bus.emit({ type: 'mission-complete', final, artifactId: input.id, verified: true })
    } catch (err: any) {
      bus.emit({ type: 'fault', agent: 'orchestrator', error: err?.message ?? 'UNKNOWN' })
    } finally {
      running.delete(input.id)
    }
    return
  }

  const vault = await import('./vault')
  const apiKey = await vault.loadKey()

  return new Promise((resolve, reject) => {
    const ac = new AbortController()
    running.set(input.id, ac)
    const handler = (e: MessageEvent) => {
      const ev = e.data
      if (!ev || typeof ev !== 'object') return
      if (ev.type === 'mission-complete' || ev.type === 'fault') {
        worker?.removeEventListener('message', handler)
        running.delete(input.id)
        if (ev.type === 'fault') reject(new Error(ev.error))
        else resolve()
      }
    }
    if (!worker) {
      reject(new Error('Worker unavailable'))
      return
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'run-mission', payload: input, apiKey: apiKey ?? '' })
  })
}

export function abortMission(missionId: string) {
  const ac = running.get(missionId)
  if (ac) ac.abort()
  if (worker) worker.postMessage({ type: 'abort', missionId })
}

export async function ingestFile(fileName: string, text: string) {
  initWorker()
  if (useFallback || !worker) {
    const chunks = chunkText(text, fileName)
    const store = new ChunkStore((globalThis as any).axiomDb ?? db)
    emitIngestProgress(fileName, 'parse', 10)
    emitIngestProgress(fileName, 'chunk', 40)
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embedText(chunks[i].text)
      await store.put({
        missionScope: 'global',
        sourceFile: chunks[i].sourceFile,
        text: chunks[i].text,
        embedding,
        createdAt: Date.now(),
      })
      const pct = 40 + Math.round(((i + 1) / chunks.length) * 50)
      emitIngestProgress(fileName, 'embed', pct)
    }
    emitRagReady(chunks.length)
    return
  }

  worker.postMessage({ type: 'rag-ingest', payload: { fileId: crypto.randomUUID(), fileName, text } })
}

export async function searchKnowledge(query: string, topK = 5) {
  initWorker()
  if (useFallback || !worker) {
    const store = new ChunkStore((globalThis as any).axiomDb ?? db)
    const chunks = await store.byScope('global')
    const results = await rankChunks(query, chunks, topK)
    return results.map((r) => ({ text: r.text, sourceFile: r.sourceFile }))
  }

  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      const ev = e.data
      if (ev && ev.type === 'tool-result' && ev.tool === 'knowledge_search') {
        worker?.removeEventListener('message', handler)
        resolve(ev.result)
      }
    }
    if (!worker) {
      resolve([])
      return
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'rag-search', payload: { query, topK }, agent: 'RESEARCHER' })
  })
}

export function destroy() {
  abortAll()
  running.clear()
  if (worker) {
    worker.terminate()
    worker = null
  }
  useFallback = false
}
