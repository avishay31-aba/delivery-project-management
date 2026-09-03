import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const seedPath = path.join(rootDir, 'src', 'data', 'seed.json')
const now = '2026-08-20T09:00:00.000Z'
const user = 'Demo User'

const regionPlans = [
  { region: 'NA', countries: [['United States', 'New York', 'UTC-04:00'], ['Canada', 'Ontario', 'UTC-04:00']] },
  { region: 'EMEA', countries: [['Germany', 'Berlin', 'UTC+02:00'], ['United Kingdom', 'England', 'UTC+01:00'], ['Israel', 'Tel Aviv', 'UTC+03:00']] },
  { region: 'APAC', countries: [['Singapore', 'Central Region', 'UTC+08:00'], ['Australia', 'New South Wales', 'UTC+10:00'], ['Japan', 'Tokyo', 'UTC+09:00']] },
  { region: 'LATAM', countries: [['Mexico', 'Mexico City', 'UTC-06:00'], ['Colombia', 'Bogota', 'UTC-05:00']] },
]

const seq = {
  account: 0,
  opportunity: 0,
  project: 0,
  sid: 0,
  mid: 0,
  tenant: 0,
  requirement: 0,
  warranty: 0,
  remark: 0,
  configurationHistory: 0,
  document: 0,
  versionUpdate: 0,
  versionUpdateAttachment: 0,
  activity: 0,
  purposeHistory: 0,
  infrastructureItem: 0,
  infrastructureCategory: 0,
  infrastructureType: 0,
  infrastructureManufacturer: 0,
  infrastructureOwner: 0,
  infrastructureBillingMethod: 0,
  infrastructureWarrantyType: 0,
  infrastructurePropertyValue: 0,
  infrastructureMaintenanceTask: 0,
  infrastructureMaintenanceTaskType: 0,
  infrastructureMaintenanceAssignedResource: 0,
}

function id(prefix, n, width = 6) {
  return `${prefix}${String(n).padStart(width, '0')}`
}

function next(prefix, key = prefix.toLowerCase(), width = 6) {
  seq[key] += 1
  return id(prefix, seq[key], width)
}

function reqId() {
  seq.requirement += 1
  return `A-${String(seq.requirement).padStart(3, '0')}`
}

function iso(day, hour = 9) {
  const d = ((day - 1) % 27) + 1
  return `2026-07-${String(d).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
}

function date(day) {
  const d = ((day - 1) % 27) + 1
  return `2026-08-${String(d).padStart(2, '0')}`
}

function cfg(index, overrides = {}) {
  const product = index % 7 === 0 ? 'Webloc' : 'Tangles'
  const users = 18 + (index % 90)
  return {
    product,
    licenses: 8 + (index % 35),
    users,
    concurrentSearches: 3 + (index % 12),
    dailySearches: 150 + index * 3,
    monthlySearches: 3000 + index * 25,
    concurrentAnalyses: 2 + (index % 8),
    dailyAnalyses: 50 + index,
    monthlyAnalyses: 1200 + index * 10,
    topicAnalyses: 1 + (index % 9),
    standardMonitors: 10 + (index % 25),
    fullMonitors: index % 4,
    topicMonitors: 2 + (index % 6),
    mapCenter: ['New York', 'London', 'Singapore', 'Mexico City', 'Toronto', 'Berlin', 'Sydney'][index % 7],
    tangles: product === 'Tangles' ? 5 + (index % 30) : 0,
    tanglesGo: product === 'Tangles' ? index % 15 : 0,
    webloc: product === 'Webloc' ? 5 + (index % 25) : index % 3,
    webeye: index % 5,
    ingest: index % 4,
    blockchain: index % 11 === 0 ? Math.min(users, 2 + (index % 5)) : 0,
    crossSystemFeatures: index % 3 === 0 ? ['Open Sources', 'SSO'] : ['Open Sources'],
    apiEnabled: index % 5 === 0 ? 'NO' : 'YES',
    apiDailyQty: index % 5 === 0 ? 0 : 500 + index * 10,
    apiMonthlyQty: index % 5 === 0 ? 0 : 10000 + index * 100,
    aiFeatures: index % 4 === 0 ? ['Entity Resolution', 'Translation'] : ['Entity Resolution'],
    additionalFeatures: index % 6 === 0 ? ['2FA', 'Advanced Search'] : ['2FA'],
    ...overrides,
  }
}

function hosting(region, index) {
  const cloudRegion = region === 'EMEA'
    ? 'eu-central-1 (Frankfurt)'
    : region === 'APAC'
      ? 'ap-southeast-1 (Singapore)'
      : region === 'LATAM'
        ? 'sa-east-1 (Sao Paulo)'
        : 'us-east-1 (N. Virginia)'
  return {
    logo: '',
    url: `https://qa-${index}.deliveryerp.example.invalid`,
    cognitoRegion: region,
    productType: index % 7 === 0 ? 'Webloc' : 'Tangles',
    hostingType: 'Cloud',
    cloudPlatform: 'AWS',
    csp: 'Automate IT',
    cloudRegion,
    performanceTier: index % 9 === 0 ? 'POWERED' : 'STANDARD',
    vpnEnabled: index % 4 === 0 ? 'YES' : 'NO',
    vpnType: index % 4 === 0 ? 'IPSec' : '',
    ipRestrictionEnabled: index % 6 === 0 ? 'YES' : 'NO',
  }
}

function remark(text) {
  const rid = next('R', 'remark')
  return { id: `remark-${rid}`, remarkId: rid, createdAt: iso(seq.remark), author: user, type: 'Note', content: text, dueDate: null, updatedAt: iso(seq.remark + 1), updatedBy: user }
}

function doc(parentObjectType, parentBusinessId, fileName) {
  const did = next('DOC', 'document')
  return { id: did, fileName, fileType: 'application/pdf', fileSize: 120000 + seq.document, uploadedAt: iso(seq.document), storedFileReference: `reference-dataset/${parentObjectType.toLowerCase()}/${fileName}`, uploadedBy: user, parentObjectType, parentBusinessId }
}

function configHistory(businessId, configuration) {
  const recordId = next('CH', 'configurationHistory')
  return { id: `configuration-history-${recordId}`, recordId, timestamp: iso(seq.configurationHistory), tid: businessId, recordedBy: user, configuration }
}

function reqBase(requirementId, configuration, overrides = {}) {
  return { id: `requirement-${requirementId}`, requirementId, ...hosting(overrides.region ?? 'NA', seq.requirement), productType: configuration.product, ...configuration, ...overrides }
}

function newReq(requirementId, configuration, overrides = {}) {
  return { ...reqBase(requirementId, configuration, overrides), deployTarget: overrides.deployTarget ?? 'NEW_SYSTEM', existingSystemId: overrides.existingSystemId ?? null }
}

function changeReq(requirementId, tenant, systemId, configuration, overrides = {}) {
  return { ...reqBase(requirementId, configuration, overrides), tenantId: tenant.id, systemId, baselineConfiguration: tenant.configuration }
}

function renewalReq(requirementId, tenant, systemId, warrantyRow, overrides = {}) {
  return { id: `requirement-${requirementId}`, requirementId, tenantId: tenant.id, systemId, warrantyRecordId: warrantyRow?.warrantyId ?? '', warrantyStatus: warrantyRow?.warrantyStatus ?? 'NOT_SET', warrantyEndDate: warrantyRow?.endDate ?? null, ...overrides }
}

function projectFromOpportunity(opp, mainType, subType, done, templateId = '1') {
  const pid = next('P', 'project')
  const taskStatus = done ? 'DONE' : 'OPEN'
  const milestoneStatus = done ? 'DONE' : 'OPEN'
  return {
    id: pid,
    pid,
    opportunityId: opp.id,
    projectSource: mainType === 'POC' ? 'POC' : 'FINAL',
    accountName: opp.accountName,
    mainType,
    subType,
    deliveryDate: opp.deliveryDate,
    pocStartDate: opp.pocStartDate,
    pocEndDate: opp.pocEndDate,
    progressStatus: done ? 'DONE' : 'OPEN',
    region: opp.region,
    country: opp.country,
    state: opp.state,
    timeZone: opp.timeZone,
    timeGroup: opp.timeGroup,
    dealOwner: opp.dealOwner,
    opportunityName: opp.opportunityName,
    canceledAt: null,
    milestoneTemplateId: templateId,
    milestones: [
      { id: `${pid}-milestone-1`, name: mainType === 'POC' ? 'POC preparation' : 'Delivery preparation', order: 1, status: milestoneStatus, deadline: opp.deliveryDate ?? opp.pocStartDate, comment: '' },
      { id: `${pid}-milestone-2`, name: mainType === 'POC' ? 'POC execution' : 'Customer acceptance', order: 2, status: milestoneStatus, deadline: opp.pocEndDate ?? opp.deliveryDate, comment: '' },
    ],
    tasks: [
      { id: `${pid}-task-1`, milestoneId: `${pid}-milestone-1`, name: 'Confirm requirements baseline', department: 'Delivery', resource: 'Delivery Manager', status: taskStatus, order: 1, deadline: opp.deliveryDate ?? opp.pocStartDate, comment: '' },
      { id: `${pid}-task-2`, milestoneId: `${pid}-milestone-2`, name: 'Complete acceptance', department: 'Delivery', resource: 'Project Owner', status: taskStatus, order: 2, deadline: opp.pocEndDate ?? opp.deliveryDate, comment: '' },
    ],
    documents: [doc('PROJECT', pid, `${pid}-project-plan.pdf`)],
    createdAt: iso(seq.project + 1),
    updatedAt: iso(seq.project + 2),
  }
}

function opportunity(account, manager, type, subType, stage, name, dates, requirements = {}) {
  const oid = next('OPP', 'opportunity')
  return {
    id: oid,
    opportunityId: oid,
    opportunityName: name,
    stage,
    accountId: account.id,
    salesManagerId: manager.id,
    type,
    subType,
    financialProfile: type === 'POC' ? (subType === 'PAID' ? 'PAID' : 'FREE') : undefined,
    dealPackage: seq.opportunity % 3 === 0 ? 'Platinum' : seq.opportunity % 2 === 0 ? 'Gold' : 'Silver',
    deliveryDate: dates.deliveryDate ?? null,
    pocStartDate: dates.pocStartDate ?? null,
    pocEndDate: dates.pocEndDate ?? null,
    warrantyServiceMonths: type === 'POC' ? null : 12,
    region: account.region,
    country: account.country,
    state: account.state,
    timeZone: account.timeZone,
    timeGroup: account.timeGroup,
    currentMilestone: stage === 'WON' ? 'Project created' : 'POC in progress',
    projectAlerts: [],
    salesComments: `<p>${name} deterministic Final QA opportunity.</p>`,
    engagementCircles: [],
    newTenantRequirements: requirements.newTenantRequirements ?? [],
    changeRequestRequirements: requirements.changeRequestRequirements ?? [],
    standardRenewalRequirements: requirements.standardRenewalRequirements ?? [],
    pocProjectIds: [],
    finalProjectId: null,
    wonAt: stage === 'WON' ? iso(seq.opportunity + 2) : null,
    createdAt: iso(seq.opportunity),
    updatedAt: iso(seq.opportunity + 3),
    accountName: account.accountName,
    dealOwner: manager.name,
  }
}

function warranty(tenantId, relatedProjectId, opportunityId, status, startDate, endDate, predecessor = '') {
  const warrantyId = next('W', 'warranty')
  return {
    id: warrantyId,
    warrantyId,
    firstWarranty: !predecessor,
    predecessor,
    successor: '',
    accountId: '',
    relatedProjectId,
    warrantyType: status === 'NO_WARRANTY' ? 'No Warranty' : 'Warranty',
    warrantySubType: '',
    opportunityId,
    startDate,
    endDate,
    durationDays: startDate && endDate ? Math.ceil((Date.parse(endDate) - Date.parse(startDate)) / 86400000) : null,
    daysBeforeExpiration: endDate ? Math.ceil((Date.parse(endDate) - Date.parse('2026-08-20T00:00:00.000Z')) / 86400000) : null,
    warrantyStatus: status,
    noWarranty: status === 'NO_WARRANTY' ? 'YES' : 'NO',
    outOfContract: status === 'OUT_OF_CONTRACT' ? 'YES' : 'NO',
    alerts: status === 'PENDING' ? 'Warranty expires in less than 90 days.' : '',
    remark: `${warrantyId} ${status} reference warranty for ${tenantId}.`,
  }
}

function topWarranty(row, tenantId) {
  return { warrantyRecordId: row.warrantyId, tenantId, startDate: row.startDate, endDate: row.endDate, status: row.warrantyStatus, predecessorWarrantyId: row.predecessor || null, createdAt: iso(5), updatedAt: iso(8) }
}

function salesManager(n, name, region) {
  return { id: `sales-manager-ref-${n}`, name, email: `${name.toLowerCase().replaceAll(' ', '.')}@deliveryerp.example`, region, createdAt: iso(1), updatedAt: iso(1) }
}

const salesManagers = regionPlans.flatMap((plan, regionIndex) => [
  salesManager(regionIndex * 2 + 1, `${plan.region} Deal Owner A`, plan.region),
  salesManager(regionIndex * 2 + 2, `${plan.region} Deal Owner B`, plan.region),
])

const accounts = []
regionPlans.forEach((plan, regionIndex) => {
  for (let i = 0; i < 20; i += 1) {
    const accountCode = next('C', 'account')
    const [country, state, timeZone] = plan.countries[i % plan.countries.length]
    accounts.push({
      id: accountCode,
      accountCode,
      accountName: `${plan.region} Final QA Customer ${String(i + 1).padStart(2, '0')}`,
      customerType: i % 3 === 0 ? 'NEW_CUSTOMER' : 'VETERAN_CUSTOMER',
      salesManagerId: salesManagers[regionIndex * 2 + (i % 2)].id,
      region: plan.region,
      country,
      state,
      timeZone,
      timeGroup: plan.region,
      createdAt: iso(i + 1),
      updatedAt: iso(i + 2),
    })
  }
})

const opportunities = []
const projects = []
const systems = []
const tenants = []
const projectSystems = []
const projectTenants = []
const productionSystemInventory = []
const reusedInternalSystems = []
const warrantyRecords = []
const infrastructureItems = []

function addVersionRefs(record, systemId, collection, sid = '', mid = '') {
  const vu = next('VU', 'versionUpdate')
  record.currentVersionUpdateId = vu
  record.currentVersionNumberRefId = seq.versionUpdate % 2 === 0 ? 'VN000002' : 'VN000001'
  record.currentBuildNumberRefId = record.currentVersionNumberRefId === 'VN000002' ? 'BN000003' : 'BN000001'
  versionUpdates.push({
    id: vu,
    systemId,
    systemCollection: collection,
    committedAt: iso(seq.versionUpdate),
    committedSequence: seq.versionUpdate,
    userName: user,
    midSnapshot: mid,
    sidSnapshot: sid,
    versionNumberRefId: record.currentVersionNumberRefId,
    buildNumberRefId: record.currentBuildNumberRefId,
    attachments: ['CONFIG', 'ATP', 'CHECKLIST'].map((category) => {
      const aid = next('VUA', 'versionUpdateAttachment')
      return { id: aid, category, fileName: `${sid || mid}-${category.toLowerCase()}.pdf`, mimeType: 'application/pdf', fileSize: 180000 + seq.versionUpdateAttachment, uploadedAt: iso(seq.versionUpdateAttachment), uploadedBy: user, storedFileReference: `reference-dataset/version-updates/${vu}/${sid || mid}-${category.toLowerCase()}.pdf`, parentObjectType: 'VERSION_UPDATE', parentBusinessId: vu }
    }),
    emailSentAt: iso(seq.versionUpdate + 1),
    remarks: `${sid || mid} deterministic version baseline.`,
    createdAt: iso(seq.versionUpdate),
    createdBy: user,
    updatedAt: iso(seq.versionUpdate),
    updatedBy: user,
  })
}

function summarize(tenantRows) {
  const out = cfg(1, { licenses: 0, users: 0, concurrentSearches: 0, dailySearches: 0, monthlySearches: 0, concurrentAnalyses: 0, dailyAnalyses: 0, monthlyAnalyses: 0, topicAnalyses: 0, standardMonitors: 0, fullMonitors: 0, topicMonitors: 0, tangles: 0, tanglesGo: 0, webloc: 0, webeye: 0, ingest: 0, blockchain: 0, apiDailyQty: 0, apiMonthlyQty: 0, crossSystemFeatures: [], aiFeatures: [], additionalFeatures: [] })
  tenantRows.forEach((tenant) => {
    const c = tenant.configuration
    ;['licenses', 'users', 'concurrentSearches', 'dailySearches', 'monthlySearches', 'concurrentAnalyses', 'dailyAnalyses', 'monthlyAnalyses', 'topicAnalyses', 'standardMonitors', 'fullMonitors', 'topicMonitors', 'tangles', 'tanglesGo', 'webloc', 'webeye', 'ingest', 'blockchain', 'apiDailyQty', 'apiMonthlyQty'].forEach((key) => { out[key] = (out[key] ?? 0) + (c[key] ?? 0) })
    ;['crossSystemFeatures', 'aiFeatures', 'additionalFeatures'].forEach((key) => { out[key] = Array.from(new Set([...out[key], ...(c[key] ?? [])])) })
    out.product = c.product
    out.mapCenter = c.mapCenter
  })
  return out
}

function ref(referenceType, label, parentReferenceId, prefix, key) {
  const refId = next(prefix, key)
  return { id: refId, referenceType, versionNumberId: parentReferenceId, parentReferenceId, label, normalizedLabel: label.trim().replace(/\s+/g, ' ').toLocaleLowerCase(), active: true, createdAt: iso(1), createdBy: user, updatedAt: iso(1), updatedBy: user }
}

const infrastructureReferenceRecords = []
const hardwareCategory = ref('INFRASTRUCTURE_CATEGORY', 'Hardware', null, 'IC', 'infrastructureCategory')
const softwareCategory = ref('INFRASTRUCTURE_CATEGORY', 'Software', null, 'IC', 'infrastructureCategory')
const cloudCategory = ref('INFRASTRUCTURE_CATEGORY', 'Cloud', null, 'IC', 'infrastructureCategory')
const networkCategory = ref('INFRASTRUCTURE_CATEGORY', 'Network', null, 'IC', 'infrastructureCategory')
infrastructureReferenceRecords.push(hardwareCategory, softwareCategory, cloudCategory, networkCategory)
const serverType = ref('INFRASTRUCTURE_TYPE', 'Server', hardwareCategory.id, 'ITY', 'infrastructureType')
const storageServerType = ref('INFRASTRUCTURE_TYPE', 'Storage Server', hardwareCategory.id, 'ITY', 'infrastructureType')
const firewallType = ref('INFRASTRUCTURE_TYPE', 'Firewall', hardwareCategory.id, 'ITY', 'infrastructureType')
const laptopType = ref('INFRASTRUCTURE_TYPE', 'Laptop', hardwareCategory.id, 'ITY', 'infrastructureType')
const esxiType = ref('INFRASTRUCTURE_TYPE', 'ESXi', softwareCategory.id, 'ITY', 'infrastructureType')
const computeType = ref('INFRASTRUCTURE_TYPE', 'Compute/Host', cloudCategory.id, 'ITY', 'infrastructureType')
const vpnType = ref('INFRASTRUCTURE_TYPE', 'VPN', cloudCategory.id, 'ITY', 'infrastructureType')
const domainType = ref('INFRASTRUCTURE_TYPE', 'Domain', networkCategory.id, 'ITY', 'infrastructureType')
const sslType = ref('INFRASTRUCTURE_TYPE', 'SSL', networkCategory.id, 'ITY', 'infrastructureType')
infrastructureReferenceRecords.push(serverType, storageServerType, firewallType, laptopType, esxiType, computeType, vpnType, domainType, sslType)
const hpManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'HP', serverType.id, 'IM', 'infrastructureManufacturer')
const dellServerManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'Dell', serverType.id, 'IM', 'infrastructureManufacturer')
const hpStorageManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'HP', storageServerType.id, 'IM', 'infrastructureManufacturer')
const dellStorageManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'Dell', storageServerType.id, 'IM', 'infrastructureManufacturer')
const fortigateManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'FortiGate', firewallType.id, 'IM', 'infrastructureManufacturer')
const paloAltoManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'Palo Alto', firewallType.id, 'IM', 'infrastructureManufacturer')
const ciscoManufacturer = ref('INFRASTRUCTURE_MANUFACTURER', 'Cisco', firewallType.id, 'IM', 'infrastructureManufacturer')
infrastructureReferenceRecords.push(hpManufacturer, dellServerManufacturer, hpStorageManufacturer, dellStorageManufacturer, fortigateManufacturer, paloAltoManufacturer, ciscoManufacturer)
const penlinkOwner = ref('INFRASTRUCTURE_OWNER', 'Penlink', null, 'IO', 'infrastructureOwner')
const agentOwner = ref('INFRASTRUCTURE_OWNER', 'Agent', null, 'IO', 'infrastructureOwner')
const customerOwner = ref('INFRASTRUCTURE_OWNER', 'Customer', null, 'IO', 'infrastructureOwner')
infrastructureReferenceRecords.push(penlinkOwner, agentOwner, customerOwner)
const oneTimeBilling = ref('INFRASTRUCTURE_BILLING_METHOD', 'One Time Payment', null, 'IBM', 'infrastructureBillingMethod')
const recurringBilling = ref('INFRASTRUCTURE_BILLING_METHOD', 'Recurring Payment', null, 'IBM', 'infrastructureBillingMethod')
infrastructureReferenceRecords.push(oneTimeBilling, recurringBilling)
const standardWarrantyType = ref('INFRASTRUCTURE_WARRANTY_TYPE', 'Standard', null, 'IWT', 'infrastructureWarrantyType')
const extendedWarrantyType = ref('INFRASTRUCTURE_WARRANTY_TYPE', 'Extended', null, 'IWT', 'infrastructureWarrantyType')
const noWarrantyType = ref('INFRASTRUCTURE_WARRANTY_TYPE', 'No Warranty', null, 'IWT', 'infrastructureWarrantyType')
infrastructureReferenceRecords.push(standardWarrantyType, extendedWarrantyType, noWarrantyType)
const propertyValues = {
  rackU1: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'U1', 'server.rackUnit', 'IPV', 'infrastructurePropertyValue'),
  rackU2: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'U2', 'server.rackUnit', 'IPV', 'infrastructurePropertyValue'),
  rackU3: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'U3', 'server.rackUnit', 'IPV', 'infrastructurePropertyValue'),
  ddr4: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'DDR4', 'server.memoryType', 'IPV', 'infrastructurePropertyValue'),
  ddr5: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'DDR5', 'server.memoryType', 'IPV', 'infrastructurePropertyValue'),
  memory32: ref('INFRASTRUCTURE_PROPERTY_VALUE', '32G', 'server.memorySize', 'IPV', 'infrastructurePropertyValue'),
  xeonSilver: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'Intel(R) Xeon(R) Silver 4110 CPU @ 8 Cores 2.10GHz', 'server.cpuType', 'IPV', 'infrastructurePropertyValue'),
  xeon6505: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'Intel Xeon 6505P 2.2GHz 12-core 150W', 'server.cpuType', 'IPV', 'infrastructurePropertyValue'),
  hpSas: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'HP 2.4TB SAS', 'server.diskType', 'IPV', 'infrastructurePropertyValue'),
  hpeSata: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'HPE 1.92TB SATA 6G', 'server.diskType', 'IPV', 'infrastructurePropertyValue'),
  openVpn: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'Open VPN', 'vpn.type', 'IPV', 'infrastructurePropertyValue'),
  forti60e: ref('INFRASTRUCTURE_PROPERTY_VALUE', '60E', 'firewall.model.fortigate', 'IPV', 'infrastructurePropertyValue'),
  forti60f: ref('INFRASTRUCTURE_PROPERTY_VALUE', '60F', 'firewall.model.fortigate', 'IPV', 'infrastructurePropertyValue'),
  forti70e: ref('INFRASTRUCTURE_PROPERTY_VALUE', '70E', 'firewall.model.fortigate', 'IPV', 'infrastructurePropertyValue'),
  hpeDl360Gen10: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'HPE ProLiant DL360 Gen10', 'manufacturer.hp.model', 'IPV', 'infrastructurePropertyValue'),
  hpeDl360Gen12: ref('INFRASTRUCTURE_PROPERTY_VALUE', 'HPE ProLiant DL360 Gen12', 'manufacturer.hp.model', 'IPV', 'infrastructurePropertyValue'),
}
infrastructureReferenceRecords.push(...Object.values(propertyValues))
const taskTypes = {
  preventive: ref('INFRASTRUCTURE_MAINTENANCE_TASK_TYPE', 'Preventive Maintenance', null, 'IMTT', 'infrastructureMaintenanceTaskType'),
  firmware: ref('INFRASTRUCTURE_MAINTENANCE_TASK_TYPE', 'Firmware Review', null, 'IMTT', 'infrastructureMaintenanceTaskType'),
  security: ref('INFRASTRUCTURE_MAINTENANCE_TASK_TYPE', 'Security Policy Review', null, 'IMTT', 'infrastructureMaintenanceTaskType'),
  warranty: ref('INFRASTRUCTURE_MAINTENANCE_TASK_TYPE', 'Warranty Renewal Check', null, 'IMTT', 'infrastructureMaintenanceTaskType'),
}
const assignedResources = {
  platform: ref('INFRASTRUCTURE_MAINTENANCE_ASSIGNED_RESOURCE', 'Platform Operations', null, 'IMAR', 'infrastructureMaintenanceAssignedResource'),
  network: ref('INFRASTRUCTURE_MAINTENANCE_ASSIGNED_RESOURCE', 'Network Operations', null, 'IMAR', 'infrastructureMaintenanceAssignedResource'),
  serviceDesk: ref('INFRASTRUCTURE_MAINTENANCE_ASSIGNED_RESOURCE', 'Service Desk', null, 'IMAR', 'infrastructureMaintenanceAssignedResource'),
}
infrastructureReferenceRecords.push(...Object.values(taskTypes), ...Object.values(assignedResources))

const referenceData = [
  { id: 'VN000001', referenceType: 'VERSION_NUMBER', versionNumberId: null, label: '2026.1', normalizedLabel: '2026.1', active: true, createdAt: iso(1), createdBy: user, updatedAt: iso(1), updatedBy: user },
  { id: 'VN000002', referenceType: 'VERSION_NUMBER', versionNumberId: null, label: '2026.2', normalizedLabel: '2026.2', active: true, createdAt: iso(1), createdBy: user, updatedAt: iso(1), updatedBy: user },
  { id: 'BN000001', referenceType: 'BUILD_NUMBER', versionNumberId: 'VN000001', label: '2026.1.104', normalizedLabel: '2026.1.104', active: true, createdAt: iso(1), createdBy: user, updatedAt: iso(1), updatedBy: user },
  { id: 'BN000003', referenceType: 'BUILD_NUMBER', versionNumberId: 'VN000002', label: '2026.2.205', normalizedLabel: '2026.2.205', active: true, createdAt: iso(1), createdBy: user, updatedAt: iso(1), updatedBy: user },
  ...infrastructureReferenceRecords,
]
const versionUpdates = []

accounts.forEach((account, accountIndex) => {
  const manager = salesManagers.find((candidate) => candidate.id === account.salesManagerId)
  const systemCount = accountIndex % 2 === 0 ? 2 : 3
  for (let s = 0; s < systemCount; s += 1) {
    const sid = next('S', 'sid')
    const tenantCount = 1 + ((accountIndex + s) % 4)
    const requirements = []
    const systemTenantRows = []
    const opp = opportunity(account, manager, 'DELIVERY', 'NEW', 'WON', `${account.accountName} Delivery ${s + 1}`, { deliveryDate: date(accountIndex + s + 1) })
    for (let t = 0; t < tenantCount; t += 1) {
      const requirementId = reqId()
      const configuration = cfg(seq.tenant + t + accountIndex)
      requirements.push(newReq(requirementId, configuration, { region: account.region }))
    }
    opp.newTenantRequirements = requirements
    opportunities.push(opp)
    const done = (accountIndex + s) % 3 === 0
    const project = projectFromOpportunity(opp, 'DELIVERY', 'NEW', done, '3')
    opp.finalProjectId = project.id
    projects.push(project)
    const isCurrentlyAllocated = seq.sid % 5 !== 0
    requirements.forEach((requirement, tenantIndex) => {
      const tid = next('T', 'tenant')
      const operationalStatus = tenantIndex === 0 && seq.tenant % 19 === 0 ? 'Deleted' : 'Active'
      const configuration = cfg(seq.tenant + accountIndex)
      const isTenantActive = operationalStatus !== 'Deleted' && operationalStatus !== 'Cancelled'
      const hasCurrentAllocation = isCurrentlyAllocated && isTenantActive
      const relationshipStatus = hasCurrentAllocation ? 'CURRENT' : 'RELEASED'
      const requirementHistory = [{ id: `tenant-req-${tid}-${requirement.requirementId}`, pid: project.pid, projectId: project.id, requirementId: requirement.requirementId, relationshipType: 'A', status: relationshipStatus, startedAt: iso(seq.tenant), endedAt: relationshipStatus === 'RELEASED' ? iso(seq.tenant + 2) : null }]
      const warrantyRows = [warranty(tid, project.id, opp.id, ['NOT_SET', 'VALID', 'PENDING', 'OUT_OF_CONTRACT'][seq.tenant % 4], done ? '2025-08-01' : '2026-08-01', done ? '2026-07-31' : '2027-07-31')]
      if (seq.tenant % 4 === 0) {
        const renewalRequirementId = reqId()
        const renewalOpp = opportunity(account, manager, 'RENEWAL', seq.tenant % 8 === 0 ? 'UPSELL' : 'STANDARD', 'WON', `${account.accountName} Renewal ${tid}`, { deliveryDate: date(seq.tenant + 5) }, {})
        const renewalProject = projectFromOpportunity(renewalOpp, 'RENEWAL', renewalOpp.subType === 'UPSELL' ? 'UPSELL' : 'STANDARD', seq.tenant % 2 === 0, '7')
        renewalOpp.finalProjectId = renewalProject.id
        const nextWarranty = warranty(tid, renewalProject.id, renewalOpp.id, 'VALID', '2027-08-01', '2028-07-31', warrantyRows[0].warrantyId)
        warrantyRows[0].successor = nextWarranty.warrantyId
        warrantyRows.push(nextWarranty)
        renewalOpp.standardRenewalRequirements = [renewalReq(renewalRequirementId, { id: tid, configuration }, sid, nextWarranty)]
        opportunities.push(renewalOpp)
        projects.push(renewalProject)
        if (hasCurrentAllocation) {
          requirementHistory.push({ id: `tenant-req-${tid}-${renewalRequirementId}`, pid: renewalProject.pid, projectId: renewalProject.id, requirementId: renewalRequirementId, relationshipType: 'C', status: 'CURRENT', startedAt: iso(seq.tenant + 8), endedAt: null })
          projectSystems.push({ id: `project-system-${renewalProject.id}-${sid}`, projectId: renewalProject.id, systemId: sid, tenantIds: [tid], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(seq.tenant + 8), deallocatedAt: null })
          projectTenants.push({ id: `project-tenant-${renewalProject.id}-${tid}`, projectId: renewalProject.id, tenantId: tid, systemId: sid, allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', allocatedAt: iso(seq.tenant + 8), deallocatedAt: null })
        } else {
          requirementHistory.push({ id: `tenant-req-${tid}-${renewalRequirementId}`, pid: renewalProject.pid, projectId: renewalProject.id, requirementId: renewalRequirementId, relationshipType: 'C', status: 'HISTORICAL', startedAt: iso(seq.tenant + 8), endedAt: iso(seq.tenant + 10) })
        }
      }
      const tenantRow = {
        id: tid,
        tid,
        accountId: account.id,
        systemId: sid,
        deliveryPid: project.pid,
        tenantType: 'CUSTOMER',
        accountName: account.accountName,
        country: account.country,
        state: account.state,
        timeGroup: account.timeGroup,
        operationalStatus,
        lastManualOperationalStatus: 'Active',
        individualLifecyclePreviousOperationalStatus: operationalStatus === 'Deleted' ? 'Active' : null,
        systemForcedPreviousOperationalStatus: null,
        systemForcedBySystemId: null,
        contractStatus: ['UNDER_CONTRACT', 'OUT_OF_CONTRACT', undefined][seq.tenant % 3],
        hostedSystemHistory: [{ systemId: sid, startedAt: iso(seq.tenant), endedAt: null, reason: 'Created' }],
        tenantFormType: 'CUSTOMER',
        hostedSystemId: sid,
        hostingSid: sid,
        sourceRequirementId: relationshipStatus === 'CURRENT' ? requirement.requirementId : undefined,
        releasedRequirementId: relationshipStatus === 'RELEASED' ? requirement.requirementId : null,
        requirementHistory,
        configuration,
        hostingSnapshot: { currentSystem: true, sid, operationalStatus: 'On', machineNumber: '', versionNumber: '2026.2', hostingType: 'Cloud', url: `https://${sid.toLowerCase()}.deliveryerp.example.invalid`, performanceTier: 'STANDARD', vpnEnabled: 'NO', vpnType: '', externalInterface: false, ipRestrictionEnabled: 'NO', platform: 'AWS', csp: 'Automate IT', awsRegion: hosting(account.region, seq.tenant).cloudRegion, azureRegion: '' },
        engagementCircle: [],
        remarks: [remark(`${tid} deterministic tenant baseline.`)],
        configurationHistory: [configHistory(tid, configuration)],
        warranties: warrantyRows,
        documents: [doc('TENANT', tid, `${tid}-tenant-profile.pdf`)],
        productType: configuration.product,
        hostingType: 'Cloud',
        cloudPlatform: 'AWS',
        csp: 'Automate IT',
        cloudRegion: hosting(account.region, seq.tenant).cloudRegion,
        performanceTier: 'STANDARD',
        vpnEnabled: 'NO',
        vpnType: '',
        externalInterface: false,
        ipRestrictionEnabled: 'NO',
        mapCenter: configuration.mapCenter,
        ...configuration,
        warrantyStatus: warrantyRows.at(-1)?.warrantyStatus ?? 'NOT_SET',
        warrantyStartDate: warrantyRows.at(-1)?.startDate ?? null,
        warrantyEndDate: warrantyRows.at(-1)?.endDate ?? null,
        pocStartDate: null,
        pocEndDate: null,
        createdAt: iso(seq.tenant),
        updatedAt: iso(seq.tenant + 2),
      }
      tenants.push(tenantRow)
      systemTenantRows.push(tenantRow)
      warrantyRows.forEach((row) => warrantyRecords.push(topWarranty(row, tid)))
      if (hasCurrentAllocation) {
        projectTenants.push({ id: `project-tenant-${project.id}-${tid}`, projectId: project.id, tenantId: tid, systemId: sid, allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', allocatedAt: iso(seq.tenant), deallocatedAt: null })
      }
    })
    const summary = summarize(systemTenantRows)
    const activeSystemTenantIds = systemTenantRows.filter((tenant) => tenant.operationalStatus !== 'Deleted' && tenant.operationalStatus !== 'Cancelled').map((tenant) => tenant.id)
    const system = { id: sid, accountId: account.id, salesManagerId: account.salesManagerId, sid, deliveryPid: isCurrentlyAllocated ? project.pid : '', machineId: null, source: 'Production', linkedProjectIds: isCurrentlyAllocated ? [project.id] : [], tenantIds: activeSystemTenantIds, systemClass: 'CUSTOMER', purpose: 'Delivery', availability: activeSystemTenantIds.length > 0 ? 'OCCUPIED' : 'AVAILABLE', ...hosting(account.region, seq.sid), mapCenter: summary.mapCenter, region: account.region, country: account.country, state: account.state, timeGroup: account.timeGroup, timeGroupAlert: '', operationalStatus: 'On', remarks: [remark(`${sid} deterministic production system.`)], owners: [], configurationHistory: [configHistory(sid, summary)], documents: [doc('SYSTEM', sid, `${sid}-architecture-summary.pdf`)], createdAt: iso(seq.sid), updatedAt: iso(seq.sid + 2), product: summary.product, ...summary }
    addVersionRefs(system, sid, 'allocated', sid)
    systems.push(system)
    projectSystems.push({ id: `project-system-${project.id}-${sid}`, projectId: project.id, systemId: sid, tenantIds: isCurrentlyAllocated ? activeSystemTenantIds : [], allocationStatus: isCurrentlyAllocated ? 'ALLOCATED' : 'DEALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(seq.sid), deallocatedAt: isCurrentlyAllocated ? null : iso(seq.sid + 2) })
  }
})

for (let i = 0; i < 40; i += 1) {
  const account = accounts[i * 2]
  const sid = next('S', 'sid')
  const inventory = { id: sid, sid, source: 'Production', purpose: 'Delivery', availability: 'AVAILABLE', ...hosting(account.region, seq.sid), mapCenter: 'Global', ...cfg(seq.sid, { licenses: 0, users: 0, blockchain: 0, mapCenter: 'Global' }), region: account.region, country: account.country, state: account.state, timeGroup: account.timeGroup, timeGroupAlert: '', linkedProjects: [], operationalStatus: 'On', tenantCount: 0, documents: [doc('PRODUCTION_SYSTEM', sid, `${sid}-inventory-record.pdf`)], alerts: [], remarks: [], configurationHistory: [], createdAt: iso(seq.sid), updatedAt: iso(seq.sid) }
  addVersionRefs(inventory, sid, 'production', sid)
  productionSystemInventory.push(inventory)
}

function onPremHostingPatch(system, index) {
  return {
    hostingType: 'On premise',
    cloudPlatform: '',
    csp: '',
    cloudRegion: '',
    url: `https://onprem-${system.sid.toLowerCase()}.deliveryerp.example.invalid`,
    vpnEnabled: index % 2 === 0 ? 'YES' : 'NO',
    vpnType: index % 2 === 0 ? 'IPSec' : '',
    ipRestrictionEnabled: 'YES',
  }
}

function daysBetweenDates(startDate, endDate) {
  if (!startDate || !endDate) return null
  return Math.ceil((Date.parse(endDate) - Date.parse(startDate)) / 86400000)
}

function daysBeforeDate(endDate) {
  return endDate ? Math.ceil((Date.parse(endDate) - Date.parse('2026-08-20T00:00:00.000Z')) / 86400000) : null
}

function infrastructureWarrantyRecord(infrastructureId, index, warrantyTypeRefId) {
  const warrantyId = next('W', 'warranty')
  const mode = index % 3
  const startDate = mode === 0 ? '2026-01-01' : mode === 1 ? '2025-10-01' : '2025-01-01'
  const endDate = mode === 0 ? '2028-12-31' : mode === 1 ? '2026-09-30' : '2026-07-31'
  const warrantyStatus = mode === 0 ? 'VALID' : mode === 1 ? 'PENDING' : 'EXPIRED'
  return {
    id: `infrastructure-warranty-${warrantyId}`,
    warrantyId,
    firstWarranty: true,
    predecessor: '',
    successor: '',
    accountId: '',
    relatedProjectId: '',
    warrantyType: '',
    warrantySubType: '',
    opportunityId: '',
    initialWarrantyDate: startDate,
    startDate,
    endDate,
    durationDays: daysBetweenDates(startDate, endDate),
    daysBeforeExpiration: daysBeforeDate(endDate),
    warrantyStatus,
    noWarranty: 'NO',
    outOfContract: 'NO',
    alerts: warrantyStatus === 'PENDING' ? 'Warranty expires in less than 90 days.' : '',
    remark: `${infrastructureId} ${warrantyStatus.toLowerCase()} infrastructure warranty baseline.`,
    warrantyTypeRefId,
  }
}

function recurrenceFor(index, startDate) {
  const frequency = ['none', 'daily', 'weekly', 'monthly', 'yearly'][index % 5]
  const base = {
    frequency,
    seriesId: frequency === 'none' ? null : `infrastructure-maintenance-series-${String(index + 1).padStart(3, '0')}`,
    interval: index % 7 === 0 ? 2 : 1,
    startDate: frequency === 'none' ? null : startDate,
    endType: frequency === 'none' ? 'none' : index % 2 === 0 ? 'after' : 'by',
    endAfterOccurrences: frequency !== 'none' && index % 2 === 0 ? 6 : null,
    endByDate: frequency !== 'none' && index % 2 === 1 ? '2027-12-31' : null,
    dailyMode: index % 2 === 0 ? 'interval' : 'weekday',
    weeklyWeekdays: frequency === 'weekly' ? ['monday', 'wednesday'] : [],
    monthlyMode: frequency === 'monthly' && index % 2 === 0 ? 'relative' : 'day',
    monthlyDay: frequency === 'monthly' ? 15 : null,
    monthlyOrdinal: 'second',
    monthlyRelativeDay: 'tuesday',
    yearlyMode: frequency === 'yearly' && index % 2 === 0 ? 'relative' : 'date',
    yearlyMonth: frequency === 'yearly' ? 8 : null,
    yearlyDay: frequency === 'yearly' ? 20 : null,
    yearlyOrdinal: 'first',
    yearlyRelativeDay: 'weekday',
    generatedThroughDate: frequency === 'none' ? null : '2027-12-31',
  }
  if (frequency === 'monthly' && base.monthlyMode === 'relative') base.monthlyDay = null
  if (frequency === 'yearly' && base.yearlyMode === 'relative') base.yearlyDay = null
  return base
}

function infrastructureMaintenanceTask(infrastructureId, index, kind) {
  const taskId = next('IMT', 'infrastructureMaintenanceTask')
  const isDone = index % 6 === 0
  const isInProgress = !isDone && index % 4 === 0
  const startDate = isDone ? '2026-06-10' : index % 5 === 0 ? '2026-08-25' : '2026-09-10'
  const dueDate = isDone ? '2026-06-15' : index % 5 === 0 ? '2026-08-30' : '2026-09-20'
  const recurrence = recurrenceFor(index, startDate)
  return {
    id: `infrastructure-maintenance-${taskId}`,
    taskId,
    taskTypeRefId: kind === 'server' ? (index % 2 === 0 ? taskTypes.preventive.id : taskTypes.firmware.id) : (index % 2 === 0 ? taskTypes.security.id : taskTypes.warranty.id),
    task: kind === 'server' ? 'Inspect hardware health, RAID status, and firmware baseline.' : 'Review firewall policy, firmware level, and VPN readiness.',
    startDate,
    dueDate,
    assignedResourceRefId: kind === 'server' ? assignedResources.platform.id : assignedResources.network.id,
    taskStatus: isDone ? 'Done' : isInProgress ? 'In Progress' : 'Open',
    completionDate: isDone ? '2026-06-15' : null,
    recurrence,
    recurrenceSeriesId: recurrence.seriesId,
    recurrenceOccurrenceDate: recurrence.frequency === 'none' ? null : startDate,
    recurrenceDefinitionTaskId: `infrastructure-maintenance-${taskId}`,
    recurrenceOverrideFields: [],
    createdAt: iso(index + 1),
    createdBy: user,
    updatedAt: iso(index + 2),
    updatedBy: user,
  }
}

function infrastructureItem(system, index, kind) {
  const infrastructureId = next('INF', 'infrastructureItem')
  const isServer = kind === 'server'
  const warranty = infrastructureWarrantyRecord(infrastructureId, index, index % 3 === 0 ? extendedWarrantyType.id : standardWarrantyType.id)
  const maintenanceTask = infrastructureMaintenanceTask(infrastructureId, index, kind)
  const identifierSuffix = isServer ? `HPE-DL360-${String(index + 1).padStart(2, '0')}` : `FGT-60F-${String(index + 1).padStart(2, '0')}`
  const identifier = `${system.sid}-${identifierSuffix}`
  return {
    id: infrastructureId,
    infrastructureId,
    identifier,
    normalizedIdentifier: identifier.toLocaleLowerCase(),
    categoryRefId: hardwareCategory.id,
    typeRefId: isServer ? serverType.id : firewallType.id,
    manufacturerRefId: isServer ? hpManufacturer.id : fortigateManufacturer.id,
    model: isServer ? (index % 2 === 0 ? 'HPE ProLiant DL360 Gen10' : 'HPE ProLiant DL360 Gen12') : (index % 3 === 0 ? 'FortiGate 70E' : 'FortiGate 60F'),
    lastUpdatedDate: date(index + 1),
    owner: index % 4 === 0 ? 'Customer' : 'Penlink',
    ownerRefId: index % 4 === 0 ? customerOwner.id : penlinkOwner.id,
    billingMethodRefId: index % 3 === 0 ? recurringBilling.id : oneTimeBilling.id,
    operationalStatus: 'Active',
    deletionReason: '',
    deletionHistory: [],
    deletionPreviousOperationalStatus: null,
    maintenanceStatus: maintenanceTask.taskStatus === 'Done' ? 'Current' : 'Planned',
    linkedSystemIds: [system.id],
    initialWarrantyStartDate: warranty.startDate,
    currentWarrantyStartDate: warranty.startDate,
    currentWarrantyEndDate: warranty.endDate,
    warrantyTypeRefId: warranty.warrantyTypeRefId,
    manualWarrantyStatus: '',
    warrantyContact: {
      name: isServer ? 'Infrastructure Warranty Desk' : 'Network Warranty Desk',
      email: isServer ? 'server-warranty@deliveryerp.example' : 'network-warranty@deliveryerp.example',
      phone: '+1-555-0100',
      address: `${system.accountId} ${system.country} ${system.state} data room`,
    },
    locationAddress: `${system.accountId} ${system.country} ${system.state} data room`,
    properties: isServer
      ? {
          manufacturerRefId: hpManufacturer.id,
          hardwareTypeRefId: serverType.id,
          modelRefId: index % 2 === 0 ? propertyValues.hpeDl360Gen10.id : propertyValues.hpeDl360Gen12.id,
          modelText: index % 2 === 0 ? 'HPE ProLiant DL360 Gen10' : 'HPE ProLiant DL360 Gen12',
          memoryTypeRefId: index % 2 === 0 ? propertyValues.ddr4.id : propertyValues.ddr5.id,
          memorySizeRefId: propertyValues.memory32.id,
          memoryQuantity: index % 2 === 0 ? 4 : 8,
          cpuTypeRefId: index % 2 === 0 ? propertyValues.xeonSilver.id : propertyValues.xeon6505.id,
          cpuQuantity: 2,
          disks: [{ id: `${infrastructureId}-disk-1`, diskTypeRefId: index % 2 === 0 ? propertyValues.hpSas.id : propertyValues.hpeSata.id, quantity: 6 }],
          vms: [],
        }
      : {
          manufacturerRefId: fortigateManufacturer.id,
          hardwareTypeRefId: firewallType.id,
          modelRefId: index % 3 === 0 ? propertyValues.forti70e.id : propertyValues.forti60f.id,
          modelText: index % 3 === 0 ? 'FortiGate 70E' : 'FortiGate 60F',
          firmwareVersionRefId: '',
          firmwareLastUpdatedDate: date(index + 3),
          fortiManager: index % 2 === 0 ? 'YES' : 'NO',
          rackmount: 'YES',
          vpnTypeRefId: propertyValues.openVpn.id,
          vpnLicenseCount: 25 + (index % 5) * 5,
          disks: [],
          vms: [],
          tokens: [{ id: `${infrastructureId}-token-1`, tokenTypeRefId: '', serialNumber: `FGT-LIC-${String(index + 1).padStart(4, '0')}`, licenseEndDate: warranty.endDate }],
        },
    maintenanceTasks: [maintenanceTask],
    warranties: [warranty],
    remarks: [remark(`${infrastructureId} deterministic ${isServer ? 'HP server' : 'FortiGate firewall'} for On-Prem System ${system.sid}.`)],
    documents: [doc('INFRASTRUCTURE_ITEM', infrastructureId, `${infrastructureId}-${isServer ? 'server' : 'firewall'}-support.pdf`)],
    createdAt: iso(index + 1),
    updatedAt: iso(index + 2),
  }
}

const hostedOnPremAccountIndexes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]
const hostedOnPremSystems = hostedOnPremAccountIndexes
  .map((accountIndex) => systems.find((system) => system.source === 'Production' && system.accountId === accounts[accountIndex]?.id))
  .filter(Boolean)
const inventoryOnPremSystems = [0, 10, 20, 30].map((index) => productionSystemInventory[index]).filter(Boolean)
const onPremSystems = [...hostedOnPremSystems, ...inventoryOnPremSystems]
onPremSystems.forEach((system, index) => {
  Object.assign(system, onPremHostingPatch(system, index))
  if (Array.isArray(system.hostingSnapshot)) return
  infrastructureItems.push(infrastructureItem(system, index * 2, 'server'))
  infrastructureItems.push(infrastructureItem(system, index * 2 + 1, 'firewall'))
})

function addPoc(index, done) {
  const account = accounts[index % accounts.length]
  const manager = salesManagers.find((candidate) => candidate.id === account.salesManagerId)
  const mid = done && index === 30 ? 'M000002' : `M${String(index + 1).padStart(6, '0')}`
  const sid = next('S', 'sid')
  const requirementId = reqId()
  const configuration = cfg(800 + index)
  const opp = opportunity(account, manager, 'POC', index % 2 === 0 ? 'FREE' : 'PAID', done ? 'WON' : 'POC', `${account.accountName} ${done ? 'Done' : 'Open'} POC ${index + 1}`, { deliveryDate: date(index + 2), pocStartDate: date(index + 1), pocEndDate: date(index + 12) }, { newTenantRequirements: [newReq(requirementId, configuration, { region: account.region })] })
  opportunities.push(opp)
  const project = projectFromOpportunity(opp, 'POC', 'NONE', done, index % 2 === 0 ? '1' : '2')
  opp.pocProjectIds = [project.id]
  projects.push(project)
  const tid = next('T', 'tenant')
  const tenantRow = { id: tid, tid, accountId: account.id, systemId: sid, deliveryPid: project.pid, tenantType: 'POC', accountName: account.accountName, country: account.country, state: account.state, timeGroup: account.timeGroup, operationalStatus: done ? 'Deleted' : 'Active', lastManualOperationalStatus: 'Active', individualLifecyclePreviousOperationalStatus: done ? 'Active' : null, systemForcedPreviousOperationalStatus: null, systemForcedBySystemId: null, contractStatus: 'UNDER_CONTRACT', hostedSystemHistory: [{ systemId: sid, startedAt: iso(10 + index), endedAt: done ? iso(18 + index) : null, reason: 'Created' }], tenantFormType: 'POC', hostedSystemId: sid, hostingSid: sid, sourceRequirementId: done ? undefined : requirementId, releasedRequirementId: done ? requirementId : null, requirementHistory: [{ id: `tenant-req-${tid}-${requirementId}`, pid: project.pid, projectId: project.id, requirementId, relationshipType: 'A', status: done ? 'HISTORICAL' : 'CURRENT', startedAt: iso(10 + index), endedAt: done ? iso(18 + index) : null }], configuration, hostingSnapshot: { currentSystem: !done, sid, operationalStatus: 'On', machineNumber: mid, versionNumber: '2026.2', hostingType: 'Cloud', url: `https://${sid.toLowerCase()}.deliveryerp.example.invalid`, performanceTier: 'STANDARD', vpnEnabled: 'NO', vpnType: '', externalInterface: false, ipRestrictionEnabled: 'NO', platform: 'AWS', csp: 'Automate IT', awsRegion: hosting(account.region, index).cloudRegion, azureRegion: '' }, engagementCircle: [], remarks: [remark(`${tid} deterministic POC tenant.`)], configurationHistory: [configHistory(tid, configuration)], warranties: [warranty(tid, project.id, opp.id, 'NO_WARRANTY', null, null)], documents: [doc('TENANT', tid, `${tid}-poc-profile.pdf`)], productType: configuration.product, hostingType: 'Cloud', cloudPlatform: 'AWS', csp: 'Automate IT', cloudRegion: hosting(account.region, index).cloudRegion, performanceTier: 'STANDARD', vpnEnabled: 'NO', vpnType: '', externalInterface: false, ipRestrictionEnabled: 'NO', mapCenter: configuration.mapCenter, ...configuration, warrantyStatus: 'NOT_SET', warrantyStartDate: null, warrantyEndDate: null, pocStartDate: opp.pocStartDate, pocEndDate: opp.pocEndDate, createdAt: iso(10 + index), updatedAt: iso(12 + index) }
  tenants.push(tenantRow)
  warrantyRecords.push(...tenantRow.warranties.map((row) => topWarranty(row, tid)))
  const system = { id: sid, accountId: account.id, salesManagerId: account.salesManagerId, sid, deliveryPid: done ? '' : project.pid, machineId: mid, source: 'Reused Internal Systems', linkedProjectIds: done ? [] : [project.id], tenantIds: [tid], systemClass: 'POC_DEMO_TRAINING', purpose: 'POC', availability: done ? 'AVAILABLE' : 'OCCUPIED', ...hosting(account.region, index), mapCenter: configuration.mapCenter, region: account.region, country: account.country, state: account.state, timeGroup: account.timeGroup, timeGroupAlert: '', operationalStatus: 'On', remarks: [remark(`${sid} deterministic POC system.`)], owners: [], configurationHistory: [configHistory(sid, configuration)], documents: [doc('SYSTEM', sid, `${sid}-poc-system.pdf`)], createdAt: iso(8 + index), updatedAt: iso(12 + index), product: configuration.product, ...configuration }
  addVersionRefs(system, sid, 'allocated', sid, mid)
  systems.push(system)
  projectSystems.push({ id: `project-system-${project.id}-${sid}`, projectId: project.id, systemId: sid, tenantIds: done ? [] : [tid], allocationStatus: done ? 'DEALLOCATED' : 'ALLOCATED', allocationType: 'REUSED_INTERNAL', sourceMachineId: mid, allocatedAt: iso(9 + index), deallocatedAt: done ? iso(20 + index) : null })
  if (!done) projectTenants.push({ id: `project-tenant-${project.id}-${tid}`, projectId: project.id, tenantId: tid, systemId: sid, allocationStatus: 'ALLOCATED', allocationType: 'REUSED_INTERNAL', allocatedAt: iso(9 + index), deallocatedAt: null })
}

for (let i = 0; i < 30; i += 1) addPoc(i, false)
for (let i = 30; i < 60; i += 1) addPoc(i, true)

for (let i = 0; i < 60; i += 1) {
  const account = accounts[i % accounts.length]
  const mid = `M${String(i + 1).padStart(6, '0')}`
  const currentPurpose = i < 30 ? 'POC' : i < 40 ? 'Demo' : i < 50 ? 'Training' : i < 58 ? 'Available' : 'Support'
  const currentProjectIds = currentPurpose === 'POC'
    ? projectSystems
      .filter((link) => link.sourceMachineId === mid && link.allocationStatus === 'ALLOCATED')
      .map((link) => link.projectId)
    : []
  const reused = { id: mid, machineId: mid, source: 'Reused Internal Systems', purpose: currentPurpose, status: currentPurpose === 'Available' ? 'Available' : 'Occupied', ...hosting(account.region, i), mapCenter: 'Global', ...cfg(900 + i), usedInRegion: account.region, timeGroup: account.timeGroup, timeGroupAlert: '', occupationStartDate: currentPurpose === 'POC' ? date(i + 1) : null, occupationEndDate: currentPurpose === 'POC' ? date(i + 12) : null, currentProjectIds, purposeHistory: [{ id: `purpose-history-${mid}`, recordId: next('PH', 'purposeHistory'), startDate: date(i + 1), endDate: currentPurpose === 'POC' ? null : date(i + 10), purposeType: currentPurpose }], tenantCount: currentPurpose === 'POC' ? 1 : 0, alerts: currentPurpose === 'Available' ? [] : [`Reserved for ${currentPurpose}`], operationalStatus: 'On', remarks: [remark(`${mid} deterministic reused internal system.`)], owners: [], configurationHistory: [configHistory(mid, cfg(900 + i))], documents: [doc('INTERNAL_REUSED_SYSTEM', mid, `${mid}-lab-readiness.pdf`)], createdAt: iso(i + 1), updatedAt: iso(i + 3) }
  addVersionRefs(reused, mid, 'reused', '', mid)
  reusedInternalSystems.push(reused)
}

function markTenantLifecycle(tid, operationalStatus, reason) {
  const tenant = tenants.find((candidate) => candidate.tid === tid)
  if (!tenant) return
  tenant.operationalStatus = operationalStatus
  tenant.individualLifecyclePreviousOperationalStatus = tenant.individualLifecyclePreviousOperationalStatus ?? 'Active'
  tenant.systemForcedPreviousOperationalStatus = null
  tenant.systemForcedBySystemId = null
  tenant.updatedAt = iso(121)
  if (operationalStatus === 'Cancelled') {
    tenant.cancellationReason = reason
    tenant.cancellationAt = iso(120)
    tenant.cancelledBy = user
    tenant.sourceRequirementId = undefined
    tenant.releasedRequirementId = tenant.releasedRequirementId ?? tenant.requirementHistory?.find((relationship) => relationship.status === 'CURRENT')?.requirementId ?? null
    tenant.requirementHistory = (tenant.requirementHistory ?? []).map((relationship) =>
      relationship.status === 'CURRENT' ? { ...relationship, status: 'RELEASED', endedAt: iso(120) } : relationship,
    )
  }
  projectTenants
    .filter((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')
    .forEach((link) => {
      link.allocationStatus = 'DEALLOCATED'
      link.deallocatedAt = iso(120)
    })
  projectSystems.forEach((link) => {
    if ((link.tenantIds ?? []).includes(tenant.id)) {
      link.tenantIds = link.tenantIds.filter((tenantId) => tenantId !== tenant.id)
    }
  })
}

function tenantWarrantyGroup(tenant) {
  const statuses = (tenant.warranties ?? []).map((warrantyRow) => warrantyRow.warrantyStatus)
  if (statuses.length === 0 || statuses.every((status) => status === 'NOT_SET')) return 'NOT_SET'
  if (statuses.some((status) => status === 'NO_WARRANTY') && statuses.every((status) => status === 'NO_WARRANTY' || status === 'RENEWED')) return 'OUT_OF_CONTRACT'
  if (statuses.some((status) => status === 'OUT_OF_CONTRACT')) return 'OUT_OF_CONTRACT'
  return 'UNDER_CONTRACT'
}

function firstTenantWithWarrantyGroup(group, skipped) {
  return tenants.find((tenant) =>
    tenant.tenantType === 'CUSTOMER' &&
    !skipped.has(tenant.tid) &&
    tenant.operationalStatus === 'Active' &&
    tenantWarrantyGroup(tenant) === group,
  )
}

function firstActiveCustomerTenant(skipped) {
  return tenants.find((tenant) =>
    tenant.tenantType === 'CUSTOMER' &&
    tenant.operationalStatus === 'Active' &&
    !skipped.has(tenant.tid),
  )
}

function setTenantWarrantyGroup(tenant, group) {
  const status = group === 'NOT_SET' ? 'NOT_SET' : group === 'OUT_OF_CONTRACT' ? 'OUT_OF_CONTRACT' : 'VALID'
  tenant.warranties = (tenant.warranties ?? []).map((warrantyRow) => ({
    ...warrantyRow,
    warrantyStatus: status,
    noWarranty: status === 'NO_WARRANTY' ? 'YES' : 'NO',
    outOfContract: status === 'OUT_OF_CONTRACT' ? 'YES' : 'NO',
  }))
  warrantyRecords
    .filter((record) => record.tenantId === tenant.tid)
    .forEach((record) => {
      record.status = status
    })
  tenant.warrantyStatus = status
}

const cancellationSeedTenantIds = new Set()
;[
  ['NOT_SET', 'Cancelled'],
  ['NOT_SET', 'Deleted'],
  ['VALID', 'Cancelled'],
  ['VALID', 'Deleted'],
  ['OUT_OF_CONTRACT', 'Cancelled'],
  ['OUT_OF_CONTRACT', 'Deleted'],
].forEach(([warrantyStatus, operationalStatus]) => {
  const tenant = firstTenantWithWarrantyGroup(warrantyStatus, cancellationSeedTenantIds) ?? firstActiveCustomerTenant(cancellationSeedTenantIds)
  if (!tenant) return
  cancellationSeedTenantIds.add(tenant.tid)
  setTenantWarrantyGroup(tenant, warrantyStatus)
  markTenantLifecycle(tenant.tid, operationalStatus, `${operationalStatus} Tenant seed scenario for ${warrantyStatus}.`)
})

const cancelledProject = projects.find((project) => project.progressStatus === 'OPEN' && project.mainType === 'DELIVERY')
if (cancelledProject) {
  projectSystems
    .filter((link) => link.projectId === cancelledProject.id && link.allocationStatus !== 'DEALLOCATED')
    .forEach((link) => {
      link.allocationStatus = 'DEALLOCATED'
      link.deallocatedAt = iso(121)
      link.tenantIds = []
    })
  projectTenants
    .filter((link) => link.projectId === cancelledProject.id && link.allocationStatus !== 'DEALLOCATED')
    .forEach((link) => {
      link.allocationStatus = 'DEALLOCATED'
      link.deallocatedAt = iso(121)
    })
  systems
    .filter((system) => (system.linkedProjectIds ?? []).includes(cancelledProject.id))
    .forEach((system) => {
      system.linkedProjectIds = (system.linkedProjectIds ?? []).filter((projectId) => projectId !== cancelledProject.id)
      system.deliveryPid = system.deliveryPid === cancelledProject.pid ? '' : system.deliveryPid
    })
  cancelledProject.cancellationRequested = 'NO'
  cancelledProject.cancellationReason = 'Cancelled Project seed scenario.'
  cancelledProject.cancellationPreviousProgressStatus = cancelledProject.progressStatus
  cancelledProject.cancellationHistory = [{
    id: `project-cancellation-${cancelledProject.id}`,
    reason: cancelledProject.cancellationReason,
    timestamp: iso(122),
    deletedBy: user,
  }]
  cancelledProject.progressStatus = 'CANCELLED'
  cancelledProject.updatedAt = iso(123)
}

const cancelledSystem = productionSystemInventory.find((system) => system.operationalStatus === 'On')
if (cancelledSystem) {
  cancelledSystem.operationalStatus = 'Canceled'
  cancelledSystem.cancellationRequested = 'NO'
  cancelledSystem.cancellationReason = 'Cancelled standalone Production System seed scenario.'
  cancelledSystem.cancellationAt = iso(124)
  cancelledSystem.cancelledBy = user
  cancelledSystem.cancellationPreviousOperationalStatus = 'On'
  cancelledSystem.updatedAt = iso(125)
}

const cancelledInfrastructureItemSourceSystem = onPremSystems[0]
if (cancelledInfrastructureItemSourceSystem) {
  const cancelledInfrastructureItem = infrastructureItem(cancelledInfrastructureItemSourceSystem, infrastructureItems.length + 1, 'firewall')
  cancelledInfrastructureItem.identifier = `${cancelledInfrastructureItem.infrastructureId}-cancelled-unlinked-firewall`
  cancelledInfrastructureItem.normalizedIdentifier = cancelledInfrastructureItem.identifier.toLocaleLowerCase()
  cancelledInfrastructureItem.manufacturerRefId = paloAltoManufacturer.id
  cancelledInfrastructureItem.model = 'Palo Alto PA-440'
  cancelledInfrastructureItem.linkedSystemIds = []
  cancelledInfrastructureItem.properties = {
    ...cancelledInfrastructureItem.properties,
    manufacturerRefId: paloAltoManufacturer.id,
    modelRefId: '',
    modelText: 'Palo Alto PA-440',
  }
  cancelledInfrastructureItem.operationalStatus = 'Cancelled'
  cancelledInfrastructureItem.cancellationRequested = 'NO'
  cancelledInfrastructureItem.cancellationReason = 'Cancelled unlinked Infrastructure Item seed scenario.'
  cancelledInfrastructureItem.cancellationPreviousOperationalStatus = 'Active'
  cancelledInfrastructureItem.cancellationHistory = [{
    id: `infrastructure-cancellation-${cancelledInfrastructureItem.id}`,
    reason: cancelledInfrastructureItem.cancellationReason,
    timestamp: iso(126),
    deletedBy: user,
  }]
  cancelledInfrastructureItem.remarks = [remark(`${cancelledInfrastructureItem.infrastructureId} cancelled after explicit System unlink release-first workflow.`)]
  cancelledInfrastructureItem.updatedAt = iso(127)
  infrastructureItems.push(cancelledInfrastructureItem)
}

const activityEvents = projects.slice(0, 80).map((project) => {
  const aid = next('ACT', 'activity')
  return { id: aid, technicalId: `activity-${aid}`, occurredAt: iso(seq.activity, 10), actorId: 'user-demo', actorName: user, source: 'USER', eventType: 'CREATE', severity: 'INFO', category: 'PROJECT', primaryObject: { objectType: 'Project', id: project.id, businessId: project.pid, displayLabel: project.opportunityName, routePath: `/projects/${project.pid}` }, relatedObjects: [], summary: `Project ${project.pid} deterministic QA baseline created.`, details: `Project ${project.pid} deterministic QA baseline created.`, metadata: {}, correlationId: `CORR-${aid}`, sequence: seq.activity, schemaVersion: 1 }
})

const data = {
  version: 1,
  lastPersistedAt: null,
  salesManagers,
  accounts,
  opportunities: opportunities.map(({ accountName, dealOwner, ...row }) => row),
  projects,
  productionSystemInventory,
  reusedInternalSystems,
  systems,
  tenants,
  warrantyRecords,
  referenceData,
  timeGroupLookups: [],
  userPresentationPreferences: [],
  versionUpdates,
  infrastructureItems,
  activityEvents,
  projectSystems,
  projectTenants,
  idCounters: {
    account: seq.account,
    opportunity: seq.opportunity,
    project: seq.project,
    productionSystem: seq.sid,
    tenant: seq.tenant,
    warranty: seq.warranty,
    remark: seq.remark,
    activity: seq.activity,
    configurationHistory: seq.configurationHistory,
    purposeHistory: seq.purposeHistory,
    document: seq.document,
    versionNumber: 2,
    buildNumber: 3,
    versionUpdate: seq.versionUpdate,
    versionUpdateAttachment: seq.versionUpdateAttachment,
    infrastructureItem: seq.infrastructureItem,
    infrastructureCategory: seq.infrastructureCategory,
    infrastructureType: seq.infrastructureType,
    infrastructureManufacturer: seq.infrastructureManufacturer,
    infrastructureOwner: seq.infrastructureOwner,
    infrastructureBillingMethod: seq.infrastructureBillingMethod,
    infrastructureWarrantyType: seq.infrastructureWarrantyType,
    infrastructurePropertyValue: seq.infrastructurePropertyValue,
    infrastructureMaintenanceTask: seq.infrastructureMaintenanceTask,
    pid: seq.project,
    sid: seq.sid,
    tid: seq.tenant,
    mid: 60,
  },
}

fs.writeFileSync(seedPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Final QA seed written to ${path.relative(rootDir, seedPath)}`)
console.log(JSON.stringify({
  accounts: data.accounts.length,
  accountsByRegion: Object.fromEntries(regionPlans.map((plan) => [plan.region, data.accounts.filter((account) => account.region === plan.region).length])),
  productionSystems: data.systems.filter((system) => system.source === 'Production').length + data.productionSystemInventory.length,
  hostedProductionSystems: data.systems.filter((system) => system.source === 'Production').length,
  productionInventorySystems: data.productionSystemInventory.length,
  customerTenants: data.tenants.filter((tenant) => tenant.tenantType === 'CUSTOMER').length,
  reusedInternalSystems: data.reusedInternalSystems.length,
  openPocProjects: data.projects.filter((project) => project.mainType === 'POC' && project.progressStatus === 'OPEN').length,
  donePocProjects: data.projects.filter((project) => project.mainType === 'POC' && project.progressStatus === 'DONE').length,
  maxRequirementId: `A-${String(seq.requirement).padStart(3, '0')}`,
  onPremProductionSystems: data.systems.filter((system) => system.source === 'Production' && system.hostingType === 'On premise').length + data.productionSystemInventory.filter((system) => system.hostingType === 'On premise').length,
  infrastructureItems: data.infrastructureItems.length,
  infrastructureWarranties: data.infrastructureItems.flatMap((item) => item.warranties ?? []).length,
  infrastructureMaintenanceTasks: data.infrastructureItems.flatMap((item) => item.maintenanceTasks ?? []).length,
}, null, 2))
