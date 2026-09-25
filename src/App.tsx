import { useReactFlow, useStoreApi, type OnSelectionChangeFunc } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AddNode } from './components/AddNode.tsx'
import { EdgeEditor } from './components/EdgeEditor.tsx'
import { GraphCanvas } from './components/GraphCanvas.tsx'
import { NodeEditor } from './components/NodeEditor.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { VIEWS, focusTypeOf, projectGraph, showsUnconnected, type ViewId } from './graph/filters.ts'
import { downloadText, parseProjectGraph } from './graph/io.ts'
import { fitViewOptions, layoutGraph, positionBelow } from './graph/layout.ts'
import type { ArchitectureNode } from './graph/types.ts'
import { useProjectStore } from './store/projectStore.ts'

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

  const projectName = useProjectStore((s) => s.graph.name)
  const setProjectName = useProjectStore((s) => s.setProjectName)
  const addNodeToStore = useProjectStore((s) => s.addNode)
  const setPositions = useProjectStore((s) => s.setPositions)
  const replaceGraph = useProjectStore((s) => s.replaceGraph)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const canUndo = useProjectStore((s) => s.past.length > 0)
  const canRedo = useProjectStore((s) => s.future.length > 0)
  const isEmpty = useProjectStore((s) => s.graph.nodes.length === 0 && s.graph.edges.length === 0)
  const { getNodes, getEdges, fitView } = useReactFlow()
  const flowStore = useStoreApi()

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

  // 検索で選んだ Node へ移動する。今の View に表示されない Node なら、その Type の View へ切り替える
  function jumpToNode(id: string) {
    const graph = useProjectStore.getState().graph
    const node = graph.nodes.find((n) => n.id === id)
    if (!node) return
    const visible = projectGraph(graph, view).nodes.some((n) => n.id === id)
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
    const { graph, positions } = useProjectStore.getState()
    const target = showsUnconnected(view, node.type) ? view : 'overview'
    addNodeToStore(node, {
      [target]: positionBelow(graph, positions, target),
      overview: positionBelow(graph, positions, 'overview'),
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

  function exportJson() {
    const graph = useProjectStore.getState().graph
    downloadText(`${graph.name || 'project'}.json`, JSON.stringify(graph, null, 2), 'application/json')
  }

  async function importJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const graph = parseProjectGraph(JSON.parse(await file.text()))
      if (!confirm(`「${graph.name}」（Node ${graph.nodes.length} 件）で現在の Graph を置き換えます（Undo で戻せます）。`)) return
      replaceGraph(graph)
      changeView('overview')
      requestAnimationFrame(() => fitView(fitViewOptions))
    } catch (error) {
      alert(`Import できませんでした: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Node と Edge をすべて消す。Project 名は残す
  function deleteAll() {
    const graph = useProjectStore.getState().graph
    if (!confirm(`Node ${graph.nodes.length} 件と Edge ${graph.edges.length} 件をすべて削除します（Undo で戻せます）。`)) return
    replaceGraph({ name: graph.name, nodes: [], edges: [] })
    setSelection(null)
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
          <button onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importJson} />
          <button className="danger" onClick={deleteAll} disabled={isEmpty}>
            Delete All
          </button>
        </div>
      </header>
      <Sidebar view={view} onChangeView={changeView} onAutoLayout={autoLayout} />
      <main className="canvas">
        {/* View を切り替えたら Canvas を作り直し、その View 全体が見えるよう表示位置を合わせ直す */}
        <GraphCanvas
          key={view}
          view={view}
          flowFrom={selection?.kind === 'node' ? selection.id : null}
          searchQuery={query}
          focusNodeId={focusNodeId}
          onFocused={onFocused}
          onSelectionChange={onSelectionChange}
        />
      </main>
      {panel}
    </div>
  )
}

export default App
