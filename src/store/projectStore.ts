import type { XYPosition } from '@xyflow/react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sampleProject } from '../data/sampleProject.ts'
import type { ViewId } from '../graph/filters.ts'
import { parseProjectGraph } from '../graph/io.ts'
import type { Positions } from '../graph/layout.ts'
import { keepTypeAttributes } from '../graph/nodes.ts'
import type { ArchitectureEdge, ArchitectureNode, ProjectGraph } from '../graph/types.ts'

// Undo / Redo で戻す単位。ドメインデータと表示用の座標をまとめて戻す
interface Snapshot {
  graph: ProjectGraph
  positions: Positions
}

interface ProjectState extends Snapshot {
  // Undo / Redo の履歴。localStorage には保存しない
  past: Snapshot[]
  future: Snapshot[]
  setProjectName: (name: string) => void
  addNode: (node: Omit<ArchitectureNode, 'id'>, placement: Partial<Record<ViewId, XYPosition>>) => void
  // mergeKey: 文字入力のように続けて変わる項目に付ける（mergeKeyOf を参照）
  updateNode: (id: string, patch: Partial<Omit<ArchitectureNode, 'id'>>, mergeKey?: string) => void
  addEdge: (source: string, target: string) => void
  updateEdge: (id: string, patch: Partial<Omit<ArchitectureEdge, 'id'>>, mergeKey?: string) => void
  // Node を消すときは、つながっている Edge もすべて消す
  deleteElements: (nodeIds: string[], edgeIds: string[]) => void
  setPositions: (view: ViewId, positions: Record<string, XYPosition>) => void
  replaceGraph: (graph: ProjectGraph) => void
  undo: () => void
  redo: () => void
}

const HISTORY_LIMIT = 100
// 同じ mergeKey の変更がこの間隔より短く続いたら、Undo の1回にまとめる（1文字ずつ戻らないように）
const MERGE_WINDOW_MS = 1000
let lastMerge: { key: string; at: number } | undefined

// 文字入力の欄ごとの mergeKey
export function mergeKeyOf(id: string, field: string): string {
  return `${id}:${field}`
}

// 変更の前の状態を履歴に積み、Redo の履歴を捨てる
function record(s: ProjectState, next: Partial<Snapshot>, mergeKey?: string): Partial<ProjectState> {
  const now = Date.now()
  const merge = mergeKey !== undefined && lastMerge?.key === mergeKey && now - lastMerge.at < MERGE_WINDOW_MS
  lastMerge = mergeKey === undefined ? undefined : { key: mergeKey, at: now }
  if (merge) return { ...next, future: [] }
  const past = [...s.past, { graph: s.graph, positions: s.positions }].slice(-HISTORY_LIMIT)
  return { ...next, past, future: [] }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      graph: sampleProject,
      positions: {},
      past: [],
      future: [],

      setProjectName: (name) => set((s) => record(s, { graph: { ...s.graph, name } }, 'project-name')),

      addNode: (node, placement) =>
        set((s) => {
          const id = crypto.randomUUID()
          const positions = { ...s.positions }
          for (const [view, position] of Object.entries(placement) as [ViewId, XYPosition][]) {
            positions[view] = { ...positions[view], [id]: position }
          }
          const nodes = [...s.graph.nodes, keepTypeAttributes({ ...node, id })]
          return record(s, { graph: { ...s.graph, nodes }, positions })
        }),

      updateNode: (id, patch, mergeKey) =>
        set((s) => {
          const nodes = s.graph.nodes.map((n) => (n.id === id ? keepTypeAttributes({ ...n, ...patch }) : n))
          return record(s, { graph: { ...s.graph, nodes } }, mergeKey)
        }),

      addEdge: (source, target) =>
        set((s) => {
          if (s.graph.edges.some((e) => e.source === source && e.target === target)) return s
          const edge = { id: crypto.randomUUID(), source, target }
          return record(s, { graph: { ...s.graph, edges: [...s.graph.edges, edge] } })
        }),

      updateEdge: (id, patch, mergeKey) =>
        set((s) => {
          const edges = s.graph.edges.map((e) => (e.id === id ? { ...e, ...patch } : e))
          return record(s, { graph: { ...s.graph, edges } }, mergeKey)
        }),

      deleteElements: (nodeIds, edgeIds) =>
        set((s) => {
          const removedNodes = new Set(nodeIds)
          const removedEdges = new Set(edgeIds)
          const nodes = s.graph.nodes.filter((n) => !removedNodes.has(n.id))
          const edges = s.graph.edges.filter(
            (e) => !removedEdges.has(e.id) && !removedNodes.has(e.source) && !removedNodes.has(e.target),
          )
          if (nodes.length === s.graph.nodes.length && edges.length === s.graph.edges.length) return s
          const positions: Positions = {}
          for (const [view, byId] of Object.entries(s.positions) as [ViewId, Record<string, XYPosition>][]) {
            positions[view] = Object.fromEntries(Object.entries(byId).filter(([id]) => !removedNodes.has(id)))
          }
          return record(s, { graph: { ...s.graph, nodes, edges }, positions })
        }),

      setPositions: (view, updates) =>
        set((s) => {
          const current = s.positions[view]
          const unchanged = Object.entries(updates).every(
            ([id, p]) => current?.[id]?.x === p.x && current?.[id]?.y === p.y,
          )
          if (unchanged) return s
          return record(s, { positions: { ...s.positions, [view]: { ...current, ...updates } } })
        }),

      replaceGraph: (graph) => set((s) => record(s, { graph, positions: {} })),

      undo: () =>
        set((s) => {
          const previous = s.past.at(-1)
          if (!previous) return s
          lastMerge = undefined
          return {
            ...previous,
            past: s.past.slice(0, -1),
            future: [{ graph: s.graph, positions: s.positions }, ...s.future],
          }
        }),

      redo: () =>
        set((s) => {
          const next = s.future[0]
          if (!next) return s
          lastMerge = undefined
          return {
            ...next,
            past: [...s.past, { graph: s.graph, positions: s.positions }],
            future: s.future.slice(1),
          }
        }),
    }),
    {
      name: 'architecture-workspace',
      version: 3,
      partialize: (s) => ({ graph: s.graph, positions: s.positions }),
      // 以前の形式（Component・関係のラベル・API の属性・カラムを持つもの）は、Import と同じ読み替えで移す
      migrate: (persisted, version) => {
        const state = persisted as Snapshot
        return version < 3 ? { ...state, graph: parseProjectGraph(state.graph) } : state
      },
    },
  ),
)
