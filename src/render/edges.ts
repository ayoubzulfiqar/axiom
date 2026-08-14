import type { Graph } from '../engine/graph'
import type { SceneState } from './scene'

export function drawEdges(
  cx: CanvasRenderingContext2D,
  g: Graph,
  s: SceneState,
  time: number
) {
  const w = s.width / s.dpr
  const h = s.height / s.dpr
  for (const e of g.edges) {
    const a = g.nodes.get(e.from)
    const b = g.nodes.get(e.to)
    if (!a || !b) continue
    const x1 = a.x * w
    const y1 = a.y * h
    const x2 = b.x * w
    const y2 = b.y * h
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2 - 40
    const alpha = Math.min(e.progress, 1) * 0.35
    cx.strokeStyle = `rgb(255 255 255 / ${alpha})`
    cx.lineWidth = 1
    cx.setLineDash([4, 6])
    cx.lineDashOffset = -time * 0.02
    cx.beginPath()
    cx.moveTo(x1, y1)
    cx.quadraticCurveTo(mx, my, x2, y2)
    cx.stroke()
    cx.setLineDash([])
    cx.lineDashOffset = 0
    if (e.progress > 0) {
      const t = e.progress
      const px = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2
      const py = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t ** 2 * y2
      cx.fillStyle = 'rgb(255 255 255 / .9)'
      cx.beginPath()
      cx.arc(px, py, 3, 0, Math.PI * 2)
      cx.fill()
      for (let i = 1; i <= 6; i++) {
        const tt = Math.max(0, t - i * 0.018)
        const tx = (1 - tt) ** 2 * x1 + 2 * (1 - tt) * tt * mx + tt ** 2 * x2
        const ty = (1 - tt) ** 2 * y1 + 2 * (1 - tt) * tt * my + tt ** 2 * y2
        cx.fillStyle = `rgb(255 255 255 / ${0.3 - i * 0.04})`
        cx.beginPath()
        cx.arc(tx, ty, 2 - i * 0.2, 0, Math.PI * 2)
        cx.fill()
      }
      if (e.progress >= 1) {
        cx.fillStyle = 'rgb(255 255 255 / .4)'
        cx.beginPath()
        cx.arc(x2, y2, 10, 0, Math.PI * 2)
        cx.fill()
      }
    }
  }
}
