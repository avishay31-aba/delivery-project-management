import { useEffect, useRef } from 'react'

interface ReactiveDraftSyncOptions<T> {
  source: T
  draft: T
  resetDraft: (value: T) => void
  clone: (value: T) => T
  isEqual: (first: T, second: T) => boolean
}

export function useReactiveDraftSync<T>({
  source,
  draft,
  resetDraft,
  clone,
  isEqual,
}: ReactiveDraftSyncOptions<T>) {
  const previousSourceRef = useRef<T>(source)

  useEffect(() => {
    const previousSource = previousSourceRef.current
    const sourceChanged = !isEqual(previousSource, source)
    if (!sourceChanged) return

    const draftWasClean = isEqual(previousSource, draft)
    const draftMatchesNextSource = isEqual(source, draft)
    previousSourceRef.current = source

    if (draftWasClean || draftMatchesNextSource) {
      resetDraft(clone(source))
    }
  }, [clone, draft, isEqual, resetDraft, source])
}
