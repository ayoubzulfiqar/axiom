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
  // Worker context: localStorage doesn't exist. Use an injected runtime key if present.
  if (runtimeKey) return runtimeKey
  if (typeof localStorage === 'undefined' && typeof sessionStorage === 'undefined') {
    return runtimeKey
  }
  if (stronghold) return stronghold.readKey()
  return localStorage.getItem(LS_KEY) ?? sessionStorage.getItem(LS_KEY)
}

/**
 * Set the API key directly (e.g. inside a Web Worker, where localStorage is unavailable
 * but the key still needs to reach the engine). `loadKey()` prefers this when set.
 */
export function setRuntimeKey(key: string | null) {
  runtimeKey = key ?? ''
}

let runtimeKey = ''

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
    try { await stronghold.writeKey('') } catch { }
    return
  }
  localStorage.removeItem(LS_KEY)
  sessionStorage.removeItem(LS_KEY)
}

/**
 * Persist the key as session-only (used to inject a build-time key, e.g. a CI/local
 * `.env.local` value) so the engine can pick it up via `loadKey()`.
 */
export async function saveKey(apiKey: string, sessionOnly = true) {
  await storeKey(apiKey, sessionOnly)
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

export async function budgetAvailable(apiKey: string): Promise<{ ok: boolean; label?: string; usage?: number; limit?: number; reason?: string }> {
  try {
    const base = API_BASE
    const res = await fetch(`${base}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12000),
    } as any)
    if (res.status === 401) {
      // Invalid/revoked key: surface it so the user gets a clear signal instead of a
      // later, harder-to-diagnose 401 on every agent call.
      return { ok: false, reason: 'invalid-key' }
    }
    if (!res.ok) return { ok: true, reason: `key-check-${res.status}` }
    const data = (await res.json()) as { data?: { usage?: number; limit?: number; is_free_tier?: boolean }; label?: string }
    const usage = Number(data?.data?.usage ?? 0)
    const limit = Number(data?.data?.limit ?? 0)
    if (limit > 0 && usage >= limit - 0.05) {
      return { ok: false, label: data?.label ?? 'KEY', usage, limit, reason: 'budget-exhausted' }
    }
    return { ok: true, label: data?.label ?? 'KEY', usage, limit }
  } catch {
    // Network error reaching the key endpoint: don't block the mission on it, but flag
    // why we couldn't verify (callers can choose to warn rather than hard-fail).
    return { ok: true, reason: 'key-check-unreachable' }
  }
}
