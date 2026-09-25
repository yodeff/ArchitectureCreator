import type { ArchitectureEdge, ArchitectureNode, NodeType, ProjectGraph } from './types.ts'

export type ViewId = 'overview' | 'requirements' | 'api' | 'usecases' | 'entities' | 'database' | 'external'

// focus を持つ View は「その Type の Node と、それに直接つながる Node」を表示する
export const VIEWS: { id: ViewId; label: string; focus?: NodeType }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements', focus: 'requirement' },
  { id: 'api', label: 'API', focus: 'api' },
  { id: 'usecases', label: 'Use Cases', focus: 'usecase' },
  { id: 'entities', label: 'Entities', focus: 'entity' },
  { id: 'database', label: 'Database', focus: 'database' },
  { id: 'external', label: 'External', focus: 'external' },
]

export interface GraphProjection {
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  // View の中心になる Node。これ以外は「直接つながる Node」として薄く表示する
  focusIds: Set<string>
}

export function focusTypeOf(view: ViewId): NodeType | undefined {
  return VIEWS.find((v) => v.id === view)?.focus
}

// どこにもつながっていない Node が、その View に表示されるか
export function showsUnconnected(view: ViewId, type: NodeType): boolean {
  const focus = focusTypeOf(view)
  return !focus || focus === type
}

// ProjectGraph から View に表示する部分を取り出す。データは複製・保存しない
export function projectGraph(graph: ProjectGraph, view: ViewId): GraphProjection {
  const focus = focusTypeOf(view)
  if (!focus) {
    return { nodes: graph.nodes, edges: graph.edges, focusIds: new Set(graph.nodes.map((n) => n.id)) }
  }

  const focusIds = new Set(graph.nodes.filter((n) => n.type === focus).map((n) => n.id))
  const visibleIds = new Set(focusIds)
  for (const edge of graph.edges) {
    if (focusIds.has(edge.source)) visibleIds.add(edge.target)
    if (focusIds.has(edge.target)) visibleIds.add(edge.source)
  }

  return {
    nodes: graph.nodes.filter((n) => visibleIds.has(n.id)),
    edges: graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    focusIds,
  }
}
