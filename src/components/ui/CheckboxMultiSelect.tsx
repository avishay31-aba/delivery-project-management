import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingOverlay } from '@/components/ui/FloatingOverlay'
import { validationControlClassName } from '@/components/ui/validationPresentation'

export interface CheckboxMultiSelectOption {
  value: string
  label?: string
  disabled?: boolean
}

export function CheckboxMultiSelect({
  id,
  label,
  selected,
  options,
  disabled = false,
  invalid = false,
  onChange,
}: {
  id: string
  label: string
  selected: string[]
  options: CheckboxMultiSelectOption[]
  disabled?: boolean
  invalid?: boolean
  onChange: (selected: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const { triggerRef, overlayRef, style, containsEventTarget } = useFloatingOverlay<HTMLButtonElement, HTMLDivElement>(open, {
    minWidth: 256,
    matchTriggerWidth: true,
    maxHeight: 224,
  })
  const pickerId = `checkbox-multiselect:${id}`
  const selectedText = selected.length > 0 ? selected.join('; ') : 'Select'
  const triggerWidth = `${Math.min(48, Math.max(16, selectedText.length + 3))}ch`

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (containsEventTarget(event.target)) return
      setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [containsEventTarget, open])

  function toggleOption(value: string) {
    if (selected.includes(value)) onChange(selected.filter((candidate) => candidate !== value))
    else onChange([...selected, value])
  }

  return (
    <span className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        data-multiselect-trigger={pickerId}
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        className={[
          'h-8 min-w-56 max-w-[42rem] whitespace-nowrap rounded border border-sf-border bg-white px-2 py-1 text-left text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted',
          validationControlClassName(invalid),
        ].join(' ')}
        style={{ width: triggerWidth }}
        title={selected.join('; ')}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{selectedText}</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={overlayRef}
              data-multiselect-picker={pickerId}
              className="fixed z-50 overflow-y-auto rounded border border-sf-border bg-white p-1 shadow-lg"
              style={style}
            >
              {options.map((option) => (
                <label
                  key={option.value}
                  className={[
                    'flex items-center gap-2 px-2 py-1 text-sm hover:bg-sf-surface-alt',
                    option.disabled ? 'cursor-not-allowed text-sf-text-muted' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    disabled={option.disabled}
                    onChange={() => toggleOption(option.value)}
                  />
                  <span>{option.label ?? option.value}</span>
                </label>
              ))}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
