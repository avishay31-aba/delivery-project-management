import { useEffect, useRef, useState } from 'react'
import { Bold, Highlighter, Italic, List, ListOrdered, Palette, Underline } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  minHeightClassName?: string
  toolbarMode?: 'always' | 'focus'
}

export function RichTextEditor({
  value,
  onChange,
  className = '',
  minHeightClassName = 'min-h-20',
  toolbarMode = 'always',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  function rememberSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange()
    }
  }

  function restoreSelection() {
    const editor = editorRef.current
    editor?.focus()
    const range = selectionRangeRef.current
    const selection = window.getSelection()
    if (!range || !selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function apply(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList', value?: string) {
    restoreSelection()
    document.execCommand(command, false, value)
    rememberSelection()
    onChange(editorRef.current?.innerHTML ?? '')
  }

  function applyColor(command: 'foreColor' | 'hiliteColor', value: string) {
    restoreSelection()
    document.execCommand(command, false, value)
    if (command === 'hiliteColor') {
      document.execCommand('backColor', false, value)
    }
    rememberSelection()
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const showToolbar = toolbarMode === 'always' || focused

  return (
    <div className={className}>
      <div
        className={['flex items-center gap-1 rounded-t border border-b-0 border-sf-border bg-sf-surface-alt px-2 py-1', showToolbar ? '' : 'hidden'].join(' ')}
        onMouseDown={(event) => event.preventDefault()}
      >
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bold" onClick={() => apply('bold')}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Italic" onClick={() => apply('italic')}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Underline" onClick={() => apply('underline')}>
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bullet list" onClick={() => apply('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Numbered list" onClick={() => apply('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <label className="inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" title="Text color">
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          <input className="sr-only" type="color" aria-label="Text color" onChange={(event) => applyColor('foreColor', event.target.value)} />
        </label>
        <label className="inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" title="Highlight">
          <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
          <input className="sr-only" type="color" aria-label="Highlight color" defaultValue="#fff3bf" onChange={(event) => applyColor('hiliteColor', event.target.value)} />
        </label>
      </div>
      <div
        ref={editorRef}
        className={`${minHeightClassName} w-full ${showToolbar ? 'rounded-b' : 'rounded'} border border-sf-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sf-brand`}
        contentEditable
        role="textbox"
        suppressContentEditableWarning
        onInput={(event) => {
          rememberSelection()
          onChange(event.currentTarget.innerHTML)
        }}
        onFocus={() => {
          setFocused(true)
          rememberSelection()
        }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
      />
    </div>
  )
}

export function RichTextContent({ value }: { value: string }) {
  if (!value) return null
  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: value }} />
}
