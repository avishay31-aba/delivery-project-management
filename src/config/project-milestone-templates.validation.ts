import type { NewTenantRequirement, Opportunity, Project } from '@/data/seed.types'
import {
  PROJECT_MILESTONE_TASK_TEMPLATES,
  type ProjectMilestoneTemplateId,
  resolveProjectMilestoneTemplate,
} from '@/config/project-milestone-templates'

function project(mainType: Project['mainType'], subType: Project['subType']): Project {
  return {
    id: 'fixture-project',
    pid: 'PID-FIXTURE',
    projectSource: mainType === 'POC' ? 'POC' : 'FINAL',
    accountName: '',
    mainType,
    subType,
    deliveryDate: null,
    progressStatus: 'OPEN',
    dealOwner: '',
    opportunityName: '',
    canceledAt: null,
    createdAt: '',
    updatedAt: '',
  }
}

function newTenant(hostingType: string): NewTenantRequirement {
  return {
    id: `fixture-new-${hostingType}`,
    requirementId: `REQ-${hostingType}`,
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
    hostingType,
    cloudPlatform: hostingType === 'Cloud' ? 'AWS' : '',
    productType: 'Tangles',
    mapCenter: '',
    licenses: 1,
    users: 1,
    concurrentSearches: 1,
    dailySearches: null,
    monthlySearches: null,
    concurrentAnalyses: 1,
    topicAnalyses: null,
    dailyAnalyses: null,
    monthlyAnalyses: null,
    tangles: null,
    tanglesGo: null,
    webloc: null,
    webeye: null,
    ingest: null,
    blockchain: null,
    crossSystemFeatures: [],
    apiEnabled: '',
    apiDailyQty: null,
    apiMonthlyQty: null,
    aiFeatures: [],
    additionalFeatures: [],
    standardMonitors: null,
    fullMonitors: null,
    topicMonitors: null,
  }
}

function opportunity(partial: Partial<Opportunity>): Opportunity {
  return {
    id: 'fixture-opportunity',
    opportunityId: 'SF-OPP-FIXTURE',
    opportunityName: '',
    stage: 'OPEN',
    accountId: '',
    salesManagerId: '',
    type: 'DELIVERY',
    subType: 'NEW',
    deliveryDate: null,
    pocStartDate: null,
    pocEndDate: null,
    warrantyServiceMonths: null,
    region: '',
    country: '',
    state: '',
    timeZone: '',
    timeGroup: '',
    currentMilestone: '',
    projectAlerts: [],
    newTenantRequirements: [],
    changeRequestRequirements: [],
    standardRenewalRequirements: [],
    pocProjectIds: [],
    finalProjectId: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

const resolverFixtures: Array<{
  name: string
  project: Project
  opportunity?: Opportunity
  expectedTemplateId: ProjectMilestoneTemplateId
}> = [
  {
    name: 'POC new tenant only',
    project: project('POC', 'NONE'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'NEW', stage: 'POC', newTenantRequirements: [newTenant('Cloud')] }),
    expectedTemplateId: '1',
  },
  {
    name: 'POC change request only',
    project: project('POC', 'NONE'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'UPSELL', stage: 'POC', changeRequestRequirements: [{ id: 'change', requirementId: 'B1', tenantId: 'ten-1', systemId: 'sys-1', hostingType: 'Cloud', cloudPlatform: 'AWS', productType: 'Tangles', mapCenter: '', licenses: 1, users: 1, concurrentSearches: 1, dailySearches: null, monthlySearches: null, concurrentAnalyses: 1, topicAnalyses: null, dailyAnalyses: null, monthlyAnalyses: null, tangles: null, tanglesGo: null, webloc: null, webeye: null, ingest: null, blockchain: null, crossSystemFeatures: [], apiEnabled: '', apiDailyQty: null, apiMonthlyQty: null, aiFeatures: [], additionalFeatures: [], standardMonitors: null, fullMonitors: null, topicMonitors: null }] }),
    expectedTemplateId: '2',
  },
  {
    name: 'POC new tenant and change request',
    project: project('POC', 'NONE'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'UPSELL', stage: 'POC', newTenantRequirements: [newTenant('Cloud')], changeRequestRequirements: [{ id: 'change', requirementId: 'B1', tenantId: 'ten-1', systemId: 'sys-1', hostingType: 'Cloud', cloudPlatform: 'AWS', productType: 'Tangles', mapCenter: '', licenses: 1, users: 1, concurrentSearches: 1, dailySearches: null, monthlySearches: null, concurrentAnalyses: 1, topicAnalyses: null, dailyAnalyses: null, monthlyAnalyses: null, tangles: null, tanglesGo: null, webloc: null, webeye: null, ingest: null, blockchain: null, crossSystemFeatures: [], apiEnabled: '', apiDailyQty: null, apiMonthlyQty: null, aiFeatures: [], additionalFeatures: [], standardMonitors: null, fullMonitors: null, topicMonitors: null }] }),
    expectedTemplateId: '1',
  },
  {
    name: 'Delivery cloud new tenant',
    project: project('DELIVERY', 'NEW'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'NEW', newTenantRequirements: [newTenant('Cloud')] }),
    expectedTemplateId: '3',
  },
  {
    name: 'Delivery on-prem new tenant',
    project: project('DELIVERY', 'NEW'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'NEW', newTenantRequirements: [newTenant('On premise')] }),
    expectedTemplateId: '4',
  },
  {
    name: 'Delivery upsell change only',
    project: project('DELIVERY', 'UPSELL'),
    opportunity: opportunity({ type: 'DELIVERY', subType: 'UPSELL', changeRequestRequirements: [{ id: 'change', requirementId: 'B1', tenantId: 'ten-1', systemId: 'sys-1', hostingType: 'Cloud', cloudPlatform: 'AWS', productType: 'Tangles', mapCenter: '', licenses: 1, users: 1, concurrentSearches: 1, dailySearches: null, monthlySearches: null, concurrentAnalyses: 1, topicAnalyses: null, dailyAnalyses: null, monthlyAnalyses: null, tangles: null, tanglesGo: null, webloc: null, webeye: null, ingest: null, blockchain: null, crossSystemFeatures: [], apiEnabled: '', apiDailyQty: null, apiMonthlyQty: null, aiFeatures: [], additionalFeatures: [], standardMonitors: null, fullMonitors: null, topicMonitors: null }] }),
    expectedTemplateId: '5',
  },
  { name: 'Renewal standard', project: project('RENEWAL', 'STANDARD'), expectedTemplateId: '6' },
  { name: 'Renewal down sell', project: project('RENEWAL', 'DOWN_SELL'), expectedTemplateId: '7' },
  {
    name: 'Renewal upsell cloud new tenant',
    project: project('RENEWAL', 'UPSELL'),
    opportunity: opportunity({ type: 'RENEWAL', subType: 'UPSELL', newTenantRequirements: [newTenant('Cloud')] }),
    expectedTemplateId: '8',
  },
  {
    name: 'Renewal upsell on-prem new tenant',
    project: project('RENEWAL', 'UPSELL'),
    opportunity: opportunity({ type: 'RENEWAL', subType: 'UPSELL', newTenantRequirements: [newTenant('Hybrid')] }),
    expectedTemplateId: '9',
  },
]

function validateProjectMilestoneTemplates() {
  resolverFixtures.forEach((fixture) => {
    const result = resolveProjectMilestoneTemplate(fixture.project, fixture.opportunity)
    if (result.templateId !== fixture.expectedTemplateId) {
      throw new Error(`${fixture.name} resolved ${result.templateId}, expected ${fixture.expectedTemplateId}`)
    }
  })

  const templateIds: ProjectMilestoneTemplateId[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  templateIds.forEach((templateId) => {
    const template = PROJECT_MILESTONE_TASK_TEMPLATES[templateId]
    if (!template.rows.length) {
      throw new Error(`Template ${templateId} has no rows`)
    }
  })
}

validateProjectMilestoneTemplates()
