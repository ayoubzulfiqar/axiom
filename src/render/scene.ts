export interface SceneState {
  zoom: number
  panX: number
  panY: number
  width: number
  height: number
  dpr: number
  time: number
}

export function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  return dpr
}

export function applyCamera(ctx: CanvasRenderingContext2D, s: SceneState) {
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
  ctx.translate(s.panX, s.panY)
  ctx.scale(s.zoom, s.zoom)
}

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgb(255 255 255 / .04)'
  ctx.lineWidth = 1
  const gap = 58
  for (let x = 0; x < w; x += gap) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += gap) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

export function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgb(255 255 255 / .06)'
  for (let i = 0; i < 40; i++) {
    const seed = i * 7919
    const x = ((seed * 13) % w)
    const y = (((seed * 7 + t * 0.01) % h + h) % h)
    ctx.beginPath()
    ctx.arc(x, y, 1, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, 'rgb(6 6 7 / .85)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}
