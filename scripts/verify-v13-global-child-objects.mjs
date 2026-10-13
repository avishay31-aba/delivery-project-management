import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const seed = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed.json'), 'utf8'))

function numericSuffix(value, prefix) {
  const match = String(value ?? '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'))
  return match ? Number.parseInt(match[1], 10) : 0
}

function maxNumeric(values, prefix) {
  return values.reduce((max, value) => Math.max(max, numericSuffix(value, prefix)), 0)
}

function duplicates(values) {
  const seen = new Set()
  const duplicate = new Set()
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) duplicate.add(value)
    seen.add(value)
  })
  return Array.from(duplicate)
}

const systemParents = [
  ...(seed.systems ?? []),
  ...(seed.productionSystemInventory ?? []),
  ...(seed.reusedInternalSystems ?? []),
]
const documentIds = [
  ...(seed.projects ?? []).flatMap((record) => record.documents ?? []),
  ...systemParents.flatMap((record) => record.documents ?? []),
  ...(seed.tenants ?? []).flatMap((record) => record.documents ?? []),
  ...(seed.infrastructureItems ?? []).flatMap((record) => record.documents ?? []),
].map((record) => record.id)
const remarkIds = [
  ...systemParents.flatMap((record) => record.remarks ?? []),
  ...(seed.tenants ?? []).flatMap((record) => record.remarks ?? []),
  ...(seed.infrastructureItems ?? []).flatMap((record) => record.remarks ?? []),
].map((record) => record.remarkId)
const configurationHistoryIds = [
  ...systemParents.flatMap((record) => record.configurationHistory ?? []),
  ...(seed.tenants ?? []).flatMap((record) => record.configurationHistory ?? []),
].map((record) => record.recordId)
const activityIds = (seed.activityEvents ?? []).map((record) => record.id)

const checks = [
  ['Documents', 'DOC', 'document', documentIds],
  ['Remarks', 'R', 'remark', remarkIds],
  ['Configuration History', 'CH', 'configurationHistory', configurationHistoryIds],
  ['Activity', 'ACT', 'activity', activityIds],
]

const summary = checks.map(([label, prefix, counterKey, ids]) => {
  const highestExisting = maxNumeric(ids, prefix)
  const persistedCounter = seed.idCounters?.[counterKey] ?? 0
  const effectiveCounter = Math.max(highestExisting, persistedCounter)
  return {
    label,
    count: ids.length,
    highestExisting,
    persistedCounter,
    effectiveNextId: `${prefix}${String(effectiveCounter + 1).padStart(6, '0')}`,
    duplicates: duplicates(ids),
  }
})

function sequence(prefix, startCounter, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}${String(startCounter + index + 1).padStart(6, '0')}`)
}

const files = {
  documentsPanel: fs.readFileSync(path.join(root, 'src/components/documents/DocumentsPanel.tsx'), 'utf8'),
  customer360: fs.readFileSync(path.join(root, 'src/pages/customers/Customer360Page.tsx'), 'utf8'),
  projectForm: fs.readFileSync(path.join(root, 'src/pages/projects/ProjectFormPage.tsx'), 'utf8'),
  systemForm: fs.readFileSync(path.join(root, 'src/pages/systems/SystemInventoryFormPages.tsx'), 'utf8'),
  tenantForm: fs.readFileSync(path.join(root, 'src/pages/tenants/TenantFormPage.tsx'), 'utf8'),
  opportunityForm: fs.readFileSync(path.join(root, 'src/pages/opportunities/OpportunityFormPage.tsx'), 'utf8'),
  store: fs.readFileSync(path.join(root, 'src/store/useAppStore.ts'), 'utf8'),
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

summary.forEach((item) => {
  assert(item.duplicates.length === 0, `${item.label} contains duplicate IDs: ${item.duplicates.join(', ')}`)
})

assert(files.documentsPanel.includes("key: 'uploadedAt'"), 'DocumentsPanel does not own the Uploaded At column.')
assert(files.documentsPanel.includes("initialSort={{ key: 'uploadedAt', direction: 'desc' }}"), 'DocumentsPanel does not default to newest uploaded documents first.')
assert(files.documentsPanel.includes('<RecordHistorySection'), 'DocumentsPanel does not use the shared sortable record-history grid.')
assert(!files.documentsPanel.includes('renameDocument'), 'DocumentsPanel still references document rename behavior.')
assert(!files.customer360.includes("'Type', 'Size'"), 'Customer Documents still contains the obsolete Type column table.')
assert(files.customer360.includes('<DocumentsPanel'), 'Customer Documents does not use the shared DocumentsPanel.')
assert(!files.projectForm.includes('title="Activity Log"'), 'Project Activity still has a parent-specific Activity Log wrapper.')
assert(!files.systemForm.includes('<h3 className="text-base font-semibold text-sf-text">Activity Log</h3>'), 'System Activity still has a parent-specific Activity Log heading.')
assert(!files.opportunityForm.includes('title="Activity Log"'), 'Opportunity Activity still has a parent-specific Activity Log wrapper.')
assert(files.store.includes('reconcileGlobalChildRecords<DocumentRecord>'), 'Store does not reconcile Document IDs globally.')
assert(files.store.includes('reconcileGlobalChildRecords<RemarkRecord>'), 'Store does not reconcile Remark IDs globally.')
assert(files.store.includes('reconcileGlobalChildRecords<ConfigurationHistoryRecord>'), 'Store does not reconcile System Configuration History IDs globally.')
assert(files.store.includes('reconcileGlobalChildRecords<TenantConfigurationHistoryRecord>'), 'Store does not reconcile Tenant Configuration History IDs globally.')
assert(files.store.includes('idCounters: normalizeIdCounters(state.idCounters, state)'), 'Store persistence does not reconcile counters from records and persisted counters.')

console.log('V1.3 global child-object verification passed')
summary.forEach((item) => {
  console.log(`${item.label}: count=${item.count}, highest=${item.highestExisting}, persisted=${item.persistedCounter}, next=${item.effectiveNextId}`)
})
console.log(`Document cross-parent sequence: ${sequence('DOC', Math.max(summary[0].highestExisting, summary[0].persistedCounter), 4).join(', ')}`)
console.log(`Remark cross-parent sequence: ${sequence('R', Math.max(summary[1].highestExisting, summary[1].persistedCounter), 3).join(', ')}`)
console.log(`Configuration History cross-parent sequence: ${sequence('CH', Math.max(summary[2].highestExisting, summary[2].persistedCounter), 2).join(', ')}`)
console.log(`Activity cross-parent sequence: ${sequence('ACT', Math.max(summary[3].highestExisting, summary[3].persistedCounter), 3).join(', ')}`)
