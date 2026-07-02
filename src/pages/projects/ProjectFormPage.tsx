import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, GripVertical, Link2, Plus, Trash2, X } from 'lucide-react'
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
import { BusinessObjectLink, FormField, PlaceholderCard, ProgressBar, RichTextContent, RichTextEditor } from '@/components/ui'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { ActivityTimeline } from '@/components/activity'
import { TenantDeliveryTable } from '@/components/tenants/TenantDeliveryTable'
import { SystemDeliveryTable } from '@/components/systems'
import { configurationColumnGroupLabel } from '@/components/configuration'
import { useAppStore } from '@/store/useAppStore'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import {
  allocationModeLabelForProject,
  allowedAllocationModes,
  availableProductionCandidates,
  availableReusedInternalCandidates,
  requestedSystemCandidatesForProject,
  type AllocationActionResult,
  type AllocationMode,
} from '@/domain/allocation-context'
import {
  linkedOpportunityForProject,
  projectTypeForOpportunity,
} from '@/domain/opportunity-lifecycle'
import { opportunityReference, systemReference } from '@/domain/business-reference'
import {
  alertPresentationForDeadline,
  errorMessageClassName,
  operationalStatusPresentation,
  projectStatusPresentation,
  successMessageClassName,
  taskStatusPresentation,
} from '@/domain/status-presentation'
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
  projectPatchFromOpportunitySelection,
  projectSavePatch,
  projectStatusLabel,
  systemProductMismatchForProject,
  validateProjectSave,
} from '@/domain/project-lifecycle'
import { activityEventsForProject } from '@/domain/activity-log'
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

type CollapsibleSectionId = 'projectHeader' | 'requirements' | 'milestones' | 'tasks' | 'systems' | 'tenants' | 'documents' | 'activity'
type AllocationCandidate = ProductionSystemInventoryItem | ReusedInternalSystem | System
type AllocationCandidateSortKey = 'id' | 'mid' | 'source' | 'status' | 'product' | 'cloudPlatform' | 'csp' | 'region'
type AllocationCandidateFilterKey =
  | 'hostingType'
  | 'cloudPlatform'
  | 'regionTimeGroup'
type AllocationCandidateFilters = Record<AllocationCandidateFilterKey, string>
type NewMilestoneTaskDraft = Pick<NonNullable<Project['tasks']>[number], 'name' | 'department' | 'resource' | 'status' | 'deadline' | 'comment'>

const ALLOCATION_CANDIDATE_SORT_OPTIONS: Array<{ key: AllocationCandidateSortKey; label: string }> = [
  { key: 'id', label: 'ID' },
  { key: 'mid', label: 'MID' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'product', label: 'Product' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'region', label: 'Region / Time Group' },
]

const EMPTY_ALLOCATION_CANDIDATE_FILTERS: AllocationCandidateFilters = {
  regionTimeGroup: '',
  hostingType: '',
  cloudPlatform: '',
}

const ALLOCATION_CANDIDATE_FILTER_OPTIONS: Array<{ key: AllocationCandidateFilterKey; label: string }> = [
  { key: 'hostingType', label: 'Hosting' },
  { key: 'cloudPlatform', label: 'Cloud Platform' },
  { key: 'regionTimeGroup', label: 'Region / Time Group' },
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

function candidateRegionTimeGroup(candidate: AllocationCandidate): string {
  if ('usedInRegion' in candidate && candidate.usedInRegion) return candidate.usedInRegion
  if ('region' in candidate && candidate.region) return candidate.region
  if ('timeGroup' in candidate && candidate.timeGroup) return candidate.timeGroup
  return ''
}

function candidateCloudRegion(candidate: AllocationCandidate): string {
  return candidate.cloudRegion ?? ''
}

function candidateAvailability(candidate: AllocationCandidate): string {
  if ('availability' in candidate && candidate.availability) return candidate.availability
  if ('allocationStatus' in candidate && candidate.allocationStatus) return String(candidate.allocationStatus)
  return ''
}

function candidateVersion(candidate: AllocationCandidate): string {
  const value = (candidate as AllocationCandidate & { versionNumber?: string | number | null }).versionNumber
  return value ? String(value) : ''
}

function candidateFilterValue(candidate: AllocationCandidate, filterKey: AllocationCandidateFilterKey): string {
  const values: Record<AllocationCandidateFilterKey, string> = {
    hostingType: candidate.hostingType,
    cloudPlatform: candidate.cloudPlatform ?? '',
    regionTimeGroup: candidateRegionTimeGroup(candidate),
  }
  return values[filterKey]
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
    region: candidateRegionTimeGroup(candidate),
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
  return result.ok ? successMessageClassName() : errorMessageClassName()
}

function candidateFilterOptions(candidates: AllocationCandidate[], filterKey: AllocationCandidateFilterKey): string[] {
  return Array.from(new Set(candidates.map((candidate) => candidateFilterValue(candidate, filterKey)).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
}

function candidateMatchesStructuredFilters(candidate: AllocationCandidate, filters: AllocationCandidateFilters): boolean {
  return ALLOCATION_CANDIDATE_FILTER_OPTIONS.every((filter) => {
    const filterValue = filters[filter.key]
    return filterValue ? candidateFilterValue(candidate, filter.key) === filterValue : true
  })
}

function ProjectStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const presentation = projectStatusPresentation(status)
  const Icon = presentation.icon
  if (large) {
    return <Icon className={['h-8 w-8 stroke-[3.5]', presentation.iconClassName].join(' ')} aria-label={presentation.tooltip} />
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sf-text">
      <Icon className={['h-4 w-4 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      <span>{projectStatusLabel(status)}</span>
    </span>
  )
}

function OperationalStatusBadge({ status }: { status: string }) {
  const presentation = operationalStatusPresentation(status)
  const Icon = presentation.icon

  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <Icon className={['h-5 w-5 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      <span>{presentation.label}</span>
    </span>
  )
}

function TaskStatusIcon({ status }: { status: 'OPEN' | 'DONE' }) {
  const presentation = taskStatusPresentation(status)
  const Icon = presentation.icon
  return <Icon className={['h-8 w-8 stroke-[3.5]', presentation.iconClassName].join(' ')} aria-label={presentation.tooltip} />
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
      <button type="button" className="sf-view-mode-allow flex min-w-0 items-start gap-2 text-left" onClick={onToggle} aria-expanded={!collapsed}>
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
          <table className="w-max min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {section.columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                    <span>
                      {column.label}
                      {column.required ? <span className="ml-0.5 text-red-600">*</span> : null}
                      {column.requiredWhen && column.key !== 'existingSystemId' ? <span className="ml-0.5 text-red-600">*</span> : null}
                    </span>
                    {column.key !== 'existingSystemId' ? <span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(column)}</span> : null}
                    {column.requiredWhen && column.key !== 'existingSystemId' ? (
                      <span className="block whitespace-nowrap text-xs font-normal leading-tight text-red-700">
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
                    <td key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-px align-top text-sm text-sf-text">
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

export function ProjectFormPage() {
  const { pid } = useParams<{ pid: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isViewMode = (location.state as { mode?: string } | null)?.mode === 'view'
  const projects = useAppStore((state) => state.projects)
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const tenants = useAppStore((state) => state.tenants)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const updateProject = useAppStore((state) => state.updateProject)
  const allocateProductionSystemToProject = useAppStore((state) => state.allocateProductionSystemToProject)
  const allocateReusedInternalSystemToProject = useAppStore((state) => state.allocateReusedInternalSystemToProject)
  const linkExistingSystemToProject = useAppStore((state) => state.linkExistingSystemToProject)
  const deallocateProjectSystem = useAppStore((state) => state.deallocateProjectSystem)
  const savedProject = useMemo(() => projects.find((project) => project.pid === pid), [pid, projects])
  const {
    value: draft,
    setValue: setDraft,
    reset: resetDraft,
    undo: undoDraft,
    canUndo,
  } = useUndoHistory<Project | null>(savedProject ? cloneProjectDraft(savedProject) : null, {
    clone: (value) => (value ? cloneProjectDraft(value) : value),
    isEqual: valuesEqual,
  })
  const [activeTab, setActiveTab] = useState<ProjectFormTab>('milestones')
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('PRODUCTION')
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([])
  const [allocationCandidateSearch, setAllocationCandidateSearch] = useState('')
  const [allocationCandidateFilters, setAllocationCandidateFilters] = useState<AllocationCandidateFilters>(EMPTY_ALLOCATION_CANDIDATE_FILTERS)
  const [allocationCandidateSortKey, setAllocationCandidateSortKey] = useState<AllocationCandidateSortKey>('id')
  const [allocationCandidateSortDirection, setAllocationCandidateSortDirection] = useState<'asc' | 'desc'>('asc')
  const [allocationResult, setAllocationResult] = useState<AllocationActionResult | null>(null)
  const [expandedLinkedSystemIds, setExpandedLinkedSystemIds] = useState<string[]>([])
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)

  useEffect(() => {
    resetDraft(savedProject ? cloneProjectDraft(savedProject) : null)
  }, [savedProject, resetDraft])

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
    return linkedSystemsForProject(currentDraft, systems, activeSystemLinks, linkedOpportunity, tenants)
  }, [activeSystemLinks, currentDraft, linkedOpportunity, systems, tenants])
  const linkedTenants = useMemo(() => {
    return linkedTenantsForProject(currentDraft, linkedSystems, projectTenants, tenants, linkedOpportunity)
  }, [currentDraft, linkedOpportunity, linkedSystems, projectTenants, tenants])
  const projectActivityEvents = useMemo(() => {
    if (!currentDraft) return []
    return activityEventsForProject(activityEvents, currentDraft.pid || currentDraft.id)
  }, [activityEvents, currentDraft])
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
        : requestedSystemCandidatesForProject(projectDraft, linkedOpportunity, systems, projectSystems)
  const trimmedAllocationCandidateSearch = allocationCandidateSearch.trim().toLowerCase()
  const allocationCandidateFilterValues = useMemo(
    () =>
      Object.fromEntries(
        ALLOCATION_CANDIDATE_FILTER_OPTIONS.map((filter) => [
          filter.key,
          candidateFilterOptions(availableAllocationCandidates, filter.key),
        ]),
      ) as Record<AllocationCandidateFilterKey, string[]>,
    [availableAllocationCandidates],
  )
  const visibleAllocationCandidates = [...availableAllocationCandidates]
    .filter((candidate) =>
      trimmedAllocationCandidateSearch ? candidateSearchText(candidate).includes(trimmedAllocationCandidateSearch) : true,
    )
    .filter((candidate) => candidateMatchesStructuredFilters(candidate, allocationCandidateFilters))
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
    if (isViewMode) return
    const initialMode = permittedAllocationModes[0]
    setAllocationMode(initialMode)
    setSelectedAllocationIds([])
    setAllocationCandidateSearch('')
    setAllocationCandidateFilters(EMPTY_ALLOCATION_CANDIDATE_FILTERS)
    setAllocationCandidateSortKey('id')
    setAllocationCandidateSortDirection('asc')
    setAllocationResult(null)
    setIsAllocationDialogOpen(true)
  }

  function changeAllocationMode(mode: AllocationMode) {
    if (isViewMode) return
    setAllocationMode(mode)
    setSelectedAllocationIds([])
    setAllocationCandidateSearch('')
    setAllocationCandidateFilters(EMPTY_ALLOCATION_CANDIDATE_FILTERS)
    setAllocationResult(null)
  }

  function confirmAllocation() {
    if (isViewMode) return
    if (selectedAllocationIds.length === 0) {
      setAllocationResult({ ok: false, message: 'Select at least one system before allocating.' })
      return
    }

    const results = selectedAllocationIds.map((candidateId) =>
      selectedMode === 'PRODUCTION'
        ? allocateProductionSystemToProject(projectDraft.id, candidateId)
        : selectedMode === 'REUSED_INTERNAL'
          ? allocateReusedInternalSystemToProject(projectDraft.id, candidateId)
          : linkExistingSystemToProject(projectDraft.id, candidateId),
    )
    const failedResults = results.filter((result) => !result.ok)
    const successCount = results.length - failedResults.length
    const result =
      failedResults.length > 0
        ? {
            ok: false,
            message: [
              successCount > 0 ? `${successCount} system${successCount === 1 ? '' : 's'} allocated.` : null,
              ...failedResults.map((failed) => failed.message),
            ].filter(Boolean).join(' '),
          }
        : {
            ok: true,
            message: `${successCount} system${successCount === 1 ? '' : 's'} allocated.`,
          }

    setAllocationResult(result)
    if (result.ok) {
      setIsAllocationDialogOpen(false)
      setSelectedAllocationIds([])
    }
  }

  function toggleAllocationCandidate(candidateId: string, selected: boolean) {
    if (isViewMode) return
    setSelectedAllocationIds((current) => {
      const next = new Set(current)
      if (selected) {
        next.add(candidateId)
      } else {
        next.delete(candidateId)
      }
      return Array.from(next)
    })
  }

  function deallocateSystem(link: ProjectSystemLink) {
    if (isViewMode) return
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
    if (isViewMode) return
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
    if (isViewMode) return
    const messages = validateProjectSave(projectDraft)
    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    updateProject(projectDraft.id, projectSavePatch(projectDraft))
    setSaveMessages(['Project saved.'])
    setSaveMenuOpen(false)
    const returnTo = typeof location.state === 'object' && location.state && 'returnTo' in location.state
      ? String(location.state.returnTo ?? '')
      : ''
    if (!stayOnPage && returnTo) navigate(returnTo)
  }

  function revertProject() {
    resetDraft(cloneProjectDraft(persistedProject))
    setSaveMessages([])
  }

  function cancelProject() {
    resetDraft(cloneProjectDraft(persistedProject))
    navigate('/projects')
  }

  function renderHeaderField(field: ProjectHeaderFieldMetadata) {
    const isChanged = fieldChanged(field.key)
    const isMissing = missingFields.has(field.key)
    const value = headerFieldValue(projectDraft, field.key)
    const isManualProjectWithoutOpportunity = !linkedOpportunity && !projectDraft.opportunityId
    const isProjectTypeField = field.key === 'mainType' || field.key === 'subType'
    const isEditable = field.editable || (isManualProjectWithoutOpportunity && !isProjectTypeField)
    const label = (
      <>
        {field.label}
        {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </>
    )

    if (!isEditable) {
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
    function switchToEditMode() {
      const currentState = typeof location.state === 'object' && location.state ? location.state : {}
      navigate(`${location.pathname}${location.search}`, { replace: true, state: { ...currentState, mode: 'edit' } })
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {isViewMode ? (
          <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={switchToEditMode}>
            Edit
          </button>
        ) : null}
        {isViewMode ? null : (
          <>
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
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt disabled:opacity-50" disabled={!canUndo} onClick={undoDraft}>
              Undo
            </button>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" disabled={!isDirty} onClick={revertProject}>
              Revert
            </button>
          </>
        )}
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={cancelProject}>
          {isViewMode ? 'Back' : 'Cancel'}
        </button>
      </div>
    )
  }

  function renderRequirementsSection() {
    const requirementSections = completeProjectRequirementSections(formMetadata.requirementSections, linkedOpportunity)
    return (
      <CollapsibleSection
        title="Requirements"
        subtitle={`Read-only live requirements from ${linkedOpportunity?.opportunityName ?? 'the linked Opportunity'}.`}
        collapsed={collapsedSections.requirements}
        onToggle={() => toggleSection('requirements')}
        className="space-y-3 p-3"
      >
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
    if (isViewMode) return
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
    if (isViewMode) return
    setDraft((current) => (current ? updateTaskOrderInPlan(current, taskId, order) : current))
    setSaveMessages([])
  }

  function dropTaskOnOrder(targetTaskId: string, targetOrder: number) {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return
    const draggedTask = projectDraft.tasks?.find((task) => task.id === draggedTaskId)
    const targetTask = projectDraft.tasks?.find((task) => task.id === targetTaskId)
    if (!draggedTask || !targetTask || draggedTask.milestoneId !== targetTask.milestoneId) {
      setDraggedTaskId(null)
      setDragOverTaskId(null)
      return
    }

    updateTaskOrder(draggedTaskId, targetOrder)
    setDraggedTaskId(null)
    setDragOverTaskId(null)
  }

  function updateMilestone(milestoneId: string, patch: Partial<NonNullable<Project['milestones']>[number]>) {
    if (isViewMode) return
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
    if (isViewMode) return
    setDraft((current) => (current ? updateTaskInPlan(current, taskId, patch) : current))
    setSaveMessages([])
  }

  function openAddMilestoneDialog() {
    if (isViewMode) return
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
    const label = milestoneDeadlineAlertLabel(alertStatus)
    const presentation = alertPresentationForDeadline(alertStatus)
    const Icon = presentation.icon

    return (
      <span className="inline-flex items-center gap-1.5 font-semibold" title={label}>
        <Icon className={['h-5 w-5 stroke-[2.5]', presentation.iconClassName].join(' ')} aria-label={label} />
        <span className={presentation.iconClassName}>{label}</span>
      </span>
    )
  }

  function orderedMilestones(project: Project) {
    return orderedProjectMilestones(project)
  }

  function orderedTasks(project: Project) {
    return orderedProjectTasks(project)
  }

  function updateTaskCompletion(taskId: string, completed: boolean) {
    if (isViewMode) return
    setDraft((current) => (current ? updateTaskInPlan(current, taskId, { status: completed ? 'DONE' : 'OPEN' }) : current))
    setSaveMessages([])
  }

  function updateMilestoneTasksCompletion(milestoneId: string, completed: boolean) {
    if (isViewMode) return
    setDraft((current) => {
      if (!current) return current
      const taskIds = (current.tasks ?? [])
        .filter((task) => task.milestoneId === milestoneId)
        .map((task) => task.id)
      return taskIds.reduce(
        (nextProject, taskId) => updateTaskInPlan(nextProject, taskId, { status: completed ? 'DONE' : 'OPEN' }),
        current,
      )
    })
    setSaveMessages([])
  }

  function renderMilestonesTab() {
    const sectionId: CollapsibleSectionId = 'milestones'
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
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
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
                      <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-xs font-semibold text-sf-text-muted">
                        {milestone.order}
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
                      <td className="max-w-72 whitespace-normal border border-sf-border px-1.5 py-1 text-sf-text"><RichTextContent value={milestone.comment ?? ''} /></td>
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
    const sectionId: CollapsibleSectionId = 'tasks'
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
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
            <table className="table-auto border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Done', 'Move', 'Milestone', 'Order', 'Task', 'Department', 'Resource', 'Status', 'Comment', 'Deadline', 'DL Alert'].map((label) => (
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
                  const milestoneTasks = startsMilestoneGroup
                    ? tasks.filter((candidate) => candidate.milestoneId === task.milestoneId)
                    : []
                  const allMilestoneTasksDone = milestoneTasks.length > 0 && milestoneTasks.every((candidate) => candidate.status === 'DONE')
                  const someMilestoneTasksDone = milestoneTasks.some((candidate) => candidate.status === 'DONE')
                  const isMilestonePartial = someMilestoneTasksDone && !allMilestoneTasksDone

                  return (
                    <Fragment key={task.id}>
                      {startsMilestoneGroup ? (
                        <tr className="border-t-2 border-sf-border bg-sf-surface-alt/70">
                          <td colSpan={11} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sf-text-muted">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={allMilestoneTasksDone}
                                ref={(element) => {
                                  if (element) element.indeterminate = isMilestonePartial
                                }}
                                onChange={(event) => updateMilestoneTasksCompletion(task.milestoneId, event.target.checked)}
                                aria-label={`Mark all tasks in ${milestone?.name ?? 'unassigned milestone'} ${allMilestoneTasksDone ? 'open' : 'done'}`}
                              />
                              {milestone?.name ?? 'Unassigned milestone'}
                            </label>
                          </td>
                        </tr>
                      ) : null}
                      <tr
                        className={[
                          'hover:bg-sf-surface-alt',
                          dragOverTaskId === task.id ? 'bg-amber-50 outline outline-2 outline-amber-300' : '',
                        ].filter(Boolean).join(' ')}
                        onDragOver={(event) => {
                          const draggedTask = projectDraft.tasks?.find((candidate) => candidate.id === draggedTaskId)
                          if (!draggedTaskId || draggedTaskId === task.id || draggedTask?.milestoneId !== task.milestoneId) return
                          event.preventDefault()
                          setDragOverTaskId(task.id)
                        }}
                        onDragLeave={() => setDragOverTaskId((current) => current === task.id ? null : current)}
                        onDrop={(event) => {
                          event.preventDefault()
                          dropTaskOnOrder(task.id, task.order)
                        }}
                      >
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-sf-text">
                          <input
                            type="checkbox"
                            checked={task.status === 'DONE'}
                            onChange={(event) => updateTaskCompletion(task.id, event.target.checked)}
                            aria-label={`Mark ${task.name} ${task.status === 'DONE' ? 'open' : 'done'}`}
                          />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-sf-text">
                          <button
                            type="button"
                            className="inline-flex cursor-grab items-center justify-center rounded border border-sf-border bg-white p-1 text-sf-text-muted hover:bg-sf-surface-alt active:cursor-grabbing"
                            draggable
                            aria-label={`Drag ${task.name}`}
                            title="Drag to reorder task within this milestone"
                            onDragStart={(event) => {
                              setDraggedTaskId(task.id)
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('text/plain', task.id)
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null)
                              setDragOverTaskId(null)
                            }}
                          >
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{milestone?.name ?? ''}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-xs font-semibold text-sf-text-muted">
                          {task.order}
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{task.name}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{task.department}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{task.resource}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{renderTaskStatusSelect(task)}</td>
                        <td className="w-64 min-w-64 max-w-72 whitespace-normal border border-sf-border px-1 py-1 text-sf-text">
                          <RichTextEditor value={task.comment ?? ''} onChange={(value) => updateTask(task.id, { comment: value })} minHeightClassName="min-h-10" toolbarMode="focus" />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">
                          <input
                            className="h-7 w-36 rounded border border-sf-border px-2 py-1 text-sm"
                            type="date"
                            value={task.deadline ?? ''}
                            onChange={(event) => updateTask(task.id, { deadline: event.target.value || null })}
                          />
                        </td>
                        <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-sf-text">{renderDeadlineAlert(task.deadline, task.status)}</td>
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
        <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-milestone-title">
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
                <RichTextEditor value={newMilestoneComment} onChange={setNewMilestoneComment} minHeightClassName="min-h-16" />
              </FormField>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-sf-text">Initial tasks</h3>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={addMilestoneTaskDraft}>
                  + Add task
                </button>
              </div>
              <div className="rounded border border-sf-border bg-white">
                <table className="w-full table-auto border-collapse text-sm leading-tight">
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
                        <td className="border border-sf-border px-1 py-1">
                          <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.name} onChange={(event) => updateMilestoneTaskDraft(index, { name: event.target.value })} />
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
                        <td className="w-64 border border-sf-border px-1 py-1">
                          <RichTextEditor value={task.comment ?? ''} onChange={(value) => updateMilestoneTaskDraft(index, { comment: value })} minHeightClassName="min-h-16" />
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
                <RichTextEditor value={milestone.comment ?? ''} onChange={(value) => updateMilestone(milestone.id, { comment: value })} minHeightClassName="min-h-16" />
              </FormField>
            </div>
            <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => addTaskToMilestone(milestone.id)}>
                + Add task
              </button>
            </div>
            <table className="table-auto border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Done', 'Move', 'Order', 'Task', 'Department', 'Resource', 'Deadline', 'Status', 'Comment', 'Action'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className={dragOverTaskId === task.id ? 'bg-amber-50 outline outline-2 outline-amber-300' : ''}
                    onDragOver={(event) => {
                      const draggedTask = projectDraft.tasks?.find((candidate) => candidate.id === draggedTaskId)
                      if (!draggedTaskId || draggedTaskId === task.id || draggedTask?.milestoneId !== task.milestoneId) return
                      event.preventDefault()
                      setDragOverTaskId(task.id)
                    }}
                    onDragLeave={() => setDragOverTaskId((current) => current === task.id ? null : current)}
                    onDrop={(event) => {
                      event.preventDefault()
                      dropTaskOnOrder(task.id, task.order)
                    }}
                  >
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={task.status === 'DONE'}
                        onChange={(event) => updateTaskCompletion(task.id, event.target.checked)}
                        aria-label={`Mark ${task.name} ${task.status === 'DONE' ? 'open' : 'done'}`}
                      />
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center">
                      <button
                        type="button"
                        className="inline-flex cursor-grab items-center justify-center rounded border border-sf-border bg-white p-1 text-sf-text-muted hover:bg-sf-surface-alt active:cursor-grabbing"
                        draggable
                        aria-label={`Drag ${task.name}`}
                        title="Drag to reorder task within this milestone"
                        onDragStart={(event) => {
                          setDraggedTaskId(task.id)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', task.id)
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null)
                          setDragOverTaskId(null)
                        }}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                    <td className="whitespace-nowrap border border-sf-border px-1 py-1 text-center text-xs font-semibold text-sf-text-muted">
                      {task.order}
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
                      <RichTextEditor value={task.comment ?? ''} onChange={(value) => updateTask(task.id, { comment: value })} minHeightClassName="min-h-16" />
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

  function renderDocumentsTab() {
    const sectionId: CollapsibleSectionId = 'documents'
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
          readOnly={isViewMode}
          onChange={(documents) => {
            if (isViewMode) return
            setDraft((current) => (current ? { ...current, documents } : current))
            setSaveMessages([])
          }}
        />
      </CollapsibleSection>
    )
  }

  function renderActivityTab() {
    const sectionId: CollapsibleSectionId = 'activity'
    return (
      <CollapsibleSection
        title="Activity"
        subtitle="Read-only Project activity timeline from ActivityLog."
        collapsed={collapsedSections[sectionId]}
        onToggle={() => toggleSection(sectionId)}
        className="space-y-3 p-3"
      >
        <ActivityTimeline
          events={projectActivityEvents}
          emptyText="No activity events are linked to this Project yet."
        />
      </CollapsibleSection>
    )
  }

  function renderAllocationDialog() {
    if (!isAllocationDialogOpen) return null
    const isReusedInternalAllocationMode = selectedMode === 'REUSED_INTERNAL'
    const allocationCandidateHeaders = [
      'Select',
      ...(isReusedInternalAllocationMode ? ['MID'] : ['ID', 'MID']),
      'Source',
      'Status',
      'Region / Time Group',
      'Country',
      'Product',
      'Hosting',
      'Cloud Platform',
      'Cloud Region',
      'Availability',
      'Version',
    ]

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-8">
        <div className="flex h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="project-allocation-title">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="project-allocation-title" className="text-xl font-semibold text-sf-text">Allocate system</h2>
              <p className="text-sm text-sf-text-muted">Create a Project to System link for {projectDraft.pid}. Tenants are created later from the System Form.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close allocation dialog" onClick={() => setIsAllocationDialogOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
                  {allocationModeLabelForProject(mode, projectDraft)}
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
                  {ALLOCATION_CANDIDATE_FILTER_OPTIONS.map((filter) => {
                    const options = allocationCandidateFilterValues[filter.key]
                    if (options.length === 0) return null
                    return (
                      <label key={filter.key} className="block text-sm font-medium text-sf-text">
                        {filter.label}
                        <select
                          className="mt-1 h-8 max-w-44 rounded border border-sf-border px-2 text-sm"
                          value={allocationCandidateFilters[filter.key]}
                          onChange={(event) =>
                            setAllocationCandidateFilters((current) => ({
                              ...current,
                              [filter.key]: event.target.value,
                            }))
                          }
                        >
                          <option value="">All</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  })}
                  {Object.values(allocationCandidateFilters).some(Boolean) ? (
                    <button
                      type="button"
                      className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                      onClick={() => setAllocationCandidateFilters(EMPTY_ALLOCATION_CANDIDATE_FILTERS)}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
                <div className="sf-scroll-x rounded border border-sf-border bg-white">
                <table className="min-w-full border-collapse text-sm leading-tight">
                  <thead className="bg-sf-surface-alt text-left">
                    <tr>
                      {allocationCandidateHeaders.map((label) => (
                        <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAllocationCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-sf-surface-alt">
                        <td className="border border-sf-border px-1.5 py-1">
                          <input
                            type="checkbox"
                            checked={selectedAllocationIds.includes(candidate.id)}
                            onChange={(event) => toggleAllocationCandidate(candidate.id, event.target.checked)}
                          />
                        </td>
                        {isReusedInternalAllocationMode ? (
                          <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateMachineId(candidate) || candidatePrimaryId(candidate)}</td>
                        ) : (
                          <>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidatePrimaryId(candidate)}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateMachineId(candidate)}</td>
                          </>
                        )}
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateSource(candidate)}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateStatus(candidate)}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{candidateRegionTimeGroup(candidate) || '-'}</td>
                        <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{'country' in candidate ? candidate.country || '-' : '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.productType || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.hostingType || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidate.cloudPlatform || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateCloudRegion(candidate) || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateAvailability(candidate) || '-'}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateVersion(candidate) || '-'}</td>
                      </tr>
                    ))}
                    {visibleAllocationCandidates.length === 0 ? (
                      <tr>
                        <td className="border border-sf-border px-1.5 py-4 text-center text-sm text-sf-text-muted" colSpan={allocationCandidateHeaders.length}>
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
              disabled={selectedAllocationIds.length === 0}
              onClick={confirmAllocation}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderSystemsTenantsSection() {
    const tenantSections = [
      {
        title: 'Under Contract',
        rows: linkedTenants.filter((tenant) => tenant.warrantyStatus !== 'OUT_OF_CONTRACT' && tenant.contractStatus !== 'OUT_OF_CONTRACT'),
      },
      {
        title: 'Out of Contract',
        rows: linkedTenants.filter((tenant) => tenant.warrantyStatus === 'OUT_OF_CONTRACT' || tenant.contractStatus === 'OUT_OF_CONTRACT'),
      },
    ]

    return (
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sf-text-muted">
            Allocation creates Project to System links only. It does not create tenants.
          </p>
          {isViewMode ? null : (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-sf-brand bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={openAllocationDialog}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Allocate System
            </button>
          )}
        </div>

        {allocationResult && !isAllocationDialogOpen ? <div className={allocationStatusClassName(allocationResult)}>{allocationResult.message}</div> : null}

        <CollapsibleSection
          title="Systems"
          subtitle="Project-to-System allocation context. Allocation rules remain owned by AllocationContext and SystemInventory."
          collapsed={collapsedSections.systems}
          onToggle={() => toggleSection('systems')}
          className="space-y-2"
        >
          <SystemDeliveryTable
            systems={linkedSystems}
            projects={projects}
            fallbackProjectId={projectDraft.id}
            emptyText="No systems are linked to this Project yet."
            expandedSystemIds={expandedLinkedSystemIds}
            onToggleDetails={toggleLinkedSystemDetails}
            renderOperationalStatus={(status) => <OperationalStatusBadge status={status} />}
            productMismatch={(system) => systemProductMismatchForProject(system, linkedOpportunity)}
            actions={(system) => {
              const link = activeSystemLinkBySystemId.get(system.id)
              return (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
                    onClick={() => {
                      const routePath = systemReference(system).routePath
                      if (routePath) navigate(routePath, { state: { mode: isViewMode ? 'view' : 'edit' } })
                    }}
                  >
                    {isViewMode ? 'View' : 'Edit'}
                  </button>
                  {link && !isViewMode ? (
                    <button
                      type="button"
                      className="ml-1 inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      onClick={() => deallocateSystem(link)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Deallocate
                    </button>
                  ) : null}
                </>
              )
            }}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Tenants"
          subtitle="Project tenant context. Tenant facts remain owned by TenantOperations and warranty facts remain owned by WarrantyCollection."
          collapsed={collapsedSections.tenants}
          onToggle={() => toggleSection('tenants')}
          className="space-y-3"
        >
          {tenantSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-sm font-semibold text-sf-text">{section.title}</h4>
              {section.rows.length > 0 ? (
                <TenantDeliveryTable
                  tenants={section.rows}
                  systems={systems}
                  emptyText={`No ${section.title.toLowerCase()} tenants are linked to this Project.`}
                />
              ) : (
                <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
                  No {section.title.toLowerCase()} tenants are linked to this Project.
                </div>
              )}
            </div>
          ))}
        </CollapsibleSection>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
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

      <div className={['sf-form-content-scroll min-h-0 flex-1 pb-2 pr-1', isViewMode ? 'sf-view-mode' : ''].filter(Boolean).join(' ')}>
      {saveMessages.length > 0 ? (
        <div className={saveMessages.some((message) => message.includes('required')) ? 'mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700' : 'mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700'}>
          {saveMessages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      ) : null}

      <CollapsibleSection
        title="Delivery Profile"
        subtitle="Project-owned delivery profile with read-only Customer and Opportunity context."
        collapsed={collapsedSections.projectHeader}
        onToggle={() => toggleSection('projectHeader')}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(0, 8).map(renderHeaderField)}</div>
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(8, 15).map(renderHeaderField)}</div>
          <div className="flex flex-wrap items-start gap-3">{formMetadata.headerFields.slice(15).map(renderHeaderField)}</div>
          {linkedOpportunity ? (
            <BusinessObjectLink reference={opportunityReference(linkedOpportunity)} className="text-sm">
              Open linked Opportunity
            </BusinessObjectLink>
          ) : null}
        </div>
      </CollapsibleSection>

      <div className="mt-4 space-y-4">{renderRequirementsSection()}</div>

      <div className="mt-4 rounded border border-sf-border bg-sf-surface">
        <div className="sticky top-0 z-10 flex flex-wrap border-b border-sf-border bg-sf-surface">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={[
                'sf-view-mode-allow border-b-2 px-4 py-2 text-base font-semibold',
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
          {activeTab === 'milestones'
            ? renderMilestonesTab()
            : activeTab === 'tasks'
              ? renderTasksTab()
              : activeTab === 'systemsTenants'
                ? renderSystemsTenantsSection()
                : activeTab === 'activity'
                  ? renderActivityTab()
                  : renderDocumentsTab()}
        </div>
      </div>
      </div>
      {renderAddMilestoneDialog()}
      {renderMilestoneDialog()}
      {renderAllocationDialog()}
    </div>
  )
}
