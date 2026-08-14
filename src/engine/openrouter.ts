export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'https://openrouter.ai/api/v1'

export function createRawHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': typeof location !== 'undefined' ? location.origin : '',
    'X-Title': 'AXIOM Orchestration',
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 120_000, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function mapError(res: Response): Promise<string> {
  const code = res.status
  if (code === 401) return 'AUTH invalid API key'
  if (code === 402) return 'CREDITS balance too low'
  if (code === 429) return 'RATE limit exceeded'
  let msg = ''
  try {
    const body = await res.clone().json()
    msg = (body?.error?.message as string) ?? ''
  } catch {
    msg = await res.text()
  }
  if (msg.length > 120) msg = msg.slice(0, 120) + '...'
  return msg || `ERROR ${code}`
}
