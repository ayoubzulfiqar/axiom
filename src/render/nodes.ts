import type { Graph } from '../engine/graph'
import type { SceneState } from './scene'
import { PALETTE, type ThemeMode } from './palette'

export function drawNodes(
  cx: CanvasRenderingContext2D,
  g: Graph,
  s: SceneState,
  selectedId: string | null,
  time: number,
  artifactFlash?: Map<string, number>,
  tokenRate?: number,
  theme: ThemeMode = 'dark'
) {
  const p = PALETTE[theme]
  const breathe = Math.min(1, (tokenRate ?? 0) / 30)
  const scale = s.zoom * (s.worldFit || 1)
  for (const node of g.nodes.values()) {
    const radius = node.r
    const grow = Math.min(1.12, node.growth)
    const pulse = 1 + 0.05 * Math.sin(time / 520 + node.spawn / 1000) + breathe * 0.07
    const br = Math.max(1.5, radius * grow * pulse * scale)
    cx.save()
    cx.translate(node.x * scale, node.y * scale)

    const isRunning = node.state === 'running'
    const isSelected = node.id === selectedId
    const base = node.state === 'fault' ? p.fault : isRunning ? p.running : node.state === 'done' ? p.done : p.idle
    const ring = node.state === 'fault' ? p.faultRing : isRunning ? p.runningRing : node.state === 'done' ? p.doneRing : p.idleRing
    const glow = node.state === 'fault' ? p.faultGlow : isRunning ? p.runningGlow : node.state === 'done' ? p.doneGlow : 'rgba(0,0,0,0)'

    // soft outer halo (running/fault pulse with token rate)
    if (node.state !== 'idle') {
      const halo = br + (isRunning ? 7 + breathe * 8 : 5)
      const hg = cx.createRadialGradient(0, 0, br * 0.7, 0, 0, halo + 8)
      hg.addColorStop(0, glow)
      hg.addColorStop(1, 'rgba(0,0,0,0)')
      cx.fillStyle = hg
      cx.beginPath()
      cx.arc(0, 0, halo + 8, 0, Math.PI * 2)
      cx.fill()
    }

    // body — glassy radial orb with a top highlight
    const grad = cx.createRadialGradient(0, -br * 0.32, br * 0.12, 0, 0, br)
    grad.addColorStop(0, ring)
    grad.addColorStop(0.62, base)
    grad.addColorStop(1, theme === 'dark' ? 'rgba(8,9,12,0.94)' : 'rgba(248,249,251,0.94)')
    cx.beginPath()
    cx.arc(0, 0, br, 0, Math.PI * 2)
    cx.fillStyle = grad
    cx.fill()

    // crisp rim
    cx.beginPath()
    cx.arc(0, 0, br, 0, Math.PI * 2)
    cx.lineWidth = isSelected ? 2.5 : 1.1
    cx.strokeStyle = isSelected ? p.core : ring
    cx.globalAlpha = isSelected ? 1 : 0.8
    cx.stroke()
    cx.globalAlpha = 1

    // birth pop-ring: an expanding faint ring while the node springs in (reference feel)
    if (grow < 1.02) {
      const pop = (1 - grow) * 26 + 4
      cx.beginPath()
      cx.arc(0, 0, br + pop, 0, Math.PI * 2)
      cx.strokeStyle = ring
      cx.globalAlpha = (1 - grow) * 0.5
      cx.lineWidth = 1.2
      cx.stroke()
      cx.globalAlpha = 1
    }

    if (artifactFlash?.has(node.id)) {
      const a = Math.min(1, artifactFlash.get(node.id) ?? 0)
      cx.fillStyle = `rgba(255,255,255,${a})`
      cx.fillRect(br + 4, -br - 8, 8 * s.zoom, 6 * s.zoom)
    }

    // label
    cx.fillStyle = p.text
    cx.font = `600 ${Math.max(10, 11 * s.zoom)}px "JetBrains Mono", ui-monospace, monospace`
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    cx.globalAlpha = 0.92
    cx.fillText(node.label, 0, br + 13 * s.zoom)
    cx.globalAlpha = 1

    cx.restore()
  }
}

export function drawOrchestratorRadar(
  cx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  gateActive?: boolean,
  theme: ThemeMode = 'dark'
) {
  cx.save()
  const radius = Math.min(width, height) * 0.34
  const angle = (time / 2200) * Math.PI * 2
  const sweep = cx.createLinearGradient(0, 0, Math.cos(angle) * radius, Math.sin(angle) * radius)
  sweep.addColorStop(0, theme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)')
  sweep.addColorStop(1, 'rgba(255,255,255,0)')
  cx.strokeStyle = sweep
  cx.lineWidth = 1.5
  cx.beginPath()
  cx.moveTo(0, 0)
  cx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  cx.stroke()

  if (gateActive) {
    const base = Math.min(width, height) * 0.34
    cx.strokeStyle = theme === 'dark' ? 'rgba(230,170,60,0.5)' : 'rgba(180,120,20,0.5)'
    cx.lineWidth = 1
    cx.setLineDash([4, 6])
    cx.beginPath()
    cx.arc(0, 0, base + 14, 0, Math.PI * 2)
    cx.stroke()
    cx.beginPath()
    cx.arc(0, 0, base + 20, 0, Math.PI * 2)
    cx.stroke()
    cx.setLineDash([])
  }
  cx.restore()
}

export function drawDoneGlyph(cx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeMode = 'dark') {
  cx.save()
  const p = PALETTE[theme]
  cx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
  cx.lineWidth = 2
  const radius = Math.min(width, height) * 0.07
  const grad = cx.createLinearGradient(-radius, -radius, radius, radius)
  grad.addColorStop(0, theme === 'dark' ? p.doneRing : p.done)
  grad.addColorStop(1, theme === 'dark' ? p.done : p.doneRing)
  cx.fillStyle = grad
  cx.beginPath()
  cx.arc(0, 0, radius, 0, Math.PI * 2)
  cx.fill()
  cx.restore()
}
