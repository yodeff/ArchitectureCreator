import { useReactFlow, useStoreApi, type OnSelectionChangeFunc } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AddNode } from './components/AddNode.tsx'
import { EdgeEditor } from './components/EdgeEditor.tsx'
import { GraphCanvas } from './components/GraphCanvas.tsx'
import { NodeEditor } from './components/NodeEditor.tsx'
import { PageTabs } from './components/PageTabs.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { VIEWS, focusTypeOf, projectGraph, showsUnconnected, type ViewId } from './graph/filters.ts'
import { downloadText, parseProject, serializeProject } from './graph/io.ts'
import { fitViewOptions, layoutGraph, positionBelow } from './graph/layout.ts'
import type { ArchitectureNode, ArchitecturePage } from './graph/types.ts'
import { currentPage, currentPositions, isEmptyProject, useProjectStore } from './store/projectStore.ts'

type Selection = { kind: 'node' | 'edge'; id: string } | null

const NODE_SIZE = { width: 180, height: 56 }

// 文字を入力している欄。ここでの Ctrl+Z は、入力欄の Undo に任せる
function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.matches('textarea, input:not([type=checkbox])') || target.isContentEditable)
}

function App() {
  const [view, setView] = useState<ViewId>('overview')
  const [selection, setSelection] = useState<Selection>(null)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const projectName = useProjectStore((s) => s.project.name)
  const pageId = useProjectStore((s) => currentPage(s).id)
  const setProjectName = useProjectStore((s) => s.setProjectName)
  const selectPage = useProjectStore((s) => s.selectPage)
  const addNodeToStore = useProjectStore((s) => s.addNode)
  const setPositions = useProjectStore((s) => s.setPositions)
  const importPages = useProjectStore((s) => s.importPages)
  const clearProject = useProjectStore((s) => s.clearProject)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const canUndo = useProjectStore((s) => s.past.length > 0)
  const canRedo = useProjectStore((s) => s.future.length > 0)
  const isEmpty = useProjectStore((s) => isEmptyProject(s.project))
  const { getNodes, getEdges, fitView } = useReactFlow()
  const flowStore = useStoreApi()

  // Page が変わったら（タブ・Undo・検索での移動・Import）、選んでいた Node / Edge の選択を解く
  const [selectionPageId, setSelectionPageId] = useState(pageId)
  if (selectionPageId !== pageId) {
    setSelectionPageId(pageId)
    setSelection(null)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if (isTextField(e.target)) {
        return
      } else if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  function changeView(next: ViewId) {
    setView(next)
    setSelection(null)
  }

  // 検索で選んだ Node へ移動する。別の Page の Node なら、その Page に切り替える。
  // 今の View に表示されない Node なら、その Type の View へ切り替える
  function jumpToNode(targetPageId: string, id: string) {
    const page = useProjectStore.getState().project.pages.find((p) => p.id === targetPageId)
    const node = page?.nodes.find((n) => n.id === id)
    if (!page || !node) return
    selectPage(page.id)
    const visible = projectGraph(page, view).nodes.some((n) => n.id === id)
    const target = visible ? view : (VIEWS.find((v) => v.focus === node.type)?.id ?? 'overview')
    if (target !== view) changeView(target)
    setAdding(false)
    setFocusNodeId(id)
  }

  const onFocused = useCallback(() => setFocusNodeId(null), [])

  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes, edges }) => {
    if (nodes.length === 1 && edges.length === 0) setSelection({ kind: 'node', id: nodes[0].id })
    else if (edges.length === 1 && nodes.length === 0) setSelection({ kind: 'edge', id: edges[0].id })
    else setSelection(null)
    if (nodes.length + edges.length > 0) setAdding(false)
  }, [])

  function openAddNode() {
    flowStore.getState().unselectNodesAndEdges()
    setAdding(true)
  }

  // 今の View に表示されない Type なら、追加後に Overview へ切り替えて見えるようにする
  function addNode(node: Omit<ArchitectureNode, 'id'>) {
    const state = useProjectStore.getState()
    const page = currentPage(state)
    const positions = currentPositions(state)
    const target = showsUnconnected(view, node.type) ? view : 'overview'
    addNodeToStore(node, {
      [target]: positionBelow(page, positions, target),
      overview: positionBelow(page, positions, 'overview'),
    })
    if (target !== view) changeView(target)
    requestAnimationFrame(() => fitView(fitViewOptions))
  }

  async function autoLayout() {
    const positions = await layoutGraph(
      getNodes().map((n) => ({
        id: n.id,
        width: n.measured?.width ?? NODE_SIZE.width,
        height: n.measured?.height ?? NODE_SIZE.height,
      })),
      getEdges(),
    )
    setPositions(view, positions)
    requestAnimationFrame(() => fitView(fitViewOptions))
  }

  // すべての Page を1つのファイルに書き出す
  function exportJson() {
    const project = useProjectStore.getState().project
    downloadText(`${project.name || 'project'}.json`, serializeProject(project), 'application/json')
  }

  // 選んだファイル（複数可）の Page を、今の Project の後ろに足す。Page を持たないファイルは、1つの Page になる。
  // 読めないファイルがあっても、読めたファイルは取り込む
  async function importJson(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    const pages: ArchitecturePage[] = []
    const errors: string[] = []
    for (const file of files) {
      try {
        pages.push(...parseProject(JSON.parse(await file.text()), file.name.replace(/\.json$/i, '')).pages)
      } catch (error) {
        errors.push(`・${file.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (pages.length > 0) {
      importPages(pages)
      changeView('overview')
    }
    if (errors.length > 0) alert(`Import できなかったファイルがあります:\n${errors.join('\n')}`)
  }

  // すべての Page を消し、空の Page を1つ残す。Project 名は残す
  function deleteAll() {
    const { pages } = useProjectStore.getState().project
    const nodes = pages.reduce((sum, p) => sum + p.nodes.length, 0)
    const edges = pages.reduce((sum, p) => sum + p.edges.length, 0)
    if (!confirm(`Page ${pages.length} 件（Node ${nodes} 件・Edge ${edges} 件）をすべて削除します（Undo で戻せます）。`)) return
    clearProject()
  }

  let panel = null
  if (adding) {
    panel = <AddNode initialType={focusTypeOf(view) ?? 'requirement'} onAdd={addNode} onClose={() => setAdding(false)} />
  } else if (selection?.kind === 'node') {
    panel = <NodeEditor nodeId={selection.id} />
  } else if (selection?.kind === 'edge') {
    panel = <EdgeEditor edgeId={selection.id} />
  }

  return (
    <div className="app">
      <header className="header">
        <input
          className="project-name"
          aria-label="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <SearchBox query={query} onQueryChange={setQuery} onJump={jumpToNode} inputRef={searchRef} />
        <div className="actions">
          <button onClick={undo} disabled={!canUndo} title="Undo（Ctrl+Z）">
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo（Ctrl+Shift+Z / Ctrl+Y）">
            Redo
          </button>
          <button className="primary" onClick={openAddNode}>
            + Add Node
          </button>
          <button onClick={exportJson}>Export JSON</button>
          <button onClick={() => fileRef.current?.click()} title="選んだファイルを Page として追加する（複数選べる）">
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" multiple hidden onChange={importJson} />
          <button className="danger" onClick={deleteAll} disabled={isEmpty}>
            Delete All
          </button>
        </div>
      </header>
      <Sidebar view={view} onChangeView={changeView} onAutoLayout={autoLayout} />
      <main className="workspace">
        <div className="canvas">
          {/* Page や View を切り替えたら Canvas を作り直し、全体が見えるよう表示位置を合わせ直す */}
          <GraphCanvas
            key={`${pageId}:${view}`}
            view={view}
            flowFrom={selection?.kind === 'node' ? selection.id : null}
            searchQuery={query}
            focusNodeId={focusNodeId}
            onFocused={onFocused}
            onSelectionChange={onSelectionChange}
          />
        </div>
        <PageTabs />
      </main>
      {panel}
    </div>
  )
}

export default App
