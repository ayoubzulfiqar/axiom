import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runMission, isUsingFallback, destroy } from '../src/engine/client'

describe('worker client', () => {
  beforeEach(() => {
    destroy()
    vi.clearAllTimers()
  })

  it('falls back when Worker is unavailable', async () => {
    const originalWorker = globalThis.Worker
    ;(globalThis as any).Worker = undefined
    expect(isUsingFallback()).toBe(false)
    await runMission({ id: 'm1', objective: 'fallback mission' })
    expect(isUsingFallback()).toBe(true)
    ;(globalThis as any).Worker = originalWorker
  })
})
