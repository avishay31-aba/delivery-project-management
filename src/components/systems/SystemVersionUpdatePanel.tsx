import { type ChangeEvent, useMemo, useState } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import type { ReferenceDataRecord, VersionUpdateAttachmentCategory, VersionUpdateRecord } from '@/data/seed.types'
import { createPendingAttachmentDraft, type PendingAttachmentDraft } from '@/domain/attachment'
import {
  activeBuildNumberRecordsForVersion,
  activeReferenceDataRecords,
  referenceDataRecordById,
  referenceDataLabel,
  VERSION_NUMBER_REFERENCE_TYPE,
} from '@/domain/reference-data'
import {
  VERSION_UPDATE_ATTACHMENT_CATEGORIES,
  VERSION_UPDATE_ATTACHMENT_LABELS,
  versionUpdateRowsForSystem,
  type VersionUpdateRow,
} from '@/domain/system-version-update'
import { useAppStore } from '@/store/useAppStore'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { EditableChildObjectActionButton } from '@/components/child-objects'
import { BusinessIdLink, FileDownloadLink, FormField, ReadonlyField, RichTextContent, RichTextEditor, TableSection } from '@/components/ui'

type SortKey = 'id' | 'timestamp' | 'userName' | 'mid' | 'sid' | 'versionLabel' | 'buildLabel' | 'emailSentAt' | 'remarks'
type SortState = { key: SortKey; direction: 'asc' | 'desc' } | null
type VersionUpdateFieldKey = 'versionNumber' | 'buildNumber' | VersionUpdateAttachmentCategory

interface SystemVersionUpdatePanelProps {
  systemId: string
  systemCollection: 'production' | 'reused' | 'allocated'
  mid: string
  sid: string
  currentVersionUpdateId?: string | null
  readOnly?: boolean
}

interface VersionUpdateDraft {
  id?: string
  versionNumberRefId: string
  buildNumberRefId: string
  newVersionNumberLabel: string
  newBuildNumberLabel: string
  attachments: Partial<Record<VersionUpdateAttachmentCategory, PendingAttachmentDraft>>
  remarks: string
}

const EMPTY_DRAFT: VersionUpdateDraft = {
  versionNumberRefId: '',
  buildNumberRefId: '',
  newVersionNumberLabel: '',
  newBuildNumberLabel: '',
  attachments: {},
  remarks: '',
}

function sortValue(row: VersionUpdateRow, key: SortKey): string {
  const values: Record<SortKey, string> = {
    id: row.id,
    timestamp: row.timestamp,
    userName: row.userName,
    mid: row.mid,
    sid: row.sid,
    versionLabel: row.versionLabel,
    buildLabel: row.buildLabel,
    emailSentAt: row.emailSentAt ?? '',
    remarks: row.remarks.replace(/<[^>]*>/g, ' '),
  }
  return values[key].trim().toLocaleLowerCase()
}

function attachmentFor(row: VersionUpdateRow, category: VersionUpdateAttachmentCategory) {
  return row.record.attachments.find((attachment) => attachment.category === category)
}

function versionOptions(records: ReferenceDataRecord[], currentId: string): ReferenceDataRecord[] {
  const active = activeReferenceDataRecords(records, VERSION_NUMBER_REFERENCE_TYPE)
  const current = referenceDataRecordById(records, currentId)
  if (current && !active.some((record) => record.id === current.id)) return [...active, current]
  return active
}

function buildOptions(records: ReferenceDataRecord[], versionNumberId: string, currentId: string): ReferenceDataRecord[] {
  const active = activeBuildNumberRecordsForVersion(records, versionNumberId)
  const current = referenceDataRecordById(records, currentId)
  if (current && current.versionNumberId === versionNumberId && !active.some((record) => record.id === current.id)) return [...active, current]
  return active
}

export function SystemVersionUpdatePanel({
  systemId,
  systemCollection,
  mid,
  sid,
  currentVersionUpdateId,
  readOnly = false,
}: SystemVersionUpdatePanelProps) {
  const referenceData = useAppStore((state) => state.referenceData)
  const versionUpdates = useAppStore((state) => state.versionUpdates)
  const saveVersionUpdate = useAppStore((state) => state.saveVersionUpdate)
  const deleteVersionUpdate = useAppStore((state) => state.deleteVersionUpdate)
  const [draft, setDraft] = useState<VersionUpdateDraft | null>(null)
  const [sort, setSort] = useState<SortState>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VersionUpdateFieldKey, string>>>({})
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)

  const rows = useMemo(
    () => versionUpdateRowsForSystem(versionUpdates, referenceData, systemId),
    [referenceData, systemId, versionUpdates],
  )
  const displayedRows = useMemo(() => {
    if (!sort) return rows
    return [...rows].sort((first, second) => {
      const comparison = sortValue(first, sort.key).localeCompare(sortValue(second, sort.key), undefined, { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [rows, sort])

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function beginAdd() {
    setDraft({ ...EMPTY_DRAFT, attachments: {} })
    setMessage(null)
    setFieldErrors({})
    setHasAttemptedSave(false)
  }

  function beginEdit(record: VersionUpdateRecord) {
    setDraft({
      id: record.id,
      versionNumberRefId: record.versionNumberRefId,
      buildNumberRefId: record.buildNumberRefId,
      newVersionNumberLabel: '',
      newBuildNumberLabel: '',
      attachments: Object.fromEntries(
        record.attachments.map((attachment) => [
          attachment.category,
          {
            category: attachment.category,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            storedFileReference: attachment.storedFileReference,
          },
        ]),
      ),
      remarks: record.remarks,
    })
    setMessage(null)
    setFieldErrors({})
    setHasAttemptedSave(false)
  }

  function clearFieldErrors(...fields: VersionUpdateFieldKey[]) {
    setFieldErrors((current) => {
      const next = { ...current }
      fields.forEach((field) => {
        delete next[field]
      })
      return next
    })
  }

  const visibleFieldErrors = (['versionNumber', 'buildNumber', ...VERSION_UPDATE_ATTACHMENT_CATEGORIES] as VersionUpdateFieldKey[])
    .filter((field) => Boolean(fieldErrors[field]))

  function fieldErrorId(field: VersionUpdateFieldKey) {
    return `version-update-${field}-error`
  }

  function fieldControlClassName(field: VersionUpdateFieldKey, base = 'mt-1 h-9 w-full rounded border px-2 py-1 font-normal') {
    return `${base} ${fieldErrors[field] ? 'border-red-500' : 'border-sf-border'}`
  }

  function mapValidationErrors(messageText: string): Partial<Record<VersionUpdateFieldKey, string>> {
    const nextErrors: Partial<Record<VersionUpdateFieldKey, string>> = {}
    if (messageText.includes('Version Number is required.')) nextErrors.versionNumber = 'Version Number is required.'
    if (messageText.includes('Build Number is required.')) nextErrors.buildNumber = 'Build Number is required.'
    if (messageText.includes('Build Number does not belong')) nextErrors.buildNumber = 'Build Number does not belong to the selected Version Number.'
    VERSION_UPDATE_ATTACHMENT_CATEGORIES.forEach((category) => {
      const requiredMessage = `${VERSION_UPDATE_ATTACHMENT_LABELS[category]} is required.`
      if (messageText.includes(requiredMessage)) nextErrors[category] = requiredMessage
    })
    return nextErrors
  }

  function focusFirstInvalidField(errors: Partial<Record<VersionUpdateFieldKey, string>>) {
    const firstField = (['versionNumber', 'buildNumber', ...VERSION_UPDATE_ATTACHMENT_CATEGORIES] as VersionUpdateFieldKey[]).find((field) => errors[field])
    if (!firstField) return
    window.setTimeout(() => {
      const element = document.getElementById(`version-update-${firstField}`)
      element?.focus()
      element?.scrollIntoView({ block: 'nearest' })
    })
  }

  function selectVersion(value: string) {
    if (value === '__add_new__') {
      const label = window.prompt('Add Version Number')
      const nextLabel = referenceDataLabel(label ?? '')
      if (!nextLabel) return
      setDraft((current) =>
        current
          ? {
              ...current,
              versionNumberRefId: '',
              buildNumberRefId: '',
              newVersionNumberLabel: nextLabel,
              newBuildNumberLabel: '',
            }
          : current,
      )
      setMessage(null)
      if (hasAttemptedSave) clearFieldErrors('versionNumber')
      return
    }
    setDraft((current) => {
      if (!current) return current
      const currentBuild = referenceDataRecordById(referenceData, current.buildNumberRefId)
      const buildBelongsToVersion = currentBuild?.versionNumberId === value
      return {
        ...current,
        versionNumberRefId: value,
        buildNumberRefId: buildBelongsToVersion ? current.buildNumberRefId : '',
        newVersionNumberLabel: '',
        newBuildNumberLabel: buildBelongsToVersion ? current.newBuildNumberLabel : '',
      }
    })
    setMessage(null)
    if (hasAttemptedSave) clearFieldErrors('versionNumber')
  }

  function selectBuild(value: string) {
    if (value === '__add_new__') {
      const label = window.prompt('Add Build Number')
      const nextLabel = referenceDataLabel(label ?? '')
      if (!nextLabel) return
      setDraft((current) =>
        current
          ? {
              ...current,
              buildNumberRefId: '',
              newBuildNumberLabel: nextLabel,
            }
          : current,
      )
      setMessage(null)
      if (hasAttemptedSave) clearFieldErrors('buildNumber')
      return
    }
    setDraft((current) => current ? { ...current, buildNumberRefId: value, newBuildNumberLabel: '' } : current)
    setMessage(null)
    if (hasAttemptedSave) clearFieldErrors('buildNumber')
  }

  async function handleFileChange(category: VersionUpdateAttachmentCategory, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const attachment = await createPendingAttachmentDraft({ category, file })
      setDraft((current) => current ? { ...current, attachments: { ...current.attachments, [category]: attachment } } : current)
      setMessage(null)
      if (hasAttemptedSave) clearFieldErrors(category)
    } catch {
      setMessage({ tone: 'error', text: `${VERSION_UPDATE_ATTACHMENT_LABELS[category]} could not be read.` })
    }
  }

  function saveDraft() {
    if (!draft) return
    const result = saveVersionUpdate(systemCollection, systemId, {
      id: draft.id,
      versionNumberRefId: draft.versionNumberRefId,
      buildNumberRefId: draft.buildNumberRefId,
      newVersionNumberLabel: draft.newVersionNumberLabel,
      newBuildNumberLabel: draft.newBuildNumberLabel,
      remarks: draft.remarks,
      attachments: VERSION_UPDATE_ATTACHMENT_CATEGORIES
        .map((category) => draft.attachments[category])
        .filter((attachment): attachment is PendingAttachmentDraft => Boolean(attachment)),
    })
    if (result.ok) {
      setFieldErrors({})
      setHasAttemptedSave(false)
      setMessage({ tone: 'success', text: result.message })
      setDraft(null)
      return
    }
    const nextErrors = mapValidationErrors(result.message)
    if (Object.keys(nextErrors).length > 0) {
      setHasAttemptedSave(true)
      setFieldErrors(nextErrors)
      setMessage(null)
      focusFirstInvalidField(nextErrors)
      return
    }
    setMessage({ tone: 'error', text: result.message })
  }

  function deleteRecord(record: VersionUpdateRecord) {
    const reason = window.prompt('Deletion reason')
    if (reason === null) return
    const result = deleteVersionUpdate(record.id, reason)
    setMessage({ tone: result.ok ? 'success' : 'error', text: result.message })
  }

  const actions = readOnly ? null : (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
      onClick={beginAdd}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add Version
    </button>
  )

  return (
    <TableSection title="Version Updates" actions={actions}>
      {message ? (
        <div
          className={[
            'rounded border px-3 py-2 text-sm',
            message.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role="status"
        >
          {message.text}
        </div>
      ) : null}
      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className="w-max min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {[
                ['actions', 'Action'],
                ['id', 'ID'],
                ['timestamp', 'Timestamp'],
                ['userName', 'User Name'],
                ['mid', 'MID'],
                ['sid', 'SID'],
                ['versionLabel', 'Version'],
                ['buildLabel', 'Build No'],
                ['config', 'Config File'],
                ['atp', 'ATP File'],
                ['checklist', 'Checklist File'],
                ['emailSentAt', 'Email Sent Date'],
                ['remarks', 'Remarks'],
              ].map(([key, label]) => (
                <th key={key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  {['actions', 'config', 'atp', 'checklist'].includes(key) ? label : (
                    <button type="button" className="font-semibold hover:text-sf-brand" onClick={() => toggleSort(key as SortKey)}>
                      {label}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                  {readOnly ? null : (
                    <div className="flex flex-wrap gap-1">
                      <EditableChildObjectActionButton onClick={() => beginEdit(row.record)}>
                        <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </EditableChildObjectActionButton>
                      <EditableChildObjectActionButton
                        variant="danger"
                        disabled={currentVersionUpdateId === row.record.id}
                        onClick={() => deleteRecord(row.record)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </EditableChildObjectActionButton>
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.id}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text"><DateTimeValue value={row.timestamp} semanticType="datetime" /></td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.userName}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.mid || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.sid || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.versionLabel || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.buildLabel || '-'}</td>
                {VERSION_UPDATE_ATTACHMENT_CATEGORIES.map((category) => {
                  const attachment = attachmentFor(row, category)
                  return (
                    <td key={category} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                      {attachment ? <FileDownloadLink fileName={attachment.fileName} fileReference={attachment.storedFileReference} /> : '-'}
                    </td>
                  )
                })}
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text"><DateTimeValue value={row.emailSentAt} semanticType="datetime" /></td>
                <td className="max-w-96 border border-sf-border px-1.5 py-1 align-top text-sf-text"><RichTextContent value={row.remarks} /></td>
              </tr>
            ))}
            {displayedRows.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={13}>
                  No Version Updates have been recorded for this System.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

              {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="false" aria-labelledby="version-update-dialog-title">
            <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
              <div>
                <h2 id="version-update-dialog-title" className="text-lg font-semibold text-sf-text">{draft.id ? 'Edit Version Update' : 'Add Version Update'}</h2>
                <p className="text-sm text-sf-text-muted">Committed records update the official System Version and Build Number.</p>
              </div>
              <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close Version Update dialog" onClick={() => setDraft(null)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 overflow-auto p-4">
              {visibleFieldErrors.length > 0 ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                  <p className="font-semibold">Please complete the required fields below.</p>
                  <ul className="mt-1 list-disc pl-5">
                    {visibleFieldErrors.map((field) => (
                        <li key={field}>{field === 'versionNumber' ? 'Version Number' : field === 'buildNumber' ? 'Build Number' : VERSION_UPDATE_ATTACHMENT_LABELS[field]}</li>
                      ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <ReadonlyField label="MID" className="!w-full" value={draft.id ? rows.find((row) => row.id === draft.id)?.mid || '-' : mid || '-'} />
                <ReadonlyField
                  label="SID"
                  className="!w-full"
                  value={(draft.id ? rows.find((row) => row.id === draft.id)?.sid || '' : sid || '')
                    ? (
                        <BusinessIdLink objectType="SYSTEM" businessId={draft.id ? rows.find((row) => row.id === draft.id)?.sid || '' : sid || ''}>
                          {draft.id ? rows.find((row) => row.id === draft.id)?.sid || '' : sid || ''}
                        </BusinessIdLink>
                      )
                    : '-'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Version Number" required error={fieldErrors.versionNumber} fieldId="version-update-versionNumber" errorId={fieldErrorId('versionNumber')} controlWidthClassName="w-full" className="!w-full">
                  <select
                    id="version-update-versionNumber"
                    className={fieldControlClassName('versionNumber')}
                    value={draft.newVersionNumberLabel ? '__new_version__' : draft.versionNumberRefId}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.versionNumber)}
                    aria-describedby={fieldErrors.versionNumber ? fieldErrorId('versionNumber') : undefined}
                    onChange={(event) => selectVersion(event.target.value)}
                  >
                    <option value="">Select Version Number</option>
                    {versionOptions(referenceData, draft.versionNumberRefId).map((record) => (
                      <option key={record.id} value={record.id}>{record.label}{record.active ? '' : ' (inactive)'}</option>
                    ))}
                    {draft.newVersionNumberLabel ? <option value="__new_version__">{draft.newVersionNumberLabel} (new)</option> : null}
                    <option value="__add_new__">Add new...</option>
                  </select>
                </FormField>
                <FormField
                  label="Build Number"
                  required
                  error={fieldErrors.buildNumber}
                  helperText={draft.versionNumberRefId && buildOptions(referenceData, draft.versionNumberRefId, draft.buildNumberRefId).length === 0 && !draft.newBuildNumberLabel ? 'No builds for this Version yet.' : undefined}
                  fieldId="version-update-buildNumber"
                  errorId={fieldErrorId('buildNumber')}
                  controlWidthClassName="w-full"
                  className="!w-full"
                >
                  <select
                    id="version-update-buildNumber"
                    className={fieldControlClassName('buildNumber')}
                    value={draft.newBuildNumberLabel ? '__new_build__' : draft.buildNumberRefId}
                    disabled={!draft.versionNumberRefId && !draft.newVersionNumberLabel}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.buildNumber)}
                    aria-describedby={fieldErrors.buildNumber ? fieldErrorId('buildNumber') : undefined}
                    onChange={(event) => selectBuild(event.target.value)}
                  >
                    <option value="">Select Build Number</option>
                    {draft.versionNumberRefId ? buildOptions(referenceData, draft.versionNumberRefId, draft.buildNumberRefId).map((record) => (
                      <option key={record.id} value={record.id}>{record.label}{record.active ? '' : ' (inactive)'}</option>
                    )) : null}
                    {draft.newBuildNumberLabel ? <option value="__new_build__">{draft.newBuildNumberLabel} (new)</option> : null}
                    {draft.versionNumberRefId || draft.newVersionNumberLabel ? <option value="__add_new__">Add new...</option> : null}
                  </select>
                </FormField>
              </div>

              {VERSION_UPDATE_ATTACHMENT_CATEGORIES.map((category) => {
                const attachment = draft.attachments[category]
                return (
                  <FormField key={category} label={VERSION_UPDATE_ATTACHMENT_LABELS[category]} required error={fieldErrors[category]} fieldId={`version-update-${category}`} errorId={fieldErrorId(category)} controlWidthClassName="w-full" className="!w-full">
                    <div className={`flex flex-wrap items-center gap-2 rounded border bg-white p-2 ${fieldErrors[category] ? 'border-red-500' : 'border-sf-border'}`}>
                      <input
                        id={`version-update-${category}`}
                        type="file"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors[category])}
                        aria-describedby={fieldErrors[category] ? fieldErrorId(category) : undefined}
                        onChange={(event) => void handleFileChange(category, event)}
                      />
                      <span className="text-sm font-normal text-sf-text-muted">{attachment?.fileName ?? 'No file selected'}</span>
                    </div>
                  </FormField>
                )
              })}

              <FormField label="Remarks" controlWidthClassName="w-full" className="!w-full" renderAs="div">
                <RichTextEditor value={draft.remarks} onChange={(value) => setDraft((current) => current ? { ...current, remarks: value } : current)} />
              </FormField>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="button" className="inline-flex items-center gap-1 rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={saveDraft}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </TableSection>
  )
}
