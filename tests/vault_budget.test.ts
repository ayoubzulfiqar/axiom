import { describe, it, expect, vi, afterEach } from 'vitest'

// Failure-signal audit: budgetAvailable must NOT swallow a bad key as "ok".
// A 401 must surface as ok:false (invalid-key) so the user gets a clear signal
// instead of a later per-agent 401; a network error should not hard-block.
describe('budgetAvailable failure signals', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok:false with reason invalid-key on HTTP 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 }) as any))
    const { budgetAvailable } = await import('../src/engine/vault')
    const r = await budgetAvailable('sk-bad')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid-key')
  })

  it('treats network/unreachable errors as ok:true (non-blocking) with a reason', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const { budgetAvailable } = await import('../src/engine/vault')
    const r = await budgetAvailable('sk-good')
    expect(r.ok).toBe(true)
    expect(r.reason).toBe('key-check-unreachable')
  })

  it('flags exhausted budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: { usage: 10, limit: 10, is_free_tier: true } }), { status: 200 }) as any),
    )
    const { budgetAvailable } = await import('../src/engine/vault')
    const r = await budgetAvailable('sk-good')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('budget-exhausted')
  })
})
