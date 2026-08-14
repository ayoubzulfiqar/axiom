export interface NodeState {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  state: string
}

export interface Graph {
  nodes: Map<string, NodeState>
  edges: { from: string; to: string; progress: number }[]
}

export function createGraph(ids: string[]): Graph {
  const nodes = new Map<string, NodeState>()
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  ids.forEach((id, i) => {
    const angle = (i / ids.length) * Math.PI * 2
    const radius = 140
    nodes.set(id, {
      id,
      label: id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      state: 'idle',
    })
  })
  return { nodes, edges: [] }
}

export function addEdge(g: Graph, from: string, to: string) {
  if (!g.edges.find((e) => e.from === from && e.to === to)) {
    g.edges.push({ from, to, progress: 0 })
  }
}

export function stepPhysics(g: Graph, dt: number) {
  const nodes = Array.from(g.nodes.values())
  const repulsion = 4000
  const damping = 0.92
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = repulsion / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[i].vx -= fx
      nodes[i].vy -= fy
      nodes[j].vx += fx
      nodes[j].vy += fy
    }
  }
  for (const node of nodes) {
    node.vx *= damping
    node.vy *= damping
    node.x += node.vx * dt * 0.01
    node.y += node.vy * dt * 0.01
  }
}

export function tickEdges(g: Graph, dt: number, active: boolean) {
  for (const edge of g.edges) {
    if (active) edge.progress = Math.min(1, edge.progress + dt * 0.002)
  }
}

export function setNodeState(g: Graph, id: string, state: string) {
  const node = g.nodes.get(id)
  if (node) node.state = state
}
