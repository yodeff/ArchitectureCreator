import type { XYPosition } from '@xyflow/react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sampleProject } from '../data/sampleProject.ts'
import type { ViewId } from '../graph/filters.ts'
import { parseProject } from '../graph/io.ts'
import type { Positions } from '../graph/layout.ts'
import { keepTypeAttributes } from '../graph/nodes.ts'
import type { ArchitectureEdge, ArchitectureNode, ArchitecturePage, Project } from '../graph/types.ts'

// Undo / Redo で戻す単位。ドメインデータと表示用の座標、表示中の Page をまとめて戻す
// （別の Page で行った変更を Undo したら、その Page に戻って見えるように）
interface Snapshot {
  project: Project
  // Page の id ごとの表示用の座標
  positions: Record<string, Positions>
  pageId: string
}

interface ProjectState extends Snapshot {
  // Undo / Redo の履歴。localStorage には保存しない
  past: Snapshot[]
  future: Snapshot[]
  setProjectName: (name: string) => void
  // Page の切り替えは Undo の1回にしない
  selectPage: (id: string) => void
  addPage: () => void
  renamePage: (id: string, name: string) => void
  deletePage: (id: string) => void
  // Page を後ろに足して、最初の Page を表示する。空の Page が1つだけのとき（Delete All の直後など）は、それと置き換える
  importPages: (pages: ArchitecturePage[]) => void
  // すべての Page を消し、空の Page を1つ残す。Project 名は残す
  clearProject: () => void
  // ここから下は、表示中の Page の Node と Edge を変える
  addNode: (node: Omit<ArchitectureNode, 'id'>, placement: Partial<Record<ViewId, XYPosition>>) => void
  // mergeKey: 文字入力のように続けて変わる項目に付ける（mergeKeyOf を参照）
  updateNode: (id: string, patch: Partial<Omit<ArchitectureNode, 'id'>>, mergeKey?: string) => void
  addEdge: (source: string, target: string) => void
  updateEdge: (id: string, patch: Partial<Omit<ArchitectureEdge, 'id'>>, mergeKey?: string) => void
  // Node を消すときは、つながっている Edge もすべて消す
  deleteElements: (nodeIds: string[], edgeIds: string[]) => void
  setPositions: (view: ViewId, positions: Record<string, XYPosition>) => void
  undo: () => void
  redo: () => void
}

const HISTORY_LIMIT = 100
// 同じ mergeKey の変更がこの間隔より短く続いたら、Undo の1回にまとめる（1文字ずつ戻らないように）
const MERGE_WINDOW_MS = 1000
let lastMerge: { key: string; at: number } | undefined

const NO_POSITIONS: Positions = {}

// 文字入力の欄ごとの mergeKey
export function mergeKeyOf(id: string, field: string): string {
  return `${id}:${field}`
}

// 表示中の Page。pageId が見つからないとき（壊れた保存データなど）は最初の Page
export function currentPage(s: Snapshot): ArchitecturePage {
  return s.project.pages.find((p) => p.id === s.pageId) ?? s.project.pages[0]
}

export function currentPositions(s: Snapshot): Positions {
  return s.positions[currentPage(s).id] ?? NO_POSITIONS
}

function isEmptyPage(page: ArchitecturePage): boolean {
  return page.nodes.length === 0 && page.edges.length === 0
}

// 空の Page が1つだけ。Delete All できる中身がなく、Import はこの Page と置き換える
export function isEmptyProject(project: Project): boolean {
  return project.pages.length === 1 && isEmptyPage(project.pages[0])
}

function emptyPage(name: string): ArchitecturePage {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [] }
}

// 既存の Page と重ならない「Page N」
function nextPageName(project: Project): string {
  const names = new Set(project.pages.map((p) => p.name))
  let n = project.pages.length + 1
  while (names.has(`Page ${n}`)) n++
  return `Page ${n}`
}

// 変更の前の状態を履歴に積み、Redo の履歴を捨てる
function record(s: ProjectState, next: Partial<Snapshot>, mergeKey?: string): Partial<ProjectState> {
  const now = Date.now()
  const merge = mergeKey !== undefined && lastMerge?.key === mergeKey && now - lastMerge.at < MERGE_WINDOW_MS
  lastMerge = mergeKey === undefined ? undefined : { key: mergeKey, at: now }
  if (merge) return { ...next, future: [] }
  const past = [...s.past, { project: s.project, positions: s.positions, pageId: s.pageId }].slice(-HISTORY_LIMIT)
  return { ...next, past, future: [] }
}

// 表示中の Page を変える
function updatePage(s: ProjectState, update: (page: ArchitecturePage) => ArchitecturePage): Project {
  const id = currentPage(s).id
  return { ...s.project, pages: s.project.pages.map((p) => (p.id === id ? update(p) : p)) }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: sampleProject,
      positions: {},
      pageId: sampleProject.pages[0].id,
      past: [],
      future: [],

      setProjectName: (name) => set((s) => record(s, { project: { ...s.project, name } }, 'project-name')),

      selectPage: (id) => set((s) => (s.project.pages.some((p) => p.id === id) ? { pageId: id } : s)),

      addPage: () =>
        set((s) => {
          const page = emptyPage(nextPageName(s.project))
          return record(s, { project: { ...s.project, pages: [...s.project.pages, page] }, pageId: page.id })
        }),

      renamePage: (id, name) =>
        set((s) => {
          const pages = s.project.pages.map((p) => (p.id === id ? { ...p, name } : p))
          return record(s, { project: { ...s.project, pages } })
        }),

      // 最後の1つは消さない。表示中の Page を消したら、隣の Page を表示する
      deletePage: (id) =>
        set((s) => {
          const index = s.project.pages.findIndex((p) => p.id === id)
          if (index < 0 || s.project.pages.length === 1) return s
          const pages = s.project.pages.filter((p) => p.id !== id)
          const positions = Object.fromEntries(Object.entries(s.positions).filter(([pageId]) => pageId !== id))
          const pageId = currentPage(s).id === id ? pages[Math.min(index, pages.length - 1)].id : s.pageId
          return record(s, { project: { ...s.project, pages }, positions, pageId })
        }),

      importPages: (imported) =>
        set((s) => {
          if (imported.length === 0) return s
          const replace = isEmptyProject(s.project)
          const pages = replace ? imported : [...s.project.pages, ...imported]
          const positions = replace ? {} : s.positions
          return record(s, { project: { ...s.project, pages }, positions, pageId: imported[0].id })
        }),

      clearProject: () =>
        set((s) => {
          const page = emptyPage('Page 1')
          return record(s, { project: { name: s.project.name, pages: [page] }, positions: {}, pageId: page.id })
        }),

      addNode: (node, placement) =>
        set((s) => {
          const id = crypto.randomUUID()
          const pagePositions = { ...currentPositions(s) }
          for (const [view, position] of Object.entries(placement) as [ViewId, XYPosition][]) {
            pagePositions[view] = { ...pagePositions[view], [id]: position }
          }
          const project = updatePage(s, (p) => ({ ...p, nodes: [...p.nodes, keepTypeAttributes({ ...node, id })] }))
          return record(s, { project, positions: { ...s.positions, [currentPage(s).id]: pagePositions } })
        }),

      updateNode: (id, patch, mergeKey) =>
        set((s) => {
          const project = updatePage(s, (p) => ({
            ...p,
            nodes: p.nodes.map((n) => (n.id === id ? keepTypeAttributes({ ...n, ...patch }) : n)),
          }))
          return record(s, { project }, mergeKey)
        }),

      addEdge: (source, target) =>
        set((s) => {
          if (currentPage(s).edges.some((e) => e.source === source && e.target === target)) return s
          const edge = { id: crypto.randomUUID(), source, target }
          return record(s, { project: updatePage(s, (p) => ({ ...p, edges: [...p.edges, edge] })) })
        }),

      updateEdge: (id, patch, mergeKey) =>
        set((s) => {
          const project = updatePage(s, (p) => ({ ...p, edges: p.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
          return record(s, { project }, mergeKey)
        }),

      deleteElements: (nodeIds, edgeIds) =>
        set((s) => {
          const page = currentPage(s)
          const removedNodes = new Set(nodeIds)
          const removedEdges = new Set(edgeIds)
          const nodes = page.nodes.filter((n) => !removedNodes.has(n.id))
          const edges = page.edges.filter(
            (e) => !removedEdges.has(e.id) && !removedNodes.has(e.source) && !removedNodes.has(e.target),
          )
          if (nodes.length === page.nodes.length && edges.length === page.edges.length) return s
          const pagePositions: Positions = {}
          for (const [view, byId] of Object.entries(currentPositions(s)) as [ViewId, Record<string, XYPosition>][]) {
            pagePositions[view] = Object.fromEntries(Object.entries(byId).filter(([id]) => !removedNodes.has(id)))
          }
          return record(s, {
            project: updatePage(s, (p) => ({ ...p, nodes, edges })),
            positions: { ...s.positions, [page.id]: pagePositions },
          })
        }),

      setPositions: (view, updates) =>
        set((s) => {
          const pagePositions = currentPositions(s)
          const current = pagePositions[view]
          const unchanged = Object.entries(updates).every(
            ([id, p]) => current?.[id]?.x === p.x && current?.[id]?.y === p.y,
          )
          if (unchanged) return s
          const next = { ...pagePositions, [view]: { ...current, ...updates } }
          return record(s, { positions: { ...s.positions, [currentPage(s).id]: next } })
        }),

      undo: () =>
        set((s) => {
          const previous = s.past.at(-1)
          if (!previous) return s
          lastMerge = undefined
          return {
            ...previous,
            past: s.past.slice(0, -1),
            future: [{ project: s.project, positions: s.positions, pageId: s.pageId }, ...s.future],
          }
        }),

      redo: () =>
        set((s) => {
          const next = s.future[0]
          if (!next) return s
          lastMerge = undefined
          return {
            ...next,
            past: [...s.past, { project: s.project, positions: s.positions, pageId: s.pageId }],
            future: s.future.slice(1),
          }
        }),
    }),
    {
      name: 'architecture-workspace',
      version: 4,
      partialize: (s) => ({ project: s.project, positions: s.positions, pageId: s.pageId }),
      // Page を入れる前の形式（version 3 まで）は、Import と同じ読み替えで1つの Page に移す
      migrate: (persisted, version) => {
        if (version >= 4) return persisted as Snapshot
        const old = persisted as { graph: unknown; positions?: Positions }
        const project = parseProject(old.graph, 'Page 1')
        const page = project.pages[0]
        return { project, positions: { [page.id]: old.positions ?? {} }, pageId: page.id }
      },
    },
  ),
)
