import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
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

interface RichTextActiveFormatting {
  bold: boolean
  italic: boolean
  underline: boolean
  textColor: string | null
  highlightColor: string | null
}

interface RichTextPalettePosition {
  left: number
  top: number
  placement: RichTextPalettePlacement
}

interface PendingTypingFormatting {
  formatting: RichTextActiveFormatting
  rangeSignature: string
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
const EMPTY_ACTIVE_FORMATTING: RichTextActiveFormatting = {
  bold: false,
  italic: false,
  underline: false,
  textColor: null,
  highlightColor: null,
}

function normalizeRichTextValue(value: string): string {
  const normalized = value.trim()
  return normalized === '<br>' || normalized === '<div><br></div>' ? '' : value
}

function cleanupCaretResetMarkers(editor: HTMLElement) {
  editor.querySelectorAll(`span[${RICH_TEXT_CARET_RESET_ATTRIBUTE}]`).forEach((marker) => {
    marker.innerHTML = marker.innerHTML.replaceAll(ZERO_WIDTH_SPACE, '')
    marker.replaceWith(...Array.from(marker.childNodes))
  })
  editor.querySelectorAll('span').forEach((span) => {
    if (!span.textContent && span.childNodes.length === 0) span.remove()
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

function rgbToHex(value: string): string | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (!match) return value.startsWith('#') ? value.toLowerCase() : null
  const alpha = match[4] ? Number(match[4]) : 1
  if (alpha === 0) return null
  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`
}

function normalizeToolbarColor(value: string | null | undefined, automaticIsDefault = false): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)') return null
  const hex = rgbToHex(normalized) ?? normalized
  if (automaticIsDefault && (hex === '#000000' || hex === '#181818' || hex === 'black')) return null
  return hex
}

function selectionElement(range: Range, editor: HTMLElement): HTMLElement {
  const node = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentNode
  return node instanceof HTMLElement && editor.contains(node) ? node : editor
}

function hasAncestor(element: HTMLElement, editor: HTMLElement, selectors: string): boolean {
  const match = element.closest(selectors)
  return Boolean(match && editor.contains(match))
}

function isBoldElement(element: HTMLElement, editor: HTMLElement): boolean {
  const fontWeight = window.getComputedStyle(element).fontWeight
  return hasAncestor(element, editor, 'b,strong') || Number(fontWeight) >= 600 || fontWeight === 'bold'
}

function isItalicElement(element: HTMLElement, editor: HTMLElement): boolean {
  const fontStyle = window.getComputedStyle(element).fontStyle
  return hasAncestor(element, editor, 'i,em') || fontStyle === 'italic' || fontStyle === 'oblique'
}

function isUnderlinedElement(element: HTMLElement, editor: HTMLElement): boolean {
  const textDecoration = window.getComputedStyle(element).textDecorationLine
  return hasAncestor(element, editor, 'u') || textDecoration.split(' ').includes('underline')
}

function rangeContainerSignature(node: Node, editor: HTMLElement): string {
  const path: number[] = []
  let current: Node | null = node
  while (current && current !== editor) {
    const parent: Node | null = current.parentNode
    if (!parent) break
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current))
    current = parent
  }
  return path.join('.')
}

function rangeSignature(range: Range, editor: HTMLElement): string {
  return [
    rangeContainerSignature(range.startContainer, editor),
    range.startOffset,
    rangeContainerSignature(range.endContainer, editor),
    range.endOffset,
    range.collapsed ? 'collapsed' : 'selected',
  ].join(':')
}

function makeFormattedTypingNode(text: string, formatting: RichTextActiveFormatting): Node {
  let node: Node = document.createTextNode(text)
  const textColor = normalizeToolbarColor(formatting.textColor, true)
  const highlightColor = normalizeToolbarColor(formatting.highlightColor)
  const hasHighlightColor = Boolean(highlightColor && highlightColor !== '#ffffff')

  if (textColor || hasHighlightColor) {
    const span = document.createElement('span')
    if (textColor) span.style.color = textColor
    if (hasHighlightColor && highlightColor) span.style.backgroundColor = highlightColor
    span.appendChild(node)
    node = span
  }
  if (formatting.underline) {
    const underline = document.createElement('u')
    underline.appendChild(node)
    node = underline
  }
  if (formatting.italic) {
    const italic = document.createElement('i')
    italic.appendChild(node)
    node = italic
  }
  if (formatting.bold) {
    const bold = document.createElement('b')
    bold.appendChild(node)
    node = bold
  }

  return node
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
  const pendingTypingFormattingRef = useRef<PendingTypingFormatting | null>(null)
  const activeFormattingRef = useRef<RichTextActiveFormatting>(EMPTY_ACTIVE_FORMATTING)
  const [focused, setFocused] = useState(false)
  const [openPaletteTarget, setOpenPaletteTarget] = useState<RichTextPaletteTarget>(null)
  const [palettePosition, setPalettePosition] = useState<RichTextPalettePosition>({ left: 0, top: 0, placement: 'bottom' })
  const [activeFormatting, setActiveFormatting] = useState<RichTextActiveFormatting>(EMPTY_ACTIVE_FORMATTING)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  useEffect(() => {
    function updateSelectionFromDocument() {
      rememberSelection()
      syncActiveFormatting()
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

  function setActiveFormattingState(next: RichTextActiveFormatting) {
    activeFormattingRef.current = next
    flushSync(() => setActiveFormatting(next))
  }

  function setPendingTypingFormatting(next: RichTextActiveFormatting, range: Range) {
    const editor = editorRef.current
    if (!editor) return
    pendingTypingFormattingRef.current = {
      formatting: next,
      rangeSignature: rangeSignature(range, editor),
    }
    setActiveFormattingState(next)
  }

  function clearPendingTypingFormatting() {
    pendingTypingFormattingRef.current = null
  }

  function rangeBelongsToEditor(range: Range | null, editor: HTMLElement): range is Range {
    return Boolean(range && editor.contains(range.commonAncestorContainer))
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

  function deriveActiveFormatting(range: Range, editor: HTMLElement): RichTextActiveFormatting {
    const element = selectionElement(range, editor)
    const computed = window.getComputedStyle(element)
    const highlightedAncestor = backgroundAncestorForRange(range, editor)
    const highlightColor = highlightedAncestor ? window.getComputedStyle(highlightedAncestor).backgroundColor : computed.backgroundColor
    const normalizedHighlightColor = highlightedAncestor ? normalizeToolbarColor(highlightColor) : null
    return {
      bold: isBoldElement(element, editor),
      italic: isItalicElement(element, editor),
      underline: isUnderlinedElement(element, editor),
      textColor: normalizeToolbarColor(computed.color, true),
      highlightColor: normalizedHighlightColor === '#ffffff' ? null : normalizedHighlightColor,
    }
  }

  function currentEditorRange(): Range | null {
    const editor = editorRef.current
    const selection = window.getSelection()
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : selectionRangeRef.current
    return editor && rangeBelongsToEditor(range, editor) ? range : null
  }

  function syncActiveFormatting() {
    const editor = editorRef.current
    const range = currentEditorRange()
    if (!editor || !range) {
      clearPendingTypingFormatting()
      setActiveFormattingState(EMPTY_ACTIVE_FORMATTING)
      return
    }

    if (!range.collapsed) {
      clearPendingTypingFormatting()
      setActiveFormattingState(deriveActiveFormatting(range, editor))
      return
    }

    const pending = pendingTypingFormattingRef.current
    if (pending && pending.rangeSignature === rangeSignature(range, editor)) {
      setActiveFormattingState(pending.formatting)
      return
    }

    clearPendingTypingFormatting()
    setActiveFormattingState(deriveActiveFormatting(range, editor))
  }

  function syncSelectionDerivedFormatting() {
    const editor = editorRef.current
    const range = currentEditorRange()
    clearPendingTypingFormatting()
    if (!editor || !range) {
      setActiveFormattingState(EMPTY_ACTIVE_FORMATTING)
      return
    }
    setActiveFormattingState(deriveActiveFormatting(range, editor))
  }

  function scheduleSelectionDerivedFormattingSync() {
    window.requestAnimationFrame(syncSelectionDerivedFormatting)
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
    const editor = editorRef.current
    const range = currentEditorRange()
    if (!editor || !range) return

    if (range.collapsed && (command === 'bold' || command === 'italic' || command === 'underline')) {
      const next = { ...activeFormattingRef.current }
      if (command === 'bold') next.bold = !next.bold
      if (command === 'italic') next.italic = !next.italic
      if (command === 'underline') next.underline = !next.underline
      setPendingTypingFormatting(next, range)
      return
    }

    clearPendingTypingFormatting()
    document.execCommand(command, false, value)
    rememberSelection()
    emitChange()
    syncActiveFormatting()
  }

  function applyColor(command: RichTextColorCommand, value: RichTextColorValue) {
    setFocused(true)
    restoreSelection()
    let shouldEmitChange = true
    const editor = editorRef.current
    const selection = window.getSelection()
    let range = currentEditorRange()

    if (editor && range && !range.collapsed) {
      clearPendingTypingFormatting()
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
          const nextRange = document.createRange()
          nextRange.setStartAfter(highlightedAncestor)
          nextRange.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(nextRange)
          selectionRangeRef.current = nextRange.cloneRange()
          range = nextRange
        }
      }
      const next = {
        ...activeFormattingRef.current,
        [command === 'foreColor' ? 'textColor' : 'highlightColor']: normalizeToolbarColor(value, command === 'foreColor'),
      }
      setPendingTypingFormatting(next, range)
      shouldEmitChange = false
    }
    rememberSelection()
    if (shouldEmitChange) emitChange()
    syncActiveFormatting()
    setOpenPaletteTarget(null)
  }

  function applyAutomaticColor(command: RichTextColorCommand) {
    if (command === 'foreColor') {
      applyColor(command, '#000000')
      return
    }
    applyColor(command, null)
  }

  function insertPendingTypingText(text: string): boolean {
    const pending = pendingTypingFormattingRef.current
    if (!pending) return false
    const editor = editorRef.current
    const range = currentEditorRange()
    if (!editor || !range || !range.collapsed || pending.rangeSignature !== rangeSignature(range, editor)) {
      return false
    }

    const formattedNode = makeFormattedTypingNode(text, pending.formatting)
    const insertionRange = range.cloneRange()
    const highlightedAncestor = pending.formatting.highlightColor === null ? backgroundAncestorForRange(range, editor) : null
    if (highlightedAncestor) {
      insertionRange.setStartAfter(highlightedAncestor)
      insertionRange.collapse(true)
    }
    insertionRange.insertNode(formattedNode)

    const nextRange = document.createRange()
    nextRange.setStartAfter(formattedNode)
    nextRange.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(nextRange)
    selectionRangeRef.current = nextRange.cloneRange()
    pendingTypingFormattingRef.current = {
      formatting: pending.formatting,
      rangeSignature: rangeSignature(nextRange, editor),
    }
    setActiveFormattingState(pending.formatting)
    emitChange()
    return true
  }

  function formatRecentlyInsertedText(text: string): boolean {
    const pending = pendingTypingFormattingRef.current
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!pending || !editor || !selection || selection.rangeCount === 0 || text.length === 0) return false

    const range = selection.getRangeAt(0)
    if (!range.collapsed || !editor.contains(range.commonAncestorContainer) || range.startContainer.nodeType !== Node.TEXT_NODE) return false
    const textNode = range.startContainer
    if (range.startOffset < text.length) return false

    const insertedRange = document.createRange()
    insertedRange.setStart(textNode, range.startOffset - text.length)
    insertedRange.setEnd(textNode, range.startOffset)
    const insertedText = insertedRange.toString()
    if (insertedText !== text) return false

    const highlightedAncestor = pending.formatting.highlightColor === null ? backgroundAncestorForRange(insertedRange, editor) : null
    insertedRange.deleteContents()
    const formattedNode = makeFormattedTypingNode(text, pending.formatting)
    if (highlightedAncestor) {
      const escapedRange = document.createRange()
      escapedRange.setStartAfter(highlightedAncestor)
      escapedRange.collapse(true)
      escapedRange.insertNode(formattedNode)
    } else {
      insertedRange.insertNode(formattedNode)
    }
    const nextRange = document.createRange()
    nextRange.setStartAfter(formattedNode)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    selectionRangeRef.current = nextRange.cloneRange()
    pendingTypingFormattingRef.current = {
      formatting: pending.formatting,
      rangeSignature: rangeSignature(nextRange, editor),
    }
    setActiveFormattingState(pending.formatting)
    return true
  }

  function handleBeforeInput(event: FormEvent<HTMLDivElement>) {
    const nativeEvent = event.nativeEvent as InputEvent
    if (!pendingTypingFormattingRef.current || nativeEvent.inputType !== 'insertText' || !nativeEvent.data) return

    if (insertPendingTypingText(nativeEvent.data)) {
      event.preventDefault()
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!pendingTypingFormattingRef.current || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return
    if (insertPendingTypingText(event.key)) {
      event.preventDefault()
    }
  }

  function keepEditorSelection(event: ReactPointerEvent | ReactMouseEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    setFocused(true)
    rememberSelection()
  }

  function blockNonPrimaryToolbarMouse(event: ReactMouseEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  function runToolbarAction(event: ReactMouseEvent, action: () => void) {
    if (event.button !== 0) return
    action()
  }

  const showToolbar = toolbarMode === 'always' || focused
  const activePaletteColor = openPaletteTarget === 'foreColor' ? activeFormatting.textColor : activeFormatting.highlightColor

  function toolbarButtonClass(active = false) {
    return [
      'rounded border p-1',
      active
        ? 'border-sf-brand bg-sf-brand/10 text-sf-brand'
        : 'border-sf-border bg-white hover:bg-sf-surface-alt',
    ].join(' ')
  }

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
          onAuxClick={blockNonPrimaryToolbarMouse}
          onContextMenu={blockNonPrimaryToolbarMouse}
          onClick={(event) => runToolbarAction(event, () => applyAutomaticColor(target))}
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
                      onAuxClick={blockNonPrimaryToolbarMouse}
                      onContextMenu={blockNonPrimaryToolbarMouse}
                      onClick={(event) => runToolbarAction(event, () => applyColor(target, shade))}
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
        <button type="button" className={toolbarButtonClass(activeFormatting.bold)} aria-label="Bold" aria-pressed={activeFormatting.bold} onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={(event) => runToolbarAction(event, () => apply('bold'))}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.italic)} aria-label="Italic" aria-pressed={activeFormatting.italic} onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={(event) => runToolbarAction(event, () => apply('italic'))}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.underline)} aria-label="Underline" aria-pressed={activeFormatting.underline} onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={(event) => runToolbarAction(event, () => apply('underline'))}>
          <Underline className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass()} aria-label="Bullet list" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={(event) => runToolbarAction(event, () => apply('insertUnorderedList'))}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass()} aria-label="Numbered list" onPointerDown={keepEditorSelection} onMouseDown={keepEditorSelection} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={(event) => runToolbarAction(event, () => apply('insertOrderedList'))}>
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="relative inline-flex">
          <button
            ref={textColorButtonRef}
            type="button"
            className={`${toolbarButtonClass()} relative inline-flex`}
            aria-label="Text color"
            title="Text color"
            onPointerDown={keepEditorSelection}
            onMouseDown={keepEditorSelection}
            onAuxClick={blockNonPrimaryToolbarMouse}
            onContextMenu={blockNonPrimaryToolbarMouse}
            onClick={(event) => runToolbarAction(event, () => setOpenPaletteTarget((current) => (current === 'foreColor' ? null : 'foreColor')))}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            <span
              className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full"
              style={{ backgroundColor: activeFormatting.textColor ?? '#181818' }}
              aria-hidden="true"
            />
          </button>
          {renderPalette('foreColor')}
        </span>
        <span className="relative inline-flex">
          <button
            ref={highlightColorButtonRef}
            type="button"
            className={`${toolbarButtonClass()} relative inline-flex`}
            aria-label="Text background"
            title="Text background"
            onPointerDown={keepEditorSelection}
            onMouseDown={keepEditorSelection}
            onAuxClick={blockNonPrimaryToolbarMouse}
            onContextMenu={blockNonPrimaryToolbarMouse}
            onClick={(event) => runToolbarAction(event, () => setOpenPaletteTarget((current) => (current === 'hiliteColor' ? null : 'hiliteColor')))}
          >
            <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
            <span
              className={[
                'pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full',
                activeFormatting.highlightColor ? '' : 'border-t border-dashed border-sf-text-muted bg-transparent',
              ].join(' ')}
              style={{ backgroundColor: activeFormatting.highlightColor ?? 'transparent' }}
              aria-hidden="true"
            />
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
        onBeforeInput={handleBeforeInput}
        onKeyDown={handleKeyDown}
        onInput={(event) => {
          const nativeEvent = event.nativeEvent as InputEvent
          const appliedPendingFormat = nativeEvent.inputType === 'insertText'
            && Boolean(nativeEvent.data)
            && formatRecentlyInsertedText(nativeEvent.data ?? '')
          if (!appliedPendingFormat) clearPendingTypingFormatting()
          cleanupCaretResetMarkers(event.currentTarget)
          rememberSelection()
          if (!appliedPendingFormat) syncActiveFormatting()
          onChange(normalizeRichTextValue(event.currentTarget.innerHTML))
        }}
        onFocus={() => {
          setFocused(true)
          rememberSelection()
          syncActiveFormatting()
        }}
        onKeyUp={() => {
          rememberSelection()
          syncActiveFormatting()
        }}
        onMouseDown={scheduleSelectionDerivedFormattingSync}
        onMouseUp={() => {
          rememberSelection()
          syncSelectionDerivedFormatting()
        }}
        onClick={scheduleSelectionDerivedFormattingSync}
        onContextMenu={scheduleSelectionDerivedFormattingSync}
      />
    </div>
  )
}

export function RichTextContent({ value }: { value: string }) {
  if (!value) return null
  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: value }} />
}
