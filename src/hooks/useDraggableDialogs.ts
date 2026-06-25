import { useEffect } from 'react'

function isDialogHeaderTarget(dialog: HTMLElement, target: HTMLElement): boolean {
  const labelledBy = dialog.getAttribute('aria-labelledby')
  const titleElement = labelledBy ? document.getElementById(labelledBy) : null
  if (titleElement && titleElement.contains(target)) return true

  const firstElement = Array.from(dialog.children).find((child): child is HTMLElement => child instanceof HTMLElement)
  return Boolean(firstElement && firstElement.contains(target))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function useDraggableDialogs() {
  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      const dialog = target?.closest('[role="dialog"]') as HTMLElement | null
      if (!target || !dialog || !isDialogHeaderTarget(dialog, target)) return
      if (target.closest('button, input, select, textarea, a, [role="button"]')) return

      const rect = dialog.getBoundingClientRect()
      const activeDialog = dialog
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      activeDialog.style.position = 'fixed'
      activeDialog.style.left = `${rect.left}px`
      activeDialog.style.top = `${rect.top}px`
      activeDialog.style.margin = '0'
      activeDialog.style.transform = 'none'
      activeDialog.style.cursor = 'grabbing'
      activeDialog.style.userSelect = 'none'

      function handleMouseMove(moveEvent: MouseEvent) {
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8)
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8)
        activeDialog.style.left = `${clamp(moveEvent.clientX - offsetX, 8, maxLeft)}px`
        activeDialog.style.top = `${clamp(moveEvent.clientY - offsetY, 8, maxTop)}px`
      }

      function handleMouseUp() {
        activeDialog.style.cursor = ''
        activeDialog.style.userSelect = ''
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])
}
