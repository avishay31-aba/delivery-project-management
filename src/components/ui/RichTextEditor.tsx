import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
type RichTextPaletteTarget = RichTextColorCommand | null
type RichTextPalettePlacement = 'bottom' | 'top'
type RichTextColorValue = string | null

interface RichTextPalettePosition {
  left: number
  top: number
  placement: RichTextPalettePlacement
}

interface ThemeColorFamily {
  name: string
  shades: string[]
}

const RICH_TEXT_THEME_PALETTE: ThemeColorFamily[] = [
  { name: 'Neutral', shades: ['#f8fafc', '#e2e8f0', '#94a3b8', '#475569', '#0f172a'] },
  { name: 'Red', shades: ['#fee2e2', '#fecaca', '#f87171', '#dc2626', '#7f1d1d'] },
  { name: 'Orange', shades: ['#ffedd5', '#fed7aa', '#fb923c', '#ea580c', '#7c2d12'] },
  { name: 'Yellow', shades: ['#fef9c3', '#fde68a', '#facc15', '#ca8a04', '#713f12'] },
  { name: 'Green', shades: ['#dcfce7', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'] },
  { name: 'Blue', shades: ['#dbeafe', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'] },
  { name: 'Purple', shades: ['#f3e8ff', '#e9d5ff', '#c084fc', '#9333ea', '#581c87'] },
]

const RICH_TEXT_CARET_RESET_ATTRIBUTE = 'data-rich-text-caret-reset'
const ZERO_WIDTH_SPACE = '\u200B'

function normalizeRichTextValue(value: string): string {
  const normalized = value.trim()
  return normalized === '<br>' || normalized === '<div><br></div>' ? '' : value
}

function cleanupCaretResetMarkers(editor: HTMLElement) {
  editor.querySelectorAll(`span[${RICH_TEXT_CARET_RESET_ATTRIBUTE}]`).forEach((marker) => {
    marker.innerHTML = marker.innerHTML.replaceAll(ZERO_WIDTH_SPACE, '')
    marker.replaceWith(...Array.from(marker.childNodes))
  })
}

function clearBackgroundFormatting(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.childNodes.forEach(clearBackgroundFormatting)
    return
  }

  const element = node as HTMLElement
  element.style.backgroundColor = ''
  element.style.removeProperty('background-color')
  element.style.removeProperty('background')
  if (!element.getAttribute('style')?.trim()) {
    element.removeAttribute('style')
  }
  element.childNodes.forEach(clearBackgroundFormatting)
}

function backgroundAncestorForRange(range: Range, editor: HTMLElement): HTMLElement | null {
  let node: Node | null = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentNode

  while (node && node !== editor) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      if (element.style.backgroundColor || element.style.background) return element
    }
    node = node.parentNode
  }

  return null
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
  const textColorButtonRef = useRef<HTMLButtonElement | null>(null)
  const highlightColorButtonRef = useRef<HTMLButtonElement | null>(null)
  const paletteRef = useRef<HTMLDivElement | null>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const [focused, setFocused] = useState(false)
  const [openPaletteTarget, setOpenPaletteTarget] = useState<RichTextPaletteTarget>(null)
  const [palettePosition, setPalettePosition] = useState<RichTextPalettePosition>({ left: 0, top: 0, placement: 'bottom' })
  const [selectedTextColor, setSelectedTextColor] = useState<string | null>(null)
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  useEffect(() => {
    function updateSelectionFromDocument() {
      rememberSelection()
    }

    document.addEventListener('selectionchange', updateSelectionFromDocument)
    return () => document.removeEventListener('selectionchange', updateSelectionFromDocument)
  }, [])

  useEffect(() => {
    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      if (target && paletteRef.current?.contains(target)) return
      setOpenPaletteTarget(null)
      if (toolbarMode === 'focus') setFocused(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [toolbarMode])

  useLayoutEffect(() => {
    if (!openPaletteTarget) return

    function updatePalettePosition() {
      const trigger = openPaletteTarget === 'foreColor' ? textColorButtonRef.current : highlightColorButtonRef.current
      if (!trigger) return

      const viewportPadding = 8
      const triggerRect = trigger.getBoundingClientRect()
      const paletteRect = paletteRef.current?.getBoundingClientRect()
      const paletteWidth = paletteRect?.width || 240
      const paletteHeight = paletteRect?.height || 244
      const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding
      const availableAbove = triggerRect.top - viewportPadding
      const placement: RichTextPalettePlacement = availableBelow < paletteHeight && availableAbove > availableBelow ? 'top' : 'bottom'
      const nextTop = placement === 'top'
        ? Math.max(viewportPadding, triggerRect.top - paletteHeight - 4)
        : Math.max(viewportPadding, Math.min(window.innerHeight - viewportPadding - paletteHeight, triggerRect.bottom + 4))
      const preferredLeft = triggerRect.left
      const nextLeft = Math.min(
        Math.max(viewportPadding, preferredLeft),
        Math.max(viewportPadding, window.innerWidth - viewportPadding - paletteWidth),
      )

      setPalettePosition({ left: nextLeft, top: nextTop, placement })
    }

    updatePalettePosition()
    window.addEventListener('resize', updatePalettePosition)
    window.addEventListener('scroll', updatePalettePosition, true)
    return () => {
      window.removeEventListener('resize', updatePalettePosition)
      window.removeEventListener('scroll', updatePalettePosition, true)
    }
  }, [openPaletteTarget])

  function emitChange() {
    const editor = editorRef.current
    if (editor) cleanupCaretResetMarkers(editor)
    onChange(normalizeRichTextValue(editor?.innerHTML ?? ''))
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

  function applyColor(command: RichTextColorCommand, value: RichTextColorValue) {
    setFocused(true)
    restoreSelection()
    let shouldEmitChange = true
    const editor = editorRef.current
    const selection = window.getSelection()
    const selectionRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : selectionRangeRef.current
    const hasEditorSelection = Boolean(editor && selectionRange && editor.contains(selectionRange.commonAncestorContainer))
    const range = hasEditorSelection ? selectionRange : null

    if (editor && range && !range.collapsed) {
      if (range.commonAncestorContainer !== editor && !editor.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(editor)
      }
      const highlightedAncestor = command === 'hiliteColor' && value === null
        ? backgroundAncestorForRange(range, editor)
        : null
      const contents = range.extractContents()
      if (command === 'hiliteColor' && value === null) {
        clearBackgroundFormatting(contents)
        const insertedNodes = Array.from(contents.childNodes)
        if (highlightedAncestor && !highlightedAncestor.textContent) {
          highlightedAncestor.replaceWith(contents)
        } else {
          range.insertNode(contents)
        }
        const nextRange = document.createRange()
        if (insertedNodes.length > 0) {
          nextRange.setStartBefore(insertedNodes[0])
          nextRange.setEndAfter(insertedNodes[insertedNodes.length - 1])
        } else {
          nextRange.setStart(range.startContainer, range.startOffset)
          nextRange.collapse(true)
        }
        selection?.removeAllRanges()
        selection?.addRange(nextRange)
        selectionRangeRef.current = nextRange.cloneRange()
      } else if (value) {
        const colorSpan = document.createElement('span')
        if (command === 'hiliteColor') {
          colorSpan.style.backgroundColor = value
        } else {
          colorSpan.style.color = value
        }
        colorSpan.appendChild(contents)
        range.insertNode(colorSpan)
        selection?.removeAllRanges()
        const nextRange = document.createRange()
        nextRange.selectNodeContents(colorSpan)
        selection?.addRange(nextRange)
        selectionRangeRef.current = nextRange.cloneRange()
      }
    } else if (editor && range) {
      if (command === 'hiliteColor' && value === null) {
        const highlightedAncestor = backgroundAncestorForRange(range, editor)
        if (highlightedAncestor) {
          const resetMarker = document.createElement('span')
          resetMarker.setAttribute(RICH_TEXT_CARET_RESET_ATTRIBUTE, 'true')
          resetMarker.textContent = ZERO_WIDTH_SPACE
          highlightedAncestor.after(resetMarker)
          const nextRange = document.createRange()
          nextRange.setStart(resetMarker.firstChild ?? resetMarker, resetMarker.firstChild ? ZERO_WIDTH_SPACE.length : 0)
          nextRange.collapse(true)
          editor.focus()
          selection?.removeAllRanges()
          selection?.addRange(nextRange)
          selectionRangeRef.current = nextRange.cloneRange()
          shouldEmitChange = false
        } else {
          document.execCommand('removeFormat', false)
          shouldEmitChange = false
        }
      } else if (value) {
        const applied = document.execCommand(command, false, value)
        if (command === 'hiliteColor' && !applied) document.execCommand('backColor', false, value)
      }
    }
    if (command === 'hiliteColor') setSelectedHighlightColor(value)
    if (command === 'foreColor') setSelectedTextColor(value)
    rememberSelection()
    if (shouldEmitChange) emitChange()
    setOpenPaletteTarget(null)
  }

  function applyAutomaticColor(command: RichTextColorCommand) {
    if (command === 'foreColor') {
      applyColor(command, '#000000')
      return
    }
    applyColor(command, null)
  }

  function keepEditorSelection(event: ReactPointerEvent | ReactMouseEvent) {
    event.preventDefault()
    setFocused(true)
    rememberSelection()
  }

  const showToolbar = toolbarMode === 'always' || focused
  const activePaletteColor = openPaletteTarget === 'foreColor' ? selectedTextColor : selectedHighlightColor

  function renderPalette(target: RichTextColorCommand) {
    if (openPaletteTarget !== target) return null
    const automaticLabel = target === 'foreColor' ? 'Automatic' : 'No Color'

    return createPortal(
      <div
        ref={paletteRef}
        className="fixed z-50 w-60 rounded border border-sf-border bg-white p-2 shadow-lg"
        style={{ left: palettePosition.left, top: palettePosition.top }}
        role="dialog"
        aria-label={target === 'foreColor' ? 'Text color palette' : 'Text background palette'}
        data-placement={palettePosition.placement}
        onPointerDown={keepEditorSelection}
        onMouseDown={keepEditorSelection}
      >
        <button
          type="button"
          className={[
            'mb-2 w-full rounded border px-2 py-1 text-left text-xs font-medium',
            !activePaletteColor ? 'border-sf-brand text-sf-brand' : 'border-sf-border text-sf-text hover:border-sf-text-muted',
          ].join(' ')}
          onClick={() => applyAutomaticColor(target)}
        >
          {automaticLabel}
        </button>
        <div className="space-y-1">
          {RICH_TEXT_THEME_PALETTE.map((family) => (
            <div key={family.name} className="grid grid-cols-[4.75rem_1fr] items-center gap-2">
              <span className="text-xs text-sf-text-muted">{family.name}</span>
              <div className="flex gap-1">
                {family.shades.map((shade) => {
                  const selected = activePaletteColor?.toLowerCase() === shade.toLowerCase()
                  return (
                    <button
                      key={shade}
                      type="button"
                      className={[
                        'h-5 w-7 rounded-sm border focus:outline-none focus:ring-2 focus:ring-sf-brand focus:ring-offset-1',
                        selected ? 'border-sf-brand ring-2 ring-sf-brand ring-offset-1' : 'border-sf-border hover:border-sf-text',
                      ].join(' ')}
                      style={{ backgroundColor: shade }}
                      aria-label={`${family.name} ${shade}`}
                      aria-pressed={selected}
                      title={`${family.name} ${shade}`}
                      onClick={() => applyColor(target, shade)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div ref={rootRef} className={className}>
      <div
        className={['flex items-center gap-1 rounded-t border border-b-0 border-sf-border bg-sf-surface-alt px-2 py-1', showToolbar ? '' : 'hidden'].join(' ')}
      >
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bold" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onClick={() => apply('bold')}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Italic" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onClick={() => apply('italic')}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Underline" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onClick={() => apply('underline')}>
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Bullet list" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onClick={() => apply('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt" aria-label="Numbered list" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onClick={() => apply('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="relative inline-flex">
          <button
            ref={textColorButtonRef}
            type="button"
            className="inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt"
            aria-label="Text color"
            title="Text color"
            onPointerDown={keepEditorSelection}
            onMouseDown={keepEditorSelection}
            onClick={() => setOpenPaletteTarget((current) => (current === 'foreColor' ? null : 'foreColor'))}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {renderPalette('foreColor')}
        </span>
        <span className="relative inline-flex">
          <button
            ref={highlightColorButtonRef}
            type="button"
            className="inline-flex rounded border border-sf-border bg-white p-1 hover:bg-sf-surface-alt"
            aria-label="Text background"
            title="Text background"
            onPointerDown={keepEditorSelection}
            onMouseDown={keepEditorSelection}
            onClick={() => setOpenPaletteTarget((current) => (current === 'hiliteColor' ? null : 'hiliteColor'))}
          >
            <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {renderPalette('hiliteColor')}
        </span>
      </div>
      <div
        ref={editorRef}
        className={`rich-text-editor ${minHeightClassName} w-full ${showToolbar ? 'rounded-b' : 'rounded'} border border-sf-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sf-brand`}
        contentEditable
        role="textbox"
        suppressContentEditableWarning
        onInput={(event) => {
          cleanupCaretResetMarkers(event.currentTarget)
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
