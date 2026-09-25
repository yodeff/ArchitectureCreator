import { useEffect, useMemo, useRef, useState } from 'react'
import { toAgentMarkdown } from '../graph/agentMarkdown.ts'
import { downloadText } from '../graph/io.ts'
import { useProjectStore } from '../store/projectStore.ts'

// コーディングエージェントに渡す Markdown を見せ、コピーか .md での保存をする
export function AgentExportDialog({ onClose }: { onClose: () => void }) {
  const graph = useProjectStore((s) => s.graph)
  const markdown = useMemo(() => toAgentMarkdown(graph), [graph])
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  async function copy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
  }

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <h2>Export for AI</h2>
      <p className="dialog-note">
        この Markdown をコーディングエージェントに渡すと、クリーンアーキテクチャでの構成を一緒に詰められます。
      </p>
      <textarea className="code" readOnly value={markdown} aria-label="Markdown" />
      <div className="row">
        <button className="primary" onClick={copy}>
          {copied ? 'コピーしました' : 'コピー'}
        </button>
        <button onClick={() => downloadText(`${graph.name || 'project'}.md`, markdown, 'text/markdown')}>
          .md で保存
        </button>
        <button onClick={() => dialogRef.current?.close()}>閉じる</button>
      </div>
    </dialog>
  )
}
