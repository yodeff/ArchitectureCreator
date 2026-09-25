import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { nodeTitle, searchNodes } from '../graph/nodes.ts'
import { NODE_TYPE_INFO } from '../graph/types.ts'
import { currentPage, useProjectStore } from '../store/projectStore.ts'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  // 選んだ Node へ移動する
  onJump: (pageId: string, nodeId: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

// すべての Page から Node を探す。表示中の Page の結果を先に並べる。
// 一致した Node は Canvas とミニマップでも強調する（GraphCanvas）
export function SearchBox({ query, onQueryChange, onJump, inputRef }: Props) {
  const pages = useProjectStore((s) => s.project.pages)
  const pageId = useProjectStore((s) => currentPage(s).id)
  const results = useMemo(() => {
    const ordered = [...pages].sort((a, b) => Number(b.id === pageId) - Number(a.id === pageId))
    return ordered.flatMap((page) => searchNodes(page.nodes, query).map((node) => ({ page, node })))
  }, [pages, pageId, query])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // 移動したら入力欄から離れる。Canvas での Undo などのキー操作が、すぐ効くように
  function jump(pageId: string, nodeId: string) {
    onJump(pageId, nodeId)
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => Math.min(Math.max(i + step, 0), Math.max(results.length - 1, 0)))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      jump(results[active].page.id, results[active].node.id)
    } else if (e.key === 'Escape') {
      if (query) onQueryChange('')
      else inputRef.current?.blur()
    }
  }

  return (
    <div className="search">
      <input
        ref={inputRef}
        type="search"
        aria-label="Search nodes"
        placeholder="Node を検索（Ctrl+K）"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim() !== '' && (
        <ul ref={listRef} className="search-results">
          <li className="search-count">{results.length === 0 ? '見つかりません' : `${results.length} 件`}</li>
          {results.map(({ page, node }, i) => (
            <li key={`${page.id}:${node.id}`}>
              <button
                type="button"
                className={i === active ? 'active' : undefined}
                // 入力欄のフォーカスを外さずに選ぶ（外れると一覧が閉じ、click が届かない）
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => jump(page.id, node.id)}
              >
                <span className={`badge type-${node.type}`}>{NODE_TYPE_INFO[node.type].label}</span>
                <span className="search-title">{nodeTitle(node)}</span>
                {page.id !== pageId && <span className="search-page">{page.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
