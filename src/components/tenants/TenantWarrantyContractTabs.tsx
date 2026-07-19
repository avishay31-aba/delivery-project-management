import { type ReactNode, useMemo, useState } from 'react'
import type { System, Tenant } from '@/data/seed.types'
import { tenantsGroupedByDerivedWarrantyContractStatus } from '@/domain/tenant-operations'
import { cn } from '@/utils/cn'
import { TenantDeliveryTable } from './TenantDeliveryTable'

interface TenantWarrantyContractTabsProps {
  tenants: Tenant[]
  systems: System[]
  emptyTextForSection: (title: string) => string
  headingLevel?: 'h3' | 'h4'
  actions?: (tenant: Tenant, system: System | undefined) => ReactNode
}

export function TenantWarrantyContractTabs({
  tenants,
  systems,
  emptyTextForSection,
  headingLevel = 'h4',
  actions,
}: TenantWarrantyContractTabsProps) {
  const sections = useMemo(() => tenantsGroupedByDerivedWarrantyContractStatus(tenants), [tenants])
  const [activeStatus, setActiveStatus] = useState(sections[0]?.status ?? 'NOT_SET_YET')
  const activeSection = sections.find((section) => section.status === activeStatus) ?? sections[0]
  const Heading = headingLevel

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-sf-border" role="tablist" aria-label="Tenant warranty contract status">
        {sections.map((section) => (
          <button
            key={section.status}
            type="button"
            role="tab"
            aria-selected={activeSection.status === section.status}
            className={cn(
              'rounded-t border border-b-0 border-sf-border bg-white px-3 py-1.5 text-sm font-semibold text-sf-text hover:bg-sf-surface-alt',
              activeSection.status === section.status ? 'bg-sf-surface-alt text-sf-brand' : 'text-sf-text-muted',
            )}
            onClick={() => setActiveStatus(section.status)}
          >
            {section.title}
            <span className="ml-1 text-xs font-normal text-sf-text-muted">({section.rows.length})</span>
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <Heading className={headingLevel === 'h3' ? 'text-lg font-semibold text-sf-text' : 'text-sm font-semibold text-sf-text'}>
          {activeSection.title}
        </Heading>
        <div className="mt-2">
          <TenantDeliveryTable
            tenants={activeSection.rows}
            systems={systems}
            emptyText={emptyTextForSection(activeSection.title)}
            actions={actions}
          />
        </div>
      </div>
    </section>
  )
}
