import type { ProjectGraph } from './types.ts'

export interface Flow {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

// 選んだ Node を通る流れ。矢印をさかのぼった上流（要件・入口の側）と、たどった下流（データ・外部の側）を集める
export function traceFlow(graph: ProjectGraph, startId: string): Flow {
  const nodeIds = new Set([startId])
  const edgeIds = new Set<string>()

  for (const direction of ['downstream', 'upstream'] as const) {
    const queue = [startId]
    const seen = new Set(queue)
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const edge of graph.edges) {
        const [from, to] = direction === 'downstream' ? [edge.source, edge.target] : [edge.target, edge.source]
        if (from !== current) continue
        edgeIds.add(edge.id)
        nodeIds.add(to)
        if (!seen.has(to)) {
          seen.add(to)
          queue.push(to)
        }
      }
    }
  }

  return { nodeIds, edgeIds }
}
