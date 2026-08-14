const LS_KEY = 'axiom.key'
const LS_SESSION = 'axiom.session'
const LS_SPEED = 'axiom.speed'
const LS_OVERRIDES = 'axiom.overrides'

export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')

let stronghold: { writeKey: (key: string) => Promise<void>; readKey: () => Promise<string | null> } | null = null

export async function initStronghold() {
  if (typeof window === 'undefined') return
  const tauri = (window as any).__TAURI__
  if (!tauri) return
  try {
    const plugin = await (tauri as any).plugin.stronghold
    stronghold = {
      writeKey: async (key: string) => plugin.write('api-key', key),
      readKey: async () => plugin.read('api-key'),
    }
  } catch {
    stronghold = null
  }
}

export async function loadKey(): Promise<string | null> {
  if (stronghold) return stronghold.readKey()
  return localStorage.getItem(LS_KEY) ?? sessionStorage.getItem(LS_KEY)
}

export async function storeKey(apiKey: string, sessionOnly: boolean) {
  if (stronghold) {
    await stronghold.writeKey(apiKey)
    return
  }
  const storage = sessionOnly ? sessionStorage : localStorage
  storage.setItem(LS_KEY, apiKey)
}

export async function clearKey() {
  if (stronghold) {
    try { await stronghold.writeKey('') } catch {}
    return
  }
  localStorage.removeItem(LS_KEY)
  sessionStorage.removeItem(LS_KEY)
}

export function maskKey(k: string | null): string {
  if (!k) return ''
  if (k.length <= 4) return '••••'
  return '••••' + k.slice(-4)
}

export function saveModelOverrides(overrides: Record<string, string>) {
  try {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(overrides))
  } catch {}
}

export function loadModelOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_OVERRIDES)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveSpeed(speed: 1 | 2 | 4) {
  try {
    localStorage.setItem(LS_SPEED, String(speed))
  } catch {}
}

export function loadSpeed(): 1 | 2 | 4 {
  const raw = localStorage.getItem(LS_SPEED)
  if (raw === '2' || raw === '4') return Number(raw) as 1 | 2 | 4
  return 1
}

export function saveSessionOnly(flag: boolean) {
  try {
    sessionStorage.setItem(LS_SESSION, flag ? '1' : '0')
  } catch {}
}

export function loadSessionOnly(): boolean {
  return sessionStorage.getItem(LS_SESSION) === '1'
}

export async function budgetAvailable(apiKey: string): Promise<{ ok: boolean; label?: string; usage?: number; limit?: number }> {
  try {
    const base = API_BASE
    const res = await fetch(`${base}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12000),
    } as any)
    if (!res.ok) return { ok: true }
    const data = (await res.json()) as { data?: { usage?: number; limit?: number; is_free_tier?: boolean }; label?: string }
    const usage = Number(data?.data?.usage ?? 0)
    const limit = Number(data?.data?.limit ?? 0)
    if (limit > 0 && usage >= limit - 0.05) {
      return { ok: false, label: data?.label ?? 'KEY', usage, limit }
    }
    return { ok: true, label: data?.label ?? 'KEY', usage, limit }
  } catch {
    return { ok: true }
  }
}
