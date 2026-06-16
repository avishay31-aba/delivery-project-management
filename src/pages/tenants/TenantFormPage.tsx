import { type ChangeEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/record'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { FormField, PlaceholderCard } from '@/components/ui'
import {
  ADDITIONAL_FEATURE_OPTIONS,
  AI_OPTIONS,
  CROSS_SYSTEM_OPTIONS,
  YES_NO_OPTIONS,
  requirementAColumns,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
import { HOSTING_OPTIONS, cloudPlatformOptionsForHosting } from '@/config/cloud-platform-metadata'
import type {
  EngagementCircleContact,
  NewTenantRequirement,
  Opportunity,
  Project,
  System,
  Tenant,
  TenantConfiguration,
  TenantConfigurationHistoryRecord,
  TenantDocument,
  TenantFormType,
  TenantHostingSnapshot,
  TenantRemark,
  TenantWarranty,
  WarrantyStatus,
  YesNo,
} from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { validateRequirementA } from '@/utils/opportunity-validation'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'

type TenantTab = 'configuration' | 'hosting' | 'engagement' | 'usage' | 'documents'
type ConfigKey = keyof TenantConfiguration
type TenantConfigurationColumn = RequirementColumnMetadata & { configKey: ConfigKey }
type RemarkKey = keyof Pick<TenantRemark, 'type' | 'content' | 'dueDate' | 'eventCreated'>
type WarrantyKey = keyof Pick<
  TenantWarranty,
  | 'predecessor'
  | 'relatedProjectId'
  | 'startDate'
  | 'endDate'
  | 'noWarranty'
  | 'outOfContract'
  | 'remark'
>
type ActiveMultiSelect = { id: string; key: ConfigKey; selected: string[]; left: number; top: number; width: number }

const TENANT_TABS: Array<{ id: TenantTab; label: string }> = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'engagement', label: 'Engagement circles' },
  { id: 'usage', label: 'Usage' },
  { id: 'documents', label: 'Documents' },
]

const REMARK_TYPES = ['Note', 'Warranty', 'Temporary change', 'Permanent change', 'Task']

const CONFIGURATION_FIELDS: TenantConfigurationColumn[] = requirementAColumns
  .slice(5)
  .map((column) => ({
    ...column,
    configKey: column.key === 'productType' ? 'product' : column.key as ConfigKey,
  }))

const HOSTING_FIELDS: Array<{ key: keyof TenantHostingSnapshot; label: string }> = [
  { key: 'currentSystem', label: 'Current system' },
  { key: 'sid', label: 'SID' },
  { key: 'operationalStatus', label: 'Operational Status' },
  { key: 'machineNumber', label: 'Machine Number' },
  { key: 'versionNumber', label: 'Version Number' },
  { key: 'hostingType', label: 'Hosting type' },
  { key: 'url', label: 'URL' },
  { key: 'performanceTier', label: 'Performance tier' },
  { key: 'vpnEnabled', label: 'VPN' },
  { key: 'vpnType', label: 'VPN type' },
  { key: 'ipRestrictionEnabled', label: 'IP restriction' },
  { key: 'platform', label: 'Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'awsRegion', label: 'AWS Region' },
  { key: 'azureRegion', label: 'Azure Region' },
]

function cloneTenant(tenant: Tenant): Tenant {
  return JSON.parse(JSON.stringify(tenant)) as Tenant
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value == null ? '' : String(value)
}

function digitString(value: unknown): string {
  return value == null ? '' : String(value).replace(/\D/g, '')
}

function parseDigitValue(value: string): number | null {
  return value === '' ? null : Number(value)
}

function splitMultiValue(value: string): string[] {
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function preventNonDigitKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  if (!/^\d$/.test(event.key)) event.preventDefault()
}

function formatLocalTimestamp(value = new Date()): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function tenantFormType(tenant: Tenant): TenantFormType {
  return tenant.tenantFormType ?? (tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER')
}

function tenantFormTypeForSystem(system: System): TenantFormType {
  if (system.systemClass === 'POC_DEMO_TRAINING' || system.source === 'Reused Internal Systems') return 'POC'
  return 'CUSTOMER'
}

function configurationFromTenant(tenant: Tenant, system?: System): TenantConfiguration {
  return {
    product: system?.productType ?? tenant.configuration?.product ?? tenant.productType ?? '',
    licenses: tenant.configuration?.licenses ?? tenant.licenses ?? null,
    users: tenant.configuration?.users ?? tenant.users ?? null,
    concurrentSearches: tenant.configuration?.concurrentSearches ?? tenant.concurrentSearches ?? null,
    dailySearches: tenant.configuration?.dailySearches ?? tenant.dailySearches ?? null,
    monthlySearches: tenant.configuration?.monthlySearches ?? tenant.monthlySearches ?? null,
    concurrentAnalyses: tenant.configuration?.concurrentAnalyses ?? tenant.concurrentAnalyses ?? null,
    dailyAnalyses: tenant.configuration?.dailyAnalyses ?? tenant.dailyAnalyses ?? null,
    monthlyAnalyses: tenant.configuration?.monthlyAnalyses ?? tenant.monthlyAnalyses ?? null,
    topicAnalyses: tenant.configuration?.topicAnalyses ?? tenant.topicAnalyses ?? null,
    standardMonitors: tenant.configuration?.standardMonitors ?? tenant.standardMonitors ?? null,
    fullMonitors: tenant.configuration?.fullMonitors ?? tenant.fullMonitors ?? null,
    topicMonitors: tenant.configuration?.topicMonitors ?? tenant.topicMonitors ?? null,
    mapCenter: tenant.configuration?.mapCenter ?? tenant.mapCenter ?? '',
    tangles: tenant.configuration?.tangles ?? tenant.tangles ?? null,
    tanglesGo: tenant.configuration?.tanglesGo ?? tenant.tanglesGo ?? null,
    webloc: tenant.configuration?.webloc ?? tenant.webloc ?? null,
    webeye: tenant.configuration?.webeye ?? tenant.webeye ?? null,
    ingest: tenant.configuration?.ingest ?? tenant.ingest ?? null,
    blockchain: tenant.configuration?.blockchain ?? tenant.blockchain ?? '',
    crossSystemFeatures: tenant.configuration?.crossSystemFeatures ?? tenant.crossSystemFeatures ?? [],
    apiEnabled: tenant.configuration?.apiEnabled ?? tenant.apiEnabled ?? '',
    apiDailyQty: tenant.configuration?.apiDailyQty ?? tenant.apiDailyQty ?? null,
    apiMonthlyQty: tenant.configuration?.apiMonthlyQty ?? tenant.apiMonthlyQty ?? null,
    aiFeatures: tenant.configuration?.aiFeatures ?? tenant.aiFeatures ?? [],
    additionalFeatures: tenant.configuration?.additionalFeatures ?? tenant.additionalFeatures ?? [],
  }
}

function hostingFromSystem(tenant: Tenant, system?: System): TenantHostingSnapshot {
  const platform = system?.cloudPlatform ?? tenant.cloudPlatform ?? ''
  const cloudRegion = system?.cloudRegion ?? tenant.cloudRegion ?? ''
  return {
    currentSystem: Boolean(system),
    sid: system?.sid ?? tenant.hostingSid ?? '',
    operationalStatus: system?.operationalStatus ?? tenant.operationalStatus ?? '',
    machineNumber: system?.machineId ?? '',
    versionNumber: system?.cognitoRegion ?? '',
    hostingType: system?.hostingType ?? tenant.hostingType ?? '',
    url: system?.url ?? '',
    performanceTier: system?.performanceTier ?? tenant.performanceTier ?? '',
    vpnEnabled: system?.vpnEnabled ?? tenant.vpnEnabled ?? '',
    vpnType: system?.vpnType ?? tenant.vpnType ?? '',
    ipRestrictionEnabled: system?.ipRestrictionEnabled ?? tenant.ipRestrictionEnabled ?? '',
    platform,
    csp: system?.csp ?? tenant.csp ?? '',
    awsRegion: platform.includes('AWS') ? cloudRegion : '',
    azureRegion: platform.includes('Azure') ? cloudRegion : '',
  }
}

function daysBetween(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return null
  return Math.ceil((end.valueOf() - start.valueOf()) / 86_400_000)
}

function daysBeforeExpiration(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  if (Number.isNaN(end.valueOf())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((end.valueOf() - today.valueOf()) / 86_400_000)
}

function warrantyTypeForProject(project?: Project): string {
  if (!project) return ''
  if (project.mainType === 'DELIVERY' && project.subType === 'UPSELL') return 'Upsell'
  if (project.mainType === 'RENEWAL') return project.subType === 'UPSELL' ? 'Upsell' : 'Renewal'
  return 'Delivery'
}

function displayWarrantyStatus(status: WarrantyStatus): string {
  const labels: Record<WarrantyStatus, string> = {
    NOT_SET: 'Not set yet',
    PLANNED: 'Planned',
    VALID: 'Valid',
    PENDING: 'Pending',
    RENEWED: 'Renewed',
    EXPIRED: 'Expired',
    NO_WARRANTY: 'No warranty',
    OUT_OF_CONTRACT: 'Out of contract',
    OBSOLETE: 'Obsolete',
  }
  return labels[status]
}

function licenseNumber(sid: string, pid: string): string {
  if (sid && pid) return `${pid}${sid}`
  if (sid) return sid
  return ''
}

function calculateWarrantyStatus(warranty: TenantWarranty, hasSuccessor: boolean): WarrantyStatus {
  if (warranty.noWarranty === 'YES') return 'NO_WARRANTY'
  if (warranty.outOfContract === 'YES') return 'OUT_OF_CONTRACT'
  if (hasSuccessor) return 'RENEWED'
  if (!warranty.startDate && !warranty.endDate) return 'NOT_SET'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = warranty.startDate ? new Date(warranty.startDate) : null
  const end = warranty.endDate ? new Date(warranty.endDate) : null
  if (start && today < start) return 'PLANNED'
  if (end) {
    const daysLeft = daysBeforeExpiration(warranty.endDate)
    if (daysLeft != null && daysLeft < 0) return 'EXPIRED'
    if (daysLeft != null && daysLeft < 90) return 'PENDING'
    if (!start || today >= start) return 'VALID'
  }
  return 'NOT_SET'
}

function configurationValue(configuration: TenantConfiguration, column: TenantConfigurationColumn): unknown {
  return configuration[column.configKey]
}

function buildRequirementAFromConfiguration(
  tenant: Tenant,
  configuration: TenantConfiguration,
  system?: System,
): NewTenantRequirement {
  return {
    id: `tenant-config-${tenant.id}`,
    requirementId: tenant.sourceRequirementId ?? 'TENANT-CONFIG',
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
    hostingType: system?.hostingType ?? tenant.hostingType ?? HOSTING_OPTIONS[0],
    cloudPlatform: system?.cloudPlatform ?? tenant.cloudPlatform ?? cloudPlatformOptionsForHosting(system?.hostingType ?? tenant.hostingType ?? HOSTING_OPTIONS[0])[0] ?? '',
    csp: system?.csp ?? tenant.csp,
    cloudRegion: system?.cloudRegion ?? tenant.cloudRegion,
    statisticsId: tenant.statisticsId,
    authId: tenant.authId,
    rdmId: tenant.rdmId,
    performanceTier: system?.performanceTier ?? tenant.performanceTier,
    vpnEnabled: system?.vpnEnabled ?? tenant.vpnEnabled,
    vpnType: system?.vpnType ?? tenant.vpnType,
    ipRestrictionEnabled: system?.ipRestrictionEnabled ?? tenant.ipRestrictionEnabled,
    productType: configuration.product,
    mapCenter: configuration.mapCenter,
    licenses: configuration.licenses,
    users: configuration.users,
    concurrentSearches: configuration.concurrentSearches,
    dailySearches: configuration.dailySearches,
    monthlySearches: configuration.monthlySearches,
    concurrentAnalyses: configuration.concurrentAnalyses,
    topicAnalyses: configuration.topicAnalyses,
    dailyAnalyses: configuration.dailyAnalyses,
    monthlyAnalyses: configuration.monthlyAnalyses,
    tangles: configuration.tangles,
    tanglesGo: configuration.tanglesGo,
    webloc: configuration.webloc,
    webeye: configuration.webeye,
    ingest: configuration.ingest,
    blockchain: configuration.blockchain,
    crossSystemFeatures: configuration.crossSystemFeatures,
    apiEnabled: configuration.apiEnabled,
    apiDailyQty: configuration.apiDailyQty,
    apiMonthlyQty: configuration.apiMonthlyQty,
    aiFeatures: configuration.aiFeatures,
    additionalFeatures: configuration.additionalFeatures,
    standardMonitors: configuration.standardMonitors,
    fullMonitors: configuration.fullMonitors,
    topicMonitors: configuration.topicMonitors,
  }
}

function resolveProject(tenant: Tenant, projects: Project[], projectTenants: Array<{ tenantId: string; projectId: string }>, systems: System[]): Project | undefined {
  const linkedProjectId = projectTenants.find((link) => link.tenantId === tenant.id)?.projectId
  if (linkedProjectId) return projects.find((project) => project.id === linkedProjectId)
  const system = systems.find((candidate) => candidate.id === tenant.systemId)
  return projects.find((project) => project.pid === tenant.deliveryPid || system?.linkedProjectIds?.includes(project.id))
}

function normalizeReference(value: string | undefined | null): string {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function projectOpportunityReference(project: Project | undefined): string {
  if (!project) return ''
  if (project.opportunityId) return project.opportunityId
  return normalizeReference(project.opportunityName).startsWith('sf-opp-') ? project.opportunityName : ''
}

function resolveOpportunity(project: Project | undefined, opportunities: Opportunity[]): Opportunity | undefined {
  if (!project) return undefined
  const opportunityReference = normalizeReference(projectOpportunityReference(project))
  const projectName = normalizeReference(project.opportunityName)

  return opportunities.find(
    (opportunity) =>
      opportunity.opportunityId === project.opportunityId ||
      opportunity.id === project.opportunityId ||
      normalizeReference(opportunity.opportunityId) === opportunityReference ||
      normalizeReference(opportunity.id) === opportunityReference ||
      normalizeReference(opportunity.opportunityName) === projectName ||
      opportunity.pocProjectIds.includes(project.id) ||
      opportunity.finalProjectId === project.id,
  )
}

function tenantPatchFromDraft(draft: Tenant, saved: Tenant, system?: System): Partial<Tenant> {
  const configuration = configurationFromTenant(draft, system)
  const now = new Date().toISOString()
  const configurationHistory = [...(draft.configurationHistory ?? [])]

  if (!valuesEqual(configurationFromTenant(saved, system), configuration)) {
    configurationHistory.unshift({
      id: `tenant-config-history-${crypto.randomUUID()}`,
      recordId: `CH-${String(configurationHistory.length + 1).padStart(3, '0')}`,
      timestamp: now,
      recordedBy: 'Current user',
      configuration,
    })
  }

  return {
    tenantFormType: tenantFormType(draft),
    hostedSystemId: system?.id ?? draft.systemId,
    hostingSid: system?.sid ?? draft.hostingSid ?? '',
    configuration,
    hostingSnapshot: hostingFromSystem(draft, system),
    engagementCircle: draft.engagementCircle ?? [],
    remarks: draft.remarks ?? [],
    configurationHistory,
    warranties: (draft.warranties ?? []).map((warranty) => ({
      ...warranty,
      durationDays: daysBetween(warranty.startDate, warranty.endDate),
      daysBeforeExpiration: daysBeforeExpiration(warranty.endDate),
    })),
    documents: draft.documents ?? [],
    productType: configuration.product,
    licenses: configuration.licenses,
    users: configuration.users,
    concurrentSearches: configuration.concurrentSearches,
    dailySearches: configuration.dailySearches,
    monthlySearches: configuration.monthlySearches,
    concurrentAnalyses: configuration.concurrentAnalyses,
    dailyAnalyses: configuration.dailyAnalyses,
    monthlyAnalyses: configuration.monthlyAnalyses,
    topicAnalyses: configuration.topicAnalyses,
    standardMonitors: configuration.standardMonitors,
    fullMonitors: configuration.fullMonitors,
    topicMonitors: configuration.topicMonitors,
    mapCenter: configuration.mapCenter,
    tangles: configuration.tangles,
    tanglesGo: configuration.tanglesGo,
    webloc: configuration.webloc,
    webeye: configuration.webeye,
    ingest: configuration.ingest,
    blockchain: configuration.blockchain,
    crossSystemFeatures: configuration.crossSystemFeatures,
    apiEnabled: configuration.apiEnabled,
    apiDailyQty: configuration.apiDailyQty,
    apiMonthlyQty: configuration.apiMonthlyQty,
    aiFeatures: configuration.aiFeatures,
    additionalFeatures: configuration.additionalFeatures,
  }
}

function ReadonlyTable({ headers, rows, emptyText }: { headers: string[]; rows: ReactNode[][]; emptyText: string }) {
  return rows.length > 0 ? (
    <div className="overflow-x-auto rounded border border-sf-border bg-white">
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-sf-surface-alt">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-sf-border px-1.5 py-1 align-top text-sf-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">{emptyText}</div>
  )
}

export function TenantFormPage() {
  const { tid } = useParams<{ tid: string }>()
  const navigate = useNavigate()
  const tenants = useAppStore((state) => state.tenants)
  const systems = useAppStore((state) => state.systems)
  const projects = useAppStore((state) => state.projects)
  const accounts = useAppStore((state) => state.accounts)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const opportunities = useAppStore((state) => state.opportunities)
  const updateTenant = useAppStore((state) => state.updateTenant)
  const savedTenant = useMemo(() => tenants.find((tenant) => tenant.tid === tid), [tenants, tid])
  const system = useMemo(
    () => systems.find((candidate) => candidate.id === (savedTenant?.hostedSystemId ?? savedTenant?.systemId)),
    [savedTenant, systems],
  )
  const [draft, setDraft] = useState<Tenant | null>(savedTenant ? cloneTenant(savedTenant) : null)
  const [activeTab, setActiveTab] = useState<TenantTab>('configuration')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [editingRemarkIds, setEditingRemarkIds] = useState<string[]>([])
  const [predecessorSelections, setPredecessorSelections] = useState<Record<string, { tenantId: string; warrantyId: string }>>({})
  const [activeMultiSelect, setActiveMultiSelect] = useState<ActiveMultiSelect | null>(null)
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ key: ConfigKey; value: string } | null>(null)
  const isDirty = Boolean(savedTenant && draft && !valuesEqual(savedTenant, draft))
  const navigationBlocker = useBlocker(isDirty)

  useEffect(() => {
    setDraft(savedTenant ? cloneTenant(savedTenant) : null)
  }, [savedTenant])

  useEffect(() => {
    if (!activeMultiSelect) return
    const activePickerId = activeMultiSelect.id

    function closeMultiSelectOnOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(`[data-multiselect-picker="${activePickerId}"]`) ||
        target?.closest(`[data-multiselect-trigger="${activePickerId}"]`)
      ) {
        return
      }
      setActiveMultiSelect(null)
    }

    document.addEventListener('mousedown', closeMultiSelectOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeMultiSelectOnOutsideClick)
  }, [activeMultiSelect])

  if (!savedTenant || !draft) {
    return (
      <PlaceholderCard
        title="Tenant not found"
        description={`No tenant with TID "${tid}" in mock store.`}
      />
    )
  }

  const persistedTenant = savedTenant
  const tenantDraft = draft
  const activeSystem = systems.find((candidate) => candidate.id === (tenantDraft.hostedSystemId ?? tenantDraft.systemId)) ?? system
  const project = resolveProject(tenantDraft, projects, projectTenants, systems)
  const opportunity = resolveOpportunity(project, opportunities)
  const linkedOpportunityId = opportunity?.opportunityId ?? projectOpportunityReference(project)
  const canManageWarranties = Boolean(project && linkedOpportunityId)
  const inheritedEngagementCircle = tenantDraft.engagementCircle?.length
    ? tenantDraft.engagementCircle
    : opportunity?.engagementCircles ?? []
  const formType = tenantFormType(tenantDraft)
  const configuration = configurationFromTenant(tenantDraft, activeSystem)
  const hosting = hostingFromSystem(tenantDraft, activeSystem)
  const countryOptions = Array.from(
    new Set(
      [
        ...accounts.map((account) => account.country),
        opportunity?.country,
        tenantDraft.country,
        activeSystem?.country,
      ].filter((value): value is string => Boolean(value)),
    ),
  ).sort((first, second) => first.localeCompare(second))
  const relatedProjects = projects.filter(
    (candidate) =>
      projectTenants.some((link) => link.tenantId === tenantDraft.id && link.projectId === candidate.id) ||
      candidate.pid === tenantDraft.deliveryPid ||
      Boolean(activeSystem?.linkedProjectIds?.includes(candidate.id)),
  )
  const allTenantWarrantyOptions = tenants.flatMap((tenant) =>
    (tenant.warranties ?? []).map((warranty) => ({ tenant, warranty })),
  )

  function computedWarranties(source: TenantWarranty[]): TenantWarranty[] {
    return source.map((warranty, index) => {
      const selectedProject = projects.find((candidate) => candidate.id === warranty.relatedProjectId)
      const selectedOpportunity = resolveOpportunity(selectedProject, opportunities)
      const successor = source
        .find((candidate) => candidate.predecessor.split(';').map((item) => item.trim()).includes(`${warranty.warrantyId}${tenantDraft.tid}`))
        ?.warrantyId ?? warranty.successor ?? ''
      const status = calculateWarrantyStatus(warranty, Boolean(successor))
      return {
        ...warranty,
        firstWarranty: index === 0,
        accountId: tenantDraft.accountId,
        warrantyType: warrantyTypeForProject(selectedProject),
        opportunityId: selectedOpportunity?.opportunityId ?? projectOpportunityReference(selectedProject),
        successor,
        durationDays: daysBetween(warranty.startDate, warranty.endDate),
        daysBeforeExpiration: daysBeforeExpiration(warranty.endDate),
        warrantyStatus: status,
        alerts: status === 'PENDING' ? 'Expiring soon' : '',
      }
    })
  }

  function validationOpportunity(): Opportunity {
    const now = new Date().toISOString()
    return opportunity ?? {
      id: `tenant-config-opportunity-${tenantDraft.id}`,
      opportunityId: linkedOpportunityId,
      opportunityName: project?.opportunityName ?? tenantDraft.tenantName ?? tenantDraft.tid,
      stage: 'OPEN',
      accountId: tenantDraft.accountId,
      salesManagerId: '',
      type: formType === 'POC' ? 'POC' : 'DELIVERY',
      subType: formType === 'POC' ? 'PAID' : 'NEW',
      deliveryDate: project?.deliveryDate ?? null,
      pocStartDate: tenantDraft.pocStartDate ?? null,
      pocEndDate: tenantDraft.pocEndDate ?? null,
      warrantyServiceMonths: null,
      region: activeSystem?.region ?? '',
      country: tenantDraft.country,
      state: activeSystem?.state ?? '',
      timeZone: '',
      timeGroup: tenantDraft.timeGroup,
      currentMilestone: '',
      projectAlerts: [],
      engagementCircles: [],
      newTenantRequirements: [],
      changeRequestRequirements: [],
      standardRenewalRequirements: [],
      pocProjectIds: [],
      finalProjectId: null,
      wonAt: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  function validateTenantConfiguration(): string[] {
    return validateRequirementA(
      buildRequirementAFromConfiguration(tenantDraft, configuration, activeSystem),
      validationOpportunity(),
      { accounts, systems, tenants },
    )
      .filter((message) => message.level === 'error')
      .map((message) => message.message.replace(/^Grid A row 1: /, 'Configuration: '))
  }

  function updateConfiguration(key: ConfigKey, value: string | string[] | number | null) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        configuration: {
          ...configurationFromTenant(current, activeSystem),
          [key]: value,
        },
      }
    })
    setMessages([])
  }

  function updateTenantType(nextType: TenantFormType) {
    setDraft((current) =>
      current
        ? {
            ...current,
            tenantType: nextType === 'POC' ? 'POC' : 'CUSTOMER',
            tenantFormType: nextType,
          }
        : current,
    )
    setMessages([])
  }

  function attachSystem(nextSystemId: string) {
    const nextSystem = systems.find((candidate) => candidate.id === nextSystemId)
    const nextProject = nextSystem?.linkedProjectIds?.[0]
      ? projects.find((candidate) => candidate.id === nextSystem.linkedProjectIds?.[0])
      : undefined
    const nextType = nextSystem ? tenantFormTypeForSystem(nextSystem) : tenantFormType(tenantDraft)
    setDraft((current) =>
      current
        ? {
            ...current,
            systemId: nextSystemId,
            hostedSystemId: nextSystemId,
            hostingSid: nextSystem?.sid ?? '',
            deliveryPid: nextProject?.pid ?? '',
            tenantType: nextType === 'POC' ? 'POC' : 'CUSTOMER',
            tenantFormType: nextType,
            productType: nextSystem?.productType ?? current.productType,
            hostedSystemHistory: nextSystemId
              ? [
                  ...(current.hostedSystemHistory ?? []),
                  { systemId: nextSystemId, startedAt: new Date().toISOString(), endedAt: null, reason: 'Moved' as const },
                ]
              : current.hostedSystemHistory ?? [],
          }
        : current,
    )
    setMessages([])
  }

  function saveTenant(stayOnPage: boolean, onSuccess?: () => void) {
    const nextMessages = validateTenantConfiguration()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      return
    }

    const normalizedDraft = {
      ...tenantDraft,
      warranties: computedWarranties(tenantDraft.warranties ?? []),
    }
    updateTenant(persistedTenant.id, tenantPatchFromDraft(normalizedDraft, persistedTenant, activeSystem))
    setMessages(['Tenant saved.'])
    setSaveMenuOpen(false)
    onSuccess?.()
    if (!stayOnPage) navigate('/tenants')
  }

  function revertTenant() {
    setDraft(cloneTenant(persistedTenant))
    setMessages([])
  }

  function cancelTenant() {
    setDraft(cloneTenant(persistedTenant))
    navigate('/tenants')
  }

  function updateRemark(id: string, key: RemarkKey, value: string | boolean | null) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        remarks: (current.remarks ?? []).map((remark) => (remark.id === id ? { ...remark, [key]: value } : remark)),
      }
    })
  }

  function saveRemark(id: string) {
    const remarks = tenantDraft.remarks ?? []
    updateTenant(persistedTenant.id, { remarks })
    setEditingRemarkIds((current) => current.filter((remarkId) => remarkId !== id))
    setMessages([`Remark ${remarks.find((remark) => remark.id === id)?.recordId ?? ''} saved.`])
  }

  function editRemark(id: string) {
    setEditingRemarkIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  function addRemark() {
    const now = formatLocalTimestamp()
    const remarkId = `tenant-remark-${crypto.randomUUID()}`
    setDraft((current) => {
      if (!current) return current
      const remarks = current.remarks ?? []
      const remark: TenantRemark = {
        id: remarkId,
        recordId: `R-${String(remarks.length + 1).padStart(3, '0')}`,
        timestamp: now,
        author: 'Current user',
        type: 'Note',
        content: '',
        dueDate: null,
        eventCreated: false,
      }
      return { ...current, remarks: [...remarks, remark] }
    })
    setEditingRemarkIds((current) => [...current, remarkId])
  }

  function deleteRemark(id: string) {
    const remarks = (tenantDraft.remarks ?? []).filter((remark) => remark.id !== id)
    setDraft((current) => (current ? { ...current, remarks } : current))
    updateTenant(persistedTenant.id, { remarks })
  }

  function updateWarranty(id: string, key: WarrantyKey, value: string | boolean | null) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        warranties: (current.warranties ?? []).map((warranty) => {
          if (warranty.id !== id) return warranty
          const next = { ...warranty, [key]: value }
          return {
            ...next,
            durationDays: daysBetween(next.startDate, next.endDate),
            daysBeforeExpiration: daysBeforeExpiration(next.endDate),
          }
        }),
      }
    })
  }

  function addWarranty() {
    if (!canManageWarranties) {
      setMessages(['Warranty can be managed only after the tenant is linked to a Project/Opportunity.'])
      return
    }

    setDraft((current) => {
      if (!current) return current
      const warranties = current.warranties ?? []
      const warranty: TenantWarranty = {
        id: `tenant-warranty-${crypto.randomUUID()}`,
        warrantyId: `W-${String(warranties.length + 1).padStart(3, '0')}`,
        firstWarranty: warranties.length === 0,
        predecessor: '',
        successor: '',
        accountId: current.accountId,
        relatedProjectId: project?.id ?? '',
        warrantyType: project?.mainType ?? '',
        opportunityId: linkedOpportunityId,
        startDate: null,
        endDate: null,
        durationDays: null,
        daysBeforeExpiration: null,
        warrantyStatus: 'NOT_SET',
        noWarranty: 'NO',
        outOfContract: 'NO',
        alerts: '',
        remark: '',
      }
      return { ...current, warranties: [...warranties, warranty] }
    })
  }

  function applyPredecessor(warrantyId: string) {
    const selection = predecessorSelections[warrantyId]
    if (!selection?.tenantId || !selection.warrantyId) return
    const selectedTenant = tenants.find((candidate) => candidate.id === selection.tenantId)
    if (!selectedTenant) return
    const predecessorValue = `${selection.warrantyId}${selectedTenant.tid}`
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        warranties: (current.warranties ?? []).map((warranty) => {
          if (warranty.id !== warrantyId) return warranty
          const currentValues = splitMultiValue(warranty.predecessor)
          return {
            ...warranty,
            predecessor: currentValues.includes(predecessorValue)
              ? warranty.predecessor
              : [...currentValues, predecessorValue].join(';'),
          }
        }),
      }
    })
  }

  function deleteWarranty(id: string) {
    setDraft((current) => (current ? { ...current, warranties: (current.warranties ?? []).filter((warranty) => warranty.id !== id) } : current))
  }

  function addDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const uploadedAt = new Date().toISOString()
    const documents: TenantDocument[] = files.map((file) => ({
      id: `tenant-document-${crypto.randomUUID()}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedAt,
      objectUrl: URL.createObjectURL(file),
    }))
    setDraft((current) => (current ? { ...current, documents: [...(current.documents ?? []), ...documents] } : current))
    event.target.value = ''
  }

  function deleteDocument(id: string) {
    setDraft((current) => (current ? { ...current, documents: (current.documents ?? []).filter((document) => document.id !== id) } : current))
  }

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isDirty}
          onClick={revertTenant}
        >
          Revert
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={cancelTenant}>
          Cancel
        </button>
        <div className="relative inline-flex">
          <button type="button" className="rounded-l border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white" onClick={() => saveTenant(false)}>
            Save
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-r border border-l-0 border-sf-brand bg-sf-brand px-2 py-1 text-sm text-white"
            aria-label="Save actions"
            onClick={() => setSaveMenuOpen((current) => !current)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {saveMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded border border-sf-border bg-white py-1 text-sm shadow-lg">
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-sf-surface-alt" onClick={() => saveTenant(true)}>
                Apply Changes
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  function renderHeaderField(label: string, value: ReactNode, width = 'w-44') {
    return (
      <FormField label={label} controlWidthClassName={width}>
        <div className="min-h-8 px-2 py-1 text-sm text-sf-text">{value || '-'}</div>
      </FormField>
    )
  }

  function renderTenantTypeField() {
    return (
      <FormField label="Tenant Type" controlWidthClassName="w-44">
        <select
          className="h-8 w-full rounded border border-sf-border bg-white px-2 py-1 text-sm"
          value={formType}
          onChange={(event) => updateTenantType(event.target.value as TenantFormType)}
        >
          <option value="POC">POC</option>
          <option value="CUSTOMER">Customer</option>
        </select>
      </FormField>
    )
  }

  function renderHostingSidField() {
    return (
      <FormField label="Hosting SID" controlWidthClassName="w-52">
        {tenantDraft.systemId ? (
          <div className="min-h-8 px-2 py-1 text-sm text-sf-text">{hosting.sid || '-'}</div>
        ) : (
          <select
            className="h-8 w-full rounded border border-sf-border bg-white px-2 py-1 text-sm"
            value={tenantDraft.systemId}
            onChange={(event) => attachSystem(event.target.value)}
          >
            <option value="">No system linked</option>
            {systems.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.sid ?? candidate.machineId ?? candidate.id} - {candidate.productType}
              </option>
            ))}
          </select>
        )}
      </FormField>
    )
  }

  function renderHeader() {
    const commonFields = [
      renderTenantTypeField(),
      renderHeaderField('Operational mode', tenantDraft.operationalStatus),
      formType === 'CUSTOMER' ? renderHeaderField('License Number', licenseNumber(hosting.sid, tenantDraft.deliveryPid ?? ''), 'w-56') : null,
      formType === 'CUSTOMER' ? renderHeaderField('Warranty status', tenantDraft.warrantyStatus) : null,
      renderHeaderField('Alert', formType === 'POC' && tenantDraft.pocEndDate ? 'POC period tracked' : ''),
    ].filter(Boolean)

    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-start gap-3">{commonFields}</div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Project Type', project?.mainType ?? '')}
          {renderHeaderField('Project Name', project?.opportunityName ?? '')}
          {renderHeaderField('Project ID', project ? <Link className="text-sf-brand hover:underline" to={`/projects/${project.pid}`}>{project.pid}</Link> : '')}
          {formType === 'POC'
            ? renderHeaderField('POC Start Date', tenantDraft.pocStartDate ?? opportunity?.pocStartDate ?? '')
            : renderHeaderField('Delivery Date', project?.deliveryDate ?? '')}
          {formType === 'POC' ? renderHeaderField('POC End Date', tenantDraft.pocEndDate ?? opportunity?.pocEndDate ?? '') : null}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Account / End User', tenantDraft.accountName || project?.accountName || '')}
          {renderHeaderField('Region', opportunity?.region ?? activeSystem?.region ?? '')}
          {renderHeaderField('Country', tenantDraft.country || opportunity?.country || activeSystem?.country || '')}
          {renderHeaderField('State', opportunity?.state ?? activeSystem?.state ?? '')}
          {renderHeaderField('Time Zone', opportunity?.timeZone ?? '')}
          {renderHeaderField('Time Group', tenantDraft.timeGroup || opportunity?.timeGroup || activeSystem?.timeGroup || '')}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHostingSidField()}
          {renderHeaderField('Hosting System Operational status', hosting.operationalStatus)}
          {renderHeaderField('Hosting System version', hosting.versionNumber)}
        </div>
      </section>
    )
  }

  function optionsWithCustom(key: ConfigKey, options: string[]): string[] {
    return [
      ...options.filter((option) => option !== 'Add new...'),
      ...(customPicklistOptions[key] ?? []),
      ...(options.includes('Add new...') ? ['Add new...'] : []),
    ]
  }

  function configurationOptions(field: TenantConfigurationColumn): string[] {
    if (field.key === 'mapCenter') return [...countryOptions, 'Add new...']
    if (field.key === 'crossSystemFeatures') return CROSS_SYSTEM_OPTIONS
    if (field.key === 'aiFeatures') return AI_OPTIONS
    if (field.key === 'additionalFeatures') return ADDITIONAL_FEATURE_OPTIONS
    if (field.inputType === 'picklist') return YES_NO_OPTIONS
    return []
  }

  function handleConfigurationPicklistChange(field: TenantConfigurationColumn, value: string) {
    if (value === 'Add new...') {
      setPendingAddNew({ key: field.configKey, value: '' })
      return
    }
    updateConfiguration(field.configKey, value)
  }

  function renderConfigurationAddNew(field: TenantConfigurationColumn) {
    if (pendingAddNew?.key !== field.configKey) return null

    return (
      <div className="mt-1 flex w-40 items-center gap-1">
        <input
          className="h-7 min-w-0 flex-1 rounded border border-sf-border px-2 py-1 text-sm"
          value={pendingAddNew.value}
          autoFocus
          onChange={(event) => setPendingAddNew({ key: field.configKey, value: event.target.value })}
        />
        <button
          type="button"
          className="rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white"
          onClick={() => {
            const nextValue = pendingAddNew.value.trim()
            if (!nextValue) return
            setCustomPicklistOptions((current) => addCustomPicklistOption(current, field.configKey, nextValue))
            updateConfiguration(field.configKey, nextValue)
            setPendingAddNew(null)
          }}
        >
          Add
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-2 py-1 text-xs" onClick={() => setPendingAddNew(null)}>
          Cancel
        </button>
      </div>
    )
  }

  function renderMultiSelect(field: TenantConfigurationColumn, selected: string[]) {
    const pickerId = `tenant-config:${field.configKey}`
    const isOpen = activeMultiSelect?.id === pickerId
    const selectedText = selected.length > 0 ? selected.join('; ') : 'Select'
    const triggerWidth = `${Math.min(48, Math.max(16, selectedText.length + 3))}ch`
    const options = configurationOptions(field)

    function toggleOption(option: string) {
      const nextSelected = selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]
      updateConfiguration(field.configKey, nextSelected)
    }

    return (
      <>
        <button
          type="button"
          data-multiselect-trigger={pickerId}
          className="h-7 min-w-56 max-w-[42rem] whitespace-nowrap rounded border border-sf-border bg-white px-2 py-1 text-left text-sm"
          style={{ width: triggerWidth }}
          title={selected.join('; ')}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActiveMultiSelect((current) =>
              current?.id === pickerId
                ? null
                : {
                    id: pickerId,
                    key: field.configKey,
                    selected,
                    left: rect.left,
                    top: rect.bottom + 4,
                    width: Math.max(rect.width, 256),
                  },
            )
          }}
        >
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{selectedText}</span>
        </button>
        {isOpen
          ? createPortal(
              <div
                data-multiselect-picker={pickerId}
                className="fixed z-50 max-h-56 overflow-y-auto rounded border border-sf-border bg-white p-1 shadow-lg"
                style={{ left: activeMultiSelect.left, top: activeMultiSelect.top, width: activeMultiSelect.width }}
              >
                {options.map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-sf-surface-alt">
                    <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>,
              document.body,
            )
          : null}
      </>
    )
  }

  function renderConfigurationCell(field: TenantConfigurationColumn) {
    const value = configurationValue(configuration, field)
    const isProduct = field.configKey === 'product'

    if (isProduct) {
      return <div className="min-h-7 px-1 py-1 text-sm text-sf-text">{textValue(value) || '-'}</div>
    }

    if (field.inputType === 'picklist') {
      const options = configurationOptions(field)
      return (
        <>
          <select
            className="h-7 w-40 rounded border border-sf-border bg-white px-2 py-1 text-sm"
            value={textValue(value)}
            onChange={(event) => handleConfigurationPicklistChange(field, event.target.value)}
          >
            {optionsWithCustom(field.configKey, options).map((option) => (
              <option key={option} value={option}>{option || 'Not set'}</option>
            ))}
          </select>
          {renderConfigurationAddNew(field)}
        </>
      )
    }

    if (field.inputType === 'multiselect') {
      return renderMultiSelect(field, Array.isArray(value) ? value : splitMultiValue(textValue(value)))
    }

    if (field.inputType === 'integer') {
      return (
        <input
          className="h-7 w-24 rounded border border-sf-border px-2 py-1 text-sm"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digitString(value)}
          onKeyDown={preventNonDigitKey}
          onPaste={(event) => {
            event.preventDefault()
            updateConfiguration(field.configKey, parseDigitValue(event.clipboardData.getData('text').replace(/\D/g, '')))
          }}
          onChange={(event) => updateConfiguration(field.configKey, parseDigitValue(event.target.value.replace(/\D/g, '')))}
        />
      )
    }

    return (
      <input
        className="h-7 w-36 rounded border border-sf-border px-2 py-1 text-sm"
        value={textValue(value)}
        onChange={(event) => updateConfiguration(field.configKey, event.target.value)}
      />
    )
  }

  function renderConfigurationTab() {
    return (
      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {CONFIGURATION_FIELDS.map((field) => (
                <th key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                  <span>{field.label}</span>
                  <span className="block text-xs font-normal text-sf-text-muted">{field.group}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {CONFIGURATION_FIELDS.map((field) => {
                return (
                  <td key={field.key} className="border border-sf-border px-1.5 py-1 align-top">
                    {renderConfigurationCell(field)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  function renderHostingTab() {
    return (
      <ReadonlyTable
        headers={HOSTING_FIELDS.map((field) => field.label)}
        rows={[HOSTING_FIELDS.map((field) => textValue(hosting[field.key]))]}
        emptyText="No hosting system is linked to this tenant."
      />
    )
  }

  function renderEngagementTab() {
    return (
      <ReadonlyTable
        headers={['Circle subject / purpose', 'Role', 'User name', 'Email', 'Phone']}
        rows={inheritedEngagementCircle.map((circle: EngagementCircleContact) => [
          circle.subject,
          circle.role,
          circle.userName,
          circle.email,
          circle.phone ?? '',
        ])}
        emptyText="No engagement circle records inherited from the linked Opportunity."
      />
    )
  }

  function renderDocumentsTab() {
    const documents = tenantDraft.documents ?? []
    return (
      <div className="space-y-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Upload
          <input className="sr-only" type="file" multiple onChange={addDocuments} />
        </label>
        <ReadonlyTable
          headers={['File', 'Type', 'Size', 'Uploaded At', 'Action']}
          rows={documents.map((document) => [
            <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" aria-hidden="true" />{document.fileName}</span>,
            document.fileType,
            `${Math.round(document.fileSize / 1024)} KB`,
            document.uploadedAt,
            <span className="inline-flex gap-2">
              {document.objectUrl ? <a className="text-sf-brand hover:underline" href={document.objectUrl} target="_blank" rel="noreferrer">Open</a> : null}
              <button type="button" className="text-red-700 hover:underline" onClick={() => deleteDocument(document.id)}>Delete</button>
            </span>,
          ])}
          emptyText="No documents uploaded for this tenant."
        />
      </div>
    )
  }

  function renderActiveTab() {
    if (activeTab === 'configuration') return renderConfigurationTab()
    if (activeTab === 'hosting') return renderHostingTab()
    if (activeTab === 'engagement') return renderEngagementTab()
    if (activeTab === 'documents') return renderDocumentsTab()
    return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">Usage will be defined in a later phase.</div>
  }

  function renderRemarks() {
    const remarks = tenantDraft.remarks ?? []
    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-sf-text">Remarks</h2>
            <p className="text-sm text-sf-text-muted">Editable tenant remarks. Outlook event creation is not implemented in this phase.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addRemark}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add remark
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {['Record ID', 'Timestamp', 'User / author', 'Type', 'Remark content', 'Due date', 'Event created', 'Action'].map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {remarks.map((remark) => {
                const isEditing = editingRemarkIds.includes(remark.id)
                return (
                    <tr key={remark.id}>
                      <td className="border border-sf-border px-1.5 py-1">{remark.recordId}</td>
                      <td className="border border-sf-border px-1.5 py-1">{remark.timestamp}</td>
                      <td className="border border-sf-border px-1.5 py-1">{remark.author}</td>
                      <td className="border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <select className="h-8 rounded border border-sf-border px-2 py-1" value={remark.type} onChange={(event) => updateRemark(remark.id, 'type', event.target.value)}>
                            {REMARK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        ) : remark.type}
                      </td>
                      <td className="min-w-96 border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <textarea className="min-h-20 w-full rounded border border-sf-border px-2 py-1" value={remark.content} onChange={(event) => updateRemark(remark.id, 'content', event.target.value)} />
                        ) : remark.content}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <input className="h-8 rounded border border-sf-border px-2 py-1" type="date" value={remark.dueDate ?? ''} onChange={(event) => updateRemark(remark.id, 'dueDate', event.target.value || null)} />
                        ) : remark.dueDate ?? ''}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-center">
                        {isEditing ? (
                          <input type="checkbox" checked={remark.eventCreated} onChange={(event) => updateRemark(remark.id, 'eventCreated', event.target.checked)} />
                        ) : remark.eventCreated ? 'Yes' : 'No'}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <button type="button" className="text-sf-brand hover:underline" onClick={() => saveRemark(remark.id)}>
                              Save
                            </button>
                          ) : (
                            <button type="button" className="text-sf-brand hover:underline" onClick={() => editRemark(remark.id)}>
                              Edit
                            </button>
                          )}
                          <button type="button" className="inline-flex items-center gap-1 text-red-700 hover:underline" onClick={() => deleteRemark(remark.id)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                )
              })}
              {remarks.length === 0 ? (
                <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={8}>No remarks yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function renderConfigurationHistory() {
    const records = tenantDraft.configurationHistory ?? []
    return (
      <section className="sf-card space-y-3 p-3">
        <h2 className="text-lg font-semibold text-sf-text">Configuration History</h2>
        <ReadonlyTable
          headers={['Record ID', 'Timestamp', 'Recorded By', ...CONFIGURATION_FIELDS.map((field) => field.label)]}
          rows={records.map((record: TenantConfigurationHistoryRecord) => [
            record.recordId,
            record.timestamp,
            record.recordedBy,
            ...CONFIGURATION_FIELDS.map((field) => textValue(configurationValue(record.configuration, field))),
          ])}
          emptyText="No configuration changes have been recorded for this POC tenant."
        />
      </section>
    )
  }

  function renderWarranties() {
    const warranties = computedWarranties(tenantDraft.warranties ?? [])
    if (!canManageWarranties) {
      return (
        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranties</h2>
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Warranty can be managed only after the tenant is linked to a Project/Opportunity.
          </div>
          <ReadonlyTable
            headers={['Warranty ID', 'Warranty Type', 'First', 'Predecessor', 'Successor', 'Account ID / End User ID', 'Related Project ID', 'Opportunity ID', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'Warranty Status', 'Alerts', 'Remark']}
            rows={warranties.map((warranty) => [
              warranty.warrantyId,
              warranty.warrantyType,
              warranty.firstWarranty ? 'Yes' : 'No',
              warranty.predecessor,
              warranty.successor,
              warranty.accountId,
              warranty.relatedProjectId,
              warranty.opportunityId,
              warranty.startDate ?? '',
              warranty.endDate ?? '',
              warranty.durationDays ?? '',
              warranty.daysBeforeExpiration ?? '',
              displayWarrantyStatus(warranty.warrantyStatus),
              warranty.alerts,
              warranty.remark,
            ])}
            emptyText="No warranty records are available for this tenant."
          />
        </section>
      )
    }

    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-sf-text">Warranties</h2>
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addWarranty}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add warranty
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {['Warranty ID', 'Warranty Type', 'First', 'Predecessor', 'Successor', 'Account ID / End User ID', 'Related Project ID', 'Opportunity ID', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'No Warranty', 'Out of Contract', 'Warranty Status', 'Alerts', 'Remark', 'Action'].map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {warranties.map((warranty) => (
                <tr key={warranty.id}>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyId}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyType}</td>
                  <td className="border border-sf-border px-1.5 py-1 text-center">{warranty.firstWarranty ? 'Yes' : 'No'}</td>
                  <td className="min-w-[24rem] border border-sf-border px-1.5 py-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <select
                        className="h-8 rounded border border-sf-border px-2 py-1"
                        value={predecessorSelections[warranty.id]?.tenantId ?? tenantDraft.id}
                        onChange={(event) =>
                          setPredecessorSelections((current) => ({
                            ...current,
                            [warranty.id]: { tenantId: event.target.value, warrantyId: '' },
                          }))
                        }
                      >
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>{tenant.tid}</option>
                        ))}
                      </select>
                      <select
                        className="h-8 rounded border border-sf-border px-2 py-1"
                        value={predecessorSelections[warranty.id]?.warrantyId ?? ''}
                        onChange={(event) =>
                          setPredecessorSelections((current) => ({
                            ...current,
                            [warranty.id]: {
                              tenantId: current[warranty.id]?.tenantId ?? tenantDraft.id,
                              warrantyId: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">Warranty ID</option>
                        {allTenantWarrantyOptions
                          .filter(({ tenant }) => tenant.id === (predecessorSelections[warranty.id]?.tenantId ?? tenantDraft.id))
                          .map(({ tenant, warranty: option }) => (
                            <option key={`${tenant.id}-${option.warrantyId}`} value={option.warrantyId}>
                              {option.warrantyId}
                            </option>
                          ))}
                      </select>
                      <button type="button" className="rounded border border-sf-border bg-white px-2 py-1 text-xs" onClick={() => applyPredecessor(warranty.id)}>
                        Add
                      </button>
                    </div>
                    <input className="mt-1 h-8 w-full rounded border border-sf-border px-2 py-1" value={warranty.predecessor} onChange={(event) => updateWarranty(warranty.id, 'predecessor', event.target.value)} />
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.successor}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.accountId}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <select className="h-8 w-56 rounded border border-sf-border px-2 py-1" value={warranty.relatedProjectId} onChange={(event) => updateWarranty(warranty.id, 'relatedProjectId', event.target.value)}>
                      <option value="">Select project</option>
                      {relatedProjects.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.opportunityName} - {candidate.pid}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.opportunityId}</td>
                  <td className="border border-sf-border px-1.5 py-1"><input className="h-8 rounded border border-sf-border px-2 py-1" type="date" value={warranty.startDate ?? ''} onChange={(event) => updateWarranty(warranty.id, 'startDate', event.target.value || null)} /></td>
                  <td className="border border-sf-border px-1.5 py-1"><input className="h-8 rounded border border-sf-border px-2 py-1" type="date" value={warranty.endDate ?? ''} onChange={(event) => updateWarranty(warranty.id, 'endDate', event.target.value || null)} /></td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.durationDays ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.daysBeforeExpiration ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <select className="h-8 rounded border border-sf-border px-2 py-1" value={warranty.noWarranty === 'YES' ? 'YES' : 'NO'} onChange={(event) => updateWarranty(warranty.id, 'noWarranty', event.target.value as YesNo)}>
                      {YES_NO_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <select className="h-8 rounded border border-sf-border px-2 py-1" value={warranty.outOfContract === 'YES' ? 'YES' : 'NO'} onChange={(event) => updateWarranty(warranty.id, 'outOfContract', event.target.value as YesNo)}>
                      {YES_NO_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{displayWarrantyStatus(warranty.warrantyStatus)}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.alerts}</td>
                  <td className="border border-sf-border px-1.5 py-1"><input className="h-8 w-48 rounded border border-sf-border px-2 py-1" value={warranty.remark} onChange={(event) => updateWarranty(warranty.id, 'remark', event.target.value)} /></td>
                  <td className="border border-sf-border px-1.5 py-1"><button type="button" className="text-red-700 hover:underline" onClick={() => deleteWarranty(warranty.id)}>Delete</button></td>
                </tr>
              ))}
              {warranties.length === 0 ? (
                <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={18}>No warranty records yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {navigationBlocker.state === 'blocked' ? (
        <UnsavedChangesDialog
          onSave={() => saveTenant(true, () => navigationBlocker.proceed?.())}
          onDiscardChanges={() => navigationBlocker.proceed?.()}
          onCancel={() => navigationBlocker.reset?.()}
        />
      ) : null}
      <PageHeader
        title={`Tenant ${tenantDraft.tid}`}
        subtitle={`${formType === 'POC' ? 'Tenant form-POC' : 'Tenant form-Customer'} foundation`}
        actions={renderActionButtons()}
      />
      {messages.length > 0 ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {messages.map((message) => <div key={message}>{message}</div>)}
        </div>
      ) : null}
      {renderHeader()}
      <section className="rounded border border-sf-border bg-sf-surface">
        <div className="flex flex-wrap border-b border-sf-border">
          {TENANT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-base font-semibold',
                activeTab === tab.id
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-80 p-3" role="tabpanel" aria-label={TENANT_TABS.find((tab) => tab.id === activeTab)?.label}>
          {renderActiveTab()}
        </div>
      </section>
      {renderRemarks()}
      {formType === 'POC' ? renderConfigurationHistory() : renderWarranties()}
    </div>
  )
}
