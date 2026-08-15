import { describe, it, expect } from 'vitest'
import { buildContextMessages, CONTEXT_BUDGET } from '../src/engine/context'

describe('context', () => {
  it('includes system, objective, and recent steps', () => {
    const history = [
      { thought: 't1', routes: ['A'], artifactId: 'a1', summary: 's1' },
      { thought: 't2', routes: ['B'], artifactId: 'a2', summary: 's2' },
      { thought: 't3', routes: ['C'], artifactId: 'a3', summary: 's3' },
      { thought: 't4', routes: ['D'], artifactId: 'a4', summary: 's4' },
    ]
    const ctx = buildContextMessages('objective', history, 'standard', 'A\nB\nC')
    expect(ctx.messages[0].content).toContain('Graph shape: standard')
    expect(ctx.messages[1].content).toContain('Objective: objective')
    expect(ctx.messages[1].content).toContain('Recent steps:')
    expect(ctx.messages[1].content).toContain('Available agents:')
    expect(ctx.stepsCompacted).toBe(1)
    expect(ctx.compacted).toBe(true)
  })

  it('never drops objective', () => {
    const ctx = buildContextMessages('keep this', [], 'standard', '')
    expect(ctx.messages[1].content).toContain('Objective: keep this')
  })

  it('stays under budget over 20 steps', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      thought: `step ${i}`,
      routes: ['A', 'B'],
      artifactId: `a${i}`,
      summary: 'summary',
    }))
    const ctx = buildContextMessages('objective', history, 'standard', 'A\nB')
    expect(ctx.estTokens).toBeLessThanOrEqual(CONTEXT_BUDGET)
    expect(ctx.compacted).toBe(true)
  })
})
