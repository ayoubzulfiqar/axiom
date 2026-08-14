export interface GraphNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  state: 'idle' | 'running' | 'done' | 'fault'
}

export interface GraphEdge {
  from: string
  to: string
  progress: number
  particleT: number
  active: boolean
}

export interface Graph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

export function createGraph(nodeIds: string[]): Graph {
  const nodes = new Map<string, GraphNode>()
  const cx = 0.5
  const cy = 0.5
  const r = 0.28
  for (let i = 0; i < nodeIds.length; i++) {
    const angle = (i / nodeIds.length) * Math.PI * 2 - Math.PI / 2
    nodes.set(nodeIds[i], {
      id: nodeIds[i],
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
      radius: 0.018 + nodeIds[i] === 'ORCH' ? 0.008 : 0,
      state: 'idle',
    })
  }
  const edges: GraphEdge[] = []
  return { nodes, edges }
}

export function stepPhysics(g: Graph, dt: number) {
  const repulsion = 24000
  const k = 0.02
  const damping = 0.86
  const speedCap = 0.0015
  const arr = Array.from(g.nodes.values())
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i]
      const b = arr[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > repulsion) continue
      const d = Math.sqrt(d2) || 0.0001
      const f = (repulsion - d2) / d * k * dt
      const fx = dx * f
      const fy = dy * f
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
  }
  // center gravity
  for (const n of arr) {
    n.vx += (0.5 - n.x) * 0.001 * dt
    n.vy += (0.5 - n.y) * 0.001 * dt
  }
  for (const n of arr) {
    const speed = Math.sqrt(n.vx ** 2 + n.vy ** 2)
    if (speed > speedCap) {
      n.vx = (n.vx / speed) * speedCap
      n.vy = (n.vy / speed) * speedCap
    }
    n.vx *= damping
    n.vy *= damping
    n.x += n.vx * dt
    n.y += n.vy * dt
    // clamp
    n.x = Math.min(Math.max(n.x, 0.05), 0.95)
    n.y = Math.min(Math.max(n.y, 0.05), 0.95)
  }
}

export function addEdge(g: Graph, from: string, to: string) {
  g.edges.push({ from, to, progress: 0, particleT: 0, active: true })
}

export function tickEdges(g: Graph, dt: number, activeMission: boolean) {
  for (const e of g.edges) {
    if (e.active && activeMission) {
      e.progress = Math.min(1, e.progress + 0.0008 * dt)
      e.particleT = (e.particleT + 0.0018 * dt) % 1
    } else {
      e.progress = Math.max(0, e.progress - 0.0005 * dt)
      e.particleT = 0
    }
  }
}

export function setNodeState(g: Graph, id: string, state: GraphNode['state']) {
  const n = g.nodes.get(id)
  if (n) n.state = state
}
