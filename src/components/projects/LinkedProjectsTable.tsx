import { BusinessObjectLink, PlaceholderCard } from '@/components/ui'
import { projectMainTypeLabel } from '@/domain/project-lifecycle'
import { projectReference } from '@/domain/business-reference'
import type { LinkedProjectRow } from '@/domain/linked-projects'
import { ProjectStatusIcon } from './ProjectStatusIcon'

interface LinkedProjectsTableProps {
  rows: LinkedProjectRow[]
  includeAccountName?: boolean
}

function projectSubTypeValue(value: string): string {
  return value && value !== 'NONE' ? value : '-'
}

export function LinkedProjectsTable({ rows, includeAccountName = false }: LinkedProjectsTableProps) {
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
            {[
              'PID',
              'Project Status Icon',
              'Project Name',
              'Project Type',
              'Project Sub Type',
              ...(includeAccountName ? ['Account Name'] : []),
            ].map((label) => (
              <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const reference = projectReference(row.project)
            return (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <BusinessObjectLink reference={reference}>{row.pid}</BusinessObjectLink>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <ProjectStatusIcon status={row.progressStatus} />
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <BusinessObjectLink reference={reference}>{row.projectName || row.pid}</BusinessObjectLink>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{projectMainTypeLabel(row.projectType)}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{projectSubTypeValue(row.projectSubType)}</td>
                {includeAccountName ? (
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.accountName || '-'}</td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
