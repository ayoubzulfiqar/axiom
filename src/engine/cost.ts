export interface ModelPricing {
  prompt: number
  completion: number
}

export interface NodeCost {
  tokens: number
  costUsd: number
  calls: number
}

export interface MissionCost {
  totalCostUsd: number
  byNode: Record<string, NodeCost>
  pricing: Record<string, ModelPricing>
}

let missionCost: MissionCost = {
  totalCostUsd: 0,
  byNode: {},
  pricing: {},
}

export function resetCost() {
  missionCost = {
    totalCostUsd: 0,
    byNode: {},
    pricing: {},
  }
}

export function setPricing(pricing: Record<string, ModelPricing>) {
  missionCost.pricing = { ...pricing }
}

export function recordCall(nodeId: string, modelId: string, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) {
  const rate = missionCost.pricing[modelId]
  let costUsd = 0
  if (rate && typeof usage.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number') {
    costUsd = usage.prompt_tokens * rate.prompt + usage.completion_tokens * rate.completion
  } else if (typeof usage.total_tokens === 'number') {
    const avgRate = rate ? (rate.prompt + rate.completion) / 2 : 0.000002
    costUsd = usage.total_tokens * avgRate
  }

  const prev = missionCost.byNode[nodeId] ?? { tokens: 0, costUsd: 0, calls: 0 }
  const tokens = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? usage.total_tokens ?? 0)
  missionCost.byNode[nodeId] = {
    tokens: prev.tokens + tokens,
    costUsd: prev.costUsd + costUsd,
    calls: prev.calls + 1,
  }
  missionCost.totalCostUsd += costUsd

  return {
    nodeCostUsd: missionCost.byNode[nodeId].costUsd,
    missionCostUsd: missionCost.totalCostUsd,
    nodeTokens: missionCost.byNode[nodeId].tokens,
  }
}

export function getMissionCost() {
  return missionCost
}

export function simulateCost(nodeId: string, modelId: string) {
  const promptTokens = 120 + Math.floor(Math.random() * 80)
  const completionTokens = 40 + Math.floor(Math.random() * 60)
  return recordCall(nodeId, modelId, { prompt_tokens: promptTokens, completion_tokens: completionTokens })
}
