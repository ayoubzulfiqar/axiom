import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bus from '../src/engine/bus'
import { initDefs } from '../src/engine/agents'
import { abortAll } from '../src/engine/orchestrator'

beforeEach(() => {
  abortAll()
  initDefs()
  bus.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  abortAll()
})

function setupEnv() {
  ;(globalThis as any).location = { origin: 'http://localhost' }
  const storage: Record<string, string> = {}
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v },
    removeItem: (k: string) => { delete storage[k] },
  }
  localStorage.setItem('axiom.key', 'sk-test')
}

describe('bus contract', () => {
  it('emits mission-start with objective', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'mission-start', objective: 'AXIOM' })
    unsub()
    expect(events).toEqual([{ type: 'mission-start', objective: 'AXIOM' }])
  })

  it('emits plan-step', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'plan-step', n: 1, total: 3, thought: 'ok' })
    unsub()
    expect(events).toEqual([{ type: 'plan-step', n: 1, total: 3, thought: 'ok' }])
  })

  it('emits dispatch with tag', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'dispatch', from: 'A', to: 'B', tag: 'T1' })
    unsub()
    expect(events).toEqual([{ type: 'dispatch', from: 'A', to: 'B', tag: 'T1' }])
  })

  it('emits token', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'token', agent: 'R1', text: 'hello' })
    unsub()
    expect(events).toEqual([{ type: 'token', agent: 'R1', text: 'hello' }])
  })

  it('emits agent-done', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'agent-done', agent: 'R1' })
    unsub()
    expect(events).toEqual([{ type: 'agent-done', agent: 'R1' }])
  })

  it('emits mission-complete', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'mission-complete', final: 'result' })
    unsub()
    expect(events).toEqual([{ type: 'mission-complete', final: 'result' }])
  })

  it('emits fault', async () => {
    const events: any[] = []
    const unsub = bus.on((ev) => events.push(ev))
    bus.emit({ type: 'fault', agent: 'orchestrator', error: 'FAIL' })
    unsub()
    expect(events).toEqual([{ type: 'fault', agent: 'orchestrator', error: 'FAIL' }])
  })

  it('supports multiple listeners and clear', async () => {
    const a: any[] = []
    const b: any[] = []
    const u1 = bus.on((ev) => a.push(ev))
    const u2 = bus.on((ev) => b.push(ev))
    bus.emit({ type: 'mission-start', objective: 'X' })
    bus.clear()
    bus.emit({ type: 'mission-start', objective: 'Y' })
    u1()
    u2()
    expect(a).toEqual([{ type: 'mission-start', objective: 'X' }])
    expect(b).toEqual([{ type: 'mission-start', objective: 'X' }])
  })
})
