import { create } from 'zustand'

export type Speed = 1 | 2 | 4

export interface SettingsState {
  speed: Speed
  reducedMotion: boolean
  setSpeed: (s: Speed) => void
  toggleReducedMotion: () => void
}

const savedSpeed = (() => {
  try {
    const raw = localStorage.getItem('axiom.speed')
    if (raw === '2' || raw === '4') return Number(raw) as Speed
  } catch {}
  return 1
})()

export const useSettingsStore = create<SettingsState>((set) => ({
  speed: savedSpeed,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  setSpeed(s: Speed) {
    try {
      localStorage.setItem('axiom.speed', String(s))
    } catch {}
    set({ speed: s })
  },
  toggleReducedMotion() {
    set((s) => ({ reducedMotion: !s.reducedMotion }))
  },
}))
