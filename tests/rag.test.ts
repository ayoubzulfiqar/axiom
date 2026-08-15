import { describe, it, expect } from 'vitest'
import { chunkText, cosineSimilarity, embedText, rankChunks } from '../src/engine/rag'

describe('rag', () => {
  it('chunks text with overlap', () => {
    const text = 'a'.repeat(900)
    const chunks = chunkText(text, 'file.txt')
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].text.length).toBeLessThanOrEqual(800)
  })

  it('produces non-zero similarity for related text', () => {
    const a = embedText('AXIOM orchestrator console')
    const b = embedText('AXIOM orchestrator console')
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.5)
  })

  it('ranks chunks by similarity', async () => {
    const aEmbed = embedText('AXIOM mission orchestration')
    const bEmbed = embedText('random noise')
    const chunks = [
      { id: '1', missionScope: 'global' as const, sourceFile: 'a.txt', text: 'AXIOM mission orchestration', embedding: aEmbed, createdAt: 1 },
      { id: '2', missionScope: 'global' as const, sourceFile: 'b.txt', text: 'random noise', embedding: bEmbed, createdAt: 2 },
    ]
    const results = await rankChunks('AXIOM mission', chunks as any, 2)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].text).toBe('AXIOM mission orchestration')
  })
})
