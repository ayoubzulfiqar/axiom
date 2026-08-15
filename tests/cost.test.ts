import { describe, it, expect, beforeEach } from 'vitest'
import { recordCall, simulateCost, resetCost, setPricing, getMissionCost } from '../src/engine/cost'

describe('cost', () => {
  beforeEach(() => {
    resetCost()
    setPricing({
      'openai/gpt-4o': { prompt: 0.000002, completion: 0.000002 },
    })
  })

  it('records call with per-direction pricing', () => {
    const result = recordCall('n1', 'openai/gpt-4o', { prompt_tokens: 100, completion_tokens: 50 })
    expect(result.nodeCostUsd).toBeCloseTo(0.0003, 6)
    expect(result.missionCostUsd).toBeCloseTo(0.0003, 6)
  })

  it('falls back to total_tokens when per-direction missing', () => {
    const result = recordCall('n1', 'openai/gpt-4o', { total_tokens: 200 })
    expect(result.nodeCostUsd).toBeGreaterThan(0)
  })

  it('uses default average rate when pricing missing', () => {
    resetCost()
    setPricing({})
    const result = recordCall('n1', 'unknown-model', { total_tokens: 1000 })
    expect(result.nodeCostUsd).toBeGreaterThan(0)
  })

  it('accumulates multiple calls', () => {
    recordCall('n1', 'openai/gpt-4o', { prompt_tokens: 100, completion_tokens: 50 })
    const result = recordCall('n1', 'openai/gpt-4o', { prompt_tokens: 50, completion_tokens: 25 })
    expect(result.nodeTokens).toBeGreaterThanOrEqual(160)
    expect(getMissionCost().totalCostUsd).toBeGreaterThan(0)
  })

  it('simulateCost produces deterministic-ish cost entry', () => {
    const result = simulateCost('n1', 'openai/gpt-4o')
    expect(result.nodeCostUsd).toBeGreaterThanOrEqual(0)
    expect(result.missionCostUsd).toBeGreaterThanOrEqual(0)
  })
})
