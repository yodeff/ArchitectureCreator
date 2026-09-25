import { EDGE_COLORS, EDGE_KINDS, EDGE_KIND_LABELS, NODE_TYPES, NODE_TYPE_INFO } from '../graph/types.ts'

const LINES = [
  { color: EDGE_COLORS.plain, label: '使う（使う側 → 使われる側）' },
  ...EDGE_KINDS.map((kind) => ({ color: EDGE_COLORS[kind], label: `データを${EDGE_KIND_LABELS[kind]}` })),
]

// 線の意味と、種類ごとのクリーンアーキテクチャの層
export function Legend() {
  return (
    <details className="legend">
      <summary>凡例</summary>
      <ul>
        {LINES.map((line) => (
          <li key={line.label}>
            <svg width="28" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="28" y2="4" stroke={line.color} strokeWidth="2" />
            </svg>
            {line.label}
          </li>
        ))}
      </ul>
      <ul>
        {NODE_TYPES.map((type) => (
          <li key={type} className={`type-${type}`}>
            <span className="legend-swatch" />
            {NODE_TYPE_INFO[type].label}
            <span className="legend-layer">{NODE_TYPE_INFO[type].layer}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
