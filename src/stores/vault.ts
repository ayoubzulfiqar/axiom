import { create } from 'zustand'
import bus from '../engine/bus'

export interface VaultState {
  connected: boolean
  maskedKey: string
  balance: { usage: number; limit: number; label: string } | null
  error: string | null
  vaultOpen: boolean
  setKey: (k: string, sessionOnly: boolean) => void
  verifyKey: () => Promise<void>
  clearKey: () => void
  setVaultOpen: (v: boolean) => void
}

export const useVaultStore = create<VaultState>((set) => ({
  connected: false,
  maskedKey: '',
  balance: null,
  error: null,
  vaultOpen: false,
  setKey(k: string, sessionOnly: boolean) {
    const storage = sessionOnly ? sessionStorage : localStorage
    storage.setItem('axiom.key', k)
    set({ maskedKey: maskKey(k), connected: false, error: null, balance: null })
  },
  async verifyKey() {
    const k = localStorage.getItem('axiom.key') ?? sessionStorage.getItem('axiom.key') ?? ''
    if (!k) {
      set({ error: 'AUTH no key provided' })
      return
    }
    set({ maskedKey: maskKey(k), error: null })
    try {
      const base = (import.meta.env.VITE_API_BASE ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
      const res = await fetch(`${base}/key`, {
        headers: {
          Authorization: `Bearer ${k}`,
          'HTTP-Referer': typeof location !== 'undefined' ? location.origin : '',
          'X-Title': 'AXIOM Orchestration',
        },
      })
      if (!res.ok) {
        const msg = await res.text()
        set({ connected: false, error: msg || `HTTP ${res.status}` })
        localStorage.removeItem('axiom.key')
        sessionStorage.removeItem('axiom.key')
        set({ maskedKey: '' })
        return
      }
      const data = await res.json()
      const balance = data.data as { usage: number; limit: number; label: string }
      set({ connected: true, balance, error: null })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'UNKNOWN'
      set({ connected: false, error: msg })
    }
  },
  clearKey() {
    localStorage.removeItem('axiom.key')
    sessionStorage.removeItem('axiom.key')
    set({ connected: false, maskedKey: '', balance: null, error: null })
  },
  setVaultOpen(v: boolean) {
    set({ vaultOpen: v })
  },
}))

function maskKey(k: string | null): string {
  if (!k) return ''
  if (k.length <= 4) return '••••'
  return '••••' + k.slice(-4)
}

export function bindVaultBus() {
  bus.on(() => {
    // vault unchanged by bus
  })
}
