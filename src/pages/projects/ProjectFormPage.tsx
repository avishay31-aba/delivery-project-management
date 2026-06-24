import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, CirclePlay, GripVertical, Link2, Plus, Square, Trash2, X } from 'lucide-react'
import { ActivityTimeline } from '@/components/activity'
import {
  getProjectFormMetadata,
  projectTabLabel,
  type ProjectFormTab,
  type ProjectHeaderFieldMetadata,
  type ProjectRequirementSectionMetadata,
} from '@/config/project-form-metadata'
import type {
  Opportunity,
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ReusedInternalSystem,
  System,
  Tenant,
} from '@/data/seed.types'
import { PageHeader } from '@/components/record'
import { AlertStatusIcon, FormField, LinkId, PlaceholderCard, ProgressBar, RecordChangeBadge, StatusBadge } from '@/components/ui'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { useAppStore } from '@/store/useAppStore'
import { activityEventsForProject } from '@/domain/activity-log'
import {
  allocationModeLabel,
  allowedAllocationModes,
  availableExistingSystemCandidates,
  availableProductionCandidates,
  availableReusedInternalCandidates,
  type AllocationActionResult,
  type AllocationMode,
} from '@/domain/allocation-context'
import { systemRoutePath, systemSourceLabel } from '@/domain/system-inventory'
import {
  linkedOpportunityForProject,
  projectTypeForOpportunity,
} from '@/domain/opportunity-lifecycle'
import {
  activeSystemLinkMapBySystemId,
  activeSystemLinksForProject,
  cloneProjectDraft,
  completeProjectRequirementSections,
  isProjectHeaderFieldChanged,
  linkedSystemsForProject,
  linkedTenantsForProject,
  projectRequirementReadonlyCellValue,
  projectRequirementRows,
  projectRequirementTitle,
  projectHeaderFieldValue,
  projectHealthReadModel,
  projectWorkspaceSystemSummary,
  projectWorkspaceTenantSummary,
  type ProjectHealthStatus,
  projectPatchFromOpportunitySelection,
  projectSavePatch,
  projectStatusLabel,
  validateProjectSave,
} from '@/domain/project-lifecycle'
import {
  APPLICATION_CONFIGURATION_FIELDS,
  type ApplicationConfigurationFieldMetadata,
} from '@/domain/application-configuration'
import {
  hostingContextFromSource,
  type HostingContext,
} from '@/domain/hosting-context'
import { tenantWarrantyHeaderStatusReadModel } from '@/domain/warranty-collection'
import {
  PROJECT_MILESTONE_TASK_TEMPLATES,
  buildProjectMilestonesAndTasks,
  milestoneDeadlineAlertLabel,
  milestoneDeadlineAlertStatus,
  orderedProjectMilestones,
  orderedProjectTasks,
  projectMilestoneStatus,
  projectMilestoneTaskProgress,
  resolveProjectMilestoneTemplate,
  updateMilestoneOrderInPlan,
  updateTaskOrderInPlan,
  updateTaskInPlan,
} from '@/domain/milestone-plan'
import {
  requirementCoverageRows,
  requirementCoverageSummary,
} from '@/domain/requirement-coverage'

type CollapsibleSectionId = 'projectHeader' | 'requirements' | 'milestones' | 'tasks' | 'systems' | 'tenants' | 'documents' | 'activity'
type AllocationCandidate = ProductionSystemInventoryItem | ReusedInternalSystem | System
type AllocationCandidateSortKey = 'id' | 'mid' | 'source' | 'status' | 'product' | 'cloudPlatform' | 'csp' | 'region'
type NewMilestoneTaskDraft = Pick<NonNullable<Project['tasks']>[number], 'name' | 'department' | 'resource' | 'status' | 'deadline' | 'comment'>

const ALLOCATION_CANDIDATE_SORT_OPTIONS: Array<{ key: AllocationCandidateSortKey; label: string }> = [
  { key: 'id', label: 'ID' },
  { key: 'mid', label: 'MID' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'product', label: 'Product' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'region', label: 'Region' },
]

const LINKED_SYSTEM_HOSTING_FIELDS: Array<{ key: keyof HostingContext; label: string }> = [
  { key: 'hostingType', label: 'Hosting Type' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'cloudRegion', label: 'Region' },
  { key: 'url', label: 'URL' },
  { key: 'performanceTier', label: 'Performance Tier' },
  { key: 'vpnEnabled', label: 'VPN' },
  { key: 'vpnType', label: 'VPN Type' },
  { key: 'ipRestrictionEnabled', label: 'IP Restriction' },
]

const DEFAULT_COLLAPSED_SECTIONS: Record<CollapsibleSectionId, boolean> = {
  projectHeader: false,
  requirements: false,
  milestones: false,
  tasks: false,
  systems: false,
  tenants: false,
  documents: false,
  activity: false,
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function inputClassName(isChanged: boolean, extra = ''): string {
  return [
    'rounded border border-sf-border px-2 py-1 leading-tight',
    isChanged ? 'bg-yellow-100' : 'bg-white',
    extra,
  ].join(' ')
}

function fieldClassName(isChanged: boolean, isMissing: boolean, extra = ''): string {
  return [
    inputClassName(isChanged, extra),
    isMissing ? 'border-red-500 ring-1 ring-red-500' : '',
  ].join(' ')
}

function candidatePrimaryId(candidate: AllocationCandidate): string {
  if ('sid' in candidate && candidate.sid) return candidate.sid
  if ('machineId' in candidate && candidate.machineId) return candidate.machineId
  return candidate.id
}

function candidateMachineId(candidate: AllocationCandidate): string {
  return 'machineId' in candidate ? candidate.machineId ?? '' : ''
}

function candidateSource(candidate: AllocationCandidate): string {
  return 'source' in candidate ? candidate.source ?? '' : ''
}

function candidateStatus(candidate: AllocationCandidate): string {
  return 'status' in candidate ? candidate.status : candidate.operationalStatus
}

function candidateRegion(candidate: AllocationCandidate): string {
  return candidate.cloudRegion ?? ''
}

function candidateSortValue(candidate: AllocationCandidate, sortKey: AllocationCandidateSortKey): string {
  const values: Record<AllocationCandidateSortKey, string> = {
    id: candidatePrimaryId(candidate),
    mid: candidateMachineId(candidate),
    source: candidateSource(candidate),
    status: candidateStatus(candidate),
    product: candidate.productType,
    cloudPlatform: candidate.cloudPlatform ?? '',
    csp: candidate.csp ?? '',
    region: candidateRegion(candidate),
  }
  return values[sortKey]
}

function candidateSearchText(candidate: AllocationCandidate): string {
  return ALLOCATION_CANDIDATE_SORT_OPTIONS
    .map((option) => candidateSortValue(candidate, option.key))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function allocationStatusClassName(result: AllocationActionResult | null): string {
  if (!result) return ''
  return result.ok
    ? 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
    : 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
}

function formatReadOnlyDetailValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ') || '-'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function systemApplicationConfigurationValue(system: System, field: ApplicationConfigurationFieldMetadata): unknown {
  if (field.configKey === 'product') return system.productType
  return (system as unknown as Record<string, unknown>)[field.configKey]
}

function detailGroups<T extends { group: string }>(fields: T[]): Array<{ group: string; fields: T[] }> {
  return fields.reduce<Array<{ group: string; fields: T[] }>>((groups, field) => {
    const existingGroup = groups.find((group) => group.group === field.group)
    if (existingGroup) {
      existingGroup.fields.push(field)
      return groups
    }
    return [...groups, { group: field.group, fields: [field] }]
  }, [])
}

function ProjectStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const isDone = status === 'DONE'
  const isInProgress = status === 'IN_PROGRESS'
  if (large) {
    if (isDone) return <Check className="h-8 w-8 stroke-[3.5] text-blue-800" aria-label={`Project status: ${projectStatusLabel(status)}`} />
    if (isInProgress) return <CirclePlay className="h-8 w-8 text-amber-500" aria-label={`Project status: ${projectStatusLabel(status)}`} />
    return <Square className="h-5 w-7 fill-emerald-100 stroke-0 text-emerald-100" aria-label={`Project status: ${projectStatusLabel(status)}`} />
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sf-text">
      {isDone ? (
        <Check className="h-4 w-4 stroke-[3] text-blue-800" aria-hidden="true" />
      ) : isInProgress ? (
        <CirclePlay className="h-4 w-4 text-amber-500" aria-hidden="true" />
      ) : (
        <Square className="h-3 w-4 fill-emerald-100 stroke-0 text-emerald-100" aria-hidden="true" />
      )}
      <span>{projectStatusLabel(status)}</span>
    </span>
  )
}

function TaskStatusIcon({ status }: { status: 'OPEN' | 'DONE' }) {
  if (status === 'DONE') {
    return <Check className="h-8 w-8 stroke-[3.5] text-blue-800" aria-label="Task status: Done" />
  }

  return <Square className="h-5 w-7 fill-emerald-100 stroke-0 text-emerald-100" aria-label="Task status: Open" />
}

function projectHealthBadgeVariant(status: ProjectHealthStatus) {
  if (status === 'COMPLETED') return 'done'
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'error'
  if (status === 'WARNING') return 'warning'
  return 'default'
}

function projectHealthAlertVariant(status: ProjectHealthStatus) {
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'danger'
  if (status === 'WARNING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  return 'info'
}

function CollapsibleSection({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
  className = 'sf-card space-y-3 p-3',
}: {
  title: string
  subtitle?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}) {
  const Indicator = collapsed ? ChevronRight : ChevronDown

  return (
    <section className={className}>
      <button type="button" className="flex min-w-0 items-start gap-2 text-left" onClick={onToggle} aria-expanded={!collapsed}>
        <Indicator className="mt-0.5 h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
        <span>
          <span className="block text-lg font-semibold text-sf-text">{title}</span>
          {subtitle ? <span className="block text-sm text-sf-text-muted">{subtitle}</span> : null}
        </span>
      </button>
      {collapsed ? null : children}
    </section>
  )
}

function RequirementSection({
  section,
  opportunity,
  tenants,
  systems,
}: {
  section: ProjectRequirementSectionMetadata
  opportunity: Opportunity | undefined
  tenants: Tenant[]
  systems: System[]
}) {
  const rows = projectRequirementRows(opportunity, section.kind)

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-lg font-semibold text-sf-text">{projectRequirementTitle(section)}</h3>
        {section.description ? <p className="text-sm text-sf-text-muted">{section.description}</p> : null}
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {section.columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                    <span>
                      {column.label}
                      {column.required ? <span className="ml-0.5 text-red-600">*</span> : null}
                      {column.requiredWhen && column.key !== 'existingSystemId' ? <span className="ml-0.5 text-red-600">*</span> : null}
                    </span>
                    {column.key !== 'existingSystemId' ? <span className="block text-xs font-normal text-sf-text-muted">{column.group}</span> : null}
                    {column.requiredWhen && column.key !== 'existingSystemId' ? (
                      <span className="block max-w-40 whitespace-normal text-xs font-normal leading-tight text-red-700">
                        {column.requiredWhen}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-sf-surface-alt">
                  {section.columns.map((column) => (
                    <td key={column.key} className="border border-sf-border px-1.5 py-px align-top text-sm text-sf-text">
                      {projectRequirementReadonlyCellValue(row, column, section.kind, tenants, systems)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
          No {section.title.toLowerCase()} received from the linked Opportunity.
        </div>
      )}
    </div>
  )
}

function tabSectionId(tab: ProjectFormTab): CollapsibleSectionId {
  const ids: Record<ProjectFormTab, CollapsibleSectionId> = {
    overview: 'projectHeader',
    requirements: 'requirements',
    systems: 'systems',
    tenants: 'tenants',
    milestones: 'milestones',
    tasks: 'tasks',
    documents: 'documents',
    activity: 'activity',
  }
  return ids[tab]
}

export function ProjectFormPage() {
  const { pid } = useParams<{ pid: string }>()
  const navigate = useNavigate()
  const projects = useAppStore((state) => state.projects)
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const tenants = useAppStore((state) => state.tenants)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const updateProject = useAppStore((state) => state.updateProject)
  const allocateProductionSystemToProject = useAppStore((state) => state.allocateProductionSystemToProject)
  const allocateReusedInternalSystemToProject = useAppStore((state) => state.allocateReusedInternalSystemToProject)
  const linkExistingSystemToProject = useAppStore((state) => state.linkExistingSystemToProject)
  const deallocateProjectSystem = useAppStore((state) => state.deallocateProjectSystem)
  const savedProject = useMemo(() => projects.find((project) => project.pid === pid), [pid, projects])
  const [draft, setDraft] = useState<Project | null>(savedProject ? cloneProjectDraft(savedProject) : null)
  const [activeTab, setActiveTab] = useState<ProjectFormTab>('overview')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [saveMessages, setSaveMessages] = useState<string[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [isAddMilestoneDialogOpen, setIsAddMilestoneDialogOpen] = useState(false)
  const [newMilestoneName, setNewMilestoneName] = useState('')
  const [newMilestoneOrder, setNewMilestoneOrder] = useState(1)
  const [newMilestoneDeadline, setNewMilestoneDeadline] = useState('')
  const [newMilestoneComment, setNewMilestoneComment] = useState('')
  const [newMilestoneTasks, setNewMilestoneTasks] = useState<NewMilestoneTaskDraft[]>([])
  const [draggedMilestoneId, setDraggedMilestoneId] = useState<string | null>(null)
  const [dragOverMilestoneId, setDragOverMilestoneId] = useState<string | null>(null)
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('PRODUCTION')
  const [selectedAllocationId, setSelectedAllocationId] = useState('')
  const [allocationCandidateSearch, setAllocationCandidateSearch] = useState('')
  const [allocationCandidateSortKey, setAllocationCandidateSortKey] = useState<AllocationCandidateSortKey>('id')
  const [allocationCandidateSortDirection, setAllocationCandidateSortDirection] = useState<'asc' | 'desc'>('asc')
  const [allocationResult, setAllocationResult] = useState<AllocationActionResult | null>(null)
  const [expandedLinkedSystemIds, setExpandedLinkedSystemIds] = useState<string[]>([])
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)

  useEffect(() => {
    setDraft(savedProject ? cloneProjectDraft(savedProject) : null)
  }, [savedProject])

  const currentDraft = draft ?? savedProject
  const metadata = currentDraft ? getProjectFormMetadata(currentDraft.mainType, currentDraft.subType) : null
  const linkedOpportunity = useMemo(() => {
    if (!currentDraft) return undefined
    return linkedOpportunityForProject(currentDraft, opportunities)
  }, [currentDraft, opportunities])
  const account = linkedOpportunity ? accounts.find((candidate) => candidate.id === linkedOpportunity.accountId) : undefined
  const salesManager = linkedOpportunity ? salesManagers.find((candidate) => candidate.id === linkedOpportunity.salesManagerId) : undefined
  const activeSystemLinks = useMemo(() => {
    if (!currentDraft) return []
    return activeSystemLinksForProject(currentDraft.id, projectSystems)
  }, [currentDraft, projectSystems])
  const linkedSystems = useMemo(() => {
    return linkedSystemsForProject(currentDraft, systems, activeSystemLinks)
  }, [activeSystemLinks, currentDraft, systems])
  const linkedTenants = useMemo(() => {
    return linkedTenantsForProject(currentDraft, linkedSystems, projectTenants, tenants)
  }, [currentDraft, linkedSystems, projectTenants, tenants])
  const projectHealth = useMemo(() => {
    if (!currentDraft) return null
    return projectHealthReadModel({
      project: currentDraft,
      systems,
      tenants,
      projectSystems,
      projectTenants,
    })
  }, [currentDraft, projectSystems, projectTenants, systems, tenants])
  const workspaceSystemSummary = useMemo(() => {
    if (!currentDraft) return null
    return projectWorkspaceSystemSummary({
      project: currentDraft,
      systems,
      tenants,
      projectSystems,
      projectTenants,
    })
  }, [currentDraft, projectSystems, projectTenants, systems, tenants])
  const workspaceTenantSummary = useMemo(() => {
    if (!currentDraft) return null
    return projectWorkspaceTenantSummary({
      project: currentDraft,
      systems,
      tenants,
      projectSystems,
      projectTenants,
    })
  }, [currentDraft, projectSystems, projectTenants, systems, tenants])
  const projectRequirementCoverageRows = useMemo(() => {
    if (!currentDraft) return []
    return requirementCoverageRows({
      accounts,
      opportunities,
      projects,
      systems,
      tenants,
      warrantyRecords,
      projectSystems,
      projectTenants,
    }).filter((row) => row.projectId === currentDraft.id || row.pid === currentDraft.pid)
  }, [accounts, currentDraft, opportunities, projectSystems, projectTenants, projects, systems, tenants, warrantyRecords])
  const projectRequirementCoverageSummary = useMemo(
    () => requirementCoverageSummary(projectRequirementCoverageRows),
    [projectRequirementCoverageRows],
  )
  const projectActivityEvents = useMemo(
    () => currentDraft ? activityEventsForProject(activityEvents, currentDraft.id) : [],
    [activityEvents, currentDraft],
  )
  const isDirty = Boolean(savedProject && currentDraft && !valuesEqual(savedProject, currentDraft))
  const missingFields = new Set<string>()

  if (currentDraft && !currentDraft.opportunityName.trim()) {
    missingFields.add('opportunityName')
  }

  useEffect(() => {
    setDraft((current) => {
      if (!current) return current
      const resolution = resolveProjectMilestoneTemplate(current, linkedOpportunity)
      if (current.milestoneTemplateId === resolution.templateId && current.milestones?.length && current.tasks?.length) {
        return current
      }
      const templateData = buildProjectMilestonesAndTasks(resolution.templateId)
      return {
        ...current,
        milestoneTemplateId: resolution.templateId,
        milestones: templateData.milestones,
        tasks: templateData.tasks,
      }
    })
  }, [
    linkedOpportunity,
    currentDraft?.id,
    currentDraft?.mainType,
    currentDraft?.subType,
    currentDraft?.opportunityId,
  ])

  if (!currentDraft || !metadata || !savedProject) {
    return (
      <PlaceholderCard
        title="Project not found"
        description={`No project with PID "${pid}" in mock store.`}
      />
    )
  }

  const projectDraft = currentDraft
  const persistedProject = savedProject
  const formMetadata = metadata
  const visibleTabs = formMetadata.tabs
  const permittedAllocationModes = allowedAllocationModes(projectDraft)
  const selectedMode = permittedAllocationModes.includes(allocationMode) ? allocationMode : permittedAllocationModes[0]
  const activeSystemLinkBySystemId = activeSystemLinkMapBySystemId(activeSystemLinks)
  const availableAllocationCandidates: AllocationCandidate[] =
    selectedMode === 'PRODUCTION'
      ? availableProductionCandidates(productionSystemInventory)
      : selectedMode === 'REUSED_INTERNAL'
        ? availableReusedInternalCandidates(reusedInternalSystems)
        : availableExistingSystemCandidates(projectDraft.id, systems, projectSystems)
  const trimmedAllocationCandidateSearch = allocationCandidateSearch.trim().toLowerCase()
  const visibleAllocationCandidates = [...availableAllocationCandidates]
    .filter((candidate) =>
      trimmedAllocationCandidateSearch ? candidateSearchText(candidate).includes(trimmedAllocationCandidateSearch) : true,
    )
    .sort((firstCandidate, secondCandidate) => {
      const direction = allocationCandidateSortDirection === 'asc' ? 1 : -1
      return candidateSortValue(firstCandidate, allocationCandidateSortKey).localeCompare(
        candidateSortValue(secondCandidate, allocationCandidateSortKey),
      ) * direction
    })

  function toggleSection(sectionId: CollapsibleSectionId) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  function toggleLinkedSystemDetails(systemId: string) {
    setExpandedLinkedSystemIds((current) =>
      current.includes(systemId) ? current.filter((id) => id !== systemId) : [...current, systemId],
    )
  }

  function openAllocationDialog() {
    const initialMode = permittedAllocationModes[0]
    const initialCandidates =
      initialMode === 'PRODUCTION'
        ? availableProductionCandidates(productionSystemInventory)
        : initialMode === 'REUSED_INTERNAL'
          ? availableReusedInternalCandidates(reusedInternalSystems)
          : availableExistingSystemCandidates(projectDraft.id, systems, projectSystems)
    setAllocationMode(initialMode)
    setSelectedAllocationId(initialCandidates[0]?.id ?? '')
    setAllocationCandidateSearch('')
    setAllocationCandidateSortKey('id')
    setAllocationCandidateSortDirection('asc')
    setAllocationResult(null)
    setIsAllocationDialogOpen(true)
  }

  function changeAllocationMode(mode: AllocationMode) {
    const nextCandidates =
      mode === 'PRODUCTION'
        ? availableProductionCandidates(productionSystemInventory)
        : mode === 'REUSED_INTERNAL'
          ? availableReusedInternalCandidates(reusedInternalSystems)
          : availableExistingSystemCandidates(projectDraft.id, systems, projectSystems)
    setAllocationMode(mode)
    setSelectedAllocationId(nextCandidates[0]?.id ?? '')
    setAllocationCandidateSearch('')
    setAllocationResult(null)
  }

  function confirmAllocation() {
    if (!selectedAllocationId) {
      setAllocationResult({ ok: false, message: 'Select a system before allocating.' })
      return
    }

    const result =
      selectedMode === 'PRODUCTION'
        ? allocateProductionSystemToProject(projectDraft.id, selectedAllocationId)
        : selectedMode === 'REUSED_INTERNAL'
          ? allocateReusedInternalSystemToProject(projectDraft.id, selectedAllocationId)
          : linkExistingSystemToProject(projectDraft.id, selectedAllocationId)

    setAllocationResult(result)
    if (result.ok) {
      setIsAllocationDialogOpen(false)
      setSelectedAllocationId('')
    }
  }

  function deallocateSystem(link: ProjectSystemLink) {
    const result = deallocateProjectSystem(link.id)
    setAllocationResult(result)
  }

  function fieldChanged(key: ProjectHeaderFieldMetadata['key']): boolean {
    return isProjectHeaderFieldChanged(persistedProject, projectDraft, key, { linkedOpportunity, account, salesManager })
  }

  function headerFieldValue(project: Project, key: ProjectHeaderFieldMetadata['key']): string {
    return projectHeaderFieldValue(project, key, { linkedOpportunity, account, salesManager })
  }

  function updateDraftField(key: keyof Project, value: string | null) {
    setDraft((current) => {
      if (!current) return current
      if (key === 'opportunityId') {
        const selectedOpportunity = opportunities.find(
          (opportunity) => opportunity.opportunityId === value || opportunity.id === value || `${opportunity.opportunityId} - ${opportunity.opportunityName}` === value,
        )
        if (!selectedOpportunity) return { ...current, [key]: value || undefined }
        const projectType = projectTypeForOpportunity(selectedOpportunity)
        return projectPatchFromOpportunitySelection(current, selectedOpportunity, projectType)
      }
      return { ...current, [key]: value }
    })
    setSaveMessages([])
  }

  function saveProject(stayOnPage: boolean) {
    const messages = validateProjectSave(projectDraft)
    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    updateProject(projectDraft.id, projectSavePatch(projectDraft))
    setSaveMessages(['Project saved.'])
    if (!stayOnPage) navigate('/projects')
  }

  function revertProject() {
    setDraft(cloneProjectDraft(persistedProject))
    setSaveMessages([])
  }

  function cancelProject() {
    setDraft(cloneProjectDraft(persistedProject))
    navigate('/projects')
  }

  function renderHeaderField(field: ProjectHeaderFieldMetadata) {
    const isChanged = fieldChanged(field.key)
    const isMissing = missingFields.has(field.key)
    const value = headerFieldValue(projectDraft, field.key)
    const label = (
      <>
        {field.label}
        {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </>
    )

    if (!field.editable) {
      return (
        <FormField key={field.key} label={label} controlWidthClassName="w-44">
          <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
            {field.key === 'progressStatus' ? <ProjectStatusBadge status={projectDraft.progressStatus} /> : value || '-'}
          </div>
        </FormField>
      )
    }

    if (field.key === 'opportunityId') {
      return (
        <FormField key={field.key} label={label} controlWidthClassName="w-72">
          <input
            className={fieldClassName(isChanged, isMissing, 'h-8 w-full text-sm')}
            value={value}
            list="project-opportunity-options"
            onChange={(event) => updateDraftField('opportunityId', event.target.value)}
          />
          <datalist id="project-opportunity-options">
            {opportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.opportunityId}>
                {opportunity.opportunityName}
              </option>
            ))}
          </datalist>
        </FormField>
      )
    }

    if (field.inputType === 'date') {
      return (
        <FormField key={field.key} label={label} controlWidthClassName="w-40">
          <input
            className={fieldClassName(isChanged, isMissing, 'h-8 w-full text-sm')}
            type="date"
            value={value}
            onChange={(event) => updateDraftField(field.key as keyof Project, event.target.value || null)}
          />
        </FormField>
      )
    }

    return (
      <FormField key={field.key} label={label} controlWidthClassName="w-64">
        <input
          className={fieldClassName(isChanged, isMissing, 'h-8 w-full text-sm')}
          value={value}
          onChange={(event) => updateDraftField(field.key as keyof Project, event.target.value)}
        />
      </FormField>
    )
  }

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex">
          <button
            type="button"
            className="rounded-l bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => saveProject(false)}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded-r border-l border-blue-500 bg-sf-brand px-2 py-1.5 text-white hover:bg-blue-700"
            aria-label="More save actions"
            aria-expanded={saveMenuOpen}
            onClick={() => setSaveMenuOpen((current) => !current)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {saveMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded border border-sf-border bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-sf-text hover:bg-sf-surface-alt"
                onClick={() => {
                  setSaveMenuOpen(false)
                  saveProject(true)
                }}
              >
                Apply Changes
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" disabled={!isDirty} onClick={revertProject}>
          Revert
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={cancelProject}>
          Cancel
        </button>
      </div>
    )
  }

  function renderWorkspaceMetric(label: string, value: ReactNode, tone: 'default' | 'warning' | 'danger' = 'default') {
    const toneClassName =
      tone === 'danger'
        ? 'border-red-200 bg-red-50'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50'
          : 'border-sf-border bg-sf-surface-alt'

    return (
      <div className={['rounded border px-2 py-1.5', toneClassName].join(' ')}>
        <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
        <div className="mt-1 text-sm font-medium text-sf-text">{value}</div>
      </div>
    )
  }

  function renderOverviewTab() {
    const sectionId = tabSectionId('overview')
    const healthAlerts = projectHealth?.healthAlerts ?? []
    const coverageAlerts = [
      projectRequirementCoverageSummary.missingSystem > 0 ? `${projectRequirementCoverageSummary.missingSystem} requirement(s) missing System allocation` : null,
      projectRequirementCoverageSummary.missingTenant > 0 ? `${projectRequirementCoverageSummary.missingTenant} requirement(s) missing Tenant creation` : null,
      projectRequirementCoverageSummary.unknown > 0 ? `${projectRequirementCoverageSummary.unknown} requirement(s) need coverage review` : null,
    ].filter((alert): alert is string => Boolean(alert))
    const needsAttentionAlerts = Array.from(new Set([...healthAlerts, ...coverageAlerts]))

    return (
      <CollapsibleSection
        title="Overview"
        subtitle="Read-only delivery workspace summary for this Project."
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-4 p-3"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {renderWorkspaceMetric(
            'Delivery Health',
            projectHealth ? <StatusBadge label={projectHealth.healthLabel} variant={projectHealthBadgeVariant(projectHealth.healthStatus)} /> : '-',
            projectHealth?.healthStatus === 'AT_RISK' || projectHealth?.healthStatus === 'BLOCKED' ? 'danger' : projectHealth?.healthStatus === 'WARNING' ? 'warning' : 'default',
          )}
          <div className="rounded border border-sf-border bg-sf-surface-alt px-2 py-1.5">
            <div className="text-xs font-semibold uppercase text-sf-text-muted">Milestone Completion</div>
            <ProgressBar value={projectHealth?.completionPercent ?? 0} className="mt-1 min-w-0" />
          </div>
          {renderWorkspaceMetric('Current Milestone', projectHealth?.currentMilestone || '-')}
          {renderWorkspaceMetric('Last Completed', projectHealth?.lastCompletedMilestone || '-')}
          {renderWorkspaceMetric('Open Tasks', projectHealth?.openTaskCount ?? 0)}
          {renderWorkspaceMetric('Completed Tasks', projectHealth?.completedTaskCount ?? 0)}
          {renderWorkspaceMetric('Deadline Risk', projectHealth?.deadlineRiskLabel ?? '-')}
          {renderWorkspaceMetric('Next Deadline', projectHealth?.nextDeadline || '-')}
          {renderWorkspaceMetric('Overdue Tasks', projectHealth?.overdueTaskCount ?? 0, (projectHealth?.overdueTaskCount ?? 0) > 0 ? 'danger' : 'default')}
          {renderWorkspaceMetric('Overdue Milestones', projectHealth?.overdueMilestoneCount ?? 0, (projectHealth?.overdueMilestoneCount ?? 0) > 0 ? 'danger' : 'default')}
          {renderWorkspaceMetric('Covered Requirements', `${projectRequirementCoverageSummary.covered}/${projectRequirementCoverageSummary.totalRequirements}`)}
          {renderWorkspaceMetric('Linked Systems', workspaceSystemSummary?.linkedSystems ?? 0, workspaceSystemSummary?.missingSystemAllocation ? 'warning' : 'default')}
          {renderWorkspaceMetric('Linked Tenants', workspaceTenantSummary?.linkedTenants ?? 0, workspaceTenantSummary?.missingTenantCreation ? 'warning' : 'default')}
        </div>

        <div className="rounded border border-sf-border bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-sf-text">Needs Attention</h3>
            {projectHealth ? <StatusBadge label={projectHealth.deliveryDateStatusLabel} variant={projectHealth.healthStatus === 'AT_RISK' ? 'error' : projectHealth.healthStatus === 'WARNING' ? 'warning' : 'default'} /> : null}
          </div>
          {needsAttentionAlerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {needsAttentionAlerts.map((alert) => (
                <span key={alert} className="inline-flex items-center gap-1.5 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
                  <AlertStatusIcon
                    variant={healthAlerts.includes(alert) ? projectHealthAlertVariant(projectHealth?.healthStatus ?? 'HEALTHY') : 'warning'}
                    label={alert}
                  />
                  {alert}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-sf-text-muted">No delivery or requirement coverage alerts from current read-only data.</div>
          )}
        </div>
      </CollapsibleSection>
    )
  }

  function renderRequirementsTab() {
    const requirementSections = completeProjectRequirementSections(formMetadata.requirementSections, linkedOpportunity)
    return (
      <CollapsibleSection
        title="Requirements"
        subtitle={`Read-only live requirements from ${linkedOpportunity?.opportunityName ?? 'the linked Opportunity'}.`}
        collapsed={collapsedSections.requirements}
        onToggle={() => toggleSection('requirements')}
        className="space-y-3 p-3"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {renderWorkspaceMetric('Total Requirements', projectRequirementCoverageSummary.totalRequirements)}
          {renderWorkspaceMetric('Covered', projectRequirementCoverageSummary.covered)}
          {renderWorkspaceMetric('Partially Covered', projectRequirementCoverageSummary.partiallyCovered, projectRequirementCoverageSummary.partiallyCovered > 0 ? 'warning' : 'default')}
          {renderWorkspaceMetric('Missing System', projectRequirementCoverageSummary.missingSystem, projectRequirementCoverageSummary.missingSystem > 0 ? 'warning' : 'default')}
          {renderWorkspaceMetric('Missing Tenant', projectRequirementCoverageSummary.missingTenant, projectRequirementCoverageSummary.missingTenant > 0 ? 'warning' : 'default')}
          {renderWorkspaceMetric('Unknown', projectRequirementCoverageSummary.unknown, projectRequirementCoverageSummary.unknown > 0 ? 'warning' : 'default')}
        </div>

        {projectRequirementCoverageRows.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Requirement ID', 'Grid', 'Product', 'Hosting', 'Coverage Status', 'Missing Step', 'PID', 'SID/MID', 'TID', 'Alerts'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectRequirementCoverageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-sf-surface-alt">
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.requirementId}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.requirementGrid}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.product}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.hostingType}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.coverageStatusLabel}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.missingStepLabel}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.pid ? <LinkId to={`/projects/${row.pid}`}>{row.pid}</LinkId> : ''}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.sid || row.mid}</td>
                    <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.tid ? <LinkId to={`/tenants/${row.tid}`}>{row.tid}</LinkId> : ''}</td>
                    <td className="max-w-72 whitespace-normal border border-sf-border px-1.5 py-1 text-sm text-sf-text">{row.coverageAlerts.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No Requirement Coverage rows are linked to this Project.
          </div>
        )}

        {linkedOpportunity ? (
          <div className="space-y-4">
            {requirementSections.map((section) => (
              <RequirementSection key={section.kind} section={section} opportunity={linkedOpportunity} tenants={tenants} systems={systems} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No linked Opportunity found for this Project.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  function updateMilestoneOrder(milestoneId: string, order: number) {
    setDraft((current) => (current ? updateMilestoneOrderInPlan(current, milestoneId, order) : current))
    setSaveMessages([])
  }

  function dropMilestoneOnOrder(targetOrder: number) {
    if (!draggedMilestoneId) return
    updateMilestoneOrder(draggedMilestoneId, targetOrder)
    setDraggedMilestoneId(null)
    setDragOverMilestoneId(null)
  }

  function updateTaskOrder(taskId: string, order: number) {
    setDraft((current) => (current ? updateTaskOrderInPlan(current, taskId, order) : current))
    setSaveMessages([])
  }

  function updateMilestone(milestoneId: string, patch: Partial<NonNullable<Project['milestones']>[number]>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            milestones: (current.milestones ?? []).map((milestone) =>
              milestone.id === milestoneId ? { ...milestone, ...patch } : milestone,
            ),
          }
        : current,
    )
    setSaveMessages([])
  }

  function updateTask(taskId: string, patch: Partial<NonNullable<Project['tasks']>[number]>) {
    setDraft((current) => (current ? updateTaskInPlan(current, taskId, patch) : current))
    setSaveMessages([])
  }

  function openAddMilestoneDialog() {
    const nextOrder = ((projectDraft.milestones ?? []).reduce((maxOrder, milestone) => Math.max(maxOrder, milestone.order), 0) || 0) + 1
    setNewMilestoneName('')
    setNewMilestoneOrder(nextOrder)
    setNewMilestoneDeadline('')
    setNewMilestoneComment('')
    setNewMilestoneTasks([{ name: '', department: '', resource: '', status: 'OPEN', deadline: null, comment: '' }])
    setIsAddMilestoneDialogOpen(true)
  }

  function addMilestoneTaskDraft() {
    setNewMilestoneTasks((current) => [...current, { name: '', department: '', resource: '', status: 'OPEN', deadline: null, comment: '' }])
  }

  function updateMilestoneTaskDraft(index: number, patch: Partial<NewMilestoneTaskDraft>) {
    setNewMilestoneTasks((current) => current.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task)))
  }

  function deleteMilestoneTaskDraft(index: number) {
    setNewMilestoneTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))
  }

  function createMilestoneTask(milestoneId: string, task: NewMilestoneTaskDraft, order: number): NonNullable<Project['tasks']>[number] {
    return {
      id: `project-task-${crypto.randomUUID()}`,
      milestoneId,
      name: task.name.trim() || `Task ${order}`,
      department: task.department.trim(),
      resource: task.resource.trim(),
      status: task.status,
      order,
      deadline: task.deadline || null,
      comment: task.comment ?? '',
    }
  }

  function confirmAddMilestone() {
    const milestoneName = newMilestoneName.trim()
    if (!milestoneName) {
      setSaveMessages(['Milestone name is required.'])
      return
    }

    const milestoneId = `project-milestone-${crypto.randomUUID()}`
    const initialTasks = newMilestoneTasks
      .filter((task) => task.name.trim() || task.department.trim() || task.resource.trim())
      .map((task, index) => createMilestoneTask(milestoneId, task, index + 1))

    setDraft((current) => {
      if (!current) return current
      const nextProject = {
        ...current,
        milestones: [
          ...(current.milestones ?? []),
          {
            id: milestoneId,
            name: milestoneName,
            order: newMilestoneOrder,
            status: 'OPEN' as const,
            deadline: newMilestoneDeadline || null,
            comment: newMilestoneComment,
          },
        ],
        tasks: [...(current.tasks ?? []), ...initialTasks],
      }
      return updateMilestoneOrderInPlan(nextProject, milestoneId, newMilestoneOrder)
    })
    setSaveMessages([])
    setIsAddMilestoneDialogOpen(false)
  }

  function addTaskToMilestone(milestoneId: string) {
    const existingTasks = (projectDraft.tasks ?? []).filter((task) => task.milestoneId === milestoneId)
    const order = existingTasks.reduce((maxOrder, task) => Math.max(maxOrder, task.order), 0) + 1
    const task = createMilestoneTask(milestoneId, { name: '', department: '', resource: '', status: 'OPEN', deadline: null, comment: '' }, order)
    setDraft((current) => (current ? { ...current, tasks: [...(current.tasks ?? []), task] } : current))
    setSaveMessages([])
  }

  function deleteTaskFromMilestone(taskId: string) {
    setDraft((current) => {
      if (!current) return current
      const nextProject = {
        ...current,
        tasks: (current.tasks ?? []).filter((task) => task.id !== taskId),
      }
      return {
        ...nextProject,
        milestones: (nextProject.milestones ?? []).map((milestone) => ({
          ...milestone,
          status: projectMilestoneStatus(nextProject, milestone.id),
        })),
      }
    })
    setSaveMessages([])
  }

  function renderTaskStatusSelect(task: NonNullable<Project['tasks']>[number]) {
    return (
      <div className="flex items-center gap-1.5">
        <select
          className="h-8 w-20 rounded border border-sf-border px-2 py-1 text-sm"
          value={task.status}
          onChange={(event) => updateTask(task.id, { status: event.target.value as 'OPEN' | 'DONE' })}
        >
          <option value="OPEN">Open</option>
          <option value="DONE">Done</option>
        </select>
        <TaskStatusIcon status={task.status} />
      </div>
    )
  }

  function renderDeadlineAlert(deadline: string | null | undefined, status: string) {
    const alertStatus = milestoneDeadlineAlertStatus(deadline, status as NonNullable<Project['milestones']>[number]['status'])
    if (alertStatus === 'NONE') return null

    return (
      <AlertStatusIcon
        variant={alertStatus === 'OVERDUE' ? 'danger' : 'warning'}
        label={milestoneDeadlineAlertLabel(alertStatus)}
      />
    )
  }

  function orderedMilestones(project: Project) {
    return orderedProjectMilestones(project)
  }

  function orderedTasks(project: Project) {
    return orderedProjectTasks(project)
  }

  function renderMilestonesTab() {
    const sectionId = tabSectionId('milestones')
    const resolution = resolveProjectMilestoneTemplate(projectDraft, linkedOpportunity)
    const template = PROJECT_MILESTONE_TASK_TEMPLATES[resolution.templateId]
    const milestones = orderedMilestones(projectDraft)

    return (
      <CollapsibleSection
        title="Milestones"
        subtitle={`${template.name} - ${resolution.reason}. Milestone order and task edits are local to this Project.`}
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-3 p-3"
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded border border-sf-brand bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={openAddMilestoneDialog}>
            + Add Milestone
          </button>
          <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
            Save as replacement template
          </button>
          <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
            Save as new template
          </button>
        </div>
        {milestones.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="table-auto border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Move', 'Order', 'Milestone', 'Deadline', 'DL Alert', 'Status', 'Progress', 'Tasks', 'Comment'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => {
                  const status = projectMilestoneStatus(projectDraft, milestone.id)
                  const progress = projectMilestoneTaskProgress(projectDraft, milestone.id)
                  const taskCount = projectDraft.tasks?.filter((task) => task.milestoneId === milestone.id).length ?? 0
                  return (
                    <tr
                      key={milestone.id}
                      className={[
                        'hover:bg-sf-surface-alt',
                        dragOverMilestoneId === milestone.id ? 'bg-amber-50 outline outline-2 outline-amber-300' : '',
                      ].filter(Boolean).join(' ')}
                      onDragOver={(event) => {
                        if (!draggedMilestoneId || draggedMilestoneId === milestone.id) return
                        event.preventDefault()
                        setDragOverMilestoneId(milestone.id)
                      }}
                      onDragLeave={() => setDragOverMilestoneId((current) => current === milestone.id ? null : current)}
                      onDrop={(event) => {
                        event.preventDefault()
                        dropMilestoneOnOrder(milestone.order)
                      }}
                    >
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-sf-text">
                        <button
                          type="button"
                          className="inline-flex cursor-grab items-center justify-center rounded border border-sf-border bg-white p-1 text-sf-text-muted hover:bg-sf-surface-alt active:cursor-grabbing"
                          draggable
                          aria-label={`Drag ${milestone.name}`}
                          title="Drag to reorder milestone"
                          onDragStart={(event) => {
                            setDraggedMilestoneId(milestone.id)
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', milestone.id)
                          }}
                          onDragEnd={() => {
                            setDraggedMilestoneId(null)
                            setDragOverMilestoneId(null)
                          }}
                        >
                          <GripVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                      <td className="border border-sf-border px-1 py-1 text-sf-text">
                        <input
                          className="h-7 w-11 rounded border border-sf-border px-1 py-1 text-center text-sm"
                          type="number"
                          min={1}
                          value={milestone.order}
                          onChange={(event) => updateMilestoneOrder(milestone.id, Number(event.target.value) || milestone.order)}
                        />
                      </td>
                      <td className="max-w-80 whitespace-normal border border-sf-border px-1.5 py-1 text-sf-text">
                        <button type="button" className="text-left font-medium text-sf-brand hover:underline" onClick={() => setSelectedMilestoneId(milestone.id)}>
                          {milestone.name}
                        </button>
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{milestone.deadline || ''}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{renderDeadlineAlert(milestone.deadline, status)}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text"><ProjectStatusBadge status={status} /></td>
                      <td className="w-24 whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">
                        <ProgressBar value={progress} className="min-w-20" />
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-sf-text">{taskCount}</td>
                      <td className="max-w-72 whitespace-normal border border-sf-border px-1.5 py-1 text-sf-text">{milestone.comment ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No milestone template rows resolved for this Project.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  function renderTasksTab() {
    const sectionId = tabSectionId('tasks')
    const tasks = orderedTasks(projectDraft)
    const milestonesById = new Map((projectDraft.milestones ?? []).map((milestone) => [milestone.id, milestone]))

    return (
      <CollapsibleSection
        title="Tasks"
        subtitle="Excel task template copied locally to this Project. Task order follows milestone order."
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-3 p-3"
      >
        {tasks.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="table-auto border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Milestone', 'Order', 'Task', 'Department', 'Resource', 'Deadline', 'DL Alert', 'Status', 'Comment'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => {
                  const milestone = milestonesById.get(task.milestoneId)
                  const startsMilestoneGroup = index === 0 || tasks[index - 1]?.milestoneId !== task.milestoneId

                  return (
                    <Fragment key={task.id}>
                      {startsMilestoneGroup ? (
                        <tr className="border-t-2 border-sf-border bg-sf-surface-alt/70">
                          <td colSpan={9} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sf-text-muted">
                            {milestone?.name ?? 'Unassigned milestone'}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="hover:bg-sf-surface-alt">
                        <td className="max-w-48 whitespace-normal border border-sf-border px-1 py-1 text-sf-text">{milestone?.name ?? ''}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">
                          <input
                            className="h-7 w-11 rounded border border-sf-border px-1 py-1 text-center text-sm"
                            type="number"
                            min={1}
                            value={task.order}
                            onChange={(event) => updateTaskOrder(task.id, Number(event.target.value) || task.order)}
                          />
                        </td>
                        <td className="max-w-96 whitespace-normal border border-sf-border px-1.5 py-1 text-sf-text">{task.name}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{task.department}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{task.resource}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{task.deadline || ''}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{renderDeadlineAlert(task.deadline, task.status)}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{renderTaskStatusSelect(task)}</td>
                        <td className="max-w-72 whitespace-normal border border-sf-border px-1.5 py-1 text-sf-text">{task.comment ?? ''}</td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No task template rows resolved for this Project.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  function renderAddMilestoneDialog() {
    if (!isAddMilestoneDialogOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-milestone-title">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="add-milestone-title" className="text-xl font-semibold text-sf-text">Add milestone</h2>
              <p className="text-sm text-sf-text-muted">Create a project-local milestone and optional initial tasks.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close add milestone dialog" onClick={() => setIsAddMilestoneDialogOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[68vh] space-y-4 overflow-auto p-4">
            <div className="flex flex-wrap items-start gap-3">
              <FormField label="Milestone name" controlWidthClassName="w-80">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={newMilestoneName} onChange={(event) => setNewMilestoneName(event.target.value)} />
              </FormField>
              <FormField label="Order" controlWidthClassName="w-24">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" type="number" min={1} value={newMilestoneOrder} onChange={(event) => setNewMilestoneOrder(Number(event.target.value) || 1)} />
              </FormField>
              <FormField label="Deadline" controlWidthClassName="w-40">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" type="date" value={newMilestoneDeadline} onChange={(event) => setNewMilestoneDeadline(event.target.value)} />
              </FormField>
              <FormField label="Comment" controlWidthClassName="w-96">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={newMilestoneComment} onChange={(event) => setNewMilestoneComment(event.target.value)} />
              </FormField>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-sf-text">Initial tasks</h3>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={addMilestoneTaskDraft}>
                  + Add task
                </button>
              </div>
              <div className="overflow-x-auto rounded border border-sf-border bg-white">
                <table className="table-auto border-collapse text-sm leading-tight">
                  <thead className="bg-sf-surface-alt text-left">
                    <tr>
                      {['Task', 'Department', 'Resource', 'Deadline', 'Status', 'Comment', 'Action'].map((label) => (
                        <th key={label} className="whitespace-nowrap border border-sf-border px-1 py-1 text-sm font-semibold text-sf-text">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {newMilestoneTasks.map((task, index) => (
                      <tr key={index}>
                        <td className="max-w-96 border border-sf-border px-1 py-1">
                          <input className="h-8 w-96 max-w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.name} onChange={(event) => updateMilestoneTaskDraft(index, { name: event.target.value })} />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                          <input className="h-8 w-24 rounded border border-sf-border px-2 py-1 text-sm" value={task.department} onChange={(event) => updateMilestoneTaskDraft(index, { department: event.target.value })} />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                          <input className="h-8 w-24 rounded border border-sf-border px-2 py-1 text-sm" value={task.resource} onChange={(event) => updateMilestoneTaskDraft(index, { resource: event.target.value })} />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                          <input className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={task.deadline ?? ''} onChange={(event) => updateMilestoneTaskDraft(index, { deadline: event.target.value || null })} />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                          <select className="h-8 w-20 rounded border border-sf-border px-2 py-1 text-sm" value={task.status} onChange={(event) => updateMilestoneTaskDraft(index, { status: event.target.value as 'OPEN' | 'DONE' })}>
                            <option value="OPEN">Open</option>
                            <option value="DONE">Done</option>
                          </select>
                        </td>
                        <td className="max-w-64 border border-sf-border px-1 py-1">
                          <input className="h-8 w-64 max-w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.comment ?? ''} onChange={(event) => updateMilestoneTaskDraft(index, { comment: event.target.value })} />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                          <button type="button" className="text-red-700 hover:underline" onClick={() => deleteMilestoneTaskDraft(index)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => setIsAddMilestoneDialogOpen(false)}>
              Cancel
            </button>
            <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={confirmAddMilestone}>
              Add Milestone
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderMilestoneDialog() {
    if (!selectedMilestoneId) return null
    const milestone = (projectDraft.milestones ?? []).find((candidate) => candidate.id === selectedMilestoneId)
    if (!milestone) return null
    const tasks = orderedTasks(projectDraft).filter((task) => task.milestoneId === milestone.id)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded border border-sf-border bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 className="text-xl font-semibold text-sf-text">{milestone.name}</h2>
              <p className="text-sm text-sf-text-muted">Tasks in this milestone are local to Project {projectDraft.pid}.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close milestone form" onClick={() => setSelectedMilestoneId(null)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-[68vh] overflow-auto p-4">
            <div className="mb-3 flex flex-wrap items-start gap-3">
              <FormField label="Milestone name" controlWidthClassName="w-80">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={milestone.name} onChange={(event) => updateMilestone(milestone.id, { name: event.target.value })} />
              </FormField>
              <FormField label="Deadline" controlWidthClassName="w-40">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" type="date" value={milestone.deadline ?? ''} onChange={(event) => updateMilestone(milestone.id, { deadline: event.target.value || null })} />
              </FormField>
              <FormField label="Comment" controlWidthClassName="w-96">
                <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={milestone.comment ?? ''} onChange={(event) => updateMilestone(milestone.id, { comment: event.target.value })} />
              </FormField>
            </div>
            <div className="mb-2 flex justify-end">
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => addTaskToMilestone(milestone.id)}>
                + Add task
              </button>
            </div>
            <table className="table-auto border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Order', 'Task', 'Department', 'Resource', 'Deadline', 'Status', 'Comment', 'Action'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                      <input
                        className="h-7 w-11 rounded border border-sf-border px-1 py-1 text-center text-sm"
                        type="number"
                        min={1}
                        value={task.order}
                        onChange={(event) => updateTaskOrder(task.id, Number(event.target.value) || task.order)}
                      />
                    </td>
                    <td className="max-w-96 border border-sf-border px-1 py-1">
                      <input className="h-8 w-96 max-w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                      <input className="h-8 w-24 rounded border border-sf-border px-2 py-1 text-sm" value={task.department} onChange={(event) => updateTask(task.id, { department: event.target.value })} />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                      <input className="h-8 w-24 rounded border border-sf-border px-2 py-1 text-sm" value={task.resource} onChange={(event) => updateTask(task.id, { resource: event.target.value })} />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                      <input className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={task.deadline ?? ''} onChange={(event) => updateTask(task.id, { deadline: event.target.value || null })} />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">{renderTaskStatusSelect(task)}</td>
                    <td className="max-w-64 border border-sf-border px-1 py-1">
                      <input className="h-8 w-64 max-w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.comment ?? ''} onChange={(event) => updateTask(task.id, { comment: event.target.value })} />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1">
                      <button type="button" className="inline-flex items-center gap-1 text-red-700 hover:underline" onClick={() => deleteTaskFromMilestone(task.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-sf-border p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
                Save as replacement template
              </button>
              <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
                Save as new template
              </button>
            </div>
            <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => setSelectedMilestoneId(null)}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderPlaceholderTab(tab: ProjectFormTab) {
    const sectionId = tabSectionId(tab)
    return (
      <CollapsibleSection
        title={projectTabLabel(tab)}
        subtitle={
          tab === 'milestones' || tab === 'tasks'
            ? `Template reference: ${formMetadata.milestoneTemplate}. Editing is planned for a later phase.`
            : 'Execution workflow will be implemented in a later phase.'
        }
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-3 p-3"
      >
        <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
          {projectTabLabel(tab)} workspace is not editable in this MVP scope.
        </div>
      </CollapsibleSection>
    )
  }

  function renderDocumentsTab() {
    const sectionId = tabSectionId('documents')
    return (
      <CollapsibleSection
        title="Documents"
        subtitle="Shared document workspace for this Project."
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-3 p-3"
      >
        <DocumentsPanel
          documents={projectDraft.documents ?? []}
          emptyText="No documents uploaded for this project."
          onChange={(documents) => {
            setDraft((current) => (current ? { ...current, documents } : current))
            setSaveMessages([])
          }}
        />
      </CollapsibleSection>
    )
  }

  function renderAllocationDialog() {
    if (!isAllocationDialogOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="project-allocation-title">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="project-allocation-title" className="text-xl font-semibold text-sf-text">Allocate system</h2>
              <p className="text-sm text-sf-text-muted">Create a Project to System link for {projectDraft.pid}. Tenants are created later from the System Form.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close allocation dialog" onClick={() => setIsAllocationDialogOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 overflow-auto p-4">
            <div className="flex flex-wrap gap-2">
              {permittedAllocationModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={[
                    'inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm font-semibold',
                    selectedMode === mode
                      ? 'border-sf-brand bg-sf-brand text-white'
                      : 'border-sf-border bg-white text-sf-text hover:bg-sf-surface-alt',
                  ].join(' ')}
                  onClick={() => changeAllocationMode(mode)}
                >
                  {mode === 'EXISTING_SYSTEM' ? <Link2 className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {allocationModeLabel(mode)}
                </button>
              ))}
            </div>

            {allocationResult ? <div className={allocationStatusClassName(allocationResult)}>{allocationResult.message}</div> : null}

            {availableAllocationCandidates.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-2 rounded border border-sf-border bg-white p-2">
                  <label className="block text-sm font-medium text-sf-text">
                    Filter
                    <input
                      className="mt-1 h-8 rounded border border-sf-border px-2 text-sm"
                      placeholder="Search candidates"
                      value={allocationCandidateSearch}
                      onChange={(event) => setAllocationCandidateSearch(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-sf-text">
                    Sort by
                    <select
                      className="mt-1 h-8 rounded border border-sf-border px-2 text-sm"
                      value={allocationCandidateSortKey}
                      onChange={(event) => setAllocationCandidateSortKey(event.target.value as AllocationCandidateSortKey)}
                    >
                      {ALLOCATION_CANDIDATE_SORT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                    onClick={() => setAllocationCandidateSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
                  >
                    {allocationCandidateSortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                </div>
                <div className="sf-scroll-x rounded border border-sf-border bg-white">
                <table className="min-w-full border-collapse text-sm leading-tight">
                  <thead className="bg-sf-surface-alt text-left">
                    <tr>
                      {['Select', 'ID', 'MID', 'Source', 'Status', 'Product', 'Cloud Platform', 'CSP', 'Region'].map((label) => (
                        <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAllocationCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-sf-surface-alt">
                        <td className="border border-sf-border px-1.5 py-1">
                          <input
                            type="radio"
                            name="project-system-allocation-candidate"
                            checked={selectedAllocationId === candidate.id}
                            onChange={() => setSelectedAllocationId(candidate.id)}
                          />
                        </td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidatePrimaryId(candidate)}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateMachineId(candidate)}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateSource(candidate)}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateStatus(candidate)}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.productType || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.cloudPlatform || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.csp || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateRegion(candidate) || '-'}</td>
                      </tr>
                    ))}
                    {visibleAllocationCandidates.length === 0 ? (
                      <tr>
                        <td className="border border-sf-border px-1.5 py-4 text-center text-sm text-sf-text-muted" colSpan={9}>
                          No systems match the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
                No available systems for this allocation mode.
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => setIsAllocationDialogOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedAllocationId}
              onClick={confirmAllocation}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderActivityTab() {
    return (
      <CollapsibleSection
        title="Activity"
        subtitle="Read-only activity recorded for this Project."
        collapsed={collapsedSections.activity}
        onToggle={() => toggleSection('activity')}
        className="space-y-3 p-3"
      >
        <ActivityTimeline
          events={projectActivityEvents}
          emptyText="No activity recorded for this project yet."
        />
      </CollapsibleSection>
    )
  }

  function renderLinkedSystemDetails(system: System) {
    const hostingContext = hostingContextFromSource(system)
    const configurationGroups = detailGroups(APPLICATION_CONFIGURATION_FIELDS)

    return (
      <div className="space-y-4 p-3">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-sf-text">Hosting Context</h4>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LINKED_SYSTEM_HOSTING_FIELDS.map((field) => (
              <div key={field.key} className="rounded border border-sf-border bg-sf-surface-alt px-2 py-1">
                <dt className="text-xs font-semibold uppercase text-sf-text-muted">{field.label}</dt>
                <dd className="text-sm text-sf-text">{formatReadOnlyDetailValue(hostingContext[field.key])}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-sf-text">Application Configuration</h4>
          {configurationGroups.map((group) => (
            <div key={group.group} className="space-y-2">
              <h5 className="text-xs font-semibold uppercase text-sf-text-muted">{group.group}</h5>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {group.fields.map((field) => (
                  <div key={field.configKey} className="rounded border border-sf-border bg-white px-2 py-1">
                    <dt className="text-xs font-medium text-sf-text-muted">{field.label}</dt>
                    <dd className="text-sm text-sf-text">{formatReadOnlyDetailValue(systemApplicationConfigurationValue(system, field))}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderSystemsTab() {
    return (
      <CollapsibleSection
        title="Systems"
        subtitle="Allocate or link systems for this Project. Tenant creation happens from the linked System Form."
        collapsed={collapsedSections.systems}
        onToggle={() => toggleSection('systems')}
        className="space-y-3 p-3"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {renderWorkspaceMetric('Linked Systems', workspaceSystemSummary?.linkedSystems ?? 0, workspaceSystemSummary?.missingSystemAllocation ? 'warning' : 'default')}
          {renderWorkspaceMetric('Production Systems', workspaceSystemSummary?.productionSystems ?? 0)}
          {renderWorkspaceMetric('Reused/Internal Systems', workspaceSystemSummary?.reusedInternalSystems ?? 0)}
          {renderWorkspaceMetric('Missing System Allocation', workspaceSystemSummary?.missingSystemAllocation ? 'Yes' : 'No', workspaceSystemSummary?.missingSystemAllocation ? 'warning' : 'default')}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sf-text-muted">
            Allocation creates Project to System links only. It does not create tenants.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-sf-brand bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={openAllocationDialog}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Allocate System
          </button>
        </div>

        {allocationResult && !isAllocationDialogOpen ? <div className={allocationStatusClassName(allocationResult)}>{allocationResult.message}</div> : null}

        {linkedSystems.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Details', 'SID/MID', 'Source', 'Purpose', 'Product', 'Hosting', 'Cloud Platform', 'CSP', 'Region', 'Operational Status', 'Allocation Type', 'Action'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedSystems.map((system) => {
                  const link = activeSystemLinkBySystemId.get(system.id)
                  const isExpanded = expandedLinkedSystemIds.includes(system.id)
                  return [
                    <tr key={system.id} className="hover:bg-sf-surface-alt">
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs hover:bg-sf-surface-alt"
                          aria-expanded={isExpanded}
                          onClick={() => toggleLinkedSystemDetails(system.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                          Details
                        </button>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        <span className="inline-flex items-center gap-2">
                          <LinkId to={systemRoutePath(system)}>
                            {system.sid ?? system.machineId ?? system.id}
                          </LinkId>
                          <RecordChangeBadge record={system} />
                        </span>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{systemSourceLabel(system)}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.purpose}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.productType}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.hostingType}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.cloudPlatform ?? ''}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.csp ?? ''}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.cloudRegion ?? ''}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.operationalStatus}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{link ? allocationModeLabel(link.allocationType ?? 'EXISTING_SYSTEM') : '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        {link ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => deallocateSystem(link)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Deallocate
                          </button>
                        ) : null}
                      </td>
                    </tr>,
                    isExpanded ? (
                      <tr key={`${system.id}-details`}>
                        <td className="border border-sf-border bg-sf-surface-alt p-0" colSpan={12}>
                          {renderLinkedSystemDetails(system)}
                        </td>
                      </tr>
                    ) : null,
                  ]
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No systems are linked to this Project yet.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  function tenantWarrantyHeaderLabel(tenant: Tenant): string {
    return tenantWarrantyHeaderStatusReadModel(tenant.warranties ?? [], tenant.tid).label
  }

  function renderTenantsTab() {
    const warrantyLabels = linkedTenants.map(tenantWarrantyHeaderLabel)
    const underContractCount = warrantyLabels.filter((label) => label === 'Under Contract').length
    const outOfContractCount = warrantyLabels.filter((label) => label === 'Out Of Contract').length

    return (
      <CollapsibleSection
        title="Tenants"
        subtitle="Read-only tenant links for this Project. Tenant creation remains available only from the linked System Form."
        collapsed={collapsedSections.tenants}
        onToggle={() => toggleSection('tenants')}
        className="space-y-3 p-3"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {renderWorkspaceMetric('Linked Tenants', workspaceTenantSummary?.linkedTenants ?? 0, workspaceTenantSummary?.missingTenantCreation ? 'warning' : 'default')}
          {renderWorkspaceMetric('Customer Tenants', workspaceTenantSummary?.customerTenants ?? 0)}
          {renderWorkspaceMetric('POC Tenants', workspaceTenantSummary?.pocTenants ?? 0)}
          {renderWorkspaceMetric('Missing Tenant Creation', workspaceTenantSummary?.missingTenantCreation ? 'Yes' : 'No', workspaceTenantSummary?.missingTenantCreation ? 'warning' : 'default')}
          {renderWorkspaceMetric('Under Contract', underContractCount)}
          {renderWorkspaceMetric('Out Of Contract', outOfContractCount, outOfContractCount > 0 ? 'warning' : 'default')}
        </div>

        {linkedTenants.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['TID', 'Tenant Name', 'System SID/MID', 'Delivery PID', 'Product', 'Hosting', 'Operational Status', 'Warranty Header Status', 'Source Requirement ID'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedTenants.map((tenant) => {
                  const system = systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId)
                  return (
                    <tr key={tenant.id} className="hover:bg-sf-surface-alt">
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        <span className="inline-flex items-center gap-2">
                          <LinkId to={`/tenants/${tenant.tid}`}>{tenant.tid}</LinkId>
                          <RecordChangeBadge record={tenant} />
                        </span>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        <LinkId to={`/tenants/${tenant.tid}`}>{tenant.tenantName}</LinkId>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        {system ? <LinkId to={systemRoutePath(system)}>{system.sid ?? system.machineId ?? ''}</LinkId> : null}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                        {tenant.deliveryPid ? <LinkId to={`/projects/${tenant.deliveryPid}`}>{tenant.deliveryPid}</LinkId> : null}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.productType}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.hostingType}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.operationalStatus}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenantWarrantyHeaderLabel(tenant)}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.sourceRequirementId ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No tenants are linked to this Project yet.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ProjectStatusBadge status={projectDraft.progressStatus} large />
            <span>{`Project ${projectDraft.pid}`}</span>
          </span>
        }
        subtitle={`${projectDraft.mainType} / ${projectDraft.subType} - ${formMetadata.sourceSheet}`}
        actions={renderActionButtons()}
      />

      {saveMessages.length > 0 ? (
        <div className={saveMessages.some((message) => message.includes('required')) ? 'mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700' : 'mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700'}>
          {saveMessages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      ) : null}

      <CollapsibleSection
        title="Project header"
        subtitle="Excel section 2 metadata for this Project type/subtype."
        collapsed={collapsedSections.projectHeader}
        onToggle={() => toggleSection('projectHeader')}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(0, 8).map(renderHeaderField)}</div>
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(8, 15).map(renderHeaderField)}</div>
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(15).map(renderHeaderField)}</div>
          {linkedOpportunity ? (
            <Link className="text-sm font-medium text-sf-brand hover:underline" to={`/opportunities/${linkedOpportunity.opportunityId}`}>
              Open linked Opportunity
            </Link>
          ) : null}
        </div>
      </CollapsibleSection>

      <div className="mt-4 rounded border border-sf-border bg-sf-surface">
        <div className="flex flex-wrap border-b border-sf-border">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-base font-semibold',
                activeTab === tab
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveTab(tab)}
            >
              {projectTabLabel(tab)}
            </button>
          ))}
        </div>
        <div className="min-h-[360px]" role="tabpanel" aria-label={projectTabLabel(activeTab)}>
          {activeTab === 'overview'
            ? renderOverviewTab()
            : activeTab === 'requirements'
              ? renderRequirementsTab()
              : activeTab === 'systems'
                ? renderSystemsTab()
                : activeTab === 'tenants'
                  ? renderTenantsTab()
                  : activeTab === 'milestones'
                    ? renderMilestonesTab()
                    : activeTab === 'tasks'
                      ? renderTasksTab()
                      : activeTab === 'documents'
                        ? renderDocumentsTab()
                        : activeTab === 'activity'
                          ? renderActivityTab()
                          : renderPlaceholderTab(activeTab)}
        </div>
      </div>
      {renderAddMilestoneDialog()}
      {renderMilestoneDialog()}
      {renderAllocationDialog()}
    </div>
  )
}
