import { describe, it, expect } from 'vitest'
import { getDefs, initDefs } from '../src/engine/agents'
import { resolvePolicy, emitPolicyApplied } from '../src/engine/policies'

describe('policies', () => {
  beforeEach(() => {
    initDefs()
  })

  it('auth => stop', () => {
    const r = resolvePolicy('AGENT-00', 'auth', '401')
    expect(r.policy).toBe('stop')
  })

  it('credits => stop', () => {
    const r = resolvePolicy('AGENT-00', 'credits', '402')
    expect(r.policy).toBe('stop')
  })

  it('schema => repair', () => {
    const r = resolvePolicy('AGENT-01', 'schema', 'validation')
    expect(r.policy).toBe('repair')
  })

  it('transient => retry', () => {
    const r = resolvePolicy('AGENT-01', 'transient', '429')
    expect(r.policy).toBe('retry')
  })

  it('escalate => escalate', () => {
    const r = resolvePolicy('AGENT-00', 'escalate', 'manual')
    expect(r.policy).toBe('escalate')
  })

  it('unavailable with fallbackModel => fallback', () => {
    const criticId = getDefs().find((d) => d.role === 'critic')?.id ?? 'AGENT-04'
    const r = resolvePolicy(criticId, 'unavailable', 'model offline')
    expect(r.policy).toBe('fallback')
  })

  it('emitPolicyApplied emits bus event', async () => {
    const events: any[] = []
    const unsub = await import('../src/engine/bus').then(m => m.default.on((ev: any) => events.push(ev)))
    emitPolicyApplied('AGENT-00', 'stop', '401')
    unsub()
    expect(events).toEqual([{ type: 'policy-applied', agent: 'AGENT-00', policy: 'stop', detail: '401' }])
  })
})
