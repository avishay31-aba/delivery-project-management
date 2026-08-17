import { type ReactNode, useMemo } from 'react'
import type { System, Tenant } from '@/data/seed.types'
import { tenantsGroupedByDerivedWarrantyContractStatus } from '@/domain/tenant-operations'
import { TenantDeliveryTable } from './TenantDeliveryTable'

interface TenantWarrantyContractSectionsProps {
  tenants: Tenant[]
  systems: System[]
  emptyTextForSection: (title: string) => string
  headingLevel?: 'h3' | 'h4'
  actions?: (tenant: Tenant, system: System | undefined) => ReactNode
  governingTenantId?: string
}

export function TenantWarrantyContractSections({
  tenants,
  systems,
  emptyTextForSection,
  headingLevel = 'h4',
  actions,
  governingTenantId,
}: TenantWarrantyContractSectionsProps) {
  const sections = useMemo(() => tenantsGroupedByDerivedWarrantyContractStatus(tenants), [tenants])
  const Heading = headingLevel

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section key={section.status} className="space-y-2" aria-label={`${section.title} tenants`}>
          <Heading className={headingLevel === 'h3' ? 'text-lg font-semibold text-sf-text' : 'text-sm font-semibold text-sf-text'}>
            {section.title}
            <span className="ml-1 text-xs font-normal text-sf-text-muted">({section.rows.length})</span>
          </Heading>
          <TenantDeliveryTable
            tenants={section.rows}
            systems={systems}
            emptyText={emptyTextForSection(section.title)}
            actions={actions}
            governingTenantId={governingTenantId}
          />
        </section>
      ))}
    </div>
  )
}
