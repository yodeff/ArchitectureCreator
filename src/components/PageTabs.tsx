import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import type { ArchitecturePage } from '../graph/types.ts'
import { currentPage, useProjectStore } from '../store/projectStore.ts'

// 大きなコンポーネントごとの Page を切り替えるタブ。ダブルクリックで名前を変える
export function PageTabs() {
  const pages = useProjectStore((s) => s.project.pages)
  const pageId = useProjectStore((s) => currentPage(s).id)
  const selectPage = useProjectStore((s) => s.selectPage)
  const addPage = useProjectStore((s) => s.addPage)
  const renamePage = useProjectStore((s) => s.renamePage)
  const deletePage = useProjectStore((s) => s.deletePage)
  const [renaming, setRenaming] = useState<string | null>(null)

  // 入力欄から離れたら確定する（Enter は離れる、Escape は元の名前に戻してから離れる）
  function finishRename(page: ArchitecturePage, e: FocusEvent<HTMLInputElement>) {
    const name = e.currentTarget.value.trim()
    if (name && name !== page.name) renamePage(page.id, name)
    setRenaming(null)
  }

  function onRenameKeyDown(page: ArchitecturePage, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') e.currentTarget.value = page.name
    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
  }

  function remove(page: ArchitecturePage) {
    const hasContent = page.nodes.length > 0 || page.edges.length > 0
    const message = `Page「${page.name}」（Node ${page.nodes.length} 件・Edge ${page.edges.length} 件）を削除します（Undo で戻せます）。`
    if (hasContent && !confirm(message)) return
    deletePage(page.id)
  }

  return (
    <nav className="page-tabs" aria-label="Pages">
      {pages.map((page) => {
        const active = page.id === pageId
        return (
          <div key={page.id} className={active ? 'page-tab active' : 'page-tab'}>
            {renaming === page.id ? (
              <input
                aria-label="Page name"
                defaultValue={page.name}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => finishRename(page, e)}
                onKeyDown={(e) => onRenameKeyDown(page, e)}
              />
            ) : (
              <button
                aria-current={active ? 'page' : undefined}
                title="ダブルクリックで名前を変更"
                onClick={() => selectPage(page.id)}
                onDoubleClick={() => setRenaming(page.id)}
              >
                {page.name || '(untitled)'}
              </button>
            )}
            {active && pages.length > 1 && renaming !== page.id && (
              <button className="page-close" aria-label={`Page「${page.name}」を削除`} title="Page を削除" onClick={() => remove(page)}>
                ×
              </button>
            )}
          </div>
        )
      })}
      <button className="page-add" title="Page を追加" aria-label="Page を追加" onClick={addPage}>
        +
      </button>
    </nav>
  )
}
