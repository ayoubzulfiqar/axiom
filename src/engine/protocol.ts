import { z } from 'zod'

export const PlanSchema = z.object({
  thought: z.string(),
  dispatch: z
    .array(z.object({ agent: z.string(), task: z.string() }))
    .max(3),
  final: z.string().nullable(),
  merge: z.boolean().optional(),
})

export type Plan = z.infer<typeof PlanSchema>

export function extractFirstObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

export function parsePlan(raw: string): { ok: boolean; plan: Plan; error?: string } {
  const trimmed = raw.trim()
  // strip fences
  let candidate = trimmed
  if (candidate.startsWith('```')) {
    const firstNL = candidate.indexOf('\n')
    const lastFence = candidate.lastIndexOf('```')
    candidate = candidate.slice(firstNL >= 0 ? firstNL + 1 : 3, lastFence >= 0 ? lastFence : undefined).trim()
  }
  const objStr = extractFirstObject(candidate)
  if (!objStr) {
    return { ok: false, plan: {} as Plan, error: 'no JSON object found' }
  }
  const parsed = PlanSchema.safeParse(JSON.parse(objStr))
  if (parsed.success) return { ok: true, plan: parsed.data }
  return { ok: false, plan: {} as Plan, error: parsed.error.message }
}
