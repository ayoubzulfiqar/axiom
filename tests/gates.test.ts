import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initDefs } from '../src/engine/agents'
import { runFinalGate, runFreshCritic, buildJury } from '../src/engine/gates'

const mockWorkerStream = vi.fn(async (opts: any) => {
  opts.onChunk?.({ textDelta: '{"verdict":"pass","issues":[]}' })
  return { text: '{"verdict":"pass","issues":[]}' }
})

describe('gates', () => {
  beforeEach(() => {
    initDefs()
    vi.clearAllMocks()
  })

  it('fails empty content', async () => {
    const res = await runFinalGate({ id: '1', nodeId: 'n', kind: 'raw', summary: 'short', content: '' }, [])
    expect(res.verdict).toBe('verified:false')
    expect(res.issues).toContain('empty-content')
  })

  it('passes valid non-empty content with fresh critic context', async () => {
    const res = await runFinalGate(
      { id: '1', nodeId: 'n', kind: 'raw', summary: 'summary', content: 'hello world' },
      [],
      { objective: 'test objective', workerStreamFn: mockWorkerStream }
    )
    expect(res.verdict).toBe('pass')
    expect(mockWorkerStream).toHaveBeenCalledTimes(1)
    const callArgs = mockWorkerStream.mock.calls[0][0]
    expect(callArgs.user).toContain('Artifact ID: 1')
    expect(callArgs.user).toContain('Objective: test objective')
  })

  it('returns issues when present', async () => {
    const res = await runFinalGate(
      { id: '1', nodeId: 'n', kind: 'raw', summary: 'summary', content: 'ok' },
      [],
      { workerStreamFn: mockWorkerStream }
    )
    expect(res.verdict).toBe('pass')
  })

  it('jury mode majority vote passes with 2/3', async () => {
    const base = { id: 'CRITIC', label: 'CRITIC', model: 'x', system: 's', outputSchema: null }
    const jury = buildJury(base)
    const results = []
    for (let i = 0; i < jury.length; i++) {
      const fn = i === 2
        ? vi.fn(async () => ({ text: '{"verdict":"fail","issues":["bad"]}' }))
        : mockWorkerStream
      const verdict = await runFreshCritic(
        jury[i],
        { id: '1', nodeId: 'n', kind: 'raw', summary: 's', content: 'ok' },
        undefined,
        undefined,
        fn as any
      )
      results.push(verdict)
    }
    const passCount = results.filter((r) => r.verdict === 'pass').length
    expect(passCount).toBe(2)
  })

  it('fresh context critic has message length 2', async () => {
    const mock = vi.fn(async (opts: any) => {
      opts.onChunk?.({ textDelta: '{"verdict":"pass","issues":[]}' })
      return { text: '{"verdict":"pass","issues":[]}' }
    })
    await runFreshCritic(
      { id: 'C1', label: 'CRITIC', model: 'm', system: 'You are a critic.' },
      { id: 'a1', nodeId: 'n', kind: 'raw', summary: 's', content: 'hello' },
      'objective text',
      undefined,
      mock
    )
    expect(mock).toHaveBeenCalledTimes(1)
    const callArgs = mock.mock.calls[0][0]
    expect(callArgs.user).toContain('Artifact ID: a1')
    expect(callArgs.user).toContain('Objective: objective text')
  })
})
