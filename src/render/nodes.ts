import type { Graph } from '../engine/graph'
import type { SceneState } from './scene'

export function drawNodes(
  cx: CanvasRenderingContext2D,
  g: Graph,
  s: SceneState,
  selectedId: string | null,
  time: number
) {
  const w = s.width / s.dpr
  const h = s.height / s.dpr
  for (const n of g.nodes.values()) {
    const x = n.x * w
    const y = n.y * h
    const r = (n.radius + 0.014) * Math.min(w, h)

    const birthAge = Math.min(time / 680, 1)
    if (birthAge < 1) {
      const scale = easeOutBack(birthAge)
      cx.save()
      cx.globalAlpha = 1 - birthAge
      cx.strokeStyle = 'rgb(255 255 255 / .35)'
      cx.lineWidth = 1.5
      cx.beginPath()
      cx.arc(x, y, r * (1 + (1 - scale) * 0.6), 0, Math.PI * 2)
      cx.stroke()
      cx.restore()
    }

    if (n.state === 'running') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.004)
      const halo = r * (1.4 + pulse * 0.3)
      const grad = cx.createRadialGradient(x, y, r * 0.6, x, y, halo)
      grad.addColorStop(0, 'rgb(255 255 255 / .2)')
      grad.addColorStop(1, 'transparent')
      cx.fillStyle = grad
      cx.beginPath()
      cx.arc(x, y, halo, 0, Math.PI * 2)
      cx.fill()
    }

    const alpha = n.state === 'done' ? 1 : n.state === 'fault' ? 0.6 : 0.9
    cx.fillStyle = `rgb(255 255 255 / ${alpha})`
    cx.beginPath()
    cx.arc(x, y, r, 0, Math.PI * 2)
    cx.fill()

    cx.fillStyle = 'rgb(6 6 7)'
    cx.font = `600 ${Math.max(10, r * 0.9)}px var(--font-mono)`
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    cx.fillText(n.id.slice(0, 2), x, y)

    if (n.id === selectedId) {
      const b = r + 8
      const len = 8
      cx.strokeStyle = 'rgb(255 255 255)'
      cx.lineWidth = 2
      cx.beginPath()
      cx.moveTo(x - b, y - b + len)
      cx.lineTo(x - b, y - b)
      cx.lineTo(x - b + len, y - b)
      cx.moveTo(x + b - len, y - b)
      cx.lineTo(x + b, y - b)
      cx.lineTo(x + b, y - b + len)
      cx.moveTo(x + b, y + b - len)
      cx.lineTo(x + b, y + b)
      cx.lineTo(x + b - len, y + b)
      cx.moveTo(x + b - len, y + b)
      cx.lineTo(x - b, y + b)
      cx.lineTo(x - b, y + b - len)
      cx.stroke()
    }
  }
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function drawOrchestratorRadar(cx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const cx_ = w / 2
  const cy_ = h / 2
  const radius = 96
  const angle = (time * 0.001) % (Math.PI * 2)
  cx.strokeStyle = 'rgb(255 255 255 / .12)'
  cx.lineWidth = 1
  cx.beginPath()
  cx.arc(cx_, cy_, radius, 0, Math.PI * 2)
  cx.stroke()
  const grad = cx.createLinearGradient(cx_ - radius, cy_ - radius, cx_ + radius, cy_ + radius)
  grad.addColorStop(0, 'rgb(255 255 255 / .25)')
  grad.addColorStop(1, 'transparent')
  cx.fillStyle = grad
  cx.beginPath()
  cx.moveTo(cx_, cy_)
  cx.arc(cx_, cy_, radius, angle, angle + 1.2)
  cx.closePath()
  cx.fill()
}

export function drawDoneGlyph(cx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const cx_ = w / 2
  const cy_ = h / 2
  const s = 14
  cx.strokeStyle = 'rgb(255 255 255 / .7)'
  cx.lineWidth = 2
  cx.lineCap = 'round'
  const progress = Math.min(time / 400, 1)
  cx.beginPath()
  cx.moveTo(cx_ - s, cy_)
  cx.lineTo(cx_ - 2, cy_ + s)
  cx.stroke()
  const endX = cx_ - 2 + (cx_ + s - (cx_ - 2)) * progress
  const endY = cy_ + s + ((cy_ - 6) - (cy_ + s)) * progress
  cx.beginPath()
  cx.moveTo(cx_ - 2, cy_ + s)
  cx.lineTo(endX, endY)
  cx.stroke()
}
