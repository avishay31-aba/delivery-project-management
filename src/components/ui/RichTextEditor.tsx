import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { Bold, Highlighter, Italic, List, ListOrdered, Palette, Underline } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  minHeightClassName?: string
  toolbarMode?: 'always' | 'focus'
}

type RichTextCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'
type RichTextColorCommand = 'foreColor' | 'hiliteColor'

function normalizeRichTextValue(value: string): string {
  const normalized = value.trim()
  return normalized === '<br>' || normalized === '<div><br></div>' ? '' : value
}

export function RichTextEditor({
  value,
  onChange,
  className = '',
  minHeightClassName = 'min-h-20',
  toolbarMode = 'always',
}: RichTextEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const textColorInputRef = useRef<HTMLInputElement | null>(null)
  const highlightColorInputRef = useRef<HTMLInputElement | null>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  useEffect(() => {
    if (toolbarMode !== 'focus') return

    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setFocused(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [toolbarMode])

  function emitChange() {
    onChange(normalizeRichTextValue(editorRef.current?.innerHTML ?? ''))
  }

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

  function apply(command: RichTextCommand, value?: string) {
    setFocused(true)
    restoreSelection()
    document.execCommand(command, false, value)
    rememberSelection()
    emitChange()
  }

  function applyColor(command: RichTextColorCommand, value: string) {
    setFocused(true)
    restoreSelection()
    const applied = document.execCommand(command, false, value)
    if (command === 'hiliteColor') {
      if (!applied) document.execCommand('backColor', false, value)
    }
    rememberSelection()
    emitChange()
  }

  function keepEditorSelection(event: ReactPointerEvent | ReactMouseEvent) {
    event.preventDefault()
    setFocused(true)
    rememberSelection()
  }

  const showToolbar = toolbarMode === 'always' || focused

  return (
    <div ref={rootRef} className={className}>
      <div
        className={['flex items-center gap-1 rounded-t border border-b-0 border-sf-border bg-sf-surface-alt px-2 py-1', showToolbar ? '' : 'hidden'].join(' ')}
      >
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bold" onPointerDown={keepEditorSelection} onClick={() => apply('bold')}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Italic" onPointerDown={keepEditorSelection} onClick={() => apply('italic')}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Underline" onPointerDown={keepEditorSelection} onClick={() => apply('underline')}>
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bullet list" onPointerDown={keepEditorSelection} onClick={() => apply('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Numbered list" onPointerDown={keepEditorSelection} onClick={() => apply('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="relative inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt"
          aria-label="Text color"
          title="Text color"
          onPointerDown={keepEditorSelection}
          onClick={() => textColorInputRef.current?.click()}
        >
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          <input ref={textColorInputRef} className="pointer-events-none absolute h-px w-px opacity-0" type="color" tabIndex={-1} aria-hidden="true" onChange={(event) => applyColor('foreColor', event.target.value)} />
        </button>
        <button
          type="button"
          className="relative inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt"
          aria-label="Highlight color"
          title="Highlight"
          onPointerDown={keepEditorSelection}
          onClick={() => highlightColorInputRef.current?.click()}
        >
          <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
          <input ref={highlightColorInputRef} className="pointer-events-none absolute h-px w-px opacity-0" type="color" tabIndex={-1} aria-hidden="true" defaultValue="#fff3bf" onChange={(event) => applyColor('hiliteColor', event.target.value)} />
        </button>
      </div>
      <div
        ref={editorRef}
        className={`rich-text-editor ${minHeightClassName} w-full ${showToolbar ? 'rounded-b' : 'rounded'} border border-sf-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sf-brand`}
        contentEditable
        role="textbox"
        suppressContentEditableWarning
        onInput={(event) => {
          rememberSelection()
          onChange(normalizeRichTextValue(event.currentTarget.innerHTML))
        }}
        onFocus={() => {
          setFocused(true)
          rememberSelection()
        }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
      />
    </div>
  )
}

export function RichTextContent({ value }: { value: string }) {
  if (!value) return null
  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: value }} />
}
