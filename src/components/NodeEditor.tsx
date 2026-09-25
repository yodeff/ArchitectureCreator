import { TYPES_WITH_FIELDS } from '../graph/types.ts'
import { mergeKeyOf, useProjectStore } from '../store/projectStore.ts'
import { TypeSelect } from './TypeSelect.tsx'

export function NodeEditor({ nodeId }: { nodeId: string }) {
  const node = useProjectStore((s) => s.graph.nodes.find((n) => n.id === nodeId))
  const updateNode = useProjectStore((s) => s.updateNode)
  const deleteElements = useProjectStore((s) => s.deleteElements)
  if (!node) return null

  // 文字入力の変更は、欄ごとに Undo の1回にまとめる
  const typing = (field: string) => mergeKeyOf(node.id, field)

  return (
    <aside className="panel">
      <h2>Node</h2>
      <TypeSelect value={node.type} onChange={(type) => updateNode(node.id, { type })} />
      <label>
        Name
        <input value={node.name} onChange={(e) => updateNode(node.id, { name: e.target.value }, typing('name'))} />
      </label>
      <label>
        Description
        <textarea
          rows={6}
          value={node.description ?? ''}
          onChange={(e) => updateNode(node.id, { description: e.target.value || undefined }, typing('description'))}
        />
      </label>
      {TYPES_WITH_FIELDS.includes(node.type) && (
        <label>
          Fields（1行に1つ）
          <textarea
            rows={5}
            className="code"
            value={(node.fields ?? []).join('\n')}
            placeholder={'id\nuserId\ntotalAmount'}
            onChange={(e) =>
              updateNode(node.id, { fields: e.target.value ? e.target.value.split('\n') : undefined }, typing('fields'))
            }
          />
        </label>
      )}
      <button className="danger" onClick={() => deleteElements([node.id], [])}>
        Delete Node
      </button>
    </aside>
  )
}
