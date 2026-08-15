import type { Graph } from '../engine/graph'
import type { SceneState } from './scene'

export function drawNodes(
  cx: CanvasRenderingContext2D,
  g: Graph,
  s: SceneState,
  selectedId: string | null,
  time: number,
  artifactFlash?: Map<string, number>
) {
  for (const node of g.nodes.values()) {
    const x = node.x * s.zoom + s.panX
    const y = node.y * s.zoom + s.panY
    const radius = 28 * s.zoom
    cx.save()
    if (node.state === 'running') {
      cx.shadowColor = 'rgba(255,255,255,0.8)'
      cx.shadowBlur = 12 + Math.sin(time / 180) * 4
    } else if (node.state === 'done') {
      cx.shadowColor = 'rgba(255,255,255,0.4)'
      cx.shadowBlur = 4
    }
    cx.beginPath()
    cx.arc(x, y, radius, 0, Math.PI * 2)
    cx.fillStyle = node.state === 'fault' ? '#ef4444' : '#0a0a0a'
    cx.fill()
    cx.strokeStyle = node.state === 'fault' ? '#ef4444' : '#e5e5e5'
    cx.lineWidth = node.id === selectedId ? 2 : 1
    cx.stroke()
    cx.shadowBlur = 0
    cx.fillStyle = '#e5e5e5'
    cx.font = `${10 * s.zoom}px "JetBrains Mono" `
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    cx.fillText(node.label, x, y)
    if (artifactFlash?.has(node.id)) {
      const alpha = Math.min(1, (artifactFlash.get(node.id) ?? 0))
      cx.fillStyle = `rgba(255,255,255,${alpha})`
      cx.fillRect(x + radius + 2, y - radius - 10, 8 * s.zoom, 6 * s.zoom)
    }
    cx.restore()
  }
}

export function drawOrchestratorRadar(cx: CanvasRenderingContext2D, width: number, height: number, time: number, gateActive?: boolean) {
  cx.save()
  cx.strokeStyle = 'rgba(255,255,255,0.12)'
  cx.lineWidth = 1
  const cx_ = width / 2
  const cy_ = height / 2
  const radius = Math.min(width, height) * 0.35
  const angle = (time / 2000) * Math.PI * 2
  cx.beginPath()
  cx.moveTo(cx_, cy_)
  cx.lineTo(cx_ + Math.cos(angle) * radius, cy_ + Math.sin(angle) * radius)
  cx.stroke()

  if (gateActive) {
    const base = Math.min(width, height) * 0.35
    cx.strokeStyle = 'rgba(255,255,255,0.18)'
    cx.lineWidth = 1
    cx.beginPath()
    cx.setLineDash([4, 6])
    cx.arc(cx_, cy_, base + 14, 0, Math.PI * 2)
    cx.stroke()
    cx.beginPath()
    cx.arc(cx_, cy_, base + 20, 0, Math.PI * 2)
    cx.stroke()
    cx.setLineDash([])
  }
  cx.restore()
}

export function drawDoneGlyph(cx: CanvasRenderingContext2D, width: number, height: number) {
  cx.save()
  cx.strokeStyle = 'rgba(255,255,255,0.35)'
  cx.lineWidth = 2
  const cx_ = width / 2
  const cy_ = height / 2
  const radius = Math.min(width, height) * 0.08
  const grad = cx.createLinearGradient(cx_ - radius, cy_ - radius, cx_ + radius, cy_ + radius)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(1, '#737373')
  cx.fillStyle = grad
  cx.beginPath()
  cx.arc(cx_, cy_, radius, 0, Math.PI * 2)
  cx.fill()
  cx.restore()
}
