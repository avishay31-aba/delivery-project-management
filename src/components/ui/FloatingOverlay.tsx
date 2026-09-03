import { type CSSProperties, type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

const VIEWPORT_PADDING = 8
const TRIGGER_GAP = 4
const MIN_POPUP_HEIGHT = 96

export interface FloatingOverlayOptions {
  minWidth?: number
  matchTriggerWidth?: boolean
  maxHeight?: number
  offset?: number
}

export interface FloatingOverlayPosition {
  left: number
  top: number
  width: number
  maxHeight: number
  clipped: boolean
  placement: 'top' | 'bottom'
}

export function calculateFloatingOverlayPosition(
  triggerRect: DOMRect,
  overlaySize: { width: number; height: number },
  options: FloatingOverlayOptions = {},
): FloatingOverlayPosition {
  const offset = options.offset ?? TRIGGER_GAP
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const minWidth = options.minWidth ?? 0
  const width = Math.min(
    Math.max(options.matchTriggerWidth === false ? overlaySize.width : triggerRect.width, minWidth),
    Math.max(minWidth, viewportWidth - VIEWPORT_PADDING * 2),
  )
  const spaceBelow = viewportHeight - triggerRect.bottom - offset - VIEWPORT_PADDING
  const spaceAbove = triggerRect.top - offset - VIEWPORT_PADDING
  const preferredHeight = Math.min(overlaySize.height, options.maxHeight ?? overlaySize.height)
  const placement: FloatingOverlayPosition['placement'] =
    spaceBelow >= preferredHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top'
  const availableHeight = Math.max(MIN_POPUP_HEIGHT, placement === 'bottom' ? spaceBelow : spaceAbove)
  const clipped = preferredHeight > availableHeight
  const maxHeight = Math.ceil(Math.min(preferredHeight, availableHeight))
  const preferredTop = placement === 'bottom'
    ? triggerRect.bottom + offset
    : triggerRect.top - offset - maxHeight
  const top = Math.min(
    Math.max(VIEWPORT_PADDING, preferredTop),
    Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - maxHeight),
  )
  const left = Math.min(
    Math.max(VIEWPORT_PADDING, triggerRect.left),
    Math.max(VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - width),
  )

  return { left, top, width, maxHeight, clipped, placement }
}

export function useFloatingOverlay<TTrigger extends HTMLElement, TOverlay extends HTMLElement>(
  open: boolean,
  options: FloatingOverlayOptions = {},
): {
  triggerRef: RefObject<TTrigger | null>
  overlayRef: RefObject<TOverlay | null>
  style: CSSProperties
  updatePosition: () => void
  containsEventTarget: (target: EventTarget | null) => boolean
} {
  const triggerRef = useRef<TTrigger>(null)
  const overlayRef = useRef<TOverlay>(null)
  const [position, setPosition] = useState<FloatingOverlayPosition | null>(null)
  const minWidth = options.minWidth
  const matchTriggerWidth = options.matchTriggerWidth
  const maxHeight = options.maxHeight
  const offset = options.offset

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    const overlay = overlayRef.current
    if (!trigger || !overlay) return

    const triggerRect = trigger.getBoundingClientRect()
    const previousMaxHeight = overlay.style.maxHeight
    overlay.style.maxHeight = ''
    const overlaySize = {
      width: overlay.scrollWidth || overlay.offsetWidth || triggerRect.width,
      height: overlay.scrollHeight || overlay.offsetHeight || MIN_POPUP_HEIGHT,
    }
    overlay.style.maxHeight = previousMaxHeight
    const nextPosition = calculateFloatingOverlayPosition(triggerRect, overlaySize, {
      minWidth,
      matchTriggerWidth,
      maxHeight,
      offset,
    })
    setPosition((current) => {
      if (
        current &&
        current.left === nextPosition.left &&
        current.top === nextPosition.top &&
        current.width === nextPosition.width &&
        current.maxHeight === nextPosition.maxHeight &&
        current.clipped === nextPosition.clipped &&
        current.placement === nextPosition.placement
      ) {
        return current
      }
      return nextPosition
    })
  }, [maxHeight, matchTriggerWidth, minWidth, offset])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  useLayoutEffect(() => {
    if (!open) return

    function handleResize() {
      updatePosition()
    }

    function handleScroll(event: Event) {
      const target = event.target
      if (target instanceof Node && overlayRef.current?.contains(target)) return
      updatePosition()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePosition])

  const style: CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.clipped ? position.maxHeight : undefined,
      }
    : {
        left: 0,
        top: 0,
        width: minWidth,
        maxHeight,
        visibility: 'hidden',
      }

  const containsEventTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) return false
    return Boolean(triggerRef.current?.contains(target) || overlayRef.current?.contains(target))
  }, [])

  return { triggerRef, overlayRef, style, updatePosition, containsEventTarget }
}
