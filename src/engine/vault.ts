const LS_KEY = 'axiom.key'
const LS_SESSION = 'axiom.session'
const LS_SPEED = 'axiom.speed'
const LS_OVERRIDES = 'axiom.overrides'

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://openrouter.ai/api/v1'

export function loadKey(): string | null {
  return localStorage.getItem(LS_KEY) ?? sessionStorage.getItem(LS_KEY)
}

export function storeKey(apiKey: string, sessionOnly: boolean) {
  const storage = sessionOnly ? sessionStorage : localStorage
  storage.setItem(LS_KEY, apiKey)
}

export function clearKey() {
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
