import type { System, Tenant } from '@/data/seed.types'
import { APPLICATION_CONFIGURATION_SUMMARY_FIELDS } from '@/domain/application-configuration'
import { systemApplicationConfigurationSummary } from '@/domain/system-inventory'
import { configurationColumnGroupLabel, formatConfigurationCellValue } from '@/components/configuration'

export function ApplicationConfigurationSummaryTable({ system, tenants }: { system: System; tenants: Tenant[] }) {
  const summary = systemApplicationConfigurationSummary(system, tenants) as unknown as Record<string, unknown>
  return (
    <section className="sf-card" aria-labelledby={`application-summary-${system.id}`}>
      <div className="border-b border-sf-border bg-sf-surface-alt px-3 py-2">
        <h3 id={`application-summary-${system.id}`} className="whitespace-nowrap text-lg font-semibold text-sf-text">Application Configuration Summary</h3>
      </div>
      <div className="sf-scroll-x bg-white">
        <table className="w-max border-collapse text-sm leading-tight" aria-label="System Application Configuration Summary">
          <thead className="bg-sf-surface-alt text-left"><tr>
            {APPLICATION_CONFIGURATION_SUMMARY_FIELDS.map((field) => (
              <th key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                <span>{field.label}</span><span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(field)}</span>
              </th>
            ))}
          </tr></thead>
          <tbody><tr>{APPLICATION_CONFIGURATION_SUMMARY_FIELDS.map((field) => (
            <td key={field.key} className="max-w-64 border border-sf-border px-1.5 py-1 text-sf-text">{formatConfigurationCellValue(summary[field.configKey])}</td>
          ))}</tr></tbody>
        </table>
      </div>
    </section>
  )
}
