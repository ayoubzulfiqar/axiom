import type { Graph } from '../engine/graph'

export interface InputState {
  dragging: string | null
  panning: boolean
  lastX: number
  lastY: number
  selected: string | null
}

const state: InputState = {
  dragging: null,
  panning: false,
  lastX: 0,
  lastY: 0,
  selected: null,
}

export function attach(canvas: HTMLCanvasElement, g: Graph, onChange: (sel: string | null) => void) {
  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    let hit: string | null = null
    for (const n of g.nodes.values()) {
      const dx = x - n.x
      const dy = y - n.y
      if (Math.sqrt(dx ** 2 + dy ** 2) < 0.04) {
        hit = n.id
        break
      }
    }
    if (hit) {
      state.dragging = hit
      state.selected = hit
      onChange(hit)
    } else {
      state.panning = true
      state.selected = null
      onChange(null)
    }
    state.lastX = e.clientX
    state.lastY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (state.dragging) {
      const rect = canvas.getBoundingClientRect()
      const dx = (e.clientX - state.lastX) / rect.width
      const dy = (e.clientY - state.lastY) / rect.height
      const node = g.nodes.get(state.dragging)
      if (node) {
        node.x = Math.min(Math.max(node.x + dx, 0.05), 0.95)
        node.y = Math.min(Math.max(node.y + dy, 0.05), 0.95)
      }
    }
    state.lastX = e.clientX
    state.lastY = e.clientY
  }
  const onUp = (e: PointerEvent) => {
    state.dragging = null
    state.panning = false
    canvas.releasePointerCapture(e.pointerId)
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('wheel', onWheel)
  }
}

export function getSelected(): string | null {
  return state.selected
}

export function setSelected(id: string | null) {
  state.selected = id
}
