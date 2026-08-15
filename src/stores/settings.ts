import { create } from 'zustand'

export interface SettingsState {
  speed: 1 | 2 | 4
  reducedMotion: boolean
  approvalRequired: boolean
  setSpeed: (s: 1 | 2 | 4) => void
  setReducedMotion: (v: boolean) => void
  setApprovalRequired: (v: boolean) => void
}

const STORAGE_KEY = 'axiom.settings'

function load(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Partial<SettingsState>
  } catch {
    // ignore
  }
  return {}
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = load()
  return {
    speed: initial.speed ?? 1,
    reducedMotion: initial.reducedMotion ?? false,
    approvalRequired: initial.approvalRequired ?? true,
    setSpeed: (s) => {
      const next = { ...useSettingsStore.getState(), speed: s }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      set({ speed: s })
    },
    setReducedMotion: (v) => {
      const next = { ...useSettingsStore.getState(), reducedMotion: v }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      set({ reducedMotion: v })
    },
    setApprovalRequired: (v) => {
      const next = { ...useSettingsStore.getState(), approvalRequired: v }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      set({ approvalRequired: v })
    },
  }
})
