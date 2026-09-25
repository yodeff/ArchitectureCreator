import { useRef, useState, type FormEvent } from 'react'
import type { ArchitectureNode, NodeType } from '../graph/types.ts'
import { TypeSelect } from './TypeSelect.tsx'

interface Props {
  initialType: NodeType
  onAdd: (node: Omit<ArchitectureNode, 'id'>) => void
  onClose: () => void
}

// 続けて何件も登録できるよう、追加後もフォームは開いたままにする
export function AddNode({ initialType, onAdd, onClose }: Props) {
  const [type, setType] = useState(initialType)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ type, name: name.trim(), description: description.trim() || undefined })
    setName('')
    setDescription('')
    nameRef.current?.focus()
  }

  return (
    <aside className="panel">
      <h2>Add Node</h2>
      <form onSubmit={submit}>
        <TypeSelect value={type} onChange={setType} />
        <label>
          Name
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>
          Description
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="row">
          <button type="submit" className="primary">
            Add
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </aside>
  )
}
