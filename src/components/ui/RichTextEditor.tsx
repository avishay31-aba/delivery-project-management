import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExtension from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Bold, Highlighter, Italic, List, ListOrdered, Palette, Underline as UnderlineIcon } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  minHeightClassName?: string
  toolbarMode?: 'always' | 'focus'
}

type RichTextColorCommand = 'foreColor' | 'hiliteColor'
type RichTextPaletteTarget = RichTextColorCommand | null
type RichTextPalettePlacement = 'bottom' | 'top'

interface RichTextActiveFormatting {
  bold: boolean
  italic: boolean
  underline: boolean
  bulletList: boolean
  orderedList: boolean
  textColor: string | null
  highlightColor: string | null
}

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

const EMPTY_ACTIVE_FORMATTING: RichTextActiveFormatting = {
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  textColor: null,
  highlightColor: null,
}

const HighlightWithSpanBackgroundImport = Highlight.extend({
  parseHTML() {
    return [
      { tag: 'mark' },
      {
        tag: 'span',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const backgroundColor = element.style.backgroundColor || element.style.background
          return backgroundColor ? { color: backgroundColor } : false
        },
      },
    ]
  },
})

function normalizeRichTextValue(value: string): string {
  const normalized = value.trim()
  return normalized === '<br>'
    || normalized === '<div><br></div>'
    || normalized === '<p></p>'
    || normalized === '<p><br></p>'
    ? ''
    : value
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

function readActiveFormatting(editor: Editor): RichTextActiveFormatting {
  const textStyleAttributes = editor.getAttributes('textStyle') as { color?: string }
  const highlightAttributes = editor.getAttributes('highlight') as { color?: string }

  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    textColor: normalizeToolbarColor(textStyleAttributes.color, true),
    highlightColor: normalizeToolbarColor(highlightAttributes.color),
  }
}

function selectionElement(editor: Editor): HTMLElement | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const editorElement = editor.view.dom
  if (!editorElement.contains(range.commonAncestorContainer)) return null
  const node = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentNode
  return node instanceof HTMLElement && editorElement.contains(node) ? node : editorElement
}

function hasAncestor(element: HTMLElement, editor: Editor, selectors: string): boolean {
  const match = element.closest(selectors)
  return Boolean(match && editor.view.dom.contains(match))
}

function isBoldElement(element: HTMLElement, editor: Editor): boolean {
  const fontWeight = window.getComputedStyle(element).fontWeight
  return hasAncestor(element, editor, 'b,strong') || Number(fontWeight) >= 600 || fontWeight === 'bold'
}

function isItalicElement(element: HTMLElement, editor: Editor): boolean {
  const fontStyle = window.getComputedStyle(element).fontStyle
  return hasAncestor(element, editor, 'i,em') || fontStyle === 'italic' || fontStyle === 'oblique'
}

function isUnderlinedElement(element: HTMLElement, editor: Editor): boolean {
  const textDecoration = window.getComputedStyle(element).textDecorationLine
  return hasAncestor(element, editor, 'u') || textDecoration.split(' ').includes('underline')
}

function backgroundAncestor(element: HTMLElement, editor: Editor): HTMLElement | null {
  let current: HTMLElement | null = element
  while (current && current !== editor.view.dom) {
    const backgroundColor = current.style.backgroundColor || current.style.background
    if (current.tagName === 'MARK' || backgroundColor) return current
    current = current.parentElement
  }
  return null
}

function readSelectionFormatting(editor: Editor): RichTextActiveFormatting {
  const element = selectionElement(editor)
  if (!element) return readActiveFormatting(editor)
  const computed = window.getComputedStyle(element)
  const highlightedAncestor = backgroundAncestor(element, editor)
  const highlightColor = highlightedAncestor ? window.getComputedStyle(highlightedAncestor).backgroundColor : null

  return {
    bold: isBoldElement(element, editor),
    italic: isItalicElement(element, editor),
    underline: isUnderlinedElement(element, editor),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    textColor: normalizeToolbarColor(computed.color, true),
    highlightColor: normalizeToolbarColor(highlightColor),
  }
}

function applyEditorAction(editor: Editor | null, action: (editor: Editor) => void, updateActiveFormatting: (editor: Editor) => void) {
  if (!editor) return
  action(editor)
  updateActiveFormatting(editor)
  window.requestAnimationFrame(() => updateActiveFormatting(editor))
}

export function RichTextEditor({
  value,
  onChange,
  className = '',
  minHeightClassName = 'min-h-20',
  toolbarMode = 'always',
}: RichTextEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const textColorButtonRef = useRef<HTMLButtonElement | null>(null)
  const highlightColorButtonRef = useRef<HTMLButtonElement | null>(null)
  const paletteRef = useRef<HTMLDivElement | null>(null)
  const latestValueRef = useRef(value)
  const toolbarActionVersionRef = useRef(0)
  const [focused, setFocused] = useState(false)
  const [openPaletteTarget, setOpenPaletteTarget] = useState<RichTextPaletteTarget>(null)
  const [palettePosition, setPalettePosition] = useState<RichTextPalettePosition>({ left: 0, top: 0, placement: 'bottom' })
  const [activeFormatting, setActiveFormatting] = useState<RichTextActiveFormatting>(EMPTY_ACTIVE_FORMATTING)

  const updateActiveFormatting = (editor: Editor, source: 'editor' | 'selection' = 'editor') => {
    setActiveFormatting(source === 'selection' ? readSelectionFormatting(editor) : readActiveFormatting(editor))
  }

  const scheduleActiveFormattingUpdate = () => {
    const scheduledForVersion = toolbarActionVersionRef.current
    window.requestAnimationFrame(() => {
      if (scheduledForVersion !== toolbarActionVersionRef.current) return
      if (editor) updateActiveFormatting(editor, 'selection')
    })
  }

  const runEditorCommand = (action: (editor: Editor) => void) => {
    toolbarActionVersionRef.current += 1
    applyEditorAction(editor, action, updateActiveFormatting)
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextStyle,
      Color,
      HighlightWithSpanBackgroundImport.configure({ multicolor: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: `rich-text-editor ${minHeightClassName} w-full rounded-b border border-sf-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sf-brand`,
      },
      handleDOMEvents: {
        focus: () => {
          setFocused(true)
          scheduleActiveFormattingUpdate()
          return false
        },
        blur: () => {
          if (toolbarMode === 'focus') {
            window.setTimeout(() => {
              const target = document.activeElement
              if (target && (rootRef.current?.contains(target) || paletteRef.current?.contains(target))) return
              setFocused(false)
            }, 0)
          }
          return false
        },
        mouseup: () => {
          scheduleActiveFormattingUpdate()
          return false
        },
        click: () => {
          scheduleActiveFormattingUpdate()
          return false
        },
        contextmenu: () => {
          scheduleActiveFormattingUpdate()
          return false
        },
        keyup: () => {
          scheduleActiveFormattingUpdate()
          return false
        },
      },
    },
    onFocus: ({ editor }) => {
      setFocused(true)
      updateActiveFormatting(editor)
    },
    onBlur: () => {
      if (toolbarMode === 'focus') {
        window.setTimeout(() => {
          const target = document.activeElement
          if (target && (rootRef.current?.contains(target) || paletteRef.current?.contains(target))) return
          setFocused(false)
        }, 0)
      }
    },
    onSelectionUpdate: ({ editor }) => updateActiveFormatting(editor),
    onTransaction: ({ editor }) => updateActiveFormatting(editor),
    onUpdate: ({ editor }) => {
      const html = normalizeRichTextValue(editor.getHTML())
      latestValueRef.current = html
      onChange(html)
      updateActiveFormatting(editor)
    },
  })

  useEffect(() => {
    latestValueRef.current = value
    if (!editor) return
    const current = normalizeRichTextValue(editor.getHTML())
    const next = normalizeRichTextValue(value || '')
    if (current !== next) {
      editor.commands.setContent(value || '', { emitUpdate: false })
      updateActiveFormatting(editor)
    }
  }, [editor, value])

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
      const nextLeft = Math.min(
        Math.max(viewportPadding, triggerRect.left),
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

  const toolbarVisible = toolbarMode === 'always' || focused || Boolean(editor?.isFocused)
  const activePaletteColor = openPaletteTarget === 'foreColor' ? activeFormatting.textColor : activeFormatting.highlightColor

  function toolbarButtonClass(active = false) {
    return [
      'rounded border p-1',
      active
        ? 'border-sf-brand bg-sf-brand/10 text-sf-brand'
        : 'border-sf-border bg-white hover:bg-sf-surface-alt',
    ].join(' ')
  }

  function keepEditorSelection(event: ReactPointerEvent | ReactMouseEvent) {
    if (event.button !== 0) return
    event.stopPropagation()
    setFocused(true)
  }

  function blockNonPrimaryToolbarMouse(event: ReactMouseEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  function runToolbarAction(event: ReactMouseEvent, action: () => void) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    action()
  }

  function togglePalette(target: RichTextColorCommand) {
    setOpenPaletteTarget((current) => (current === target ? null : target))
    if (editor) updateActiveFormatting(editor)
  }

  function applyTextColor(color: string) {
    runEditorCommand((instance) => {
      instance.chain().focus().setColor(color).run()
    })
    setOpenPaletteTarget(null)
  }

  function applyAutomaticTextColor() {
    applyTextColor('#000000')
  }

  function applyTextBackground(color: string) {
    runEditorCommand((instance) => {
      instance.chain().focus().setHighlight({ color }).run()
    })
    setOpenPaletteTarget(null)
  }

  function clearTextBackground() {
    runEditorCommand((instance) => {
      instance.chain().focus().unsetHighlight().run()
    })
    setOpenPaletteTarget(null)
  }

  function renderPalette(target: RichTextColorCommand) {
    if (openPaletteTarget !== target) return null
    const automaticLabel = target === 'foreColor' ? 'Automatic' : 'No Color'
    const applyAutomatic = target === 'foreColor' ? applyAutomaticTextColor : clearTextBackground

    return createPortal(
      <div
        ref={paletteRef}
        className="fixed z-50 w-60 rounded border border-sf-border bg-white p-2 shadow-lg"
        style={{ left: palettePosition.left, top: palettePosition.top }}
        role="dialog"
        aria-label={target === 'foreColor' ? 'Text color palette' : 'Text background palette'}
        data-placement={palettePosition.placement}
       
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
          onMouseDown={(event) => runToolbarAction(event, applyAutomatic)}
          onClick={blockNonPrimaryToolbarMouse}
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
                  const applyColor = target === 'foreColor'
                    ? () => applyTextColor(shade)
                    : () => applyTextBackground(shade)
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
                      onMouseDown={(event) => runToolbarAction(event, applyColor)}
                      onClick={blockNonPrimaryToolbarMouse}
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
    <div
      ref={rootRef}
      className={className}
      onClick={(event) => event.stopPropagation()}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => {
        if (toolbarMode === 'focus') {
          window.setTimeout(() => {
            const target = document.activeElement
            if (target && (rootRef.current?.contains(target) || paletteRef.current?.contains(target))) return
            setFocused(false)
          }, 0)
        }
      }}
    >
      <div
        className={[
          'flex items-center gap-1 rounded-t border border-b-0 border-sf-border bg-sf-surface-alt px-2 py-1 transition-opacity',
          toolbarVisible ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0',
        ].join(' ')}
      >
        <button type="button" className={toolbarButtonClass(activeFormatting.bold)} aria-label="Bold" aria-pressed={activeFormatting.bold} onMouseDown={(event) => runToolbarAction(event, () => runEditorCommand((instance) => {
          const chain = instance.chain().focus()
          if (instance.isActive('bold')) {
            chain.unsetBold().run()
          } else {
            chain.setBold().run()
          }
        }))} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={blockNonPrimaryToolbarMouse}>
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.italic)} aria-label="Italic" aria-pressed={activeFormatting.italic} onMouseDown={(event) => runToolbarAction(event, () => runEditorCommand((instance) => instance.chain().focus().toggleItalic().run()))} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={blockNonPrimaryToolbarMouse}>
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.underline)} aria-label="Underline" aria-pressed={activeFormatting.underline} onMouseDown={(event) => runToolbarAction(event, () => runEditorCommand((instance) => instance.chain().focus().toggleUnderline().run()))} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={blockNonPrimaryToolbarMouse}>
          <UnderlineIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.bulletList)} aria-label="Bullet list" aria-pressed={activeFormatting.bulletList} onMouseDown={(event) => runToolbarAction(event, () => runEditorCommand((instance) => instance.chain().focus().toggleBulletList().run()))} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={blockNonPrimaryToolbarMouse}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={toolbarButtonClass(activeFormatting.orderedList)} aria-label="Numbered list" aria-pressed={activeFormatting.orderedList} onMouseDown={(event) => runToolbarAction(event, () => runEditorCommand((instance) => instance.chain().focus().toggleOrderedList().run()))} onAuxClick={blockNonPrimaryToolbarMouse} onContextMenu={blockNonPrimaryToolbarMouse} onClick={blockNonPrimaryToolbarMouse}>
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="relative inline-flex">
          <button
            ref={textColorButtonRef}
            type="button"
            className={`${toolbarButtonClass()} relative inline-flex`}
            aria-label="Text color"
            title="Text color"
           
            onAuxClick={blockNonPrimaryToolbarMouse}
            onContextMenu={blockNonPrimaryToolbarMouse}
            onMouseDown={(event) => runToolbarAction(event, () => togglePalette('foreColor'))}
            onClick={blockNonPrimaryToolbarMouse}
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
           
            onAuxClick={blockNonPrimaryToolbarMouse}
            onContextMenu={blockNonPrimaryToolbarMouse}
            onMouseDown={(event) => runToolbarAction(event, () => togglePalette('hiliteColor'))}
            onClick={blockNonPrimaryToolbarMouse}
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
      <EditorContent editor={editor} />
    </div>
  )
}

export function RichTextContent({ value }: { value: string }) {
  if (!value) return null
  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: value }} />
}
