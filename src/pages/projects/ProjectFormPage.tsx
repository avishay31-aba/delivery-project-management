import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronRight, CirclePlay, Link2, Plus, Trash2, X } from 'lucide-react'
import {
  getProjectFormMetadata,
  projectTabLabel,
  type ProjectFormTab,
  type ProjectHeaderFieldMetadata,
  type ProjectRequirementSectionKind,
  type ProjectRequirementSectionMetadata,
} from '@/config/project-form-metadata'
import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  ProductionSystemInventoryItem,
  Project,
  ProjectMainType,
  ProjectSubType,
  ProjectSystemLink,
  ReusedInternalSystem,
  StandardRenewalRequirement,
  System,
  Tenant,
} from '@/data/seed.types'
import {
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
import { PageHeader } from '@/components/record'
import { FormField, PlaceholderCard } from '@/components/ui'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { type AllocationActionResult, useAppStore } from '@/store/useAppStore'
import {
  PROJECT_MILESTONE_TASK_TEMPLATES,
  buildProjectMilestonesAndTasks,
  orderedProjectMilestones,
  orderedProjectTasks,
  projectMilestoneStatus,
  projectMilestoneTaskProgress,
  resolveProjectMilestoneTemplate,
  updateMilestoneOrderInPlan,
  updateTaskInPlan,
} from '@/domain/milestone-plan'

type RequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement
type CollapsibleSectionId = 'projectHeader' | 'tenantRequirements' | 'milestones' | 'tasks' | 'systemsTenants' | 'engagementCircles' | 'documents'
type AllocationMode = 'PRODUCTION' | 'REUSED_INTERNAL' | 'EXISTING_SYSTEM'
type AllocationCandidate = ProductionSystemInventoryItem | ReusedInternalSystem | System

const DEFAULT_COLLAPSED_SECTIONS: Record<CollapsibleSectionId, boolean> = {
  projectHeader: false,
  tenantRequirements: false,
  milestones: false,
  tasks: false,
  systemsTenants: false,
  engagementCircles: false,
  documents: false,
}

function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
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

function rowValue(row: RequirementRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key]
}

function opportunityRowsForSection(opportunity: Opportunity | undefined, kind: ProjectRequirementSectionKind): RequirementRow[] {
  if (!opportunity) return []
  if (kind === 'A') return opportunity.newTenantRequirements
  if (kind === 'B') return opportunity.changeRequestRequirements
  return opportunity.standardRenewalRequirements
}

function projectRequirementTitle(section: ProjectRequirementSectionMetadata): string {
  if (section.kind === 'A') return 'Grid A: New Tenant Requirements'
  if (section.kind === 'B') return 'Grid B: Change Request Requirements'
  return 'Tenants to Renew'
}

function completeRequirementSections(
  sections: ProjectRequirementSectionMetadata[],
  opportunity: Opportunity | undefined,
): ProjectRequirementSectionMetadata[] {
  const sectionsByKind = new Map(sections.map((section) => [section.kind, section]))
  const fallbackSections: ProjectRequirementSectionMetadata[] = [
    {
      kind: 'A',
      title: 'New Tenant Requirements',
      description: 'Live-linked from the Opportunity new tenant requirements.',
      columns: requirementAColumns,
    },
    {
      kind: 'B',
      title: 'Change Request on Existing Tenant - Final Configuration',
      description: 'Live-linked from the Opportunity selected tenant change requirements.',
      columns: requirementBColumns,
    },
    {
      kind: 'C',
      title: 'Standard Renewal',
      description: 'Live-linked from the Opportunity tenants to renew.',
      columns: requirementCColumns,
    },
  ]

  fallbackSections.forEach((section) => {
    if (!sectionsByKind.has(section.kind) && opportunityRowsForSection(opportunity, section.kind).length > 0) {
      sectionsByKind.set(section.kind, section)
    }
  })

  return fallbackSections
    .map((section) => sectionsByKind.get(section.kind))
    .filter((section): section is ProjectRequirementSectionMetadata => Boolean(section))
}

function tenantDisplayName(tenant: Tenant): string {
  return tenant.tenantName ? `${tenant.tid} - ${tenant.tenantName}` : tenant.tid
}

function allocationModeLabel(mode: AllocationMode): string {
  if (mode === 'PRODUCTION') return 'Allocate Production System'
  if (mode === 'REUSED_INTERNAL') return 'Allocate Reused Internal System'
  return 'Link Existing System'
}

function activeProjectSystemLinks(links: ProjectSystemLink[]): ProjectSystemLink[] {
  return links.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

function isPocProject(project: Project): boolean {
  return project.mainType === 'POC'
}

function allowedAllocationModes(project: Project): AllocationMode[] {
  return isPocProject(project) ? ['REUSED_INTERNAL'] : ['PRODUCTION', 'EXISTING_SYSTEM']
}

function candidatePrimaryId(candidate: AllocationCandidate): string {
  if ('sid' in candidate && candidate.sid) return candidate.sid
  if ('machineId' in candidate && candidate.machineId) return candidate.machineId
  return candidate.id
}

function candidateSummary(candidate: AllocationCandidate): string {
  return [candidate.productType, candidate.hostingType, candidate.cloudPlatform, candidate.cloudRegion].filter(Boolean).join(' | ')
}

function allocationStatusClassName(result: AllocationActionResult | null): string {
  if (!result) return ''
  return result.ok
    ? 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
    : 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
}

function projectStatusLabel(status: string): string {
  if (status === 'DONE') return 'Done'
  if (status === 'IN_PROGRESS') return 'In progress'
  return 'Open'
}

function ProjectStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const isDone = status === 'DONE'
  const isInProgress = status === 'IN_PROGRESS'
  const Icon = isDone ? CheckCircle2 : CirclePlay
  const color = isDone ? 'text-green-600' : isInProgress ? 'text-amber-500' : 'text-slate-500'
  if (large) {
    return <Icon className={[color, 'h-8 w-8'].join(' ')} aria-label={`Project status: ${projectStatusLabel(status)}`} />
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sf-text">
      <Icon className={[color, 'h-4 w-4'].join(' ')} aria-hidden="true" />
      <span>{projectStatusLabel(status)}</span>
    </span>
  )
}

function projectTypeForOpportunity(opportunity: Opportunity): { mainType: ProjectMainType; subType: ProjectSubType } {
  if (opportunity.type === 'POC') return { mainType: 'POC', subType: 'NONE' }
  if (opportunity.type === 'DELIVERY') return { mainType: 'DELIVERY', subType: opportunity.subType === 'UPSELL' ? 'UPSELL' : 'NEW' }
  if (opportunity.subType === 'UPSELL') return { mainType: 'RENEWAL', subType: 'UPSELL' }
  if (opportunity.subType === 'DOWN_SELL') return { mainType: 'RENEWAL', subType: 'DOWN_SELL' }
  return { mainType: 'RENEWAL', subType: 'STANDARD' }
}

function resolveSystemSid(systemId: string | null | undefined, systems: System[]): string {
  if (!systemId) return ''
  return systems.find((system) => system.id === systemId)?.sid ?? ''
}

function resolveTenant(tenantId: string, tenants: Tenant[]): Tenant | undefined {
  return tenants.find((tenant) => tenant.id === tenantId)
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

function readonlyCellValue(
  row: RequirementRow,
  column: RequirementColumnMetadata,
  kind: ProjectRequirementSectionKind,
  tenants: Tenant[],
  systems: System[],
): string {
  if (column.key === 'existingSystemId' && kind === 'A') {
    const requirement = row as NewTenantRequirement
    if (requirement.deployTarget !== 'EXISTING_SID') return 'New System'
    return resolveSystemSid(requirement.existingSystemId, systems)
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'tenantId') {
    const tenant = resolveTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant ? tenantDisplayName(tenant) : ''
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'tenantName') {
    const tenant = resolveTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant?.tenantName ?? ''
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'systemId') {
    const tenant = resolveTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return resolveSystemSid(tenant?.systemId ?? rowValue(row, column.key) as string, systems)
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'deliveryPid') {
    const tenant = resolveTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant?.deliveryPid ?? ''
  }

  return textValue(rowValue(row, column.key))
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
  const rows = opportunityRowsForSection(opportunity, section.kind)

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
                      {readonlyCellValue(row, column, section.kind, tenants, systems)}
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
    tenantRequirements: 'tenantRequirements',
    milestones: 'milestones',
    tasks: 'tasks',
    systemsTenants: 'systemsTenants',
    engagementCircles: 'engagementCircles',
    documents: 'documents',
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
  const updateProject = useAppStore((state) => state.updateProject)
  const allocateProductionSystemToProject = useAppStore((state) => state.allocateProductionSystemToProject)
  const allocateReusedInternalSystemToProject = useAppStore((state) => state.allocateReusedInternalSystemToProject)
  const linkExistingSystemToProject = useAppStore((state) => state.linkExistingSystemToProject)
  const deallocateProjectSystem = useAppStore((state) => state.deallocateProjectSystem)
  const savedProject = useMemo(() => projects.find((project) => project.pid === pid), [pid, projects])
  const [draft, setDraft] = useState<Project | null>(savedProject ? cloneProject(savedProject) : null)
  const [activeTab, setActiveTab] = useState<ProjectFormTab>('systemsTenants')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [saveMessages, setSaveMessages] = useState<string[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('PRODUCTION')
  const [selectedAllocationId, setSelectedAllocationId] = useState('')
  const [allocationResult, setAllocationResult] = useState<AllocationActionResult | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)

  useEffect(() => {
    setDraft(savedProject ? cloneProject(savedProject) : null)
  }, [savedProject])

  const currentDraft = draft ?? savedProject
  const metadata = currentDraft ? getProjectFormMetadata(currentDraft.mainType, currentDraft.subType) : null
  const linkedOpportunity = useMemo(() => {
    if (!currentDraft) return undefined
    return opportunities.find(
      (opportunity) =>
        opportunity.opportunityId === currentDraft.opportunityId ||
        opportunity.id === currentDraft.opportunityId ||
        opportunity.pocProjectIds.includes(currentDraft.id) ||
        opportunity.finalProjectId === currentDraft.id,
    )
  }, [currentDraft, opportunities])
  const account = linkedOpportunity ? accounts.find((candidate) => candidate.id === linkedOpportunity.accountId) : undefined
  const salesManager = linkedOpportunity ? salesManagers.find((candidate) => candidate.id === linkedOpportunity.salesManagerId) : undefined
  const activeSystemLinks = useMemo(() => {
    if (!currentDraft) return []
    return activeProjectSystemLinks(projectSystems).filter((link) => link.projectId === currentDraft.id)
  }, [currentDraft, projectSystems])
  const linkedSystems = useMemo(() => {
    if (!currentDraft) return []
    const linkedSystemIds = new Set(activeSystemLinks.map((link) => link.systemId))
    return systems.filter((system) => linkedSystemIds.has(system.id))
  }, [activeSystemLinks, currentDraft, systems])
  const linkedTenants = useMemo(() => {
    if (!currentDraft) return []
    const linkedTenantIds = new Set(
      projectTenants
        .filter((link) => link.projectId === currentDraft.id && link.allocationStatus !== 'DEALLOCATED')
        .map((link) => link.tenantId),
    )
    linkedSystems.forEach((system) => {
      tenants.filter((tenant) => tenant.systemId === system.id).forEach((tenant) => linkedTenantIds.add(tenant.id))
    })
    return tenants.filter((tenant) => linkedTenantIds.has(tenant.id))
  }, [currentDraft, linkedSystems, projectTenants, tenants])
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
  const visibleTabs = formMetadata.tabs.filter((tab) => tab !== 'tenantRequirements')
  const permittedAllocationModes = allowedAllocationModes(projectDraft)
  const selectedMode = permittedAllocationModes.includes(allocationMode) ? allocationMode : permittedAllocationModes[0]
  const activeSystemLinkBySystemId = new Map(activeSystemLinks.map((link) => [link.systemId, link]))
  const availableAllocationCandidates: AllocationCandidate[] =
    selectedMode === 'PRODUCTION'
      ? productionSystemInventory
      : selectedMode === 'REUSED_INTERNAL'
        ? reusedInternalSystems.filter((system) => system.status !== 'Occupied')
        : systems.filter(
            (system) =>
              Boolean(system.sid) &&
              !activeProjectSystemLinks(projectSystems).some(
                (link) => link.projectId === projectDraft.id && link.systemId === system.id,
              ),
          )

  function toggleSection(sectionId: CollapsibleSectionId) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  function openAllocationDialog() {
    const initialMode = permittedAllocationModes[0]
    const initialCandidates =
      initialMode === 'PRODUCTION'
        ? productionSystemInventory
        : initialMode === 'REUSED_INTERNAL'
          ? reusedInternalSystems.filter((system) => system.status !== 'Occupied')
          : systems.filter(
              (system) =>
                Boolean(system.sid) &&
                !activeProjectSystemLinks(projectSystems).some(
                  (link) => link.projectId === projectDraft.id && link.systemId === system.id,
                ),
            )
    setAllocationMode(initialMode)
    setSelectedAllocationId(initialCandidates[0]?.id ?? '')
    setAllocationResult(null)
    setIsAllocationDialogOpen(true)
  }

  function changeAllocationMode(mode: AllocationMode) {
    const nextCandidates =
      mode === 'PRODUCTION'
        ? productionSystemInventory
        : mode === 'REUSED_INTERNAL'
          ? reusedInternalSystems.filter((system) => system.status !== 'Occupied')
          : systems.filter(
              (system) =>
                Boolean(system.sid) &&
                !activeProjectSystemLinks(projectSystems).some(
                  (link) => link.projectId === projectDraft.id && link.systemId === system.id,
                ),
            )
    setAllocationMode(mode)
    setSelectedAllocationId(nextCandidates[0]?.id ?? '')
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
    if (key === 'pocStartDate' || key === 'pocEndDate' || key === 'warrantyServiceMonths' || key === 'currentMilestone' || key === 'projectAlerts') {
      return false
    }
    return !valuesEqual(headerFieldValue(persistedProject, key), headerFieldValue(projectDraft, key))
  }

  function headerFieldValue(project: Project, key: ProjectHeaderFieldMetadata['key']): string {
    switch (key) {
      case 'accountName':
        return account?.accountName ?? project.accountName
      case 'region':
        return linkedOpportunity?.region ?? account?.region ?? ''
      case 'country':
        return linkedOpportunity?.country ?? account?.country ?? ''
      case 'state':
        return linkedOpportunity?.state ?? account?.state ?? ''
      case 'timeZone':
        return linkedOpportunity?.timeZone ?? account?.timeZone ?? ''
      case 'timeGroup':
        return linkedOpportunity?.timeGroup ?? account?.timeGroup ?? ''
      case 'pocStartDate':
        return linkedOpportunity?.pocStartDate ?? ''
      case 'pocEndDate':
        return linkedOpportunity?.pocEndDate ?? ''
      case 'warrantyServiceMonths':
        return textValue(linkedOpportunity?.warrantyServiceMonths)
      case 'currentMilestone':
        return linkedOpportunity?.currentMilestone ?? ''
      case 'projectAlerts':
        return linkedOpportunity?.projectAlerts?.join(', ') ?? ''
      case 'reportToDirect':
      case 'reportToLevel2':
        return ''
      case 'dealOwner':
        return salesManager?.name ?? project.dealOwner
      default:
        return textValue(project[key as keyof Project])
    }
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
        return {
          ...current,
          opportunityId: selectedOpportunity.opportunityId,
          opportunityName: selectedOpportunity.opportunityName,
          mainType: projectType.mainType,
          subType: projectType.subType,
          deliveryDate: selectedOpportunity.deliveryDate,
        }
      }
      return { ...current, [key]: value }
    })
    setSaveMessages([])
  }

  function validateProject(): string[] {
    const messages: string[] = []
    if (!projectDraft.opportunityName.trim()) messages.push('Project name is required.')
    return messages
  }

  function saveProject(stayOnPage: boolean) {
    const messages = validateProject()
    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    updateProject(projectDraft.id, {
      opportunityId: projectDraft.opportunityId,
      opportunityName: projectDraft.opportunityName.trim(),
      mainType: projectDraft.mainType,
      subType: projectDraft.subType,
      deliveryDate: projectDraft.deliveryDate,
      milestoneTemplateId: projectDraft.milestoneTemplateId,
      milestones: projectDraft.milestones,
      tasks: projectDraft.tasks,
      documents: projectDraft.documents ?? [],
    })
    setSaveMessages(['Project saved.'])
    if (!stayOnPage) navigate('/projects')
  }

  function revertProject() {
    setDraft(cloneProject(persistedProject))
    setSaveMessages([])
  }

  function cancelProject() {
    setDraft(cloneProject(persistedProject))
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

  function renderTenantRequirementsTab() {
    const requirementSections = completeRequirementSections(formMetadata.requirementSections, linkedOpportunity)
    return (
      <CollapsibleSection
        title="Tenant Requirements"
        subtitle={`Read-only live requirements from ${linkedOpportunity?.opportunityName ?? 'the linked Opportunity'}.`}
        collapsed={collapsedSections.tenantRequirements}
        onToggle={() => toggleSection('tenantRequirements')}
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
    setDraft((current) => (current ? updateMilestoneOrderInPlan(current, milestoneId, order) : current))
    setSaveMessages([])
  }

  function updateTask(taskId: string, patch: Partial<NonNullable<Project['tasks']>[number]>) {
    setDraft((current) => (current ? updateTaskInPlan(current, taskId, patch) : current))
    setSaveMessages([])
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
          <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
            Save as replacement template
          </button>
          <button type="button" className="rounded border border-sf-border bg-sf-surface-alt px-3 py-1.5 text-sm text-sf-text-muted" disabled>
            Save as new template
          </button>
        </div>
        {milestones.length > 0 ? (
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Order', 'Milestone', 'Status', 'Progress', 'Tasks'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
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
                    <tr key={milestone.id} className="hover:bg-sf-surface-alt">
                      <td className="w-24 border border-sf-border px-1.5 py-1 text-sf-text">
                        <input
                          className="h-8 w-20 rounded border border-sf-border px-2 py-1 text-sm"
                          type="number"
                          min={1}
                          value={milestone.order}
                          onChange={(event) => updateMilestoneOrder(milestone.id, Number(event.target.value) || milestone.order)}
                        />
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">
                        <button type="button" className="font-medium text-sf-brand hover:underline" onClick={() => setSelectedMilestoneId(milestone.id)}>
                          {milestone.name}
                        </button>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text"><ProjectStatusBadge status={status} /></td>
                      <td className="w-44 border border-sf-border px-1.5 py-1 text-sf-text">
                        <div className="h-2 overflow-hidden rounded-full bg-sf-surface-alt">
                          <div className="h-full bg-sf-brand" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="mt-1 block text-xs text-sf-text-muted">{progress}%</span>
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{taskCount}</td>
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
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Milestone', 'Task', 'Department', 'Resource', 'Status'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-sf-surface-alt">
                    <td className="w-56 border border-sf-border px-1.5 py-1 text-sf-text">{milestonesById.get(task.milestoneId)?.name ?? ''}</td>
                    <td className="min-w-64 border border-sf-border px-1.5 py-1 text-sf-text">{task.name}</td>
                    <td className="w-36 border border-sf-border px-1.5 py-1 text-sf-text">{task.department}</td>
                    <td className="w-36 border border-sf-border px-1.5 py-1 text-sf-text">{task.resource}</td>
                    <td className="w-36 border border-sf-border px-1.5 py-1 text-sf-text">
                      <select className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as 'OPEN' | 'DONE' })}>
                        <option value="OPEN">Open</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                  </tr>
                ))}
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

  function renderMilestoneDialog() {
    if (!selectedMilestoneId) return null
    const milestone = (projectDraft.milestones ?? []).find((candidate) => candidate.id === selectedMilestoneId)
    if (!milestone) return null
    const tasks = orderedTasks(projectDraft).filter((task) => task.milestoneId === milestone.id)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded border border-sf-border bg-white shadow-xl">
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
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Task', 'Department', 'Resource', 'Status'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="min-w-80 border border-sf-border px-1.5 py-1">
                      <input className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm" value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} />
                    </td>
                    <td className="border border-sf-border px-1.5 py-1">
                      <input className="h-8 w-44 rounded border border-sf-border px-2 py-1 text-sm" value={task.department} onChange={(event) => updateTask(task.id, { department: event.target.value })} />
                    </td>
                    <td className="border border-sf-border px-1.5 py-1">
                      <input className="h-8 w-44 rounded border border-sf-border px-2 py-1 text-sm" value={task.resource} onChange={(event) => updateTask(task.id, { resource: event.target.value })} />
                    </td>
                    <td className="border border-sf-border px-1.5 py-1">
                      <select className="h-8 rounded border border-sf-border px-2 py-1 text-sm" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as 'OPEN' | 'DONE' })}>
                        <option value="OPEN">Open</option>
                        <option value="DONE">Done</option>
                      </select>
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
              <div className="overflow-x-auto rounded border border-sf-border bg-white">
                <table className="min-w-full border-collapse text-sm leading-tight">
                  <thead className="bg-sf-surface-alt text-left">
                    <tr>
                      {['Select', 'ID', 'MID', 'Source', 'Status', 'Product / Hosting'].map((label) => (
                        <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableAllocationCandidates.map((candidate) => (
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
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{'machineId' in candidate ? candidate.machineId ?? '' : ''}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{'source' in candidate ? candidate.source ?? '' : ''}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{'status' in candidate ? candidate.status : candidate.operationalStatus}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{candidateSummary(candidate) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

  function renderSystemsTenantsTab() {
    return (
      <CollapsibleSection
        title="Systems and Tenants"
        subtitle="Allocate or link systems for this Project. Tenant creation happens from the linked System Form."
        collapsed={collapsedSections.systemsTenants}
        onToggle={() => toggleSection('systemsTenants')}
        className="space-y-3 p-3"
      >
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

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">Linked Systems</h3>
          {linkedSystems.length > 0 ? (
            <div className="overflow-x-auto rounded border border-sf-border bg-white">
              <table className="min-w-full border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {['SID', 'MID', 'Source', 'Purpose', 'Product', 'Hosting', 'Operational Mode', 'Allocation', 'Action'].map((label) => (
                      <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linkedSystems.map((system) => {
                    const link = activeSystemLinkBySystemId.get(system.id)
                    return (
                      <tr key={system.id} className="hover:bg-sf-surface-alt">
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.sid ?? ''}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.machineId ?? ''}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.source ?? (system.machineId ? 'Reused Internal Systems' : 'Production')}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.purpose}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.productType}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system.hostingType}</td>
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
              No systems are linked to this Project yet.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">Linked Tenants</h3>
          {linkedTenants.length > 0 ? (
            <div className="overflow-x-auto rounded border border-sf-border bg-white">
              <table className="min-w-full border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {['TID', 'Tenant Name', 'System SID', 'Delivery PID', 'Product', 'Hosting', 'Operational Mode'].map((label) => (
                      <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linkedTenants.map((tenant) => {
                    const system = systems.find((candidate) => candidate.id === tenant.systemId)
                    return (
                      <tr key={tenant.id} className="hover:bg-sf-surface-alt">
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tid}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tenantName}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{system?.sid ?? ''}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.deliveryPid}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.productType}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.hostingType}</td>
                        <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.operationalStatus}</td>
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
        </div>
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

      <div className="mt-4">
        {renderTenantRequirementsTab()}
      </div>

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
          {activeTab === 'systemsTenants'
              ? renderSystemsTenantsTab()
              : activeTab === 'milestones'
                ? renderMilestonesTab()
                : activeTab === 'tasks'
                  ? renderTasksTab()
                  : activeTab === 'documents'
                    ? renderDocumentsTab()
                    : renderPlaceholderTab(activeTab)}
        </div>
      </div>
      {renderMilestoneDialog()}
      {renderAllocationDialog()}
    </div>
  )
}
