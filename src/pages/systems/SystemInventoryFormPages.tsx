import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/record'
import { FormField, PlaceholderCard } from '@/components/ui'
import {
  productionSystemMetadata,
  reusedInternalSystemMetadata,
  type SystemInventoryHeaderField,
  type SystemInventoryMetadata,
} from '@/config/system-inventory-metadata'
import type { ProductionSystemInventoryItem, ReusedInternalSystem } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'

type InventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem

function cloneRecord<T extends InventoryRecord>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ')
  return value == null ? '' : String(value)
}

function fieldClassName(isChanged: boolean): string {
  return [
    'h-8 w-full rounded border border-sf-border px-2 py-1 text-sm leading-tight',
    isChanged ? 'bg-yellow-100' : 'bg-white',
  ].join(' ')
}

function readRecordValue(record: InventoryRecord, key: string): string {
  return textValue((record as unknown as Record<string, unknown>)[key])
}

function InventoryForm<T extends InventoryRecord>({
  record,
  metadata,
  onSave,
  dashboardPath,
}: {
  record: T | undefined
  metadata: SystemInventoryMetadata
  onSave: (id: string, patch: Partial<T>) => void
  dashboardPath: string
}) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<T | null>(record ? cloneRecord(record) : null)

  useEffect(() => {
    setDraft(record ? cloneRecord(record) : null)
  }, [record])

  if (!record || !draft) {
    return (
      <PlaceholderCard
        title="System inventory record not found"
        description="No inventory record exists for this ID."
      />
    )
  }

  const activeRecord = record
  const activeDraft = draft

  function changed(field: SystemInventoryHeaderField): boolean {
    return readRecordValue(activeRecord, field.key) !== readRecordValue(activeDraft, field.key)
  }

  function updateField(key: string, value: string) {
    setDraft((current) => (current ? ({ ...current, [key]: value } as T) : current))
  }

  function renderField(field: SystemInventoryHeaderField) {
    const value = readRecordValue(activeDraft, field.key)
    const isChanged = changed(field)

    if (!field.editable) {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-56">
          <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
            {value || '-'}
          </div>
        </FormField>
      )
    }

    if (field.key === 'purpose' && metadata.source === 'Reused Internal Systems') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-44">
          <select className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
            {['POC', 'Demo', 'Training', 'Support'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.key === 'status') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-44">
          <select className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
            {['Available', 'Occupied', 'Obsolete'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.key === 'occupationStartDate' || field.key === 'occupationEndDate') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-40">
          <input className={fieldClassName(isChanged)} type="date" value={value} onChange={(event) => updateField(field.key, event.target.value)} />
        </FormField>
      )
    }

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-52">
        <input className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(field.key, event.target.value)} />
      </FormField>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${metadata.titleLabel} ${readRecordValue(activeDraft, metadata.source === 'Production' ? 'sid' : 'machineId')}`}
        subtitle={`${metadata.sourceSheet} - ${metadata.source}`}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-sf-brand bg-sf-brand px-3 py-1.5 text-sm text-white"
              onClick={() => {
                onSave(activeDraft.id, activeDraft as Partial<T>)
                navigate(dashboardPath)
              }}
            >
              Save
            </button>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={() => setDraft(cloneRecord(activeRecord))}>
              Revert
            </button>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={() => navigate(dashboardPath)}>
              Cancel
            </button>
          </div>
        }
      />

      <section className="sf-card space-y-3 p-3">
        <div>
          <h2 className="text-lg font-semibold text-sf-text">System header</h2>
          <p className="text-sm text-sf-text-muted">Fields follow {metadata.sourceSheet}.</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {metadata.headerFields.map(renderField)}
        </div>
      </section>

      <section className="sf-card overflow-hidden">
        <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
          {metadata.tabs.map((tab) => (
            <button key={tab.id} type="button" className="border-b-2 border-transparent px-4 py-2 text-base font-semibold text-sf-text-muted">
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-48 p-4 text-sm text-sf-text-muted">
          Tab implementation is reserved for later system execution phases.
        </div>
      </section>
    </div>
  )
}

export function ProductionSystemInventoryFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const record = useAppStore((state) => state.productionSystemInventory.find((system) => system.sid === sid))
  const updateRecord = useAppStore((state) => state.updateProductionSystemInventoryItem)

  return (
    <InventoryForm
      record={record}
      metadata={productionSystemMetadata}
      onSave={updateRecord}
      dashboardPath="/systems/production-inventory"
    />
  )
}

export function ReusedInternalSystemFormPage() {
  const { mid } = useParams<{ mid: string }>()
  const record = useAppStore((state) => state.reusedInternalSystems.find((system) => system.machineId === mid))
  const updateRecord = useAppStore((state) => state.updateReusedInternalSystem)

  return (
    <InventoryForm
      record={record}
      metadata={reusedInternalSystemMetadata}
      onSave={updateRecord}
      dashboardPath="/systems/reused-internal"
    />
  )
}
