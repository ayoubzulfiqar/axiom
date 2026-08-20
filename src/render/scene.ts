import { PALETTE, type ThemeMode } from './palette'

export interface SceneState {
  zoom: number
  panX: number
  panY: number
  width: number
  height: number
  dpr: number
  time: number
  /** world->screen scale so the whole graph fits the canvas */
  worldFit: number
}

export function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  return dpr
}

/** Maps world coords -> centered, auto-fit canvas. worldFit = scale to fit graph. */
export function applyCamera(ctx: CanvasRenderingContext2D, s: SceneState) {
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
  const cssW = s.width / s.dpr
  const cssH = s.height / s.dpr
  ctx.translate(cssW / 2 + s.panX, cssH / 2 + s.panY)
  ctx.scale(s.zoom * s.worldFit, s.zoom * s.worldFit)
}

/** Soft dot grid — calm, modern, doesn't fight the nodes. */
export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ThemeMode) {
  const p = PALETTE[theme]
  const dpr = window.devicePixelRatio || 1
  const gap = 34 * dpr
  const cw = w / 2
  const ch = h / 2
  ctx.fillStyle = p.dotGrid
  const r = 1.1 * dpr
  for (let x = -cw; x <= cw; x += gap) {
    for (let y = -ch; y <= ch; y += gap) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Slow drifting ambient motes for depth (kept very subtle). */
export function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, theme: ThemeMode) {
  const p = PALETTE[theme]
  ctx.fillStyle = p.dust
  const cw = w / 2
  const ch = h / 2
  for (let i = 0; i < 36; i++) {
    const seed = i * 7919
    const x = (((seed * 13) % w) - cw)
    const y = (((seed * 7 + t * 0.006) % h + h) % h - ch)
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 1400 + i)
    ctx.beginPath()
    ctx.arc(x, y, 1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Soft radial core glow at the center — the mind-map anchor. */
export function drawCoreGlow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, theme: ThemeMode) {
  const cw = w / 2
  const ch = h / 2
  const pulse = 0.5 + Math.sin(t / 2600) * 0.12
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.min(cw, ch) * 0.85)
  grad.addColorStop(0, theme === 'dark' ? `rgba(127,180,255,${0.08 * pulse})` : `rgba(47,123,255,${0.05 * pulse})`)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(-cw, -ch, w, h)
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ThemeMode) {
  const p = PALETTE[theme]
  const cw = w / 2
  const ch = h / 2
  const grad = ctx.createRadialGradient(0, 0, Math.min(cw, ch) * 0.6, 0, 0, Math.max(cw, ch) * 1.1)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, p.vignette)
  ctx.fillStyle = grad
  ctx.fillRect(-cw, -ch, w, h)
}
