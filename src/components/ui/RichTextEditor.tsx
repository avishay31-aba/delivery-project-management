import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  minHeightClassName?: string
}

export function RichTextEditor({
  value,
  onChange,
  className = '',
  minHeightClassName = 'min-h-20',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  function apply(command: 'bold' | 'italic' | 'underline') {
    document.execCommand(command)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1 rounded-t border border-b-0 border-sf-border bg-sf-surface-alt px-2 py-1">
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bold" onClick={() => apply('bold')}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Italic" onClick={() => apply('italic')}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Underline" onClick={() => apply('underline')}>
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div
        ref={editorRef}
        className={`${minHeightClassName} w-full rounded-b border border-sf-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sf-brand`}
        contentEditable
        role="textbox"
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}

export function RichTextContent({ value }: { value: string }) {
  if (!value) return null
  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: value }} />
}
