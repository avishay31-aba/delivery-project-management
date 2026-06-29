import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Project, System } from '@/data/seed.types'
import { ConfigurationColumnHeaders, ConfigurationValueCells } from '@/components/configuration'
import { AlertStatusIcon, LinkId, RecordChangeBadge } from '@/components/ui'
import { TENANT_REQUIREMENT_CONFIGURATION_FIELDS } from '@/domain/tenant-requirement'
import { systemRoutePath } from '@/domain/system-inventory'

const PLATFORM_DETAIL_GROUPS: Array<{ title: string; fields: Array<{ key: string; label: string }> }> = [
  {
    title: 'Access Details',
    fields: [
      { key: 'url', label: 'URL' },
      { key: 'ipRestrictionEnabled', label: 'IP Restriction' },
      { key: 'vpnEnabled', label: 'VPN' },
      { key: 'vpnType', label: 'VPN Type' },
    ],
  },
  {
    title: 'Hosting',
    fields: [
      { key: 'hostingType', label: 'Hosting' },
      { key: 'cloudPlatform', label: 'Cloud Platform' },
      { key: 'csp', label: 'CSP' },
      { key: 'cloudRegion', label: 'Cloud Region' },
      { key: 'performanceTier', label: 'Performance Tier' },
    ],
  },
  {
    title: 'Identifiers',
    fields: [
      { key: 'statisticsId', label: 'Statistics ID' },
      { key: 'authId', label: 'Auth ID' },
      { key: 'rdmId', label: 'RDM ID' },
    ],
  },
]

function formatReadOnlyValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ') || '-'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function renderSystemDetails(system: System) {
  return (
    <div className="space-y-4 p-3">
      {PLATFORM_DETAIL_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <h4 className="text-sm font-semibold text-sf-text">{group.title}</h4>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {group.fields.map((field) => (
              <div key={field.key} className="rounded border border-sf-border bg-white px-2 py-1">
                <dt className="text-xs font-medium text-sf-text-muted">{field.label}</dt>
                <dd className="text-sm text-sf-text">{formatReadOnlyValue((system as unknown as Record<string, unknown>)[field.key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

interface SystemDeliveryTableProps {
  systems: System[]
  projects: Project[]
  fallbackProjectId?: string
  emptyText: string
  expandedSystemIds?: string[]
  onToggleDetails?: (systemId: string) => void
  actions?: (system: System) => ReactNode
  renderOperationalStatus: (status: string) => ReactNode
  productMismatch?: (system: System) => boolean
}

export function SystemDeliveryTable({
  systems,
  projects,
  fallbackProjectId,
  emptyText,
  expandedSystemIds = [],
  onToggleDetails,
  actions,
  renderOperationalStatus,
  productMismatch,
}: SystemDeliveryTableProps) {
  if (systems.length === 0) {
    return (
      <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="sf-scroll-x rounded border border-sf-border bg-white">
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {[
              'Actions',
              'Details',
              'SID',
              'MID',
              'PIDs',
              'Time Group',
              'Operational Status',
              'Delivery',
              'Product Mismatch',
            ].map((label) => (
              <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {label}
              </th>
            ))}
            <ConfigurationColumnHeaders fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
          </tr>
        </thead>
        <tbody>
          {systems.map((system) => {
            const isExpanded = expandedSystemIds.includes(system.id)
            const projectIds = system.linkedProjectIds?.length ? system.linkedProjectIds : fallbackProjectId ? [fallbackProjectId] : []
            return [
              <tr key={system.id} className="hover:bg-sf-surface-alt">
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {actions?.(system)}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {onToggleDetails ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs hover:bg-sf-surface-alt"
                      aria-expanded={isExpanded}
                      onClick={() => onToggleDetails(system.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                      Details
                    </button>
                  ) : null}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <span className="inline-flex items-center gap-2">
                    <LinkId to={systemRoutePath(system)}>
                      {system.sid ?? system.machineId ?? system.id}
                    </LinkId>
                    <RecordChangeBadge record={system} labels={{ New: 'Added' }} />
                  </span>
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system.machineId ? <LinkId to={systemRoutePath(system)}>{system.machineId}</LinkId> : ''}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {projectIds.map((projectId) => {
                    const project = projects.find((candidate) => candidate.id === projectId || candidate.pid === projectId)
                    return project ? (
                      <span key={projectId} className="mr-2 inline-block">
                        <LinkId to={`/projects/${project.pid}`}>{project.pid}</LinkId>
                      </span>
                    ) : null
                  })}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.timeGroup}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{renderOperationalStatus(system.operationalStatus)}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.purpose}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {productMismatch?.(system) ? (
                    <span className="group relative inline-flex" title="Product mismatch">
                      <AlertStatusIcon variant="warning" label="Product mismatch" />
                      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 shadow group-hover:block">
                        Product mismatch
                      </span>
                    </span>
                  ) : null}
                </td>
                <ConfigurationValueCells record={system as unknown as Record<string, unknown>} fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
              </tr>,
              isExpanded ? (
                <tr key={`${system.id}-details`}>
                  <td className="border border-sf-border bg-sf-surface-alt p-0" colSpan={9 + TENANT_REQUIREMENT_CONFIGURATION_FIELDS.length}>
                    {renderSystemDetails(system)}
                  </td>
                </tr>
              ) : null,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
