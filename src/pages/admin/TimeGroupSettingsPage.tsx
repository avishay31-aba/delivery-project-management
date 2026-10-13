import { useCallback, useMemo, useState } from 'react'
import { Save, X } from 'lucide-react'
import { DataDashboard, DashboardActionButton, type DashboardColumn } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { BusinessIdListLinks, CheckboxMultiSelect, formMessageClassName, type CheckboxMultiSelectOption } from '@/components/ui'
import type { TimeGroupLookupRecord } from '@/data/seed.types'
import { uniqueConfiguredTimeZones } from '@/domain/geographic-configuration'
import { joinSemicolonValues, linkedSidsForTimeGroup, linkedTidsForTimeGroup, withDerivedTimeGroupMembership } from '@/domain/time-groups'
import { useAppStore } from '@/store/useAppStore'

type TimeGroupRow = TimeGroupLookupRecord & {
  linkedSids: string[]
  linkedTids: string[]
}

function optionsForRecord(rows: TimeGroupLookupRecord[], record: TimeGroupLookupRecord, allTimeZones: string[]): CheckboxMultiSelectOption[] {
  const selected = new Set(record.timeZones)
  return allTimeZones.map((value) => ({
    value,
    disabled: !selected.has(value) && rows.some((row) => row.active && row.id !== record.id && row.timeZones.includes(value)),
  }))
}

const FULL_CELL_CLASS_NAME = 'sf-full-table-cell'
const WRAPPED_VALUE_COLUMN_CLASS_NAME = 'min-w-64 max-w-96 whitespace-normal'

export function TimeGroupSettingsPage() {
  const lookups = useAppStore((state) => state.timeGroupLookups)
  const countries = useAppStore((state) => state.countryLookups)
  const states = useAppStore((state) => state.usStateLookups)
  const systems = useAppStore((state) => state.systems)
  const productionSystems = useAppStore((state) => state.productionSystemInventory)
  const reusedSystems = useAppStore((state) => state.reusedInternalSystems)
  const tenants = useAppStore((state) => state.tenants)
  const updateTimeGroupLookup = useAppStore((state) => state.updateTimeGroupLookup)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TimeGroupLookupRecord | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const allTimeZones = useMemo(() => uniqueConfiguredTimeZones(countries, states), [countries, states])

  const rows = useMemo<TimeGroupRow[]>(() => {
    const allSystems = [...systems, ...productionSystems, ...reusedSystems]
    return lookups.map((lookup) => {
      const derived = withDerivedTimeGroupMembership(lookup, countries, states)
      return {
        ...derived,
        linkedSids: linkedSidsForTimeGroup(derived, allSystems, tenants, lookups, countries, states),
        linkedTids: linkedTidsForTimeGroup(derived, tenants, lookups, countries, states),
      }
    })
  }, [countries, lookups, productionSystems, reusedSystems, states, systems, tenants])

  function beginEdit(row: TimeGroupLookupRecord) {
    const derived = withDerivedTimeGroupMembership(row, countries, states)
    setEditingId(row.id)
    setDraft({ ...derived, timeZones: [...derived.timeZones], countries: [...derived.countries], states: [...derived.states] })
    setMessage(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setMessage(null)
  }

  const updateDraft = useCallback((patch: Partial<TimeGroupLookupRecord>) => {
    setDraft((current) => {
      if (!current) return current
      return withDerivedTimeGroupMembership({ ...current, ...patch }, countries, states)
    })
    setMessage(null)
  }, [countries, states])

  function saveDraft() {
    if (!draft) return
    const result = updateTimeGroupLookup(draft.id, {
      timeGroup: draft.timeGroup,
      timeZones: draft.timeZones,
    })
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setEditingId(null)
      setDraft(null)
    }
  }

  const columns = useMemo<Array<DashboardColumn<TimeGroupRow>>>(() => [
    {
      id: 'timeGroupId',
      label: 'Time Group ID#',
      getValue: (row) => row.timeGroupId,
      sortValue: (row) => Number(row.timeGroupId),
      promoteAsBusinessIdentifier: true,
    },
    {
      id: 'timeGroup',
      label: 'Time Group',
      headerClassName: 'min-w-72',
      cellClassName: 'min-w-72 whitespace-nowrap',
      cellContentClassName: `${FULL_CELL_CLASS_NAME} whitespace-nowrap`,
      getValue: (row) => row.timeGroup,
      render: (row) => editingId === row.id && draft
        ? <input aria-label="Time Group" className="h-8 w-72 rounded border border-sf-border px-2 py-1 text-sm" value={draft.timeGroup} onChange={(event) => updateDraft({ timeGroup: event.target.value })} />
        : row.timeGroup,
    },
    {
      id: 'timeZones',
      label: 'Time Zones',
      headerClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellContentClassName: FULL_CELL_CLASS_NAME,
      getValue: (row) => joinSemicolonValues(row.timeZones),
      render: (row) => editingId === row.id && draft
        ? (
          <CheckboxMultiSelect
            id={`${row.id}:timeZones`}
            label="Time Zones"
            selected={draft.timeZones}
            options={optionsForRecord(lookups, draft, allTimeZones)}
            onChange={(timeZones) => updateDraft({ timeZones })}
          />
        )
        : joinSemicolonValues(row.timeZones),
    },
    {
      id: 'countries',
      label: 'Countries',
      headerClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellContentClassName: FULL_CELL_CLASS_NAME,
      getValue: (row) => joinSemicolonValues(row.countries),
      render: (row) => <span className="whitespace-normal">{joinSemicolonValues(editingId === row.id && draft ? draft.countries : row.countries)}</span>,
    },
    {
      id: 'states',
      label: 'States',
      headerClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellContentClassName: FULL_CELL_CLASS_NAME,
      getValue: (row) => joinSemicolonValues(row.states),
      render: (row) => <span className="whitespace-normal">{joinSemicolonValues(editingId === row.id && draft ? draft.states : row.states)}</span>,
    },
    {
      id: 'linkedSids',
      label: 'Linked SIDs',
      headerClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellContentClassName: FULL_CELL_CLASS_NAME,
      getValue: (row) => row.linkedSids.join('; '),
      render: (row) => <BusinessIdListLinks objectType="SYSTEM" businessIds={row.linkedSids} />,
    },
    {
      id: 'linkedTids',
      label: 'Linked TIDs',
      headerClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellClassName: WRAPPED_VALUE_COLUMN_CLASS_NAME,
      cellContentClassName: FULL_CELL_CLASS_NAME,
      getValue: (row) => row.linkedTids.join('; '),
      render: (row) => <BusinessIdListLinks objectType="TENANT" businessIds={row.linkedTids} />,
    },
  ], [allTimeZones, draft, editingId, lookups, updateDraft])

  return (
    <WorkspaceFrame>
      <PageHeader title="Time Group Settings" subtitle="Version 1.3 Time Zone to Time Group reference mapping" />
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Time Group Settings"
          dashboardScope="timeGroupLookups"
          rows={rows}
          columns={columns}
          onEditRecord={beginEdit}
          renderRecordActions={(row) => editingId === row.id ? (
            <>
              <DashboardActionButton icon={<Save className="h-4 w-4" aria-hidden="true" />} label="Save" onClick={saveDraft} />
              <DashboardActionButton icon={<X className="h-4 w-4" aria-hidden="true" />} label="Cancel" onClick={cancelEdit} />
            </>
          ) : null}
          toolbar={message ? <div className={message.kind === 'error' ? formMessageClassName([message.text]) : 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'}>{message.text}</div> : null}
          enableRecordActions
          initialSorting={[{ id: 'timeGroupId', desc: false }]}
        />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
