import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const seedPath = path.join(rootDir, 'src', 'data', 'seed.json')

const now = '2026-07-22T09:00:00.000Z'
const user = 'Demo User'

const idCounters = {
  account: 6,
  opportunity: 8,
  project: 8,
  productionSystem: 12,
  tenant: 10,
  warranty: 12,
  remark: 20,
  activity: 32,
  configurationHistory: 14,
  purposeHistory: 6,
  document: 12,
  versionNumber: 3,
  buildNumber: 6,
  versionUpdate: 21,
  versionUpdateAttachment: 63,
  pid: 8,
  sid: 12,
  tid: 10,
  mid: 8,
}

const regionsByCountry = {
  Australia: 'APAC',
  Canada: 'NA',
  Germany: 'EMEA',
  Singapore: 'APAC',
  'United Kingdom': 'EMEA',
  'United States': 'NA',
}

const timeZones = {
  Germany: 'UTC+02:00',
  Canada: 'UTC-04:00',
  Singapore: 'UTC+08:00',
  'United Kingdom': 'UTC+01:00',
  'United States': 'UTC-04:00',
  Australia: 'UTC+10:00',
}

function bid(prefix, n) {
  return `${prefix}${String(n).padStart(6, '0')}`
}

function iso(day, hour = 9) {
  return `2026-07-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
}

function region(country) {
  return regionsByCountry[country]
}

function timeZone(country) {
  return timeZones[country]
}

function salesManager(n, name, regionValue) {
  return {
    id: `sales-manager-ref-${n}`,
    name,
    email: `${name.toLowerCase().replaceAll(' ', '.')}@deliveryerp.example`,
    region: regionValue,
    createdAt: iso(1),
    updatedAt: iso(1),
  }
}

function account(n, name, customerType, salesManagerId, country, state) {
  const accountRegion = region(country)
  const accountCode = bid('C', n)
  return {
    id: accountCode,
    accountCode,
    accountName: name,
    customerType,
    salesManagerId,
    region: accountRegion,
    country,
    state,
    timeZone: timeZone(country),
    timeGroup: accountRegion,
    createdAt: iso(1),
    updatedAt: iso(2),
  }
}

function config(overrides = {}) {
  return {
    product: 'Tangles',
    licenses: 25,
    users: 60,
    concurrentSearches: 5,
    dailySearches: 400,
    monthlySearches: 8000,
    concurrentAnalyses: 3,
    dailyAnalyses: 120,
    monthlyAnalyses: 2400,
    topicAnalyses: 5,
    standardMonitors: 20,
    fullMonitors: 5,
    topicMonitors: 4,
    mapCenter: 'Global',
    tangles: 25,
    tanglesGo: 10,
    webloc: 0,
    webeye: 0,
    ingest: 2,
    blockchain: 0,
    crossSystemFeatures: ['Open Sources'],
    apiEnabled: 'YES',
    apiDailyQty: 1000,
    apiMonthlyQty: 20000,
    aiFeatures: ['Entity Resolution'],
    additionalFeatures: ['SSO'],
    ...overrides,
  }
}

function reqBase(id, requirementId, overrides = {}) {
  return {
    id,
    requirementId,
    hostingType: 'Cloud',
    cloudPlatform: 'AWS',
    csp: 'Automate IT',
    cloudRegion: 'us-east-1 (N. Virginia)',
    statisticsId: '',
    authId: '',
    rdmId: '',
    performanceTier: 'STANDARD',
    vpnEnabled: 'NO',
    vpnType: '',
    ipRestrictionEnabled: 'NO',
    productType: 'Tangles',
    ...config(),
    ...overrides,
  }
}

function newTenantReq(id, requirementId, overrides = {}) {
  return {
    ...reqBase(id, requirementId, overrides),
    deployTarget: overrides.deployTarget ?? 'NEW_SYSTEM',
    existingSystemId: overrides.existingSystemId ?? null,
  }
}

function changeReq(id, requirementId, tenantId, systemId, baselineConfiguration, overrides = {}) {
  return {
    ...reqBase(id, requirementId, overrides),
    tenantId,
    systemId,
    baselineConfiguration,
  }
}

function renewalReq(id, requirementId, tenantId, systemId, warrantyRecordId, status, endDate) {
  return {
    id,
    requirementId,
    tenantId,
    systemId,
    warrantyRecordId,
    warrantyStatus: status,
    warrantyEndDate: endDate,
  }
}

function milestone(projectId, n, name, status, deadline, comment = '') {
  return { id: `${projectId}-milestone-${n}`, name, order: n, status, deadline, comment }
}

function task(projectId, milestoneId, n, name, department, resource, status, deadline, comment = '') {
  return { id: `${projectId}-task-${n}`, milestoneId, name, department, resource, status, order: n, deadline, comment }
}

function projectTasks(projectId, done = false) {
  const status = done ? 'DONE' : 'OPEN'
  const m1 = `${projectId}-milestone-1`
  const m2 = `${projectId}-milestone-2`
  return [
    task(projectId, m1, 1, 'Confirm requirements baseline', 'Delivery', 'Delivery Manager', 'DONE', '2026-07-12', 'Baseline reviewed.'),
    task(projectId, m1, 2, 'Prepare environment', 'Infrastructure', 'Cloud Engineer', status, '2026-07-18', done ? 'Completed.' : 'In progress.'),
    task(projectId, m2, 3, 'Customer acceptance review', 'Delivery', 'Project Owner', status, '2026-07-25', done ? 'Accepted.' : 'Pending customer review.'),
  ]
}

function project(n, opportunity, mainType, subType, dates, done = false) {
  const id = bid('P', n)
  return {
    id,
    pid: id,
    opportunityId: opportunity.id,
    projectSource: mainType === 'POC' ? 'POC' : 'FINAL',
    accountName: opportunity.accountName,
    mainType,
    subType,
    deliveryDate: dates.deliveryDate ?? null,
    pocStartDate: dates.pocStartDate ?? null,
    pocEndDate: dates.pocEndDate ?? null,
    progressStatus: done ? 'DONE' : 'OPEN',
    region: opportunity.region,
    country: opportunity.country,
    state: opportunity.state,
    timeZone: opportunity.timeZone,
    timeGroup: opportunity.timeGroup,
    dealOwner: opportunity.dealOwner,
    opportunityName: opportunity.opportunityName,
    canceledAt: null,
    milestoneTemplateId: String(n),
    createdAt: iso(2 + n),
    updatedAt: iso(8 + n),
    milestones: [
      milestone(id, 1, mainType === 'POC' ? 'POC preparation' : 'Environment configuration', done ? 'DONE' : 'OPEN', dates.deliveryDate ?? dates.pocStartDate ?? '2026-07-25'),
      milestone(id, 2, mainType === 'RENEWAL' ? 'Renewal acceptance' : 'Customer acceptance', done ? 'DONE' : 'OPEN', dates.deliveryDate ?? dates.pocEndDate ?? '2026-07-30'),
    ],
    tasks: projectTasks(id, done),
    documents: [
      document(1 + n, 'PROJECT', bid('P', n), `${bid('P', n)}-project-plan.pdf`, 'application/pdf', 240000 + n),
    ],
  }
}

function document(n, parentObjectType, parentBusinessId, fileName, fileType = 'application/pdf', fileSize = 120000) {
  return {
    id: bid('DOC', n),
    fileName,
    fileType,
    fileSize,
    uploadedAt: iso(10 + (n % 10)),
    storedFileReference: `reference-dataset/${parentObjectType.toLowerCase()}/${fileName}`,
    uploadedBy: user,
    parentObjectType,
    parentBusinessId,
  }
}

function remark(n, content, type = 'Note', dueDate = null) {
  return {
    id: `remark-ref-${n}`,
    remarkId: bid('R', n),
    createdAt: iso(6 + (n % 10)),
    author: user,
    type,
    content,
    dueDate,
    updatedAt: iso(8 + (n % 10)),
    updatedBy: user,
  }
}

function owner(n, fullName, company) {
  return {
    id: `owner-ref-${n}`,
    userId: `owner-user-${n}`,
    userName: fullName.toLowerCase().replaceAll(' ', '.'),
    fullName,
    title: 'Operational Owner',
    company,
    phoneNumber: '+1-555-0100',
    email: `${fullName.toLowerCase().replaceAll(' ', '.')}@example.org`,
  }
}

function configHistory(n, businessId, configuration, timestamp = iso(10)) {
  return {
    id: `configuration-history-ref-${n}`,
    recordId: bid('CH', n),
    timestamp,
    tid: businessId,
    recordedBy: user,
    configuration,
  }
}

function purposeHistory(n, purposeType, startDate, endDate, context = {}) {
  return {
    id: `purpose-history-ref-${n}`,
    recordId: bid('PH', n),
    startDate,
    endDate,
    purposeType,
    ...context,
  }
}

function hostingFields(country, overrides = {}) {
  return {
    logo: '',
    url: overrides.url ?? 'https://erp.example.invalid',
    cognitoRegion: region(country),
    productType: overrides.productType ?? 'Tangles',
    hostingType: overrides.hostingType ?? 'Cloud',
    cloudPlatform: overrides.cloudPlatform ?? 'AWS',
    csp: overrides.csp ?? 'Automate IT',
    cloudRegion: overrides.cloudRegion ?? 'us-east-1 (N. Virginia)',
    performanceTier: overrides.performanceTier ?? 'STANDARD',
    vpnEnabled: overrides.vpnEnabled ?? 'NO',
    vpnType: overrides.vpnType ?? '',
    ipRestrictionEnabled: overrides.ipRestrictionEnabled ?? 'NO',
  }
}

function summarize(tenantRows) {
  const summary = config({ licenses: 0, users: 0, concurrentSearches: 0, dailySearches: 0, monthlySearches: 0, concurrentAnalyses: 0, dailyAnalyses: 0, monthlyAnalyses: 0, topicAnalyses: 0, standardMonitors: 0, fullMonitors: 0, topicMonitors: 0, tangles: 0, tanglesGo: 0, webloc: 0, webeye: 0, ingest: 0, blockchain: 0, apiDailyQty: 0, apiMonthlyQty: 0, crossSystemFeatures: [], aiFeatures: [], additionalFeatures: [] })
  for (const tenant of tenantRows) {
    const cfg = tenant.configuration
    for (const key of ['licenses','users','concurrentSearches','dailySearches','monthlySearches','concurrentAnalyses','dailyAnalyses','monthlyAnalyses','topicAnalyses','standardMonitors','fullMonitors','topicMonitors','tangles','tanglesGo','webloc','webeye','ingest','blockchain','apiDailyQty','apiMonthlyQty']) {
      summary[key] = (summary[key] ?? 0) + (cfg[key] ?? 0)
    }
    for (const key of ['crossSystemFeatures','aiFeatures','additionalFeatures']) {
      summary[key] = Array.from(new Set([...summary[key], ...(cfg[key] ?? [])]))
    }
    summary.product = cfg.product
    summary.mapCenter = cfg.mapCenter
    summary.apiEnabled = summary.apiEnabled === 'YES' || cfg.apiEnabled === 'YES' ? 'YES' : 'NO'
  }
  return summary
}

function system(n, account, sid, projectIds, tenantRows, overrides = {}) {
  const cfg = summarize(tenantRows)
  return {
    id: sid,
    accountId: account.id,
    salesManagerId: account.salesManagerId,
    sid,
    deliveryPid: overrides.deliveryPid ?? '',
    machineId: overrides.machineId ?? null,
    source: overrides.source,
    linkedProjectIds: projectIds,
    tenantIds: tenantRows.map((tenant) => tenant.id),
    systemClass: overrides.systemClass ?? 'CUSTOMER',
    purpose: overrides.purpose ?? 'Delivery',
    availability: overrides.availability ?? 'OCCUPIED',
    ...hostingFields(account.country, overrides),
    mapCenter: cfg.mapCenter,
    region: account.region,
    country: account.country,
    state: account.state,
    timeGroup: account.timeGroup,
    timeGroupAlert: '',
    operationalStatus: overrides.operationalStatus ?? 'On',
    remarks: [remark(n, `${sid} operational baseline reviewed.`)],
    owners: [owner(n, `${account.accountName.split(' ')[0]} Operations`, account.accountName)],
    configurationHistory: [configHistory(n, sid, cfg, iso(9 + n))],
    documents: [document(20 + n, 'SYSTEM', sid, `${sid}-architecture-summary.pdf`)],
    currentVersionUpdateId: overrides.currentVersionUpdateId ?? null,
    currentVersionNumberRefId: overrides.currentVersionNumberRefId ?? null,
    currentBuildNumberRefId: overrides.currentBuildNumberRefId ?? null,
    createdAt: iso(3 + n),
    updatedAt: iso(12 + n),
    product: cfg.product,
    ...cfg,
  }
}

function productionInventory(n, sid, country, state, overrides = {}) {
  const invRegion = region(country)
  return {
    id: sid,
    sid,
    source: 'Production',
    purpose: 'Delivery',
    availability: overrides.availability ?? 'AVAILABLE',
    ...hostingFields(country, overrides),
    mapCenter: overrides.mapCenter ?? 'Global',
    ...config({ licenses: 0, users: 0, mapCenter: overrides.mapCenter ?? 'Global' }),
    region: invRegion,
    country,
    state,
    timeGroup: invRegion,
    timeGroupAlert: '',
    linkedProjects: [],
    operationalStatus: 'On',
    tenantCount: 0,
    documents: [document(40 + n, 'PRODUCTION_SYSTEM', sid, `${sid}-inventory-record.pdf`)],
    alerts: [],
    remarks: [],
    configurationHistory: [],
    currentVersionUpdateId: overrides.currentVersionUpdateId ?? null,
    currentVersionNumberRefId: overrides.currentVersionNumberRefId ?? null,
    currentBuildNumberRefId: overrides.currentBuildNumberRefId ?? null,
    createdAt: iso(1 + n),
    updatedAt: iso(1 + n),
  }
}

function reusedInternal(n, machineId, purpose, country, overrides = {}) {
  const status = purpose === 'Available' ? 'Available' : 'Occupied'
  const usedInRegion = region(country)
  return {
    id: machineId,
    machineId,
    source: 'Reused Internal Systems',
    purpose,
    status,
    ...hostingFields(country, overrides),
    mapCenter: overrides.mapCenter ?? 'Global',
    ...config({ licenses: overrides.licenses ?? 20, users: overrides.users ?? 40, mapCenter: overrides.mapCenter ?? 'Global' }),
    usedInRegion,
    timeGroup: usedInRegion,
    timeGroupAlert: '',
    occupationStartDate: overrides.occupationStartDate ?? null,
    occupationEndDate: overrides.occupationEndDate ?? null,
    currentProjectIds: overrides.currentProjectIds ?? [],
    purposeHistory: [purposeHistory(n, purpose, overrides.occupationStartDate ?? '2026-07-01', overrides.occupationEndDate ?? null, overrides.historyContext ?? {})],
    tenantCount: overrides.tenantCount ?? 0,
    alerts: purpose === 'Available' ? [] : [`Reserved for ${purpose}`],
    operationalStatus: 'On',
    remarks: [remark(10 + n, `${machineId} prepared for ${purpose}.`)],
    owners: [owner(10 + n, `Lab Owner ${n}`, 'Delivery ERP Lab')],
    configurationHistory: [configHistory(10 + n, machineId, config({ licenses: overrides.licenses ?? 20, users: overrides.users ?? 40 }), iso(7 + n))],
    documents: [document(50 + n, 'INTERNAL_REUSED_SYSTEM', machineId, `${machineId}-lab-readiness.pdf`)],
    createdAt: iso(1 + n),
    updatedAt: iso(4 + n),
  }
}

function tenant(n, account, systemId, sid, deliveryPid, tenantType, cfg, warrantyRows, overrides = {}) {
  const tid = bid('T', n)
  return {
    id: tid,
    tid,
    tenantName: `${tid} ${account.accountName}`,
    accountId: account.id,
    systemId,
    deliveryPid,
    tenantType,
    accountName: account.accountName,
    country: account.country,
    timeGroup: account.timeGroup,
    operationalStatus: overrides.operationalStatus ?? 'Operative',
    contractStatus: overrides.contractStatus,
    hostedSystemHistory: overrides.hostedSystemHistory ?? [{ systemId, startedAt: iso(5 + n), endedAt: null, reason: 'Created' }],
    tenantFormType: tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: systemId,
    hostingSid: sid,
    sourceRequirementId: overrides.sourceRequirementId,
    configuration: cfg,
    hostingSnapshot: {
      currentSystem: true,
      sid,
      operationalStatus: 'On',
      machineNumber: overrides.machineId ?? '',
      versionNumber: overrides.versionNumber ?? '2026.2',
      hostingType: overrides.hostingType ?? 'Cloud',
      url: overrides.url ?? 'https://erp.example.invalid',
      performanceTier: 'STANDARD',
      vpnEnabled: 'NO',
      vpnType: '',
      ipRestrictionEnabled: 'NO',
      platform: overrides.cloudPlatform ?? 'AWS',
      csp: 'Automate IT',
      awsRegion: overrides.cloudRegion ?? 'us-east-1 (N. Virginia)',
      azureRegion: '',
    },
    remarks: [remark(n, `${tid} operational note for ${account.accountName}.`, n % 2 === 0 ? 'Task' : 'Note', n % 2 === 0 ? '2026-08-15' : null)],
    configurationHistory: [configHistory(n, tid, cfg, iso(7 + n))],
    warranties: warrantyRows,
    documents: [document(60 + n, 'TENANT', tid, `${tid}-tenant-profile.pdf`)],
    productType: cfg.product,
    hostingType: overrides.hostingType ?? 'Cloud',
    cloudPlatform: overrides.cloudPlatform ?? 'AWS',
    csp: 'Automate IT',
    cloudRegion: overrides.cloudRegion ?? 'us-east-1 (N. Virginia)',
    performanceTier: 'STANDARD',
    vpnEnabled: 'NO',
    vpnType: '',
    ipRestrictionEnabled: 'NO',
    mapCenter: cfg.mapCenter,
    product: cfg.product,
    ...cfg,
    warrantyStatus: overrides.warrantyStatus ?? (warrantyRows[0]?.warrantyStatus ?? 'NOT_SET'),
    warrantyStartDate: warrantyRows[0]?.startDate ?? null,
    warrantyEndDate: warrantyRows[0]?.endDate ?? null,
    pocStartDate: tenantType === 'POC' ? '2026-07-12' : null,
    pocEndDate: tenantType === 'POC' ? '2026-08-02' : null,
    createdAt: iso(5 + n),
    updatedAt: iso(10 + n),
  }
}

function warranty(n, tenantTid, projectId, opportunityId, status, startDate, endDate, predecessor = '', noWarranty = 'NO') {
  const warrantyId = bid('W', n)
  return {
    id: warrantyId,
    warrantyId,
    firstWarranty: !predecessor,
    predecessor,
    successor: '',
    accountId: '',
    relatedProjectId: projectId,
    warrantyType: status === 'NO_WARRANTY' ? 'No Warranty' : 'Warranty',
    warrantySubType: '',
    opportunityId,
    startDate,
    endDate,
    durationDays: startDate && endDate ? Math.ceil((Date.parse(endDate) - Date.parse(startDate)) / 86400000) : null,
    daysBeforeExpiration: endDate ? Math.ceil((Date.parse(endDate) - Date.parse('2026-07-22T00:00:00.000Z')) / 86400000) : null,
    warrantyStatus: status,
    noWarranty,
    outOfContract: status === 'OUT_OF_CONTRACT' ? 'YES' : 'NO',
    alerts: status === 'PENDING' ? 'Warranty expires in less than 90 days.' : '',
    remark: `${warrantyId} ${status} reference warranty for ${tenantTid}.`,
  }
}

function topWarranty(row, tenantId) {
  return {
    warrantyRecordId: row.warrantyId,
    tenantId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.warrantyStatus,
    predecessorWarrantyId: row.predecessor || null,
    createdAt: iso(6),
    updatedAt: iso(8),
  }
}

function referenceData() {
  const versions = [
    { id: bid('VN', 1), label: '2026.1' },
    { id: bid('VN', 2), label: '2026.2' },
    { id: bid('VN', 3), label: '2026.3' },
  ].map((record, index) => ({
    id: record.id,
    referenceType: 'VERSION_NUMBER',
    versionNumberId: null,
    label: record.label,
    normalizedLabel: record.label.toLowerCase(),
    active: true,
    createdAt: iso(1 + index),
    createdBy: user,
    updatedAt: iso(1 + index),
    updatedBy: user,
  }))
  const builds = [
    [1, versions[0].id, '2026.1.104'],
    [2, versions[0].id, '2026.1.118'],
    [3, versions[1].id, '2026.2.205'],
    [4, versions[1].id, '2026.2.219'],
    [5, versions[2].id, '2026.3.031'],
    [6, versions[2].id, '2026.3.044'],
  ].map(([n, versionNumberId, label]) => ({
    id: bid('BN', n),
    referenceType: 'BUILD_NUMBER',
    versionNumberId,
    label,
    normalizedLabel: label.toLowerCase(),
    active: true,
    createdAt: iso(2 + n),
    createdBy: user,
    updatedAt: iso(2 + n),
    updatedBy: user,
  }))
  return [...versions, ...builds]
}

function versionAttachment(n, versionUpdateId, category, fileName) {
  return {
    id: bid('VUA', n),
    category,
    fileName,
    mimeType: 'application/pdf',
    fileSize: 180000 + n,
    uploadedAt: iso(12 + (n % 6)),
    uploadedBy: user,
    storedFileReference: `reference-dataset/version-updates/${versionUpdateId}/${fileName}`,
    parentObjectType: 'VERSION_UPDATE',
    parentBusinessId: versionUpdateId,
  }
}

function versionUpdate(n, systemId, collection, sid, mid, versionRef, buildRef, remarks) {
  const id = bid('VU', n)
  return {
    id,
    systemId,
    systemCollection: collection,
    committedAt: iso(12 + n),
    committedSequence: n,
    userName: user,
    midSnapshot: mid,
    sidSnapshot: sid,
    versionNumberRefId: versionRef,
    buildNumberRefId: buildRef,
    attachments: [
      versionAttachment((n - 1) * 3 + 1, id, 'CONFIG', `${sid || mid}-config.pdf`),
      versionAttachment((n - 1) * 3 + 2, id, 'ATP', `${sid || mid}-atp.pdf`),
      versionAttachment((n - 1) * 3 + 3, id, 'CHECKLIST', `${sid || mid}-checklist.pdf`),
    ],
    emailSentAt: iso(13 + n),
    remarks,
    createdAt: iso(12 + n),
    createdBy: user,
    updatedAt: iso(12 + n),
    updatedBy: user,
  }
}

function activityRef(type, id, businessId, label, routePath) {
  return { objectType: type, id, businessId, displayLabel: label, routePath }
}

function activity(n, day, category, eventType, primaryObject, summary, options = {}) {
  return {
    id: bid('ACT', n),
    technicalId: `activity-ref-${n}`,
    occurredAt: iso(day, 10),
    actorId: 'user-demo',
    actorName: options.actorName ?? user,
    source: options.source ?? 'USER',
    eventType,
    severity: options.severity ?? 'INFO',
    category,
    primaryObject,
    relatedObjects: options.relatedObjects ?? [],
    summary,
    details: options.details ?? summary,
    before: options.before,
    after: options.after,
    metadata: options.metadata ?? {},
    correlationId: options.correlationId ?? `CORR-REF-${String(n).padStart(3, '0')}`,
    sequence: n,
    schemaVersion: 1,
  }
}

const salesManagers = [
  salesManager(1, 'Maya Cohen', 'EMEA'),
  salesManager(2, 'Noah Stein', 'NA'),
  salesManager(3, 'Daniel Brooks', 'NA'),
  salesManager(4, 'Aiko Tan', 'APAC'),
  salesManager(5, 'Lena Wright', 'EMEA'),
  salesManager(6, 'Priya Nair', 'APAC'),
]

const accounts = [
  account(1, 'Civic Sentinel Authority', 'NEW_CUSTOMER', salesManagers[0].id, 'Germany', 'Berlin'),
  account(2, 'Metro Justice Analytics', 'VETERAN_CUSTOMER', salesManagers[1].id, 'United States', 'New York'),
  account(3, 'Northern County Intelligence', 'VETERAN_CUSTOMER', salesManagers[2].id, 'Canada', 'Ontario'),
  account(4, 'Meridian Digital Forensics', 'NEW_CUSTOMER', salesManagers[3].id, 'Singapore', 'Central Region'),
  account(5, 'Kingsport Public Safety Directorate', 'VETERAN_CUSTOMER', salesManagers[4].id, 'United Kingdom', 'England'),
  account(6, 'Southern Cross Analytics', 'NEW_CUSTOMER', salesManagers[5].id, 'Australia', 'New South Wales'),
]

function opportunity(n, accountRow, owner, type, subType, stage, name, dates, requirements = {}) {
  const opportunityId = bid('OPP', n)
  return {
    id: opportunityId,
    opportunityId,
    opportunityName: name,
    stage,
    accountId: accountRow.id,
    salesManagerId: owner.id,
    type,
    subType,
    financialProfile: type === 'POC' ? (subType === 'PAID' ? 'PAID' : 'FREE') : undefined,
    dealPackage: n % 3 === 0 ? 'Platinum' : n % 2 === 0 ? 'Gold' : 'Silver',
    deliveryDate: dates.deliveryDate ?? null,
    pocStartDate: dates.pocStartDate ?? null,
    pocEndDate: dates.pocEndDate ?? null,
    warrantyServiceMonths: type === 'POC' ? null : 12,
    warrantyRecordId: requirements.warrantyRecordId,
    region: accountRow.region,
    country: accountRow.country,
    state: accountRow.state,
    timeZone: accountRow.timeZone,
    timeGroup: accountRow.timeGroup,
    currentMilestone: stage === 'WON' ? 'Project created' : 'POC in progress',
    projectAlerts: requirements.alerts ?? [],
    salesComments: `<p>${name} reference opportunity.</p>`,
    engagementCircles: [],
    newTenantRequirements: requirements.newTenantRequirements ?? [],
    changeRequestRequirements: requirements.changeRequestRequirements ?? [],
    standardRenewalRequirements: requirements.standardRenewalRequirements ?? [],
    pocProjectIds: [],
    finalProjectId: null,
    wonAt: stage === 'WON' ? iso(5 + n) : null,
    createdAt: iso(1 + n),
    updatedAt: iso(6 + n),
    accountName: accountRow.accountName,
    dealOwner: owner.name,
  }
}

const tenantCfg = [
  config({ licenses: 30, users: 80, mapCenter: 'New York', aiFeatures: ['Entity Resolution', 'Translation'] }),
  config({ licenses: 20, users: 45, mapCenter: 'New York', product: 'Webloc', webloc: 20, tangles: 0 }),
  config({ licenses: 15, users: 35, mapCenter: 'New York', additionalFeatures: ['2FA'] }),
  config({ licenses: 25, users: 55, mapCenter: 'Toronto', cloudRegion: undefined }),
  config({ licenses: 10, users: 25, mapCenter: 'Toronto', apiEnabled: 'NO', apiDailyQty: 0, apiMonthlyQty: 0 }),
  config({ licenses: 28, users: 70, mapCenter: 'Singapore', aiFeatures: ['Entity Resolution'] }),
  config({ licenses: 12, users: 30, mapCenter: 'Singapore', product: 'Tangles Light' }),
  config({ licenses: 18, users: 40, mapCenter: 'London', cloudPlatform: 'Azure', csp: 'Ingram UK', cloudRegion: 'UK South' }),
  config({ licenses: 8, users: 20, mapCenter: 'Berlin' }),
  config({ licenses: 10, users: 22, mapCenter: 'Sydney', cloudRegion: 'ap-southeast-2 (Sydney)' }),
]

const warranties = {
  t1a: warranty(1, 'T000001', 'P000002', 'OPP000002', 'RENEWED', '2025-07-01', '2026-06-30'),
  t1b: warranty(2, 'T000001', 'P000004', 'OPP000004', 'VALID', '2026-07-01', '2027-06-30', 'W000001T000001'),
  t2: warranty(3, 'T000002', 'P000004', 'OPP000004', 'PENDING', '2025-09-01', '2026-08-20'),
  t3: warranty(4, 'T000003', 'P000003', 'OPP000003', 'PLANNED', '2026-09-01', '2027-08-31'),
  t4: warranty(5, 'T000004', 'P000005', 'OPP000005', 'EXPIRED', '2025-07-01', '2026-06-30'),
  t5: warranty(6, 'T000005', 'P000005', 'OPP000005', 'NO_WARRANTY', null, null, '', 'YES'),
  t6: warranty(7, 'T000006', 'P000006', 'OPP000006', 'VALID', '2026-07-15', '2027-07-14'),
  t8a: warranty(8, 'T000008', 'P000007', 'OPP000007', 'RENEWED', '2025-01-01', '2025-12-31'),
  t8b: warranty(9, 'T000008', 'P000007', 'OPP000007', 'VALID', '2026-01-01', '2026-12-31', 'W000008T000008'),
  t9: warranty(10, 'T000009', 'P000001', 'OPP000001', 'NO_WARRANTY', null, null, '', 'YES'),
  t7: warranty(11, 'T000007', 'P000006', 'OPP000006', 'NOT_SET', null, null),
  t10: warranty(12, 'T000010', 'P000008', 'OPP000008', 'NOT_SET', null, null),
}
warranties.t1a.successor = 'W000002'
warranties.t8a.successor = 'W000009'

const tenants = [
  tenant(1, accounts[1], 'S000001', 'S000001', 'P000002', 'CUSTOMER', tenantCfg[0], [warranties.t1a, warranties.t1b], { sourceRequirementId: 'REQ-METRO-DEL-001' }),
  tenant(2, accounts[1], 'S000001', 'S000001', 'P000002', 'CUSTOMER', tenantCfg[1], [warranties.t2], { sourceRequirementId: 'REQ-METRO-DEL-002', hostedSystemHistory: [{ systemId: 'S000005', startedAt: iso(7), endedAt: iso(15), reason: 'Created' }, { systemId: 'S000001', startedAt: iso(15), endedAt: null, reason: 'Moved' }] }),
  tenant(3, accounts[1], 'S000001', 'S000001', 'P000003', 'CUSTOMER', tenantCfg[2], [warranties.t3], { sourceRequirementId: 'REQ-METRO-EXP-001' }),
  tenant(4, accounts[2], 'S000002', 'S000002', 'P000005', 'CUSTOMER', tenantCfg[3], [warranties.t4], { sourceRequirementId: 'REQ-NORTH-REN-001' }),
  tenant(5, accounts[2], 'S000002', 'S000002', 'P000005', 'CUSTOMER', tenantCfg[4], [warranties.t5], { sourceRequirementId: 'REQ-NORTH-REN-002' }),
  tenant(6, accounts[3], 'S000003', 'S000003', 'P000006', 'CUSTOMER', tenantCfg[5], [warranties.t6], { sourceRequirementId: 'REQ-MERIDIAN-001' }),
  tenant(7, accounts[3], 'S000003', 'S000003', 'P000006', 'CUSTOMER', tenantCfg[6], [warranties.t7], { sourceRequirementId: 'REQ-MERIDIAN-002' }),
  tenant(8, accounts[4], 'S000004', 'S000004', 'P000007', 'CUSTOMER', tenantCfg[7], [warranties.t8a, warranties.t8b], { sourceRequirementId: 'REQ-KING-REN-001' }),
  tenant(9, accounts[0], 'S000006', 'S000006', 'P000001', 'POC', tenantCfg[8], [warranties.t9], { sourceRequirementId: 'REQ-CIVIC-POC-001', machineId: 'M000001' }),
  tenant(10, accounts[5], 'S000007', 'S000007', 'P000008', 'POC', tenantCfg[9], [warranties.t10], { sourceRequirementId: 'REQ-SOUTH-POC-001', machineId: 'M000002' }),
]

const opportunities = [
  opportunity(1, accounts[0], salesManagers[0], 'POC', 'FREE', 'POC', 'Civic Sentinel POC Evaluation', { deliveryDate: '2026-08-02', pocStartDate: '2026-07-12', pocEndDate: '2026-08-02' }, { newTenantRequirements: [newTenantReq('requirement-ref-1', 'REQ-CIVIC-POC-001', tenantCfg[8])] }),
  opportunity(2, accounts[1], salesManagers[1], 'DELIVERY', 'NEW', 'WON', 'Metro Justice Initial Delivery', { deliveryDate: '2026-07-30' }, { newTenantRequirements: [newTenantReq('requirement-ref-2', 'REQ-METRO-DEL-001', tenantCfg[0]), newTenantReq('requirement-ref-3', 'REQ-METRO-DEL-002', tenantCfg[1])] }),
  opportunity(3, accounts[1], salesManagers[1], 'DELIVERY', 'UPSELL', 'WON', 'Metro Justice Analytics Expansion', { deliveryDate: '2026-08-15' }, { changeRequestRequirements: [changeReq('requirement-ref-4', 'REQ-METRO-EXP-CR-001', 'T000001', 'S000001', tenantCfg[0], config({ licenses: 40, users: 100, mapCenter: 'New York', aiFeatures: ['Entity Resolution', 'Translation', 'Summarization'] }))], newTenantRequirements: [newTenantReq('requirement-ref-5', 'REQ-METRO-EXP-001', tenantCfg[2], { deployTarget: 'EXISTING_SID', existingSystemId: 'S000001' })] }),
  opportunity(4, accounts[1], salesManagers[1], 'RENEWAL', 'STANDARD', 'WON', 'Metro Justice Renewal 2027', { deliveryDate: '2026-09-30' }, { standardRenewalRequirements: [renewalReq('requirement-ref-6', 'REQ-METRO-REN-001', 'T000001', 'S000001', 'W000002', 'VALID', '2027-06-30'), renewalReq('requirement-ref-7', 'REQ-METRO-REN-002', 'T000002', 'S000001', 'W000003', 'PENDING', '2026-08-20'), renewalReq('requirement-ref-8', 'REQ-METRO-REN-003', 'T000003', 'S000001', 'W000004', 'PLANNED', '2027-08-31')] }),
  opportunity(5, accounts[2], salesManagers[2], 'RENEWAL', 'UPSELL', 'WON', 'Northern County Renewal Upsell', { deliveryDate: '2026-08-20' }, { standardRenewalRequirements: [renewalReq('requirement-ref-9', 'REQ-NORTH-REN-001', 'T000004', 'S000002', 'W000005', 'EXPIRED', '2026-06-30'), renewalReq('requirement-ref-10', 'REQ-NORTH-REN-002', 'T000005', 'S000002', 'W000006', 'NO_WARRANTY', null)], changeRequestRequirements: [changeReq('requirement-ref-11', 'REQ-NORTH-UP-001', 'T000004', 'S000002', tenantCfg[3], config({ licenses: 32, users: 75, mapCenter: 'Toronto' }))] }),
  opportunity(6, accounts[3], salesManagers[3], 'DELIVERY', 'NEW', 'WON', 'Meridian Forensics New Delivery', { deliveryDate: '2026-08-05' }, { newTenantRequirements: [newTenantReq('requirement-ref-12', 'REQ-MERIDIAN-001', tenantCfg[5]), newTenantReq('requirement-ref-13', 'REQ-MERIDIAN-002', tenantCfg[6])] }),
  opportunity(7, accounts[4], salesManagers[4], 'RENEWAL', 'DOWN_SELL', 'WON', 'Kingsport Service Renewal Downsell', { deliveryDate: '2026-07-18' }, { standardRenewalRequirements: [renewalReq('requirement-ref-14', 'REQ-KING-REN-001', 'T000008', 'S000004', 'W000009', 'VALID', '2026-12-31')] }),
  opportunity(8, accounts[5], salesManagers[5], 'POC', 'PAID', 'POC', 'Southern Cross Paid POC', { deliveryDate: '2026-08-18', pocStartDate: '2026-07-25', pocEndDate: '2026-08-18' }, { newTenantRequirements: [newTenantReq('requirement-ref-15', 'REQ-SOUTH-POC-001', tenantCfg[9])] }),
]

const projects = opportunities.map((opp, index) => {
  const mapping = [
    ['POC', 'NONE', { deliveryDate: '2026-08-02', pocStartDate: '2026-07-12', pocEndDate: '2026-08-02' }, false],
    ['DELIVERY', 'NEW', { deliveryDate: '2026-07-30' }, true],
    ['DELIVERY', 'UPSELL', { deliveryDate: '2026-08-15' }, false],
    ['RENEWAL', 'STANDARD', { deliveryDate: '2026-09-30' }, false],
    ['RENEWAL', 'UPSELL', { deliveryDate: '2026-08-20' }, false],
    ['DELIVERY', 'NEW', { deliveryDate: '2026-08-05' }, false],
    ['RENEWAL', 'DOWN_SELL', { deliveryDate: '2026-07-18' }, true],
    ['POC', 'NONE', { deliveryDate: '2026-08-18', pocStartDate: '2026-07-25', pocEndDate: '2026-08-18' }, false],
  ][index]
  return project(index + 1, opp, mapping[0], mapping[1], mapping[2], mapping[3])
})

opportunities.forEach((opp, index) => {
  const proj = projects[index]
  if (proj.mainType === 'POC') opp.pocProjectIds = [proj.id]
  else opp.finalProjectId = proj.id
})

const referenceDataRecords = referenceData()
const versionUpdates = [
  versionUpdate(1, 'S000001', 'allocated', 'S000001', '', 'VN000002', 'BN000003', 'Metro Justice upgraded to 2026.2.205.'),
  versionUpdate(2, 'S000001', 'allocated', 'S000001', '', 'VN000002', 'BN000004', 'Metro Justice hotfix for expansion readiness.'),
  versionUpdate(3, 'S000002', 'allocated', 'S000002', '', 'VN000001', 'BN000002', 'Northern County remains on stable 2026.1 build.'),
  versionUpdate(4, 'S000003', 'allocated', 'S000003', '', 'VN000003', 'BN000005', 'Meridian pilot release installed.'),
  versionUpdate(5, 'S000006', 'allocated', 'S000006', 'M000001', 'VN000002', 'BN000004', 'Civic POC environment prepared.'),
  versionUpdate(6, 'M000003', 'reused', '', 'M000003', 'VN000001', 'BN000001', 'Demo lab baseline image refreshed.'),
  versionUpdate(7, 'S000004', 'allocated', 'S000004', '', 'VN000001', 'BN000002', 'Kingsport production baseline recorded.'),
  versionUpdate(8, 'S000005', 'allocated', 'S000005', '', 'VN000001', 'BN000001', 'Metro historical host baseline preserved.'),
  versionUpdate(9, 'S000007', 'allocated', 'S000007', 'M000002', 'VN000002', 'BN000004', 'Southern Cross POC environment prepared.'),
  versionUpdate(10, 'S000008', 'production', 'S000008', '', 'VN000002', 'BN000003', 'Production inventory baseline recorded.'),
  versionUpdate(11, 'S000009', 'production', 'S000009', '', 'VN000001', 'BN000002', 'Production inventory baseline recorded.'),
  versionUpdate(12, 'S000010', 'production', 'S000010', '', 'VN000002', 'BN000004', 'Production inventory baseline recorded.'),
  versionUpdate(13, 'S000011', 'production', 'S000011', '', 'VN000003', 'BN000005', 'Production inventory baseline recorded.'),
  versionUpdate(14, 'S000012', 'production', 'S000012', '', 'VN000003', 'BN000006', 'Production inventory baseline recorded.'),
  versionUpdate(15, 'M000001', 'reused', '', 'M000001', 'VN000002', 'BN000004', 'Civic reused internal source baseline recorded.'),
  versionUpdate(16, 'M000002', 'reused', '', 'M000002', 'VN000002', 'BN000004', 'Southern Cross reused internal source baseline recorded.'),
  versionUpdate(17, 'M000004', 'reused', '', 'M000004', 'VN000001', 'BN000001', 'Demo lab baseline image refreshed.'),
  versionUpdate(18, 'M000005', 'reused', '', 'M000005', 'VN000001', 'BN000002', 'Training lab baseline image refreshed.'),
  versionUpdate(19, 'M000006', 'reused', '', 'M000006', 'VN000002', 'BN000003', 'Support lab baseline image refreshed.'),
  versionUpdate(20, 'M000007', 'reused', '', 'M000007', 'VN000002', 'BN000004', 'Available lab baseline image refreshed.'),
  versionUpdate(21, 'M000008', 'reused', '', 'M000008', 'VN000003', 'BN000005', 'Demo lab baseline image refreshed.'),
]

const systems = [
  system(1, accounts[1], 'S000001', ['P000002','P000003','P000004'], tenants.slice(0, 3), { deliveryPid: 'P000002', currentVersionUpdateId: 'VU000002', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004' }),
  system(2, accounts[2], 'S000002', ['P000005'], tenants.slice(3, 5), { deliveryPid: 'P000005', currentVersionUpdateId: 'VU000003', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000002' }),
  system(3, accounts[3], 'S000003', ['P000006'], tenants.slice(5, 7), { deliveryPid: 'P000006', currentVersionUpdateId: 'VU000004', currentVersionNumberRefId: 'VN000003', currentBuildNumberRefId: 'BN000005' }),
  system(4, accounts[4], 'S000004', ['P000007'], tenants.slice(7, 8), { deliveryPid: 'P000007', operationalStatus: 'Access blocked', currentVersionUpdateId: 'VU000007', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000002' }),
  system(5, accounts[1], 'S000005', ['P000002'], [], { deliveryPid: 'P000002', operationalStatus: 'On', currentVersionUpdateId: 'VU000008', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000001' }),
  system(6, accounts[0], 'S000006', ['P000001'], tenants.slice(8, 9), { deliveryPid: 'P000001', machineId: 'M000001', source: 'Reused Internal Systems', systemClass: 'POC_DEMO_TRAINING', purpose: 'POC', currentVersionUpdateId: 'VU000005', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004' }),
  system(7, accounts[5], 'S000007', ['P000008'], tenants.slice(9, 10), { deliveryPid: 'P000008', machineId: 'M000002', source: 'Reused Internal Systems', systemClass: 'POC_DEMO_TRAINING', purpose: 'POC', currentVersionUpdateId: 'VU000009', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004' }),
]

const productionSystemInventory = [
  productionInventory(1, 'S000008', 'United States', 'Virginia', { currentVersionUpdateId: 'VU000010', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000003' }),
  productionInventory(2, 'S000009', 'Canada', 'Ontario', { currentVersionUpdateId: 'VU000011', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000002' }),
  productionInventory(3, 'S000010', 'Germany', 'Berlin', { currentVersionUpdateId: 'VU000012', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004' }),
  productionInventory(4, 'S000011', 'Singapore', 'Central Region', { currentVersionUpdateId: 'VU000013', currentVersionNumberRefId: 'VN000003', currentBuildNumberRefId: 'BN000005' }),
  productionInventory(5, 'S000012', 'Australia', 'New South Wales', { currentVersionUpdateId: 'VU000014', currentVersionNumberRefId: 'VN000003', currentBuildNumberRefId: 'BN000006' }),
]

const reusedInternalSystems = [
  reusedInternal(1, 'M000001', 'POC', 'Germany', { occupationStartDate: '2026-07-12', occupationEndDate: '2026-08-02', currentProjectIds: ['P000001'], tenantCount: 1, currentVersionUpdateId: 'VU000015', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004', historyContext: { pid: 'P000001', sid: 'S000006', projectName: 'Civic Sentinel POC Evaluation', accountName: accounts[0].accountName, product: 'Tangles', projectStatus: 'OPEN' } }),
  reusedInternal(2, 'M000002', 'POC', 'Australia', { occupationStartDate: '2026-07-25', occupationEndDate: '2026-08-18', currentProjectIds: ['P000008'], tenantCount: 1, currentVersionUpdateId: 'VU000016', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004', historyContext: { pid: 'P000008', sid: 'S000007', projectName: 'Southern Cross Paid POC', accountName: accounts[5].accountName, product: 'Tangles', projectStatus: 'OPEN' } }),
  reusedInternal(3, 'M000003', 'Available', 'United States', { currentVersionUpdateId: 'VU000006', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000001' }),
  reusedInternal(4, 'M000004', 'Demo', 'Singapore', { currentVersionUpdateId: 'VU000017', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000001' }),
  reusedInternal(5, 'M000005', 'Training', 'United Kingdom', { currentVersionUpdateId: 'VU000018', currentVersionNumberRefId: 'VN000001', currentBuildNumberRefId: 'BN000002' }),
  reusedInternal(6, 'M000006', 'Support', 'Canada', { currentVersionUpdateId: 'VU000019', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000003' }),
  reusedInternal(7, 'M000007', 'Available', 'Germany', { currentVersionUpdateId: 'VU000020', currentVersionNumberRefId: 'VN000002', currentBuildNumberRefId: 'BN000004' }),
  reusedInternal(8, 'M000008', 'Demo', 'Australia', { currentVersionUpdateId: 'VU000021', currentVersionNumberRefId: 'VN000003', currentBuildNumberRefId: 'BN000005' }),
]

const projectSystems = [
  { id: 'project-S000001', projectId: 'P000002', systemId: 'S000001', tenantIds: ['T000001','T000002'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(6), deallocatedAt: null },
  { id: 'project-S000002', projectId: 'P000003', systemId: 'S000001', tenantIds: ['T000001','T000003'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(10), deallocatedAt: null },
  { id: 'project-S000003', projectId: 'P000004', systemId: 'S000001', tenantIds: ['T000001','T000002','T000003'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(13), deallocatedAt: null },
  { id: 'project-S000004', projectId: 'P000005', systemId: 'S000002', tenantIds: ['T000004','T000005'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(9), deallocatedAt: null },
  { id: 'project-S000005', projectId: 'P000006', systemId: 'S000003', tenantIds: ['T000006','T000007'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(8), deallocatedAt: null },
  { id: 'project-S000006', projectId: 'P000007', systemId: 'S000004', tenantIds: ['T000008'], allocationStatus: 'ALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(6), deallocatedAt: null },
  { id: 'project-S000007', projectId: 'P000001', systemId: 'S000006', tenantIds: ['T000009'], allocationStatus: 'ALLOCATED', allocationType: 'REUSED_INTERNAL', sourceMachineId: 'M000001', allocatedAt: iso(7), deallocatedAt: null },
  { id: 'project-system-ref-8', projectId: 'P000008', systemId: 'S000007', tenantIds: ['T000010'], allocationStatus: 'ALLOCATED', allocationType: 'REUSED_INTERNAL', sourceMachineId: 'M000002', allocatedAt: iso(11), deallocatedAt: null },
  { id: 'project-system-ref-9', projectId: 'P000002', systemId: 'S000005', tenantIds: ['T000002'], allocationStatus: 'DEALLOCATED', allocationType: 'PRODUCTION', sourceMachineId: null, allocatedAt: iso(5), deallocatedAt: iso(15) },
]

const projectTenants = [
  ['P000002','T000001','S000001',6],
  ['P000002','T000002','S000005',6],
  ['P000003','T000001','S000001',10],
  ['P000003','T000003','S000001',10],
  ['P000004','T000001','S000001',13],
  ['P000004','T000002','S000001',13],
  ['P000004','T000003','S000001',13],
  ['P000005','T000004','S000002',9],
  ['P000005','T000005','S000002',9],
  ['P000006','T000006','S000003',8],
  ['P000006','T000007','S000003',8],
  ['P000007','T000008','S000004',6],
  ['P000001','T000009','S000006',7],
  ['P000008','T000010','S000007',11],
].map(([projectId, tenantId, systemId, day], index) => ({
  id: `project-tenant-ref-${index + 1}`,
  projectId,
  tenantId,
  systemId,
  allocationStatus: 'ALLOCATED',
  allocationType: projectId === 'P000001' || projectId === 'P000008' ? 'REUSED_INTERNAL' : 'PRODUCTION',
  allocatedAt: iso(day),
  deallocatedAt: null,
}))

const warrantyRecords = tenants.flatMap((tenantRow) => (tenantRow.warranties ?? []).map((row) => topWarranty(row, tenantRow.id)))

const primaryRefs = {
  customer: activityRef('Customer', accounts[1].id, accounts[1].accountCode, accounts[1].accountName, `/customers/${accounts[1].accountCode}`),
  project2: activityRef('Project', 'P000002', 'P000002', 'Metro Justice Initial Delivery', '/projects/P000002'),
  project3: activityRef('Project', 'P000003', 'P000003', 'Metro Justice Analytics Expansion', '/projects/P000003'),
  project4: activityRef('Project', 'P000004', 'P000004', 'Metro Justice Renewal 2027', '/projects/P000004'),
  system1: activityRef('System', 'S000001', 'S000001', 'S000001 Metro Justice Production', '/systems/S000001'),
  system5: activityRef('System', 'S000005', 'S000005', 'S000005 Metro Historical Host', '/systems/S000005'),
  tenant2: activityRef('Tenant', 'T000002', 'T000002', 'T000002 Metro Justice Analytics', '/tenants/T000002'),
  warranty3: activityRef('Warranty', 'W000003', 'W000003', 'W000003 pending renewal', '/warranties'),
}

const activityEvents = [
  activity(1, 2, 'CUSTOMER', 'CREATE', primaryRefs.customer, 'Customer C000002 created.'),
  activity(2, 4, 'OPPORTUNITY', 'CREATE', activityRef('Opportunity', 'OPP000002', 'OPP000002', 'Metro Justice Initial Delivery', '/opportunities/OPP000002'), 'Opportunity OPP000002 created.'),
  activity(3, 5, 'PROJECT', 'CREATE', primaryRefs.project2, 'Project P000002 created from won Opportunity OPP000002.'),
  activity(4, 6, 'ALLOCATION', 'ALLOCATE', primaryRefs.system1, 'System S000001 allocated to Project P000002.', { relatedObjects: [primaryRefs.project2] }),
  activity(5, 6, 'TENANT', 'CREATE', activityRef('Tenant', 'T000001', 'T000001', 'T000001 Metro Justice Analytics', '/tenants/T000001'), 'Tenant T000001 created on System S000001.'),
  activity(6, 7, 'DOCUMENT', 'UPLOAD', primaryRefs.project2, 'Project plan uploaded for P000002.'),
  activity(7, 8, 'REMARK', 'CREATE', primaryRefs.system1, 'System remark added to S000001.'),
  activity(8, 9, 'CONFIGURATION', 'CHANGE', primaryRefs.system1, 'System S000001 configuration summary captured.', { before: { licenses: 0 }, after: { licenses: 65 } }),
  activity(9, 10, 'PROJECT', 'COMPLETE', primaryRefs.project2, 'Project P000002 completed.', { before: { progressStatus: 'OPEN' }, after: { progressStatus: 'DONE' } }),
  activity(10, 10, 'PROJECT', 'CREATE', primaryRefs.project3, 'Expansion Project P000003 created.'),
  activity(11, 11, 'TENANT', 'CREATE', activityRef('Tenant', 'T000003', 'T000003', 'T000003 Metro Justice Analytics', '/tenants/T000003'), 'Expansion Tenant T000003 created on S000001.'),
  activity(12, 12, 'WARRANTY', 'CREATE', activityRef('Warranty', 'W000004', 'W000004', 'W000004 planned warranty', '/warranties'), 'Planned warranty W000004 created.'),
  activity(13, 13, 'PROJECT', 'CREATE', primaryRefs.project4, 'Renewal Project P000004 created.'),
  activity(14, 14, 'WARRANTY', 'CREATE', primaryRefs.warranty3, 'Pending warranty W000003 added to renewal queue.'),
  activity(15, 15, 'ALLOCATION', 'DEALLOCATE', primaryRefs.system5, 'Historical host S000005 deallocated from P000002.', { relatedObjects: [primaryRefs.project2] }),
  activity(16, 15, 'TENANT', 'MOVE', primaryRefs.tenant2, 'Tenant T000002 moved from S000005 to S000001.', { before: { hostedSystemId: 'S000005' }, after: { hostedSystemId: 'S000001' }, relatedObjects: [primaryRefs.system5, primaryRefs.system1] }),
  activity(17, 16, 'CONFIGURATION', 'CHANGE', primaryRefs.system1, 'Map Center retained at New York for all hosted Tenants.'),
  activity(18, 17, 'SYSTEM', 'VERSION_UPDATE', primaryRefs.system1, 'Version update VU000002 committed on S000001.'),
  activity(19, 18, 'PROJECT', 'CREATE', activityRef('Project', 'P000001', 'P000001', 'Civic Sentinel POC Evaluation', '/projects/P000001'), 'POC Project P000001 created.'),
  activity(20, 19, 'ALLOCATION', 'ALLOCATE', activityRef('System', 'S000006', 'S000006', 'Civic POC reused System', '/systems/S000006'), 'Reused Internal System M000001 allocated to POC Project P000001.'),
  activity(21, 20, 'WARRANTY', 'CREATE', activityRef('Warranty', 'W000010', 'W000010', 'W000010 no warranty', '/warranties'), 'No Warranty recorded for POC Tenant T000009.'),
  activity(22, 21, 'PROJECT', 'CREATE', activityRef('Project', 'P000005', 'P000005', 'Northern County Renewal Upsell', '/projects/P000005'), 'Renewal Upsell Project P000005 created.'),
  activity(23, 22, 'WARRANTY', 'CREATE', activityRef('Warranty', 'W000005', 'W000005', 'W000005 expired warranty', '/warranties'), 'Expired Warranty W000005 included for renewal candidate verification.'),
  activity(24, 23, 'PROJECT', 'CREATE', activityRef('Project', 'P000006', 'P000006', 'Meridian Forensics New Delivery', '/projects/P000006'), 'Delivery Project P000006 created.'),
  activity(25, 24, 'TENANT', 'CREATE', activityRef('Tenant', 'T000007', 'T000007', 'T000007 Meridian Digital Forensics', '/tenants/T000007'), 'Tenant T000007 created with Not Set Yet warranty state.'),
  activity(26, 25, 'PROJECT', 'COMPLETE', activityRef('Project', 'P000007', 'P000007', 'Kingsport Service Renewal Downsell', '/projects/P000007'), 'Project P000007 completed.'),
  activity(27, 26, 'SYSTEM', 'FIELD_CHANGE', activityRef('System', 'S000004', 'S000004', 'Kingsport Production System', '/systems/S000004'), 'System S000004 operational status changed to Access blocked.', { before: { operationalStatus: 'On' }, after: { operationalStatus: 'Access blocked' } }),
  activity(28, 27, 'ADMINISTRATION', 'CREATE', activityRef('Version Number', 'VN000003', 'VN000003', 'Version 2026.3'), 'Shared Version Number 2026.3 created.'),
  activity(29, 28, 'DOCUMENT', 'UPLOAD', activityRef('Version Update', 'VU000004', 'VU000004', 'Meridian version update'), 'Version update attachments uploaded for VU000004.'),
  activity(30, 29, 'PURPOSE_HISTORY', 'CHANGE', activityRef('System', 'M000004', 'M000004', 'Demo reused internal system', '/systems/reused-internal/M000004'), 'Reused Internal System M000004 marked Demo.'),
  activity(31, 30, 'TASK', 'FIELD_CHANGE', primaryRefs.project3, 'Expansion task deadline updated.', { before: { deadline: '2026-08-12' }, after: { deadline: '2026-08-15' } }),
  activity(32, 31, 'OTHER', 'CANCELLED_OPERATION', primaryRefs.project4, 'Delete Project requested then cancelled by user.', { severity: 'WARNING' }),
]

const data = {
  version: 1,
  lastPersistedAt: null,
  salesManagers,
  accounts,
  opportunities: opportunities.map(({ accountName, dealOwner, ...opportunityRow }) => opportunityRow),
  projects,
  productionSystemInventory,
  reusedInternalSystems,
  systems,
  tenants,
  warrantyRecords,
  referenceData: referenceDataRecords,
  versionUpdates,
  projectSystems,
  projectTenants,
  idCounters,
  activityEvents,
}

function validate(state) {
  const errors = []
  const unique = (label, values) => {
    const seen = new Set()
    for (const value of values.filter(Boolean)) {
      if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`)
      seen.add(value)
    }
  }
  unique('accountCode', state.accounts.map((row) => row.accountCode))
  unique('opportunityId', state.opportunities.map((row) => row.opportunityId))
  unique('pid', state.projects.map((row) => row.pid))
  unique('sid', [...state.productionSystemInventory.map((row) => row.sid), ...state.systems.map((row) => row.sid)])
  unique('tid', state.tenants.map((row) => row.tid))
  unique('warrantyId', state.tenants.flatMap((row) => (row.warranties ?? []).map((warrantyRow) => warrantyRow.warrantyId)))
  unique('activityId', state.activityEvents.map((row) => row.id))

  const ids = {
    account: new Set(state.accounts.map((row) => row.id)),
    salesManager: new Set(state.salesManagers.map((row) => row.id)),
    opportunity: new Set(state.opportunities.map((row) => row.id)),
    project: new Set(state.projects.map((row) => row.id)),
    system: new Set(state.systems.map((row) => row.id)),
    productionSystem: new Set(state.productionSystemInventory.map((row) => row.id)),
    reusedInternalSystem: new Set(state.reusedInternalSystems.map((row) => row.id)),
    tenant: new Set(state.tenants.map((row) => row.id)),
    referenceData: new Set(state.referenceData.map((row) => row.id)),
  }
  const versionUpdateBySystem = new Map(state.versionUpdates.map((row) => [row.systemId, row]))
  for (const accountRow of state.accounts) {
    if (!ids.salesManager.has(accountRow.salesManagerId)) errors.push(`Account ${accountRow.accountCode} missing sales manager`)
    if (!['NA','EMEA','APAC'].includes(accountRow.region)) errors.push(`Account ${accountRow.accountCode} invalid region ${accountRow.region}`)
  }
  for (const opportunityRow of state.opportunities) {
    if (!ids.account.has(opportunityRow.accountId)) errors.push(`Opportunity ${opportunityRow.opportunityId} missing account`)
    if (!ids.salesManager.has(opportunityRow.salesManagerId)) errors.push(`Opportunity ${opportunityRow.opportunityId} missing sales manager`)
  }
  for (const projectRow of state.projects) {
    if (!ids.opportunity.has(projectRow.opportunityId)) errors.push(`Project ${projectRow.pid} missing opportunity`)
    const tasks = projectRow.tasks ?? []
    const expectedStatus = tasks.length > 0 && tasks.every((taskRow) => taskRow.status === 'DONE') ? 'DONE' : 'OPEN'
    if (projectRow.progressStatus !== expectedStatus) {
      errors.push(`Project ${projectRow.pid} status ${projectRow.progressStatus} conflicts with Task completion; expected ${expectedStatus}`)
    }
  }
  for (const systemRow of state.systems) {
    for (const projectId of systemRow.linkedProjectIds ?? []) if (!ids.project.has(projectId)) errors.push(`System ${systemRow.sid} linked missing project ${projectId}`)
    for (const tenantId of systemRow.tenantIds ?? []) if (!ids.tenant.has(tenantId)) errors.push(`System ${systemRow.sid} linked missing tenant ${tenantId}`)
  }
  for (const systemRow of [...state.systems, ...state.productionSystemInventory, ...state.reusedInternalSystems]) {
    const currentUpdate = versionUpdateBySystem.get(systemRow.id)
    const versionRef = systemRow.currentVersionNumberRefId ?? currentUpdate?.versionNumberRefId
    const buildRef = systemRow.currentBuildNumberRefId ?? currentUpdate?.buildNumberRefId
    const buildRecord = buildRef ? state.referenceData.find((row) => row.id === buildRef) : null
    if (!versionRef || !ids.referenceData.has(versionRef)) errors.push(`System ${systemRow.sid ?? systemRow.machineId} missing current Version Number`)
    if (!buildRef || !ids.referenceData.has(buildRef)) errors.push(`System ${systemRow.sid ?? systemRow.machineId} missing current Build Number`)
    if (buildRecord?.referenceType === 'BUILD_NUMBER' && buildRecord.versionNumberId !== versionRef) errors.push(`System ${systemRow.sid ?? systemRow.machineId} current Build Number does not belong to Version Number`)
  }
  for (const tenantRow of state.tenants) {
    if (!ids.account.has(tenantRow.accountId)) errors.push(`Tenant ${tenantRow.tid} missing account`)
    if (!ids.system.has(tenantRow.hostedSystemId)) errors.push(`Tenant ${tenantRow.tid} missing hosted system`)
    if (!(tenantRow.warranties ?? []).some((warrantyRow) => warrantyRow.warrantyId && warrantyRow.warrantyStatus)) errors.push(`Tenant ${tenantRow.tid} missing explicit warranty coverage`)
    for (const key of ['product','licenses','users','concurrentSearches','concurrentAnalyses','mapCenter']) {
      if (tenantRow.configuration?.[key] == null || tenantRow.configuration?.[key] === '') errors.push(`Tenant ${tenantRow.tid} missing configuration ${key}`)
    }
  }
  for (const link of state.projectSystems) {
    if (!ids.project.has(link.projectId)) errors.push(`ProjectSystem ${link.id} missing project`)
    if (!ids.system.has(link.systemId)) errors.push(`ProjectSystem ${link.id} missing system`)
  }
  for (const link of state.projectTenants) {
    if (!ids.project.has(link.projectId)) errors.push(`ProjectTenant ${link.id} missing project`)
    if (!ids.tenant.has(link.tenantId)) errors.push(`ProjectTenant ${link.id} missing tenant`)
  }
  for (const ref of state.referenceData.filter((row) => row.referenceType === 'BUILD_NUMBER')) {
    if (!ids.referenceData.has(ref.versionNumberId)) errors.push(`Build ${ref.id} missing parent version`)
  }
  for (const update of state.versionUpdates) {
    if (!ids.referenceData.has(update.versionNumberRefId)) errors.push(`Version update ${update.id} missing version ref`)
    if (!ids.referenceData.has(update.buildNumberRefId)) errors.push(`Version update ${update.id} missing build ref`)
    for (const category of ['CONFIG','ATP','CHECKLIST']) {
      if (!update.attachments.some((attachment) => attachment.category === category)) errors.push(`Version update ${update.id} missing ${category}`)
    }
  }
  for (const event of state.activityEvents) {
    if (!event.primaryObject?.id || !event.primaryObject?.businessId) errors.push(`Activity ${event.id} missing primary object reference`)
  }

  const dashboardCoverage = {
    projectTypes: new Set(state.projects.map((row) => row.mainType)).size >= 3,
    projectDone: state.projects.some((row) => row.progressStatus === 'DONE'),
    pocTenants: state.tenants.some((row) => row.tenantType === 'POC'),
    deliveryTenants: state.tenants.some((row) => row.tenantType === 'CUSTOMER'),
    reusedPurposes: ['Available','POC','Demo','Training','Support'].every((purpose) => state.reusedInternalSystems.some((row) => row.purpose === purpose)),
    warrantyStates: ['NOT_SET','PLANNED','VALID','PENDING','RENEWED','EXPIRED','NO_WARRANTY'].every((status) => state.tenants.some((tenantRow) => (tenantRow.warranties ?? []).length === 0 && status === 'NOT_SET' || (tenantRow.warranties ?? []).some((warrantyRow) => warrantyRow.warrantyStatus === status))),
  }
  for (const [key, passed] of Object.entries(dashboardCoverage)) {
    if (!passed) errors.push(`Dashboard coverage failed: ${key}`)
  }

  if (errors.length) {
    throw new Error(`Reference dataset validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }
}

validate(data)
fs.writeFileSync(seedPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Reference dataset written to ${path.relative(rootDir, seedPath)}`)
for (const [key, value] of Object.entries(data)) {
  if (Array.isArray(value)) console.log(`${key}: ${value.length}`)
}
