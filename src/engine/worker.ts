import { ChunkStore } from './storage'
import { chunkText, embedText, rankChunks, emitIngestProgress, emitRagReady } from './rag'
import { resetCost } from './cost'

const db = new (require('dexie')).default('axiom')
const chunkStore = new ChunkStore(db)

const running = new Map<string, AbortController>()

function post(ev: any) {
  try { self.postMessage(ev) } catch { /* ignore */ }
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (!msg || typeof msg !== 'object') return

  if (msg.type === 'run-mission') {
    const input = msg.payload
    const ac = new AbortController()
    running.set(input.id, ac)
    try {
      resetCost()
      const { runMission } = await import('./orchestrator')
      const final = await runMission(input.objective, ac)
      post({ type: 'mission-complete', final, artifactId: input.id, verified: true })
    } catch (err: any) {
      post({ type: 'fault', agent: 'orchestrator', error: err?.message ?? 'UNKNOWN' })
    } finally {
      running.delete(input.id)
    }
    return
  }

  if (msg.type === 'abort') {
    const ac = running.get(msg.missionId)
    if (ac) ac.abort()
    return
  }

  if (msg.type === 'resume') {
    // placeholder for checkpoint resume
    return
  }

  if (msg.type === 'rag-ingest') {
    try {
      const { fileName, text } = msg.payload
      emitIngestProgress(fileName, 'parse', 10)
      const chunks = chunkText(text, fileName)
      emitIngestProgress(fileName, 'chunk', 40)
      for (let i = 0; i < chunks.length; i++) {
        const embedding = embedText(chunks[i].text)
        await chunkStore.put({
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
    } catch (err: any) {
      post({ type: 'fault', agent: 'rag', error: err?.message ?? 'INGEST_FAIL' })
    }
    return
  }

  if (msg.type === 'rag-search') {
    try {
      const { query, topK } = msg.payload
      const chunks = await chunkStore.byScope('global')
      const results = await rankChunks(query, chunks, topK ?? 5)
      post({ type: 'tool-result', agent: msg.agent ?? 'RESEARCHER', tool: 'knowledge_search', ok: true, result: results.map((r) => ({ text: r.text, sourceFile: r.sourceFile })) })
    } catch (err: any) {
      post({ type: 'tool-result', agent: msg.agent ?? 'RESEARCHER', tool: 'knowledge_search', ok: false, error: err?.message })
    }
    return
  }
}
