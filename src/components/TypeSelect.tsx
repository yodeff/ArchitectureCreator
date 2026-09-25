import { NODE_TYPES, NODE_TYPE_INFO, type NodeType } from '../graph/types.ts'

// 種類を選ぶ欄。選んだ種類が、クリーンアーキテクチャのどの層で何をするものかを下に出す
export function TypeSelect({ value, onChange }: { value: NodeType; onChange: (type: NodeType) => void }) {
  const info = NODE_TYPE_INFO[value]
  return (
    <label>
      Type
      <select value={value} onChange={(e) => onChange(e.target.value as NodeType)}>
        {NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {NODE_TYPE_INFO[t].label}
          </option>
        ))}
      </select>
      <span className="hint">
        {info.layer}: {info.role}
      </span>
    </label>
  )
}
