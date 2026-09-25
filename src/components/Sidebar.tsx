import { VIEWS, type ViewId } from '../graph/filters.ts'

interface Props {
  view: ViewId
  onChangeView: (view: ViewId) => void
  onAutoLayout: () => void
}

export function Sidebar({ view, onChangeView, onAutoLayout }: Props) {
  return (
    <nav className="sidebar">
      <ul className="view-list">
        {VIEWS.map((v) => (
          <li key={v.id}>
            <button className={v.id === view ? 'active' : undefined} onClick={() => onChangeView(v.id)}>
              {v.label}
            </button>
          </li>
        ))}
      </ul>
      <button className="auto-layout" onClick={onAutoLayout}>
        Auto Layout
      </button>
    </nav>
  )
}
