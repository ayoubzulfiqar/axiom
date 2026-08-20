import type { Graph } from '../engine/graph'
import { edgeReveal } from '../engine/graph'
import type { SceneState } from './scene'
import { PALETTE, type ThemeMode } from './palette'

export function drawEdges(
  cx: CanvasRenderingContext2D,
  g: Graph,
  s: SceneState,
  time: number,
  usedEdges?: Set<string>,
  theme: ThemeMode = 'dark'
) {
  const p = PALETTE[theme]
  const scale = s.zoom * (s.worldFit || 1)
  for (const edge of g.edges) {
    const from = g.nodes.get(edge.from)
    const to = g.nodes.get(edge.to)
    if (!from || !to) continue
    const reveal = edgeReveal(g, edge.from, edge.to)
    if (reveal <= 0.01) continue
    const x1 = from.x * scale
    const y1 = from.y * scale
    const x2 = to.x * scale
    const y2 = to.y * scale
    // curved bezier — control point offset perpendicular for an organic arc
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const bow = Math.min(60, len * 0.18)
    const cx1 = mx + nx * bow
    const cy1 = my + ny * bow

    const isActive = usedEdges?.has(`${edge.from}->${edge.to}`)
    // draw the curve only up to the reveal fraction (edge "grows" from->to)
    cx.beginPath()
    cx.moveTo(x1, y1)
    const steps = 22
    for (let k = 1; k <= steps; k++) {
      const u = (k / steps) * reveal
      const mu = 1 - u
      const bx = mu * mu * x1 + 2 * mu * u * cx1 + u * u * x2
      const by = mu * mu * y1 + 2 * mu * u * cy1 + u * u * y2
      cx.lineTo(bx, by)
    }
    cx.strokeStyle = isActive ? p.edgeActive : p.edge
    cx.globalAlpha = (isActive ? 0.9 : 0.5) * Math.min(1, reveal + 0.1)
    cx.lineWidth = isActive ? 1.6 : 1
    cx.stroke()
    cx.globalAlpha = 1

    // flowing energy comet along the revealed portion
    const t = (time / 1400 + edge.progress) % 1
    if (t <= reveal) {
      const mt = 1 - t
      const bx = mt * mt * x1 + 2 * mt * t * cx1 + t * t * x2
      const by = mt * mt * y1 + 2 * mt * t * cy1 + t * t * y2
      const cometR = 2.4 * s.zoom
      const grad = cx.createRadialGradient(bx, by, 0, bx, by, cometR * 3)
      grad.addColorStop(0, isActive ? p.runningRing : p.edgeActive)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      cx.fillStyle = grad
      cx.beginPath()
      cx.arc(bx, by, cometR * 3, 0, Math.PI * 2)
      cx.fill()
    }
  }
}
