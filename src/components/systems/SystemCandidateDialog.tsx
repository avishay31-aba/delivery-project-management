import { type ReactNode, useMemo } from 'react'
import { X } from 'lucide-react'
import type { ProductionSystemInventoryItem, ReusedInternalSystem, System } from '@/data/seed.types'

export type SystemCandidate = ProductionSystemInventoryItem | ReusedInternalSystem | System
export type SystemCandidateSortKey = 'id' | 'mid' | 'source' | 'status' | 'product' | 'cloudPlatform' | 'csp' | 'region'
export type SystemCandidateFilterKey = 'hostingType' | 'cloudPlatform' | 'regionTimeGroup'
export type SystemCandidateFilters = Record<SystemCandidateFilterKey, string>

export const SYSTEM_CANDIDATE_SORT_OPTIONS: Array<{ key: SystemCandidateSortKey; label: string }> = [
  { key: 'id', label: 'ID' },
  { key: 'mid', label: 'MID' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'product', label: 'Product' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'region', label: 'Used in Region' },
]

export const EMPTY_SYSTEM_CANDIDATE_FILTERS: SystemCandidateFilters = {
  regionTimeGroup: '',
  hostingType: '',
  cloudPlatform: '',
}

export const SYSTEM_CANDIDATE_FILTER_OPTIONS: Array<{ key: SystemCandidateFilterKey; label: string }> = [
  { key: 'hostingType', label: 'Hosting' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'regionTimeGroup', label: 'Used in Region' },
]

export function candidatePrimaryId(candidate: SystemCandidate): string {
  if ('sid' in candidate && candidate.sid) return candidate.sid
  if ('machineId' in candidate && candidate.machineId) return candidate.machineId
  return candidate.id
}

export function candidateMachineId(candidate: SystemCandidate): string {
  return 'machineId' in candidate ? candidate.machineId ?? '' : ''
}

export function candidateSource(candidate: SystemCandidate): string {
  return 'source' in candidate ? candidate.source ?? '' : ''
}

export function candidateStatus(candidate: SystemCandidate): string {
  return 'status' in candidate ? candidate.status : candidate.operationalStatus
}

export function candidateRegionTimeGroup(candidate: SystemCandidate): string {
  if ('usedInRegion' in candidate && candidate.usedInRegion) return candidate.usedInRegion
  if ('region' in candidate && candidate.region) return candidate.region
  if ('timeGroup' in candidate && candidate.timeGroup) return candidate.timeGroup
  return ''
}

export function candidateCloudRegion(candidate: SystemCandidate): string {
  return candidate.cloudRegion ?? ''
}

export function candidateAvailability(candidate: SystemCandidate): string {
  if ('availability' in candidate && candidate.availability) return candidate.availability
  if ('allocationStatus' in candidate && candidate.allocationStatus) return String(candidate.allocationStatus)
  return ''
}

export function candidateVersion(candidate: SystemCandidate): string {
  const value = (candidate as SystemCandidate & { versionNumber?: string | number | null }).versionNumber
  return value ? String(value) : ''
}

function candidateFilterValue(candidate: SystemCandidate, filterKey: SystemCandidateFilterKey): string {
  const values: Record<SystemCandidateFilterKey, string> = {
    hostingType: candidate.hostingType,
    cloudPlatform: candidate.cloudPlatform ?? '',
    regionTimeGroup: candidateRegionTimeGroup(candidate),
  }
  return values[filterKey]
}

function candidateSortValue(candidate: SystemCandidate, sortKey: SystemCandidateSortKey): string {
  const values: Record<SystemCandidateSortKey, string> = {
    id: candidatePrimaryId(candidate),
    mid: candidateMachineId(candidate),
    source: candidateSource(candidate),
    status: candidateStatus(candidate),
    product: candidate.productType,
    cloudPlatform: candidate.cloudPlatform ?? '',
    csp: candidate.csp ?? '',
    region: candidateRegionTimeGroup(candidate),
  }
  return values[sortKey]
}

function candidateSearchText(candidate: SystemCandidate): string {
  return SYSTEM_CANDIDATE_SORT_OPTIONS
    .map((option) => candidateSortValue(candidate, option.key))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function candidateFilterOptions(candidates: SystemCandidate[], filterKey: SystemCandidateFilterKey): string[] {
  return Array.from(new Set(candidates.map((candidate) => candidateFilterValue(candidate, filterKey)).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
}

function candidateMatchesStructuredFilters(candidate: SystemCandidate, filters: SystemCandidateFilters): boolean {
  return SYSTEM_CANDIDATE_FILTER_OPTIONS.every((filter) => {
    const filterValue = filters[filter.key]
    return filterValue ? candidateFilterValue(candidate, filter.key) === filterValue : true
  })
}

interface SystemCandidateMode {
  id: string
  label: string
  icon?: ReactNode
}

interface SystemCandidateDialogProps {
  title: string
  description: string
  closeLabel: string
  confirmLabel?: string
  modes: SystemCandidateMode[]
  selectedMode: string
  onModeChange: (mode: string) => void
  result?: ReactNode
  candidates: SystemCandidate[]
  selectedCandidateIds: string[]
  onToggleCandidate: (candidateId: string, selected: boolean) => void
  search: string
  onSearchChange: (value: string) => void
  filters: SystemCandidateFilters
  onFiltersChange: (filters: SystemCandidateFilters) => void
  sortKey: SystemCandidateSortKey
  onSortKeyChange: (sortKey: SystemCandidateSortKey) => void
  sortDirection: 'asc' | 'desc'
  onSortDirectionChange: (sortDirection: 'asc' | 'desc') => void
  onClose: () => void
  onConfirm: () => void
  emptyText: string
  allowMultiple?: boolean
  isReusedInternalMode?: boolean
  confirmDisabled?: boolean
  getCandidateVersion?: (candidate: SystemCandidate) => string
}

export function SystemCandidateDialog({
  title,
  description,
  closeLabel,
  confirmLabel = 'Confirm',
  modes,
  selectedMode,
  onModeChange,
  result,
  candidates,
  selectedCandidateIds,
  onToggleCandidate,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sortKey,
  onSortKeyChange,
  sortDirection,
  onSortDirectionChange,
  onClose,
  onConfirm,
  emptyText,
  allowMultiple = true,
  isReusedInternalMode = false,
  confirmDisabled,
  getCandidateVersion = candidateVersion,
}: SystemCandidateDialogProps) {
  const candidateHeaders = [
    'Select',
    ...(isReusedInternalMode ? ['MID'] : ['ID', 'MID']),
    'Source',
    'Status',
    'Used in Region',
    'Country',
    'Product',
    'Hosting',
    'Cloud Platform',
    'Cloud Region',
    'Availability',
    'Version',
  ]
  const trimmedSearch = search.trim().toLowerCase()
  const filterValues = useMemo(
    () =>
      Object.fromEntries(
        SYSTEM_CANDIDATE_FILTER_OPTIONS.map((filter) => [
          filter.key,
          candidateFilterOptions(candidates, filter.key),
        ]),
      ) as Record<SystemCandidateFilterKey, string[]>,
    [candidates],
  )
  const visibleCandidates = [...candidates]
    .filter((candidate) => trimmedSearch ? candidateSearchText(candidate).includes(trimmedSearch) : true)
    .filter((candidate) => candidateMatchesStructuredFilters(candidate, filters))
    .sort((firstCandidate, secondCandidate) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      return candidateSortValue(firstCandidate, sortKey).localeCompare(
        candidateSortValue(secondCandidate, sortKey),
      ) * direction
    })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-8">
      <div className="flex h-[82vh] w-full max-w-[96rem] resize overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="false" aria-labelledby="system-candidate-dialog-title">
        <div className="flex min-h-0 w-full flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="system-candidate-dialog-title" className="text-xl font-semibold text-sf-text">{title}</h2>
              <p className="text-sm text-sf-text-muted">{description}</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label={closeLabel} onClick={onClose}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={[
                    'inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm font-semibold',
                    selectedMode === mode.id
                      ? 'border-sf-brand bg-sf-brand text-white'
                      : 'border-sf-border bg-white text-sf-text hover:bg-sf-surface-alt',
                  ].join(' ')}
                  onClick={() => onModeChange(mode.id)}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>

            {result}

            {candidates.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-2 rounded border border-sf-border bg-white p-2">
                  <label className="block text-sm font-medium text-sf-text">
                    Filter
                    <input
                      className="mt-1 h-8 rounded border border-sf-border px-2 text-sm"
                      placeholder="Search candidates"
                      value={search}
                      onChange={(event) => onSearchChange(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-sf-text">
                    Sort by
                    <select
                      className="mt-1 h-8 rounded border border-sf-border px-2 text-sm"
                      value={sortKey}
                      onChange={(event) => onSortKeyChange(event.target.value as SystemCandidateSortKey)}
                    >
                      {SYSTEM_CANDIDATE_SORT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                    onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                  {SYSTEM_CANDIDATE_FILTER_OPTIONS.map((filter) => {
                    const options = filterValues[filter.key]
                    if (options.length === 0) return null
                    return (
                      <label key={filter.key} className="block text-sm font-medium text-sf-text">
                        {filter.label}
                        <select
                          className="mt-1 h-8 max-w-44 rounded border border-sf-border px-2 text-sm"
                          value={filters[filter.key]}
                          onChange={(event) =>
                            onFiltersChange({
                              ...filters,
                              [filter.key]: event.target.value,
                            })
                          }
                        >
                          <option value="">All</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  })}
                  {Object.values(filters).some(Boolean) ? (
                    <button
                      type="button"
                      className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                      onClick={() => onFiltersChange(EMPTY_SYSTEM_CANDIDATE_FILTERS)}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
                <div className="sf-scroll-x rounded border border-sf-border bg-white">
                  <table className="min-w-full border-collapse text-sm leading-tight">
                    <thead className="bg-sf-surface-alt text-left">
                      <tr>
                        {candidateHeaders.map((label) => (
                          <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCandidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-sf-surface-alt">
                          <td className="border border-sf-border px-1.5 py-1">
                            <input
                              type={allowMultiple ? 'checkbox' : 'radio'}
                              name={allowMultiple ? undefined : 'system-candidate-selection'}
                              checked={selectedCandidateIds.includes(candidate.id)}
                              onChange={(event) => onToggleCandidate(candidate.id, event.target.checked)}
                            />
                          </td>
                          {isReusedInternalMode ? (
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateMachineId(candidate) || candidatePrimaryId(candidate)}</td>
                          ) : (
                            <>
                              <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidatePrimaryId(candidate)}</td>
                              <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateMachineId(candidate)}</td>
                            </>
                          )}
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateSource(candidate)}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateStatus(candidate)}</td>
                          <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateRegionTimeGroup(candidate) || '-'}</td>
                          <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{'country' in candidate ? candidate.country || '-' : '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.productType || '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.hostingType || '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.cloudPlatform || '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateCloudRegion(candidate) || '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateAvailability(candidate) || '-'}</td>
                          <td className="border border-sf-border px-1.5 py-1 text-sf-text">{getCandidateVersion(candidate) || '-'}</td>
                        </tr>
                      ))}
                      {visibleCandidates.length === 0 ? (
                        <tr>
                          <td className="border border-sf-border px-1.5 py-4 text-center text-sm text-sf-text-muted" colSpan={candidateHeaders.length}>
                            No systems match the current filter.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
                {emptyText}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={confirmDisabled ?? selectedCandidateIds.length === 0}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
