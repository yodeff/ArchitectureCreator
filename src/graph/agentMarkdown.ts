import { fieldsOf, nodeTitle } from './nodes.ts'
import {
  EDGE_KIND_LABELS,
  NODE_TYPES,
  NODE_TYPE_INFO,
  type ArchitectureEdge,
  type ArchitectureNode,
  type NodeType,
  type ProjectGraph,
} from './types.ts'

// クリーンアーキテクチャの依存の向きから外れていそうな矢印（使う側 → 使われる側）
const UNEXPECTED_USES: { from: NodeType[]; to: NodeType[]; reason: string }[] = [
  {
    from: ['entity'],
    to: ['api', 'usecase', 'database', 'external'],
    reason: 'Entity はほかの層に依存しない。データの読み書きは UseCase から Repository 越しにする',
  },
  { from: ['usecase'], to: ['api'], reason: 'UseCase は入口（API）に依存しない。矢印の向きが逆かもしれない' },
  { from: ['api'], to: ['entity', 'database', 'external'], reason: 'API は UseCase を通して処理する' },
  {
    from: ['database', 'external'],
    to: ['requirement', 'api', 'usecase', 'entity', 'external'],
    reason: 'Database・External は使われる側。矢印の向きが逆かもしれない',
  },
]

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' / ')
}

function edgeText(edge: ArchitectureEdge): string {
  return [edge.kind && EDGE_KIND_LABELS[edge.kind], edge.note].filter(Boolean).join(': ')
}

// コーディングエージェントに渡す Markdown。クリーンアーキテクチャの層との対応、UseCase ごとの流れ、
// 確認したい点（依存の向き・つながっていない要素）、Mermaid の図を書く
export function toAgentMarkdown(graph: ProjectGraph): string {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const ofType = (type: NodeType) => graph.nodes.filter((n) => n.type === type)
  // 向きを問わず、直接つながる Node と、その線
  const neighbors = (node: ArchitectureNode, type: NodeType) =>
    graph.edges.flatMap((edge) => {
      const otherId = edge.source === node.id ? edge.target : edge.target === node.id ? edge.source : undefined
      const other = otherId && byId.get(otherId)
      return other && other.type === type ? [{ node: other, edge }] : []
    })
  const list = (items: { node: ArchitectureNode; edge: ArchitectureEdge }[], unspecified?: string) =>
    items
      .map(({ node, edge }) => {
        const text = edgeText(edge) || unspecified
        return text ? `${nodeTitle(node)}（${text}）` : nodeTitle(node)
      })
      .join('、')

  const lines: string[] = [
    `# ${graph.name || 'Project'} のアーキテクチャ`,
    '',
    'Architecture Workspace で描いた図から書き出した。クリーンアーキテクチャで実装する前提で、要素の種類を次の層に対応させている。',
    '矢印は「使う側 → 使われる側」。「読む」「書く」はデータの読み書きを表す。細部（クラス名・メソッド・テーブル定義など）は決めていない。',
    '',
    '| 種類 | 層 | 役割 |',
    '|---|---|---|',
    ...NODE_TYPES.map((t) => `| ${NODE_TYPE_INFO[t].label} | ${NODE_TYPE_INFO[t].layer} | ${NODE_TYPE_INFO[t].role} |`),
    '',
    '## UseCase ごとの流れ',
  ]

  const usecases = ofType('usecase')
  if (usecases.length === 0) lines.push('', '（UseCase はまだない）')
  for (const uc of usecases) {
    const rows: [string, string][] = [
      ['説明', uc.description ? oneLine(uc.description) : ''],
      ['満たす要件', list(neighbors(uc, 'requirement'))],
      ['入口（API）', list(neighbors(uc, 'api'))],
      ['使う Entity', list(neighbors(uc, 'entity'))],
      ['データ（Repository 越し）', list(neighbors(uc, 'database'), '読み書きは未指定')],
      ['外部サービス（Gateway 越し）', list(neighbors(uc, 'external'))],
      ['関係する UseCase', list(neighbors(uc, 'usecase'))],
    ]
    lines.push('', `### ${nodeTitle(uc)}`, '', ...rows.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`))
  }

  lines.push('', '## 要素の一覧')
  for (const type of NODE_TYPES) {
    const nodes = ofType(type)
    if (nodes.length === 0) continue
    lines.push('', `### ${NODE_TYPE_INFO[type].label}（${NODE_TYPE_INFO[type].layer}）`, '')
    for (const node of nodes) {
      lines.push(`- ${nodeTitle(node)}${node.description ? ` — ${oneLine(node.description)}` : ''}`)
      const fields = fieldsOf(node)
      if (fields.length > 0) lines.push(`  - 項目: ${fields.join(', ')}`)
    }
  }

  const checks: string[] = []
  for (const edge of graph.edges) {
    const from = byId.get(edge.source)
    const to = byId.get(edge.target)
    if (!from || !to) continue
    const rule = UNEXPECTED_USES.find((r) => r.from.includes(from.type) && r.to.includes(to.type))
    if (rule) checks.push(`- ${nodeTitle(from)} → ${nodeTitle(to)}: ${rule.reason}`)
  }
  const connected = new Set(graph.edges.flatMap((e) => [e.source, e.target]))
  for (const node of graph.nodes) {
    const title = `${NODE_TYPE_INFO[node.type].label}「${nodeTitle(node)}」`
    if (!connected.has(node.id)) checks.push(`- ${title}がどこにもつながっていない`)
    else if (node.type === 'requirement' && neighbors(node, 'usecase').length === 0)
      checks.push(`- ${title}を実現する UseCase がない`)
    else if (node.type === 'usecase' && neighbors(node, 'api').length === 0)
      checks.push(`- ${title}の入口（API など）がない`)
  }
  if (checks.length > 0) lines.push('', '## 確認したい点', '', ...checks)

  lines.push('', '## 図', '', '```mermaid', 'flowchart LR')
  const mermaidId = new Map(graph.nodes.map((n, i) => [n.id, `n${i + 1}`]))
  const quote = (text: string) => `"${text.replace(/"/g, '#quot;')}"`
  for (const type of NODE_TYPES) {
    const nodes = ofType(type)
    if (nodes.length === 0) continue
    lines.push(`  subgraph ${type}[${quote(`${NODE_TYPE_INFO[type].label}（${NODE_TYPE_INFO[type].layer}）`)}]`)
    for (const node of nodes) lines.push(`    ${mermaidId.get(node.id)}[${quote(nodeTitle(node))}]`)
    lines.push('  end')
  }
  for (const edge of graph.edges) {
    const text = edgeText(edge)
    const arrow = text ? `-->|${quote(text)}|` : '-->'
    lines.push(`  ${mermaidId.get(edge.source)} ${arrow} ${mermaidId.get(edge.target)}`)
  }
  lines.push('```', '')

  return lines.join('\n')
}
