import { ConfigurationColumnHeaders, ConfigurationValueCells } from '@/components/configuration'
import { APPLICATION_CONFIGURATION_SUMMARY_FIELDS } from '@/domain/application-configuration'
import { systemApplicationConfigurationSummary } from '@/domain/system-inventory'
import type { System, Tenant } from '@/data/seed.types'

export function SystemApplicationConfigurationSummary({ system, tenants, section = false }: { system: System; tenants: Tenant[]; section?: boolean }) {
  const summary = systemApplicationConfigurationSummary(system, tenants) as unknown as Record<string, unknown>
  const table = (
    <div className="sf-scroll-x bg-white">
      <table className="w-max border-collapse text-sm leading-tight" aria-label="System Application Configuration Summary">
        <thead className="bg-sf-surface-alt text-left"><tr><ConfigurationColumnHeaders fields={APPLICATION_CONFIGURATION_SUMMARY_FIELDS} /></tr></thead>
        <tbody><tr><ConfigurationValueCells record={summary} fields={APPLICATION_CONFIGURATION_SUMMARY_FIELDS} /></tr></tbody>
      </table>
    </div>
  )
  if (!section) return <div className="overflow-x-auto rounded border border-sf-border bg-white">{table}</div>
  return (
    <section className="sf-card" aria-labelledby="system-application-summary-section-title">
      <div className="border-b border-sf-border bg-sf-surface-alt px-3 py-2">
        <h3 id="system-application-summary-section-title" className="whitespace-nowrap text-lg font-semibold text-sf-text">Application Configuration Summary</h3>
      </div>
      {table}
    </section>
  )
}
