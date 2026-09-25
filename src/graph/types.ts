// 並びは、左（要件・入口）から右（データ・外部）への流れの順
export const NODE_TYPES = ['requirement', 'api', 'usecase', 'entity', 'database', 'external'] as const

export type NodeType = (typeof NODE_TYPES)[number]

// 種類ごとの表示名と、クリーンアーキテクチャでの位置づけ
export const NODE_TYPE_INFO: Record<NodeType, { label: string; layer: string; role: string }> = {
  requirement: { label: 'Requirement', layer: '層の外', role: '満たすべき要件' },
  api: { label: 'API', layer: 'Interface Adapters', role: 'Controller。外からの入力を UseCase に渡す' },
  usecase: { label: 'UseCase', layer: 'Use Cases', role: 'Interactor。アプリケーションの処理の流れ' },
  entity: { label: 'Entity', layer: 'Entities', role: 'ドメインのデータとルール' },
  database: {
    label: 'Database',
    layer: 'Frameworks & Drivers',
    role: 'データの保存先。UseCase からは Repository（interface）越しに使う',
  },
  external: {
    label: 'External',
    layer: 'Frameworks & Drivers',
    role: '外部サービス。UseCase からは Gateway（interface）越しに使う',
  },
}

// 項目（Fields）を持てる種類
export const TYPES_WITH_FIELDS: readonly NodeType[] = ['entity', 'database']

// 線は、ただの矢印（使う側 → 使われる側）か、データを読む・書く線
export const EDGE_KINDS = ['reads', 'writes'] as const

export type EdgeKind = (typeof EDGE_KINDS)[number]

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = { reads: '読む', writes: '書く' }

// 線の色。ただの矢印と、データを読む・書く線を見分ける（Canvas と凡例で使う）
export const EDGE_COLORS: Record<EdgeKind | 'plain', string> = { plain: '#71717a', reads: '#0284c7', writes: '#c2410c' }

export interface ArchitectureNode {
  id: string
  type: NodeType
  name: string
  description?: string
  // Entity・Database が持つデータの項目名。入力中の空行も含む（表示と書き出しでは空行を除く）
  fields?: string[]
}

export interface ArchitectureEdge {
  id: string
  source: string
  target: string
  // 未設定は、ただの矢印
  kind?: EdgeKind
  // 補足（例: 注文確定時のみ）
  note?: string
}

// 1つの Page の Node と Edge。View・流れの追跡・整列は、この単位で行う
export interface ArchitectureGraph {
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}

// 大きなコンポーネント（例: 注文・会員）ごとに分けた Page。Page どうしは Edge でつながない
export interface ArchitecturePage extends ArchitectureGraph {
  id: string
  name: string
}

// すべての Page と View の元になる唯一のデータ（Single Source of Truth）。Page は常に1つ以上ある
export interface Project {
  name: string
  pages: ArchitecturePage[]
}
