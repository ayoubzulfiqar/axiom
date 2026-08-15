import { z } from 'zod'
import bus from './bus'
import type { ArtifactRecord } from './types'

const SUMMARY_MAX = 500

const SchemaResearcher = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      source_url: z.string().url().optional().or(z.literal('')),
      confidence: z.enum(['high', 'medium', 'low']),
    }),
  ),
})

const SchemaAnalyst = z.object({
  findings: z.array(z.string()),
  metrics: z.record(z.string()).optional(),
  conclusion: z.string(),
})

export const SchemaWriter = z.object({
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
})

export const SchemaCritic = z.object({
  verdict: z.enum(['pass', 'fail']),
  issues: z.array(z.string()),
})

export const AGENT_OUTPUT_SCHEMAS: Record<string, z.ZodType<any>> = {
  researcher: SchemaResearcher,
  analyst: SchemaAnalyst,
  writer: SchemaWriter,
  critic: SchemaCritic,
}

export function schemaForRole(role: string): z.ZodType<any> {
  return AGENT_OUTPUT_SCHEMAS[role] ?? z.any()
}

export function truncateSummary(text: string): string {
  if (text.length <= SUMMARY_MAX) return text
  return text.slice(0, SUMMARY_MAX - 3).trimEnd() + '...'
}

export function structuredSummaryForRole(role: string, raw: string): { summary: string; structured: unknown } {
  const schema = schemaForRole(role)
  const trimmed = raw.trim()
  const parsed = safeParseWithRepair(schema, trimmed)
  if (parsed.ok) {
    const pretty = JSON.stringify(parsed.data)
    return { summary: truncateSummary(pretty), structured: parsed.data }
  }
  const fallback = truncateSummary(trimmed)
  return { summary: fallback, structured: null }
}

export function safeParseWithRepair(schema: z.ZodType<any>, raw: string): { ok: boolean; data?: any; error?: string } {
  let candidate = raw.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    candidate = candidate.slice(start, end + 1)
  }
  let parsedObj: any
  try {
    parsedObj = JSON.parse(candidate)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  const first = schema.safeParse(parsedObj)
  if (first.success) return { ok: true, data: first.data }

  // attempt repair: wrap unlabeled arrays into expected shape for known schemas
  let repaired = parsedObj
  try {
    if (Array.isArray(repaired) && repaired.length > 0 && schema === SchemaWriter) {
      repaired = { sections: repaired }
    } else if (Array.isArray(repaired) && repaired.length > 0 && schema === SchemaCritic) {
      repaired = { verdict: repaired[0]?.verdict ? 'pass' : 'fail', issues: repaired.map((x: any) => x?.issue ?? String(x)) }
    } else if (Array.isArray(repaired) && repaired.length > 0 && schema === SchemaResearcher) {
      repaired = { claims: repaired.map((x: any) => ({ claim: x?.claim ?? String(x), confidence: x?.confidence ?? 'medium' })) }
    } else if (typeof repaired === 'string') {
      repaired = { sections: [{ heading: 'Output', body: repaired }] }
    } else {
      repaired = { ...repaired }
    }
  } catch {
    repaired = { sections: [{ heading: 'Raw', body: raw.slice(0, 200) }] }
  }

  const second = schema.safeParse(repaired)
  if (second.success) return { ok: true, data: second.data }
  return { ok: false, error: second.error.message }
}

export function validateArtifact(record: ArtifactRecord): { ok: boolean; error?: string } {
  if (!record.id || !record.missionId || !record.nodeId) return { ok: false, error: 'missing identifiers' }
  if (record.kind.length === 0 || record.summary.length === 0) return { ok: false, error: 'empty kind/summary' }
  if (record.summary.length > 1000) return { ok: false, error: 'summary too long' }
  return { ok: true }
}

export function emitArtifactStored(id: string, agent: string, kind: string, summary: string) {
  bus.emit({ type: 'artifact-stored', id, agent, kind, summary })
}
