import { useCallback, useReducer } from 'react'

type UndoUpdater<T> = T | ((current: T) => T)

interface UndoHistoryState<T> {
  value: T
  history: T[]
}

type UndoHistoryAction<T> =
  | { type: 'set'; updater: UndoUpdater<T>; record: boolean }
  | { type: 'reset'; value: T }
  | { type: 'undo' }

interface UseUndoHistoryOptions<T> {
  clone?: (value: T) => T
  isEqual?: (first: T, second: T) => boolean
}

const defaultClone = <T,>(value: T): T => value
const defaultIsEqual = <T,>(first: T, second: T): boolean => Object.is(first, second)

export function useUndoHistory<T>(initialValue: T, options: UseUndoHistoryOptions<T> = {}) {
  const clone = options.clone ?? defaultClone
  const isEqual = options.isEqual ?? defaultIsEqual

  const [state, dispatch] = useReducer(
    (current: UndoHistoryState<T>, action: UndoHistoryAction<T>): UndoHistoryState<T> => {
      if (action.type === 'reset') {
        return { value: action.value, history: [] }
      }

      if (action.type === 'undo') {
        const previous = current.history[current.history.length - 1]
        if (previous === undefined) return current
        return {
          value: previous,
          history: current.history.slice(0, -1),
        }
      }

      const nextValue = typeof action.updater === 'function'
        ? (action.updater as (value: T) => T)(current.value)
        : action.updater

      if (!action.record || isEqual(current.value, nextValue)) {
        return { ...current, value: nextValue }
      }

      return {
        value: nextValue,
        history: [...current.history, clone(current.value)],
      }
    },
    { value: initialValue, history: [] },
  )

  const setValue = useCallback((updater: UndoUpdater<T>, options?: { record?: boolean }) => {
    dispatch({ type: 'set', updater, record: options?.record ?? true })
  }, [])

  const reset = useCallback((value: T) => {
    dispatch({ type: 'reset', value })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'undo' })
  }, [])

  return {
    value: state.value,
    setValue,
    reset,
    undo,
    canUndo: state.history.length > 0,
  }
}
