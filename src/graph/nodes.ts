import { TYPES_WITH_FIELDS, type ArchitectureNode } from './types.ts'

// 一覧や Edge の両端など、Node を1行で表す名前
export function nodeTitle(node: ArchitectureNode): string {
  return node.name || '(untitled)'
}

// 空行を除いた項目名
export function fieldsOf(node: ArchitectureNode): string[] {
  return (node.fields ?? []).map((f) => f.trim()).filter(Boolean)
}

// 項目は、持てる種類のときだけ残す。Type を変えたら消す
export function keepTypeAttributes(node: ArchitectureNode): ArchitectureNode {
  const { fields, ...rest } = node
  return TYPES_WITH_FIELDS.includes(rest.type) && fields ? { ...rest, fields } : rest
}

// 名前・説明・項目名のどれかに検索語を含む Node。大文字と小文字は区別しない
export function searchNodes(nodes: ArchitectureNode[], query: string): ArchitectureNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes.filter((n) => [n.name, n.description, ...fieldsOf(n)].some((text) => text?.toLowerCase().includes(q)))
}
