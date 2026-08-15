import { getDef } from './agents'
import type { AgentDef } from './types'
import bus from './bus'

const FALLBACK_POLICIES: Record<string, NonNullable<AgentDef['policy']>> = {
  researcher: { retries: 1, onFail: 'skip' },
  analyst: { retries: 2, onFail: 'retry' },
  writer: { retries: 1, onFail: 'repair' },
  critic: { retries: 2, fallbackModel: 'openai/gpt-4o-mini', onFail: 'fallback' },
  orchestrator: { retries: 0, onFail: 'stop' },
}

export function getPolicyFor(def: AgentDef): NonNullable<AgentDef['policy']> {
  if (def.policy) return def.policy
  return FALLBACK_POLICIES[def.role] ?? { retries: 1, onFail: 'retry' }
}

export type PolicyErrorType = 'transient' | 'auth' | 'credits' | 'schema' | 'unavailable' | 'escalate'

export function resolvePolicy(agent: string, errorType: PolicyErrorType, _detail: string) {
  const def = getDef(agent)
  const policy = def ? getPolicyFor(def) : { retries: 1, onFail: 'retry' as const }
  let chosen: 'retry' | 'stop' | 'repair' | 'escalate' | 'fallback' = 'retry'
  if (errorType === 'auth' || errorType === 'credits') chosen = 'stop'
  else if (errorType === 'schema') chosen = 'repair'
  else if (errorType === 'escalate') chosen = 'escalate'
  else if (errorType === 'unavailable' && policy.fallbackModel) chosen = 'fallback'
  else if (errorType === 'transient') chosen = 'retry'
  return { policy: chosen, fallbackModel: policy.fallbackModel }
}

export function isMissionFault(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : ''
  return msg.includes('AUTH') || msg.includes('BUDGET') || msg.includes('CREDITS')
}

export function errorTypeFor(err: unknown): PolicyErrorType {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('401') || msg.includes('auth')) return 'auth'
  if (msg.includes('402') || msg.includes('credits')) return 'credits'
  if (msg.includes('429') || msg.includes('rate')) return 'transient'
  if (msg.includes('schema') || msg.includes('validation')) return 'schema'
  if (msg.includes('unavailable') || msg.includes('model')) return 'unavailable'
  return 'transient'
}

export function emitPolicyApplied(agent: string, policy: string, detail: string) {
  bus.emit({ type: 'policy-applied', agent, policy, detail })
}
