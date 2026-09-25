import { keepTypeAttributes } from './nodes.ts'
import {
  EDGE_KINDS,
  NODE_TYPES,
  type ArchitectureEdge,
  type ArchitectureNode,
  type EdgeKind,
  type NodeType,
  type ProjectGraph,
} from './types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function isEdgeKind(value: unknown): value is EdgeKind {
  return EDGE_KINDS.includes(value as EdgeKind)
}

// 以前の形式には Component があった。サービスとして処理を受け持つ役割だったので、UseCase として読む
function parseType(value: unknown): NodeType | undefined {
  if (value === 'component') return 'usecase'
  return NODE_TYPES.includes(value as NodeType) ? (value as NodeType) : undefined
}

// 項目名。以前の形式のカラム（{ name, type, ... }）は名前だけを読む
function parseFields(n: Record<string, unknown>): string[] | undefined {
  const source = Array.isArray(n.fields) ? n.fields : Array.isArray(n.columns) ? n.columns : undefined
  const fields = source
    ?.map((f: unknown) => (isRecord(f) ? f.name : f))
    .filter((f): f is string => typeof f === 'string' && f.trim() !== '')
  return fields && fields.length > 0 ? fields : undefined
}

// 以前の形式の API は method と path を持っていた。名前がなければ、それを名前にする
function legacyApiName(n: Record<string, unknown>): string {
  const api = n.api
  return isRecord(api) && typeof api.method === 'string' && typeof api.path === 'string' ? `${api.method} ${api.path}` : ''
}

// Import した JSON や、以前の形式で保存したデータを検証して ProjectGraph にする。
// 形が壊れているときだけ Error を投げ、以前の形式の違い（種類・属性・関係）は読み替える
export function parseProjectGraph(value: unknown): ProjectGraph {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error('nodes と edges の配列が必要です')
  }

  const ids = new Set<string>()
  const nodes: ArchitectureNode[] = value.nodes.map((n: unknown, i) => {
    if (!isRecord(n) || typeof n.id !== 'string' || typeof n.name !== 'string') {
      throw new Error(`nodes[${i}] に id と name（文字列）が必要です`)
    }
    const type = parseType(n.type)
    if (!type) throw new Error(`nodes[${i}] の type が不正です: ${String(n.type)}`)
    if (ids.has(n.id)) throw new Error(`Node の id が重複しています: ${n.id}`)
    ids.add(n.id)
    return keepTypeAttributes({
      id: n.id,
      type,
      name: n.name || legacyApiName(n),
      description: optionalString(n.description),
      fields: parseFields(n),
    })
  })

  const edges: ArchitectureEdge[] = value.edges.map((e: unknown, i) => {
    if (!isRecord(e) || typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string') {
      throw new Error(`edges[${i}] に id・source・target（文字列）が必要です`)
    }
    if (!ids.has(e.source) || !ids.has(e.target)) {
      throw new Error(`edges[${i}] が存在しない Node を参照しています`)
    }
    // 以前の形式は、関係を自由入力のラベル（label）で持っていた。reads / writes 以外は補足として残す
    const kind = [e.kind, e.label].find(isEdgeKind)
    const note = optionalString(e.note) ?? (kind ? undefined : optionalString(e.label))
    return { id: e.id, source: e.source, target: e.target, kind, note }
  })

  return { name: typeof value.name === 'string' ? value.name : 'Imported Project', nodes, edges }
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}
