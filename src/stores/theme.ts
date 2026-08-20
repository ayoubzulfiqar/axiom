import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const KEY = 'axiom.theme'

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

function initial(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const saved = localStorage.getItem(KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  // default to dark for the console aesthetic
  return 'dark'
}

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const start = initial()
  apply(start)
  return {
    theme: start,
    toggle: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark'
      apply(next)
      localStorage.setItem(KEY, next)
      set({ theme: next })
    },
    set: (t) => {
      apply(t)
      localStorage.setItem(KEY, t)
      set({ theme: t })
    },
  }
})

export function initTheme() {
  const start = initial()
  apply(start)
  useThemeStore.setState({ theme: start })
}
