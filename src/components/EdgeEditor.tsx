import { nodeTitle } from '../graph/nodes.ts'
import { EDGE_KINDS, EDGE_KIND_LABELS, type EdgeKind } from '../graph/types.ts'
import { currentPage, mergeKeyOf, useProjectStore } from '../store/projectStore.ts'

export function EdgeEditor({ edgeId }: { edgeId: string }) {
  const edge = useProjectStore((s) => currentPage(s).edges.find((e) => e.id === edgeId))
  const nodes = useProjectStore((s) => currentPage(s).nodes)
  const updateEdge = useProjectStore((s) => s.updateEdge)
  const deleteElements = useProjectStore((s) => s.deleteElements)
  if (!edge) return null

  const titleOf = (id: string) => {
    const node = nodes.find((n) => n.id === id)
    return node ? nodeTitle(node) : '(untitled)'
  }

  return (
    <aside className="panel">
      <h2>Edge</h2>
      <p className="edge-ends">
        {titleOf(edge.source)} → {titleOf(edge.target)}
      </p>
      <label>
        Kind
        <select
          value={edge.kind ?? ''}
          onChange={(e) => updateEdge(edge.id, { kind: (e.target.value as EdgeKind) || undefined })}
        >
          <option value="">矢印（使う）</option>
          {EDGE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {EDGE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Note
        <input
          value={edge.note ?? ''}
          placeholder="補足（例: 注文確定時のみ）"
          onChange={(e) => updateEdge(edge.id, { note: e.target.value || undefined }, mergeKeyOf(edge.id, 'note'))}
        />
      </label>
      <button className="danger" onClick={() => deleteElements([], [edge.id])}>
        Delete Edge
      </button>
    </aside>
  )
}
