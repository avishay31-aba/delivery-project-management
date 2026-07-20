import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { BusinessObjectLink, PlaceholderCard } from '@/components/ui'
import { projectMainTypeLabel, projectStatusLabel } from '@/domain/project-lifecycle'
import { projectReference } from '@/domain/business-reference'
import type { LinkedProjectRow } from '@/domain/linked-projects'
import { ProjectStatusIcon } from './ProjectStatusIcon'

interface LinkedProjectsTableProps {
  rows: LinkedProjectRow[]
  includeAccountName?: boolean
}

type LinkedProjectSortKey = 'pid' | 'progressStatus' | 'projectName' | 'projectType' | 'projectSubType' | 'accountName'
type SortDirection = 'asc' | 'desc'

interface LinkedProjectColumn {
  key: LinkedProjectSortKey
  label: string
  render: (row: LinkedProjectRow) => ReactNode
  getValue: (row: LinkedProjectRow) => string
}

function projectSubTypeValue(value: string): string {
  return value && value !== 'NONE' ? value : '-'
}

function sortValue(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function LinkedProjectsTable({ rows, includeAccountName = false }: LinkedProjectsTableProps) {
  const [sort, setSort] = useState<{ key: LinkedProjectSortKey; direction: SortDirection } | null>(null)
  const columns = useMemo<LinkedProjectColumn[]>(() => [
    {
      key: 'pid',
      label: 'PID',
      getValue: (row) => row.pid,
      render: (row) => <BusinessObjectLink reference={projectReference(row.project)}>{row.pid}</BusinessObjectLink>,
    },
    {
      key: 'progressStatus',
      label: 'Project Status Icon',
      getValue: (row) => projectStatusLabel(row.progressStatus),
      render: (row) => <ProjectStatusIcon status={row.progressStatus} />,
    },
    {
      key: 'projectName',
      label: 'Project Name',
      getValue: (row) => row.projectName,
      render: (row) => <BusinessObjectLink reference={projectReference(row.project)}>{row.projectName || row.pid}</BusinessObjectLink>,
    },
    {
      key: 'projectType',
      label: 'Project Type',
      getValue: (row) => projectMainTypeLabel(row.projectType),
      render: (row) => projectMainTypeLabel(row.projectType),
    },
    {
      key: 'projectSubType',
      label: 'Project Sub Type',
      getValue: (row) => projectSubTypeValue(row.projectSubType),
      render: (row) => projectSubTypeValue(row.projectSubType),
    },
    ...(includeAccountName ? [{
      key: 'accountName' as const,
      label: 'Account Name',
      getValue: (row: LinkedProjectRow) => row.accountName,
      render: (row: LinkedProjectRow) => row.accountName || '-',
    }] : []),
  ], [includeAccountName])
  const displayedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((candidate) => candidate.key === sort.key)
    if (!column) return rows
    return [...rows].sort((first, second) => {
      const comparison = sortValue(column.getValue(first)).localeCompare(sortValue(column.getValue(second)))
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [columns, rows, sort])

  function toggleSort(key: LinkedProjectSortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function SortIndicator({ columnKey }: { columnKey: LinkedProjectSortKey }) {
    if (sort?.key === columnKey && sort.direction === 'asc') return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
    if (sort?.key === columnKey && sort.direction === 'desc') return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
    return <ArrowUpDown className="h-3.5 w-3.5 text-sf-text-muted" aria-hidden="true" />
  }

  if (rows.length === 0) {
    return (
      <PlaceholderCard
        title="No linked Projects"
        description="No Projects are linked to this record."
      />
    )
  }

  return (
    <div className="sf-scroll-x rounded border border-sf-border bg-white">
      <table className="w-max min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-sf-brand"
                  aria-label={`Sort by ${column.label}`}
                  onClick={() => toggleSort(column.key)}
                >
                  {column.label}
                  <SortIndicator columnKey={column.key} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayedRows.map((row) => {
            return (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
