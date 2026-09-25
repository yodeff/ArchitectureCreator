import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeProps,
  type OnDelete,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import { projectGraph, type ViewId } from '../graph/filters.ts'
import { traceFlow } from '../graph/flow.ts'
import { fitViewOptions, resolvePositions } from '../graph/layout.ts'
import { fieldsOf, searchNodes } from '../graph/nodes.ts'
import { EDGE_COLORS, EDGE_KIND_LABELS, NODE_TYPE_INFO, type ArchitectureEdge, type ArchitectureNode } from '../graph/types.ts'
import { useProjectStore } from '../store/projectStore.ts'
import { Legend } from './Legend.tsx'

// faded: 選んだ Node を通る流れに含まれない（流れのハイライト中だけ）
type ArchFlowNode = Node<{ node: ArchitectureNode; dimmed: boolean; faded: boolean; searchHit: boolean }, 'arch'>

function ArchNodeView({ data }: NodeProps<ArchFlowNode>) {
  const { node, dimmed, faded, searchHit } = data
  const fields = fieldsOf(node)
  const className = ['arch-node', `type-${node.type}`, dimmed && 'dimmed', faded && 'faded', searchHit && 'search-hit']
  return (
    <div className={className.filter(Boolean).join(' ')} title={node.description}>
      <Handle type="target" position={Position.Left} />
      <span className="badge">{NODE_TYPE_INFO[node.type].label}</span>
      <div className="arch-node-name">{node.name || '(untitled)'}</div>
      {fields.length > 0 && (
        <ul className="fields">
          {fields.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

// 読む・書く線は色を変える。流れのハイライト中は、流れに含まれる線を動かし、それ以外を薄くする
function toFlowEdge(edge: ArchitectureEdge, inFlow: boolean | undefined): Edge {
  const color = EDGE_COLORS[edge.kind ?? 'plain']
  const label = [edge.kind && EDGE_KIND_LABELS[edge.kind], edge.note].filter(Boolean).join(' · ')
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: label || undefined,
    style: { stroke: color },
    markerEnd: { type: MarkerType.ArrowClosed, color },
    animated: inFlow === true,
    className: inFlow === false ? 'faded' : undefined,
  }
}

const nodeTypes = { arch: ArchNodeView }
const isValidConnection: IsValidConnection = (c) => c.source !== c.target
const deleteKeys = ['Backspace', 'Delete']
const SEARCH_HIT_COLOR = '#ca8a04'

interface Props {
  view: ViewId
  // 流れをハイライトする起点（選択中の Node）
  flowFrom: string | null
  searchQuery: string
  // 検索で選んだ Node。表示されたら選択して中央に寄せ、onFocused で知らせる
  focusNodeId: string | null
  onFocused: () => void
  onSelectionChange: OnSelectionChangeFunc
}

export function GraphCanvas({ view, flowFrom, searchQuery, focusNodeId, onFocused, onSelectionChange }: Props) {
  const graph = useProjectStore((s) => s.graph)
  const positions = useProjectStore((s) => s.positions)
  const addEdge = useProjectStore((s) => s.addEdge)
  const deleteElements = useProjectStore((s) => s.deleteElements)
  const setPositions = useProjectStore((s) => s.setPositions)
  const { fitView } = useReactFlow()

  const projection = useMemo(() => projectGraph(graph, view), [graph, view])
  const searchHits = useMemo(
    () => new Set(searchNodes(projection.nodes, searchQuery).map((n) => n.id)),
    [projection, searchQuery],
  )
  const flow = useMemo(() => (flowFrom ? traceFlow(graph, flowFrom) : undefined), [graph, flowFrom])
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // 正本（store）から表示用の Node / Edge を作る。React Flow が持つ選択状態と計測サイズだけ引き継ぐ
  useEffect(() => {
    const resolved = resolvePositions(graph, positions, view)
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return projection.nodes.map((node) => ({
        id: node.id,
        type: 'arch',
        position: resolved[node.id],
        data: {
          node,
          dimmed: !projection.focusIds.has(node.id),
          faded: !!flow && !flow.nodeIds.has(node.id),
          searchHit: searchHits.has(node.id),
        },
        selected: prevById.get(node.id)?.selected,
        measured: prevById.get(node.id)?.measured,
      }))
    })
  }, [graph, projection, positions, view, flow, searchHits, setNodes])

  useEffect(() => {
    setEdges((prev) => {
      const selected = new Set(prev.filter((e) => e.selected).map((e) => e.id))
      return projection.edges.map((e) => ({ ...toFlowEdge(e, flow?.edgeIds.has(e.id)), selected: selected.has(e.id) }))
    })
  }, [projection, flow, setEdges])

  useEffect(() => {
    if (!focusNodeId || !nodes.some((n) => n.id === focusNodeId)) return
    setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === focusNodeId })))
    setEdges((prev) => prev.map((e) => (e.selected ? { ...e, selected: false } : e)))
    void fitView({ nodes: [{ id: focusNodeId }], maxZoom: 1, duration: 300 })
    onFocused()
  }, [focusNodeId, nodes, setNodes, setEdges, fitView, onFocused])

  const onConnect = useCallback((c: Connection) => addEdge(c.source, c.target), [addEdge])

  const onDelete: OnDelete<ArchFlowNode> = useCallback(
    ({ nodes, edges }) => deleteElements(nodes.map((n) => n.id), edges.map((e) => e.id)),
    [deleteElements],
  )

  const onNodeDragStop: OnNodeDrag<ArchFlowNode> = useCallback(
    (_event, _node, dragged) => setPositions(view, Object.fromEntries(dragged.map((n) => [n.id, n.position]))),
    [view, setPositions],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      onNodeDragStop={onNodeDragStop}
      onSelectionChange={onSelectionChange}
      isValidConnection={isValidConnection}
      deleteKeyCode={deleteKeys}
      fitView
      fitViewOptions={fitViewOptions}
      minZoom={0.1}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap<ArchFlowNode>
        pannable
        zoomable
        nodeColor={(n) => `var(--${n.data.node.type})`}
        nodeClassName={(n) => (n.data.dimmed ? 'dimmed' : '')}
        nodeStrokeColor={(n) => (n.data.searchHit ? SEARCH_HIT_COLOR : 'transparent')}
        nodeStrokeWidth={8}
      />
      <Panel position="top-right">
        <Legend />
      </Panel>
      {projection.nodes.length === 0 && (
        <Panel position="top-center" className="empty-note">
          この View に表示する Node はありません
        </Panel>
      )}
    </ReactFlow>
  )
}
