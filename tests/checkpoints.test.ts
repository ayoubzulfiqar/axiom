import { describe, it, expect } from 'vitest'
import { upsertCheckpoint, loadCheckpoint, clearCheckpoint } from '../src/engine/checkpoints'

describe('checkpoints', () => {
  it('writes and loads a checkpoint', async () => {
    const now = Date.now()
    const cp = {
      missionId: 'm1',
      status: 'running' as const,
      currentStep: 2,
      completedNodes: ['A', 'B'],
      decisions: [{ step: 1, thought: 't', routes: ['A'] }],
      artifactIds: ['a1'],
      budgets: { stepsUsed: 1, tokensUsed: 10, fullReads: 0 },
      updatedAt: now,
    }
    await upsertCheckpoint(cp)
    const loaded = loadCheckpoint('m1')
    expect(loaded?.missionId).toBe('m1')
    expect(loaded?.currentStep).toBe(2)
    await clearCheckpoint('m1')
    expect(loadCheckpoint('m1')).toBeNull()
  })
})
