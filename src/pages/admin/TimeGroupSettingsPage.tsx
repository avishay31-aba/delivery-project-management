import { useMemo, useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { BusinessIdListLinks, CheckboxMultiSelect, RecordHistorySection, SaveButtonLabel, formMessageClassName, type CheckboxMultiSelectOption, type RecordHistoryColumn } from '@/components/ui'
import type { TimeGroupLookupRecord } from '@/data/seed.types'
import { TIME_GROUP_LOOKUP_SOURCE, joinSemicolonValues, linkedSidsForTimeGroup, linkedTidsForTimeGroup } from '@/domain/time-groups'
import { useAppStore } from '@/store/useAppStore'

type TimeGroupRow = TimeGroupLookupRecord & {
  linkedSids: string[]
  linkedTids: string[]
}

function distinctValues(rows: TimeGroupLookupRecord[], key: 'timeZones' | 'countries' | 'states'): string[] {
  return Array.from(new Set([...TIME_GROUP_LOOKUP_SOURCE, ...rows].flatMap((row) => row[key]).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}

function optionsForRecord(
  rows: TimeGroupLookupRecord[],
  record: TimeGroupLookupRecord,
  key: 'timeZones' | 'countries' | 'states',
): CheckboxMultiSelectOption[] {
  const selected = new Set(record[key])
  return distinctValues(rows, key)
    .filter((value) => {
      if (selected.has(value)) return true
      return !rows.some((row) => row.active && row.id !== record.id && row[key].includes(value))
    })
    .map((value) => ({ value }))
}

export function TimeGroupSettingsPage() {
  const lookups = useAppStore((state) => state.timeGroupLookups)
  const systems = useAppStore((state) => state.systems)
  const productionSystems = useAppStore((state) => state.productionSystemInventory)
  const reusedSystems = useAppStore((state) => state.reusedInternalSystems)
  const tenants = useAppStore((state) => state.tenants)
  const updateTimeGroupLookup = useAppStore((state) => state.updateTimeGroupLookup)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TimeGroupLookupRecord | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const rows = useMemo<TimeGroupRow[]>(() => {
    const allSystems = [...systems, ...productionSystems, ...reusedSystems]
    return lookups.map((lookup) => ({
      ...lookup,
      linkedSids: linkedSidsForTimeGroup(lookup, allSystems, tenants, lookups),
      linkedTids: linkedTidsForTimeGroup(lookup, tenants, lookups),
    }))
  }, [lookups, productionSystems, reusedSystems, systems, tenants])

  function beginEdit(row: TimeGroupLookupRecord) {
    setEditingId(row.id)
    setDraft({ ...row, timeZones: [...row.timeZones], countries: [...row.countries], states: [...row.states] })
    setMessage(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setMessage(null)
  }

  function updateDraft(patch: Partial<TimeGroupLookupRecord>) {
    setDraft((current) => current ? { ...current, ...patch } : current)
    setMessage(null)
  }

  function saveDraft() {
    if (!draft) return
    const result = updateTimeGroupLookup(draft.id, draft)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setEditingId(null)
      setDraft(null)
    }
  }

  const columns = useMemo<Array<RecordHistoryColumn<TimeGroupRow>>>(() => [
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => editingId === row.id ? (
        <span className="inline-flex items-center gap-1">
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border px-2 py-1 text-xs hover:bg-sf-surface-alt" onClick={saveDraft}>
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <SaveButtonLabel saving={false} />
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border px-2 py-1 text-xs hover:bg-sf-surface-alt" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border px-2 py-1 text-xs hover:bg-sf-surface-alt" onClick={() => beginEdit(row)}>
          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      ),
      className: 'whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text',
    },
    {
      key: 'timeGroupId',
      label: 'Time Group ID#',
      render: (row) => row.timeGroupId,
      sortValue: (row) => Number(row.timeGroupId),
    },
    {
      key: 'timeGroup',
      label: 'Time Group',
      render: (row) => editingId === row.id && draft
        ? <input aria-label="Time Group" className="h-8 w-72 rounded border border-sf-border px-2 py-1 text-sm" value={draft.timeGroup} onChange={(event) => updateDraft({ timeGroup: event.target.value })} />
        : row.timeGroup,
      sortValue: (row) => row.timeGroup,
    },
    {
      key: 'timeZones',
      label: 'Time Zones',
      render: (row) => editingId === row.id && draft
        ? (
          <CheckboxMultiSelect
            id={`${row.id}:timeZones`}
            label="Time Zones"
            selected={draft.timeZones}
            options={optionsForRecord(lookups, draft, 'timeZones')}
            onChange={(timeZones) => updateDraft({ timeZones })}
          />
        )
        : joinSemicolonValues(row.timeZones),
      sortValue: (row) => joinSemicolonValues(row.timeZones),
    },
    {
      key: 'countries',
      label: 'Countries',
      render: (row) => editingId === row.id && draft
        ? (
          <CheckboxMultiSelect
            id={`${row.id}:countries`}
            label="Countries"
            selected={draft.countries}
            options={optionsForRecord(lookups, draft, 'countries')}
            onChange={(countries) => updateDraft({ countries })}
          />
        )
        : joinSemicolonValues(row.countries),
      sortValue: (row) => joinSemicolonValues(row.countries),
      className: 'max-w-xl whitespace-normal border border-sf-border px-1.5 py-1 align-top text-sf-text',
    },
    {
      key: 'states',
      label: 'States',
      render: (row) => editingId === row.id && draft
        ? (
          <CheckboxMultiSelect
            id={`${row.id}:states`}
            label="States"
            selected={draft.states}
            options={optionsForRecord(lookups, draft, 'states')}
            onChange={(states) => updateDraft({ states })}
          />
        )
        : joinSemicolonValues(row.states),
      sortValue: (row) => joinSemicolonValues(row.states),
      className: 'max-w-xl whitespace-normal border border-sf-border px-1.5 py-1 align-top text-sf-text',
    },
    {
      key: 'linkedSids',
      label: 'Linked SIDs',
      render: (row) => <BusinessIdListLinks objectType="SYSTEM" businessIds={row.linkedSids} />,
      sortValue: (row) => row.linkedSids.join('; '),
    },
    {
      key: 'linkedTids',
      label: 'Linked TIDs',
      render: (row) => <BusinessIdListLinks objectType="TENANT" businessIds={row.linkedTids} />,
      sortValue: (row) => row.linkedTids.join('; '),
    },
  ], [draft, editingId])

  return (
    <WorkspaceFrame>
      <PageHeader title="Time Group Settings" subtitle="Version 1.2 Time Zone to Time Group reference mapping" />
      <WorkspaceScrollContent>
        <RecordHistorySection
          records={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          getSearchText={(row) => [
            row.timeGroupId,
            row.timeGroup,
            joinSemicolonValues(row.timeZones),
            joinSemicolonValues(row.countries),
            joinSemicolonValues(row.states),
            row.linkedSids.join('; '),
            row.linkedTids.join('; '),
          ].join(' ')}
          emptyText="No Time Group mappings are available."
          initialPageSize={10}
          message={message ? <div className={message.kind === 'error' ? formMessageClassName([message.text]) : 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'}>{message.text}</div> : null}
          resetPageSignal={editingId}
        />
      </WorkspaceScrollContent>
    </WorkspaceFrame>
  )
}
