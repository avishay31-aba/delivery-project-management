import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { configurationColumnGroupLabel } from '@/components/configuration'
import { RecordHistorySection, type RecordHistoryColumn } from '@/components/ui'
import type {
  ApplicationConfigurationFieldMetadata,
  ApplicationConfigurationHistoryRecord,
} from '@/domain/application-configuration'

interface ConfigurationHistorySectionProps<TRecord extends ApplicationConfigurationHistoryRecord> {
  records: TRecord[]
  fields: ApplicationConfigurationFieldMetadata[]
  emptyText: string
  tidValue: (record: TRecord) => string
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value == null ? '' : String(value)
}

function configurationValue(record: ApplicationConfigurationHistoryRecord, field: ApplicationConfigurationFieldMetadata): string {
  return textValue((record.configuration as unknown as Record<string, unknown>)[field.configKey]) || '-'
}

function defaultConfigurationHistorySort<TRecord extends ApplicationConfigurationHistoryRecord>(first: TRecord, second: TRecord): number {
  const timestampComparison = second.timestamp.localeCompare(first.timestamp)
  if (timestampComparison !== 0) return timestampComparison
  return second.recordId.localeCompare(first.recordId, undefined, { numeric: true, sensitivity: 'base' })
}

export function ConfigurationHistorySection<TRecord extends ApplicationConfigurationHistoryRecord>({
  records,
  fields,
  emptyText,
  tidValue,
}: ConfigurationHistorySectionProps<TRecord>) {
  const orderedRecords = [...records].sort(defaultConfigurationHistorySort)
  const columns: Array<RecordHistoryColumn<TRecord>> = [
    {
      key: 'recordId',
      label: 'Record ID',
      render: (record) => record.recordId,
      sortValue: (record) => record.recordId,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (record) => <DateTimeValue value={record.timestamp} semanticType="datetime" />,
      sortValue: (record) => record.timestamp,
    },
    {
      key: 'tid',
      label: 'TID',
      render: tidValue,
      sortValue: tidValue,
    },
    {
      key: 'recordedBy',
      label: 'Recorded By',
      render: (record) => record.recordedBy,
      sortValue: (record) => record.recordedBy,
    },
    ...fields.map((field): RecordHistoryColumn<TRecord> => ({
      key: field.key,
      label: (
        <>
          <span>{field.label}</span>
          <span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(field)}</span>
        </>
      ),
      render: (record) => configurationValue(record, field),
      sortValue: (record) => configurationValue(record, field),
      headerClassName: 'whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text',
    })),
  ]

  return (
    <RecordHistorySection
      records={orderedRecords}
      columns={columns}
      getRowKey={(record) => record.id}
      getSearchText={(record) => [
        record.recordId,
        record.timestamp,
        tidValue(record),
        record.recordedBy,
        ...fields.map((field) => configurationValue(record, field)),
      ].join(' ')}
      emptyText={emptyText}
      filteredEmptyText="No configuration history matches the current filters."
      enableSearch={false}
      searchLabel="Search / Filter"
      searchPlaceholder="Search Configuration History"
      recordsPerPageLabel="Records per page"
    />
  )
}
