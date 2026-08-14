import { create } from 'zustand'
import bus from '../engine/bus'
import { loadKey, maskKey, clearKey, saveModelOverrides, storeKey } from '../engine/vault'

export interface VaultState {
  connected: boolean
  maskedKey: string
  balance: { usage: number; limit: number; label: string } | null
  vaultOpen: boolean
  setVaultOpen: (v: boolean) => void
}

export const useVaultStore = create<VaultState>((set) => ({
  connected: false,
  maskedKey: '',
  balance: null,
  vaultOpen: false,
  setVaultOpen: (v) => set({ vaultOpen: v }),
}))

bus.on(async () => {
  const key = await loadKey()
  if (key) {
    useVaultStore.setState({ connected: true, maskedKey: maskKey(key) })
  } else {
    useVaultStore.setState({ connected: false, maskedKey: '', balance: null })
  }
})

export async function connectKey(raw: string, sessionOnly: boolean) {
  const trimmed = raw.trim()
  if (!trimmed) return
  await clearKey()
  await storeKey(trimmed, sessionOnly)
  useVaultStore.setState({ connected: true, maskedKey: maskKey(trimmed), vaultOpen: false })
}

export function disconnectKey() {
  clearKey()
  useVaultStore.setState({ connected: false, maskedKey: '', balance: null })
}

export function applyOverrides(overrides: Record<string, string>) {
  saveModelOverrides(overrides)
}
