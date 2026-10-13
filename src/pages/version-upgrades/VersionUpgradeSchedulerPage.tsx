import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock3, Save, XCircle } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataDashboard, type DashboardColumn } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { BusinessObjectLink, FormField, RichTextContent, RichTextEditor, SaveButtonLabel, dirtyControlClassName, formMessageClassName } from '@/components/ui'
import type { VersionUpgradeRecord, VersionUpgradeSystemSchedule } from '@/data/seed.types'
import { systemReference, tenantReference, projectReference, accountReference } from '@/domain/business-reference'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import {
  VERSION_UPGRADE_CLOUD_PLATFORM_OPTIONS,
  VERSION_UPGRADE_COMPLETION_LABELS,
  VERSION_UPGRADE_CUSTOMER_TIME_ZONE_OPTIONS,
  VERSION_UPGRADE_STATUS_COLOR_CLASSES,
  VERSION_UPGRADE_STATUS_LABELS,
  deriveVersionUpgradeDashboardRows,
  deriveVersionUpgradeProgress,
  deriveVersionUpgradeSystemRows,
  supportEngineerAssignments,
  versionUpgradeSystemSchedule,
  type VersionUpgradeDashboardRow,
  type VersionUpgradeSystemRow,
} from '@/domain/version-upgrade-scheduler'
import { useAppStore } from '@/store/useAppStore'

interface VersionUpgradeDraft {
  versionNumber: string
  buildNumber: string
  releaseDate: string | null
  phaseOutDate: string | null
  limitedToCloudPlatform: string
  remarks: string
  schedules: VersionUpgradeSystemSchedule[]
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second)
}

function editableClassName(isDirty: boolean): string {
  return `h-9 w-full rounded border border-sf-border px-2 py-1 ${dirtyControlClassName(isDirty)}`
}

function systemExtra(system: VersionUpgradeSystemRow['system'], key: string): unknown {
  return (system as unknown as Record<string, unknown>)[key]
}

function emptyDraft(): VersionUpgradeDraft {
  return {
    versionNumber: '',
    buildNumber: '',
    releaseDate: null,
    phaseOutDate: null,
    limitedToCloudPlatform: '',
    remarks: '',
    schedules: [],
  }
}

function draftFromRecord(state: ReturnType<typeof useAppStore.getState>, record?: VersionUpgradeRecord): VersionUpgradeDraft {
  if (!record) return emptyDraft()
  return {
    versionNumber: state.referenceData.find((item) => item.id === record.versionNumberRefId)?.label ?? '',
    buildNumber: state.referenceData.find((item) => item.id === record.buildNumberRefId)?.label ?? '',
    releaseDate: record.releaseDate,
    phaseOutDate: record.phaseOutDate,
    limitedToCloudPlatform: record.limitedToCloudPlatform,
    remarks: record.remarks,
    schedules: record.schedules,
  }
}

function provisionalRecord(state: ReturnType<typeof useAppStore.getState>, draft: VersionUpgradeDraft, existing?: VersionUpgradeRecord): VersionUpgradeRecord {
  const version = state.referenceData.find((record) => record.referenceType === 'VERSION_NUMBER' && record.label.toLocaleLowerCase() === draft.versionNumber.trim().toLocaleLowerCase())
  const build = state.referenceData.find((record) => record.referenceType === 'BUILD_NUMBER' && record.versionNumberId === version?.id && record.label.toLocaleLowerCase() === draft.buildNumber.trim().toLocaleLowerCase())
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? 'version-upgrade-draft',
    versionNumberRefId: version?.id ?? '',
    buildNumberRefId: build?.id ?? '',
    releaseDate: draft.releaseDate,
    phaseOutDate: draft.phaseOutDate,
    limitedToCloudPlatform: draft.limitedToCloudPlatform,
    remarks: draft.remarks,
    operationalStatus: existing?.operationalStatus ?? 'ACTIVE',
    cancellationRequested: existing?.cancellationRequested ?? 'NO',
    cancellationReason: existing?.cancellationReason ?? '',
    cancellationHistory: existing?.cancellationHistory ?? [],
    cancelledAt: existing?.cancelledAt ?? null,
    cancelledBy: existing?.cancelledBy ?? null,
    schedules: draft.schedules,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? 'Current User',
    updatedAt: existing?.updatedAt ?? now,
    updatedBy: existing?.updatedBy ?? 'Current User',
  }
}

function useVersionUpgradeDashboardColumns(): Array<DashboardColumn<VersionUpgradeDashboardRow>> {
  return useMemo<Array<DashboardColumn<VersionUpgradeDashboardRow>>>(() => [
    { id: 'versionNumber', label: 'Version Number', getValue: (row) => row.versionNumber },
    { id: 'buildNumber', label: 'Build Number', getValue: (row) => row.buildNumber },
    { id: 'releaseDate', label: 'Release Date', getValue: (row) => row.releaseDate ?? '', render: (row) => formatSemanticDateTimeValue(row.releaseDate, 'date'), semanticType: 'date' },
    { id: 'phaseOutDate', label: 'Phase Out Date', getValue: (row) => row.phaseOutDate ?? '', render: (row) => formatSemanticDateTimeValue(row.phaseOutDate, 'date'), semanticType: 'date' },
    { id: 'numberOfSystemsToUpgrade', label: 'Number of Systems to Upgrade', getValue: (row) => row.numberOfSystemsToUpgrade },
    { id: 'upgradeCompletionStatus', label: 'Upgrade Completion Status', getValue: (row) => row.upgradeCompletionStatus },
    { id: 'plannedUpgradeSystems', label: 'Planned Upgrade Systems', getValue: (row) => row.plannedUpgradeSystems },
    { id: 'pendingUpgradeSchedule', label: 'Pending Upgrade Schedule', getValue: (row) => row.pendingUpgradeSchedule },
    { id: 'lastSystemsSync', label: 'Last Systems Sync', getValue: (row) => row.lastSystemsSync, render: (row) => formatSemanticDateTimeValue(row.lastSystemsSync, 'datetime'), semanticType: 'datetime' },
    { id: 'limitedToCloudPlatform', label: 'Limited to Cloud Platform', getValue: (row) => row.limitedToCloudPlatform },
    { id: 'operationalStatus', label: 'Status', getValue: (row) => row.operationalStatus },
  ], [])
}

function ProgressCards({ progress }: { progress: ReturnType<typeof deriveVersionUpgradeProgress> }) {
  const cards = [
    { label: 'TOTAL SYSTEMS TO UPGRADE', value: String(progress.total), className: 'border-sf-border text-sf-text' },
    { label: 'PENDING SCHEDULE', value: `${progress.pending} ${progress.pendingPercent}%`, className: 'border-sf-border text-sf-text' },
    { label: 'CONFIRMED SCHEDULE', value: `${progress.confirmed} ${progress.confirmedPercent}%`, className: 'border-green-200 text-green-700' },
    { label: 'UPGRADED SYSTEMS', value: `${progress.upgraded} ${progress.upgradedPercent}%`, className: 'border-blue-200 text-blue-700' },
  ]
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-sf-text">Progress Status</h2>
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded border bg-white p-3 ${card.className}`}>
            <div className="text-xs font-semibold uppercase text-sf-text-muted">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatusBadge({ row }: { row: VersionUpgradeSystemRow }) {
  const icon = row.upgradeStatus === 'SYSTEM_UPGRADED'
    ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
    : row.upgradeStatus === 'UPGRADE_SCHEDULE_CONFIRMED'
      ? <CalendarCheck className="h-4 w-4" aria-hidden="true" />
      : <Clock3 className="h-4 w-4" aria-hidden="true" />
  return <span className={`inline-flex items-center gap-1 font-semibold ${VERSION_UPGRADE_STATUS_COLOR_CLASSES[row.upgradeStatus]}`}>{icon}{VERSION_UPGRADE_STATUS_LABELS[row.upgradeStatus]}</span>
}

function TenantLinks({ tenants }: { tenants: VersionUpgradeSystemRow['underContractTenants'] }) {
  if (tenants.length === 0) return <>-</>
  return (
    <span className="flex flex-wrap gap-x-1">
      {tenants.map((tenant, index) => (
        <span key={tenant.id}>
          <BusinessObjectLink reference={tenantReference(tenant)} />
          {index < tenants.length - 1 ? ', ' : ''}
        </span>
      ))}
    </span>
  )
}

function VersionUpgradeDashboard() {
  const state = useAppStore()
  const columns = useVersionUpgradeDashboardColumns()
  const rows = useMemo(() => deriveVersionUpgradeDashboardRows(state), [state])
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  return (
    <WorkspaceFrame className="gap-4">
      <PageHeader
        title="Version Upgrade Scheduler"
        subtitle="Coordinate eligible Production System upgrades by Version and Build"
      />
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Version Upgrade Scheduler"
          dashboardScope="versionUpgradeScheduler"
          rows={rows}
          columns={columns}
          enableRecordActions
          onView={(row) => navigate(`/version-upgrades/${row.id}?mode=view`)}
          onEditRecord={(row) => navigate(`/version-upgrades/${row.id}?mode=edit`)}
          initialSorting={[{ id: 'releaseDate', desc: true }]}
          toolbar={(
            <Link to="/version-upgrades/new" state={{ returnTo, mode: 'edit', newRecordSession: true }} className="rounded border border-sf-border bg-white px-3 py-1 text-sm">
              + New Version
            </Link>
          )}
        />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}

function VersionUpgradeForm() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const state = useAppStore()
  const saveRecord = useAppStore((store) => store.saveVersionUpgradeRecord)
  const cancelRecord = useAppStore((store) => store.cancelVersionUpgradeRecord)
  const isCreate = id === 'new' || location.pathname === '/version-upgrades/new'
  const existing = isCreate ? undefined : state.versionUpgradeRecords.find((record) => record.id === id)
  const isViewMode = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('mode') !== 'edit' && !isCreate
  const [draft, setDraft] = useState<VersionUpgradeDraft>(() => draftFromRecord(state, existing))
  const [baseline, setBaseline] = useState<VersionUpgradeDraft>(() => draftFromRecord(state, existing))
  const [message, setMessage] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const next = draftFromRecord(state, existing)
    setDraft(next)
    setBaseline(next)
  }, [existing, state])

  const formRecord = useMemo(() => provisionalRecord(state, draft, existing), [draft, existing, state])
  const progress = useMemo(() => deriveVersionUpgradeProgress(state, formRecord), [state, formRecord])
  const rows = useMemo(() => deriveVersionUpgradeSystemRows(state, formRecord), [state, formRecord])
  const engineers = useMemo(() => supportEngineerAssignments(state), [state])
  const isDirty = isCreate || !valuesEqual(draft, baseline)
  const readOnly = isViewMode || formRecord.operationalStatus === 'CANCELLED'

  function scheduleFor(systemId: string): VersionUpgradeSystemSchedule {
    return draft.schedules.find((schedule) => schedule.systemId === systemId) ?? versionUpgradeSystemSchedule(formRecord, systemId)
  }

  function updateSchedule(systemId: string, patch: Partial<VersionUpgradeSystemSchedule>) {
    setDraft((current) => {
      const currentSchedule = scheduleFor(systemId)
      const nextSchedule = { ...currentSchedule, ...patch }
      const schedules = current.schedules.some((schedule) => schedule.systemId === systemId)
        ? current.schedules.map((schedule) => schedule.systemId === systemId ? nextSchedule : schedule)
        : [...current.schedules, nextSchedule]
      return { ...current, schedules }
    })
  }

  function save(stayOnPage: boolean) {
    setIsSaving(true)
    const result = saveRecord(existing?.id ?? null, draft)
    setIsSaving(false)
    if (!result.ok || !result.record) {
      setMessage([result.message])
      return
    }
    const nextDraft = draftFromRecord(useAppStore.getState(), result.record)
    setDraft(nextDraft)
    setBaseline(nextDraft)
    setMessage(['Version Upgrade record saved.'])
    if (!stayOnPage) {
      navigate('/version-upgrades')
      return
    }
    if (isCreate) navigate(`/version-upgrades/${result.record.id}?mode=edit`, { replace: true })
  }

  function cancelCampaign() {
    if (!existing) return
    const reason = window.prompt('Cancellation reason')
    if (reason === null) return
    const result = cancelRecord(existing.id, reason)
    setMessage([result.message])
  }

  return (
    <WorkspaceFrame>
      <PageHeader
        title={isCreate ? 'New Version Upgrade' : `Version Upgrade ${draft.versionNumber || '-'} / ${draft.buildNumber || '-'}`}
        subtitle="One scheduler record coordinates one unique Version + Build pair"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <>
                <button type="button" className="inline-flex items-center gap-2 rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={!isDirty || isSaving} onClick={() => save(false)}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <SaveButtonLabel saving={isSaving} />
                </button>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt disabled:opacity-50" disabled={!isDirty || isSaving} onClick={() => save(true)}>Apply Changes</button>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => { setDraft(baseline); setMessage([]) }}>Revert</button>
              </>
            ) : !isCreate && formRecord.operationalStatus !== 'CANCELLED' ? (
              <Link to={`/version-upgrades/${id}?mode=edit`} className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt">Edit</Link>
            ) : null}
            {existing && formRecord.operationalStatus !== 'CANCELLED' ? (
              <button type="button" className="inline-flex items-center gap-2 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={cancelCampaign}>
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Cancel Version Upgrade
              </button>
            ) : null}
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => navigate('/version-upgrades')}>Back</button>
          </div>
        )}
      />
      <WorkspaceScrollContent className="space-y-5">
        {message.length > 0 ? <div className={formMessageClassName(message)}>{message.join(' ')}</div> : null}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-sf-text">Header</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Version Number" required controlWidthClassName="w-full">
              <input className={editableClassName(draft.versionNumber !== baseline.versionNumber)} value={draft.versionNumber} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, versionNumber: event.target.value })} />
            </FormField>
            <FormField label="Build Number" required controlWidthClassName="w-full">
              <input className={editableClassName(draft.buildNumber !== baseline.buildNumber)} value={draft.buildNumber} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, buildNumber: event.target.value })} />
            </FormField>
            <FormField label="Completion Status" controlWidthClassName="w-full">
              <div className="rounded border border-sf-border bg-sf-surface-alt px-3 py-2 text-sm">{VERSION_UPGRADE_COMPLETION_LABELS[progress.completionStatus]}</div>
            </FormField>
            <FormField label="Release Date" controlWidthClassName="w-full">
              <input type="date" className={editableClassName((draft.releaseDate ?? '') !== (baseline.releaseDate ?? ''))} value={draft.releaseDate ?? ''} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, releaseDate: event.target.value || null })} />
            </FormField>
            <FormField label="Phase Out Date" controlWidthClassName="w-full">
              <input type="date" className={editableClassName((draft.phaseOutDate ?? '') !== (baseline.phaseOutDate ?? ''))} value={draft.phaseOutDate ?? ''} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, phaseOutDate: event.target.value || null })} />
            </FormField>
            <FormField label="Limited to Cloud Platform" controlWidthClassName="w-full">
              <select className={editableClassName(draft.limitedToCloudPlatform !== baseline.limitedToCloudPlatform)} value={draft.limitedToCloudPlatform} disabled={readOnly} onChange={(event) => setDraft({ ...draft, limitedToCloudPlatform: event.target.value })}>
                <option value="">All Cloud Platforms</option>
                {VERSION_UPGRADE_CLOUD_PLATFORM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Remarks" controlWidthClassName="w-full" className="!w-full" renderAs="div">
            {readOnly ? <RichTextContent value={draft.remarks} /> : <RichTextEditor value={draft.remarks} onChange={(value) => setDraft({ ...draft, remarks: value })} />}
          </FormField>
        </section>

        <ProgressCards progress={progress} />

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-sf-text">Systems to Upgrade</h2>
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
            <table className="w-max min-w-full border-collapse text-sm">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Upgrade Status', 'Requested Upgrade Date', 'Requested Upgrade Time', 'Customer Time Zone', 'CS Comments', 'Schedule Confirmed', 'Activity Duration (hr)', 'Assigned Engineer', 'Engineer Time Zone', 'Engineer Local Date', 'Engineer Local Time', 'Engineer Availability', 'SID', 'PID', 'Under Contract Tenants', 'Not Set Yet Tenants', 'System Operational Status', 'Region', 'Country', 'Project Name', 'Account / End User', 'System URL', 'Performance Tier', 'Hosting', 'Cloud Platform', 'CSP', 'Cloud Region', 'Product', '# Users', '# Licenses', '# Searches', '# Analyses', 'Modules', 'AI Features', 'Additional Features', 'Current Version'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-2 py-1 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const schedule = scheduleFor(row.id)
                  const conflict = row.engineerAvailability === 'No' && schedule.scheduleConfirmed
                  return (
                    <tr key={row.id} className={conflict ? 'bg-red-50' : 'hover:bg-sf-surface-alt'}>
                      <td className="border border-sf-border px-2 py-1"><StatusBadge row={row} /></td>
                      <td className="border border-sf-border px-2 py-1"><input type="date" className="h-8 rounded border border-sf-border px-2" value={schedule.requestedUpgradeDate ?? ''} readOnly={readOnly} onChange={(event) => updateSchedule(row.id, { requestedUpgradeDate: event.target.value || null })} /></td>
                      <td className="border border-sf-border px-2 py-1"><input type="time" className="h-8 rounded border border-sf-border px-2" value={schedule.requestedUpgradeTime} readOnly={readOnly} onChange={(event) => updateSchedule(row.id, { requestedUpgradeTime: event.target.value })} /></td>
                      <td className="border border-sf-border px-2 py-1">
                        <select className="h-8 rounded border border-sf-border px-2" value={schedule.customerTimeZone} disabled={readOnly} onChange={(event) => updateSchedule(row.id, { customerTimeZone: event.target.value as VersionUpgradeSystemSchedule['customerTimeZone'] })}>
                          <option value="">Select</option>
                          {VERSION_UPGRADE_CUSTOMER_TIME_ZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td className="border border-sf-border px-2 py-1"><textarea className="min-h-8 w-56 rounded border border-sf-border px-2 py-1" value={schedule.csComments} readOnly={readOnly} onChange={(event) => updateSchedule(row.id, { csComments: event.target.value })} /></td>
                      <td className="border border-sf-border px-2 py-1 text-center"><input type="checkbox" checked={schedule.scheduleConfirmed} disabled={readOnly} onChange={(event) => updateSchedule(row.id, { scheduleConfirmed: event.target.checked })} /></td>
                      <td className="border border-sf-border px-2 py-1"><input type="number" min={1} step={1} className="h-8 w-24 rounded border border-sf-border px-2" value={schedule.activityDurationHours ?? ''} readOnly={readOnly} onChange={(event) => updateSchedule(row.id, { activityDurationHours: event.target.value ? Number(event.target.value) : null })} /></td>
                      <td className="border border-sf-border px-2 py-1">
                        <select className="h-8 rounded border border-sf-border px-2" value={schedule.assignedEngineerUserId} disabled={readOnly} onChange={(event) => updateSchedule(row.id, { assignedEngineerUserId: event.target.value })}>
                          <option value="">Select Engineer</option>
                          {engineers.map((engineer) => <option key={engineer.id} value={engineer.userId}>{engineer.userId}</option>)}
                        </select>
                      </td>
                      <td className="border border-sf-border px-2 py-1">{row.engineerTimeZone || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.engineerLocalDate || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.engineerLocalTime || '-'}</td>
                      <td className="border border-sf-border px-2 py-1" title={row.availabilityReason}>{row.engineerAvailability}</td>
                      <td className="border border-sf-border px-2 py-1"><BusinessObjectLink reference={systemReference(row.system)} /></td>
                      <td className="border border-sf-border px-2 py-1">{row.project ? <BusinessObjectLink reference={projectReference(row.project)} /> : row.pid || '-'}</td>
                      <td className="border border-sf-border px-2 py-1"><TenantLinks tenants={row.underContractTenants} /></td>
                      <td className="border border-sf-border px-2 py-1"><TenantLinks tenants={row.notSetYetTenants} /></td>
                      <td className="border border-sf-border px-2 py-1">{row.system.operationalStatus || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.region || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.country || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.project?.opportunityName || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.account ? <BusinessObjectLink reference={accountReference(row.account)} /> : row.project?.accountName || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.url ? <a className="text-sf-link underline" href={row.system.url} target="_blank" rel="noreferrer">{row.system.url}</a> : '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.performanceTier || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.hostingType || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.cloudPlatform || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.csp || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.cloudRegion || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.system.productType || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{String(systemExtra(row.system, 'users') ?? '-')}</td>
                      <td className="border border-sf-border px-2 py-1">{String(systemExtra(row.system, 'licenses') ?? '-')}</td>
                      <td className="border border-sf-border px-2 py-1">{String(systemExtra(row.system, 'concurrentSearches') ?? '-')}</td>
                      <td className="border border-sf-border px-2 py-1">{String(systemExtra(row.system, 'concurrentAnalyses') ?? '-')}</td>
                      <td className="border border-sf-border px-2 py-1">{[['Tangles', systemExtra(row.system, 'tangles')], ['Tangles Go', systemExtra(row.system, 'tanglesGo')], ['Webloc', systemExtra(row.system, 'webloc')], ['Webeye', systemExtra(row.system, 'webeye')], ['Ingest', systemExtra(row.system, 'ingest')], ['Blockchain', systemExtra(row.system, 'blockchain')]].filter(([, count]) => Number(count) > 0).map(([label]) => label).join(', ') || '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{Array.isArray(systemExtra(row.system, 'aiFeatures')) ? (systemExtra(row.system, 'aiFeatures') as string[]).join(', ') : '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{Array.isArray(systemExtra(row.system, 'additionalFeatures')) ? (systemExtra(row.system, 'additionalFeatures') as string[]).join(', ') : '-'}</td>
                      <td className="border border-sf-border px-2 py-1">{row.currentVersion}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 ? (
                  <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={36}>No eligible Production Systems currently match this Version Upgrade.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </WorkspaceScrollContent>
    </WorkspaceFrame>
  )
}

export function VersionUpgradeSchedulerPage() {
  const location = useLocation()
  const { id } = useParams()
  const isCreateRoute = location.pathname === '/version-upgrades/new'
  return id || isCreateRoute ? <VersionUpgradeForm /> : <VersionUpgradeDashboard />
}
