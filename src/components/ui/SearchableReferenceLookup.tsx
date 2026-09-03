import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

export interface SearchableReferenceOption {
  id: string
  value: string
  primaryLabel: string
  secondaryLabel?: string
}

export const SEARCHABLE_REFERENCE_DEFAULT_LIMIT = 5
const SEARCH_OPTION_VALUE = '__search__'

function optionSearchText(option: SearchableReferenceOption): string {
  return [option.primaryLabel, option.secondaryLabel, option.value].filter(Boolean).join(' ').toLocaleLowerCase()
}

function optionDisplayLabel(option: SearchableReferenceOption): string {
  return option.secondaryLabel ? `${option.primaryLabel} (${option.secondaryLabel})` : option.primaryLabel
}

interface SearchableReferenceLookupProps {
  options: SearchableReferenceOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  disabled?: boolean
  defaultLimit?: number
  searchTitle?: string
  searchPlaceholder?: string
  emptyLabel?: string
  searchOptionLabel?: string
  selectLabel?: string
}

export function SearchableReferenceLookup({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  disabled = false,
  defaultLimit = SEARCHABLE_REFERENCE_DEFAULT_LIMIT,
  searchTitle = 'Search',
  searchPlaceholder = 'Search by name or ID',
  emptyLabel = 'Select...',
  searchOptionLabel = 'Search...',
  selectLabel = 'Select',
}: SearchableReferenceLookupProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingValue, setPendingValue] = useState('')

  const selectedOption = options.find((option) => option.value === value)
  const defaultOptions = options.slice(0, defaultLimit)
  const dropdownOptions = selectedOption && !defaultOptions.some((option) => option.id === selectedOption.id)
    ? [selectedOption, ...defaultOptions]
    : defaultOptions

  const matchingOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return options
    return options.filter((option) => optionSearchText(option).includes(normalized))
  }, [options, query])

  function openSearch() {
    if (disabled) return
    setQuery('')
    setPendingValue(value)
    setSearchOpen(true)
  }

  function closeSearch() {
    setSearchOpen(false)
    setQuery('')
    setPendingValue('')
  }

  function confirmSearch() {
    if (!pendingValue) return
    onChange(pendingValue)
    closeSearch()
  }

  return (
    <>
      <select
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === SEARCH_OPTION_VALUE) {
            openSearch()
            return
          }
          onChange(nextValue)
        }}
      >
        <option value="">{emptyLabel}</option>
        {value && !dropdownOptions.some((option) => option.value === value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {dropdownOptions.map((option) => (
          <option key={option.id} value={option.value}>
            {optionDisplayLabel(option)}
          </option>
        ))}
        <option value={SEARCH_OPTION_VALUE}>{searchOptionLabel}</option>
      </select>
      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="searchable-reference-title">
            <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
              <h2 id="searchable-reference-title" className="text-lg font-semibold text-sf-text">{searchTitle}</h2>
              <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close search dialog" onClick={closeSearch}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 overflow-auto p-4">
              <input
                autoFocus
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirmSearch()
                  }
                }}
              />
              {matchingOptions.length === 0 ? (
                <div className="rounded border border-dashed border-sf-border bg-sf-surface-alt p-3 text-sm text-sf-text-muted">No matching records.</div>
              ) : (
                <div className="max-h-72 overflow-auto rounded border border-sf-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-sf-surface-alt text-left">
                      <tr>
                        <th className="border-b border-sf-border px-2 py-1.5 font-semibold text-sf-text">Name</th>
                        <th className="border-b border-sf-border px-2 py-1.5 font-semibold text-sf-text">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingOptions.map((option) => {
                        const isSelected = pendingValue === option.value
                        return (
                          <tr
                            key={option.id}
                            className={isSelected ? 'bg-blue-50' : 'hover:bg-sf-surface-alt'}
                            onClick={() => setPendingValue(option.value)}
                            onDoubleClick={() => {
                              onChange(option.value)
                              closeSearch()
                            }}
                          >
                            <td className="border-b border-sf-border px-2 py-1.5 text-sf-text">{option.primaryLabel}</td>
                            <td className="border-b border-sf-border px-2 py-1.5 text-sf-text">{option.secondaryLabel || option.value}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-sf-border p-4">
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeSearch}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!pendingValue}
                onClick={confirmSearch}
              >
                {selectLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
