export type ThemeMode = 'dark' | 'light'

/** Canvas palette — mirrors the shadcn token set so the graph matches the UI in both themes. */
export const PALETTE: Record<ThemeMode, {
  grid: string
  dust: string
  vignette: string
  text: string
  idle: string
  idleRing: string
  running: string
  runningRing: string
  runningGlow: string
  done: string
  doneRing: string
  doneGlow: string
  fault: string
  faultRing: string
  faultGlow: string
  core: string
  edge: string
  edgeActive: string
  radar: string
  dotGrid: string
}> = {
  dark: {
    grid: 'rgb(255 255 255 / 0.045)',
    dust: 'rgb(255 255 255 / 0.06)',
    vignette: 'rgba(0,0,0,0.82)',
    text: '#ededed',
    // monochrome node states — differentiated by brightness/opacity, not hue
    idle: 'rgba(255,255,255,0.40)',
    idleRing: 'rgba(255,255,255,0.20)',
    running: 'rgba(255,255,255,0.98)',
    runningRing: 'rgba(255,255,255,0.92)',
    runningGlow: 'rgba(255,255,255,0.55)',
    done: 'rgba(255,255,255,0.78)',
    doneRing: 'rgba(255,255,255,0.70)',
    doneGlow: 'rgba(255,255,255,0.35)',
    fault: 'rgba(220,220,220,0.92)',
    faultRing: 'rgba(200,200,200,0.85)',
    faultGlow: 'rgba(255,255,255,0.40)',
    core: 'rgba(255,255,255,0.92)',
    edge: 'rgba(255,255,255,0.16)',
    edgeActive: 'rgba(255,255,255,0.55)',
    radar: 'rgba(255,255,255,0.45)',
    dotGrid: 'rgba(255,255,255,0.05)',
  },
  light: {
    grid: 'rgb(0 0 0 / 0.05)',
    dust: 'rgb(0 0 0 / 0.06)',
    vignette: 'rgba(0,0,0,0.10)',
    text: '#1a1a1a',
    idle: 'rgba(0,0,0,0.32)',
    idleRing: 'rgba(0,0,0,0.16)',
    running: 'rgba(0,0,0,0.95)',
    runningRing: 'rgba(0,0,0,0.88)',
    runningGlow: 'rgba(0,0,0,0.30)',
    done: 'rgba(0,0,0,0.72)',
    doneRing: 'rgba(0,0,0,0.62)',
    doneGlow: 'rgba(0,0,0,0.22)',
    fault: 'rgba(40,40,40,0.85)',
    faultRing: 'rgba(60,60,60,0.8)',
    faultGlow: 'rgba(0,0,0,0.25)',
    core: 'rgba(0,0,0,0.82)',
    edge: 'rgba(0,0,0,0.18)',
    edgeActive: 'rgba(0,0,0,0.5)',
    radar: 'rgba(0,0,0,0.4)',
    dotGrid: 'rgba(0,0,0,0.05)',
  },
}

export function resolveTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
