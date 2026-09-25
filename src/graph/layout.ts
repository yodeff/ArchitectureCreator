import type { XYPosition } from '@xyflow/react'
import { projectGraph, type ViewId } from './filters.ts'
import { fieldsOf } from './nodes.ts'
import { NODE_TYPES, type ArchitectureGraph, type ArchitectureNode, type NodeType } from './types.ts'

// 1つの Page の表示用の座標。ドメインデータ（Project）とは分け、View ごとの並びを覚えておく
export type Positions = Partial<Record<ViewId, Record<string, XYPosition>>>

interface LayoutNode {
  id: string
  width: number
  height: number
}

interface LayoutEdge {
  id: string
  source: string
  target: string
}

// 自動整列は ELK（layered, Left → Right）に任せる。ELK は大きいので、使うときに読み込む
export async function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[]): Promise<Record<string, XYPosition>> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js')
  const result = await new ELK().layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    },
    children: nodes.map(({ id, width, height }) => ({ id, width, height })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  })
  return Object.fromEntries((result.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]))
}

// 仮の配置での列。UseCase を真ん中に置き、UseCase につながる側（要件・API）と、UseCase が使う側（Entity・Database・External）を
// それぞれ同じ列に縦に並べる。線が Node の裏を通らないように
const DEFAULT_COLUMN: Record<NodeType, number> = { requirement: 0, api: 0, usecase: 1, entity: 2, database: 2, external: 2 }

// 座標をまだ持たない Node（サンプルや Import 直後）の仮の位置。列ごとに、Type の順で縦に並べるだけ。
// 項目を持つ Node はその分だけ高くなるので、重ならないよう行の高さに足す
function defaultPositions(nodes: ArchitectureNode[]): Record<string, XYPosition> {
  const nextYByColumn = new Map<number, number>()
  const ordered = [...nodes].sort((a, b) => NODE_TYPES.indexOf(a.type) - NODE_TYPES.indexOf(b.type))
  return Object.fromEntries(
    ordered.map((node) => {
      const column = DEFAULT_COLUMN[node.type]
      const y = nextYByColumn.get(column) ?? 0
      nextYByColumn.set(column, y + 100 + fieldsOf(node).length * 17)
      return [node.id, { x: column * 260, y }]
    }),
  )
}

// View での座標は「その View で動かした位置 → Overview の位置 → 仮の位置」の順で決める
export function resolvePositions(graph: ArchitectureGraph, positions: Positions, view: ViewId): Record<string, XYPosition> {
  const fallback = defaultPositions(graph.nodes)
  return Object.fromEntries(
    graph.nodes.map((n) => [n.id, positions[view]?.[n.id] ?? positions.overview?.[n.id] ?? fallback[n.id]]),
  )
}

// 新しい Node の置き場所。既存の Node と重ならないよう、View に表示中の Node の下に置く
export function positionBelow(graph: ArchitectureGraph, positions: Positions, view: ViewId): XYPosition {
  const resolved = resolvePositions(graph, positions, view)
  const points = projectGraph(graph, view).nodes.map((n) => resolved[n.id])
  if (points.length === 0) return { x: 0, y: 0 }
  return { x: Math.min(...points.map((p) => p.x)), y: Math.max(...points.map((p) => p.y)) + 100 }
}

// View 全体を表示するときの設定。Node が少ない View で拡大しすぎないよう、最大ズームを 1 にする
export const fitViewOptions = { padding: 0.2, maxZoom: 1 }
