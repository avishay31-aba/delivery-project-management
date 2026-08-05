import { useMemo, useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { BusinessIdListLinks, RecordHistorySection, SaveButtonLabel, formMessageClassName, type RecordHistoryColumn } from '@/components/ui'
import type { TimeGroupLookupRecord } from '@/data/seed.types'
import { joinSemicolonValues, linkedSidsForTimeGroup, linkedTidsForTimeGroup } from '@/domain/time-groups'
import { useAppStore } from '@/store/useAppStore'

type TimeGroupRow = TimeGroupLookupRecord & {
  linkedSids: string[]
  linkedTids: string[]
}

function splitSemicolonInput(value: string): string[] {
  return value.split(';').map((candidate) => candidate.trim()).filter(Boolean)
}

function editableTextarea(
  label: string,
  value: string,
  onChange: (value: string) => void,
  required = false,
) {
  return (
    <textarea
      aria-label={label}
      className="min-h-16 w-80 rounded border border-sf-border px-2 py-1 text-sm"
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
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
      linkedSids: linkedSidsForTimeGroup(lookup, allSystems),
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
        ? editableTextarea('Time Zones', joinSemicolonValues(draft.timeZones), (value) => updateDraft({ timeZones: splitSemicolonInput(value) }), true)
        : joinSemicolonValues(row.timeZones),
      sortValue: (row) => joinSemicolonValues(row.timeZones),
    },
    {
      key: 'countries',
      label: 'Countries',
      render: (row) => editingId === row.id && draft
        ? editableTextarea('Countries', joinSemicolonValues(draft.countries), (value) => updateDraft({ countries: splitSemicolonInput(value) }))
        : joinSemicolonValues(row.countries),
      sortValue: (row) => joinSemicolonValues(row.countries),
      className: 'max-w-xl whitespace-normal border border-sf-border px-1.5 py-1 align-top text-sf-text',
    },
    {
      key: 'states',
      label: 'States',
      render: (row) => editingId === row.id && draft
        ? editableTextarea('States', joinSemicolonValues(draft.states), (value) => updateDraft({ states: splitSemicolonInput(value) }))
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
