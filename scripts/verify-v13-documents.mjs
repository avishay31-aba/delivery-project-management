import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function text(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const documentsPanel = text('src/components/documents/DocumentsPanel.tsx')
const documentCollection = text('src/domain/document-collection/index.ts')
const projectForm = text('src/pages/projects/ProjectFormPage.tsx')
const tenantForm = text('src/pages/tenants/TenantFormPage.tsx')
const infrastructureForm = text('src/pages/infrastructure/InfrastructureFormPage.tsx')

assert(!documentsPanel.includes('Edit3'), 'DocumentsPanel still imports or renders the Edit icon')
assert(!documentsPanel.includes('renameDocument'), 'DocumentsPanel still wires generic rename behavior')
assert(!documentsPanel.includes('<th>Type</th>'), 'DocumentsPanel still renders Type column')
assert(!documentsPanel.includes('<th>File Type</th>'), 'DocumentsPanel still renders File Type column')
assert(documentsPanel.includes("'Uploaded By'"), 'DocumentsPanel is missing Uploaded By column')
assert(documentsPanel.includes("'Replaced By'"), 'DocumentsPanel is missing Replaced By column')
assert(documentsPanel.includes('document.uploadedBy ||'), 'DocumentsPanel does not render persisted uploadedBy fallback')
assert(documentsPanel.includes('document.replacedBy ||'), 'DocumentsPanel does not render persisted replacedBy fallback')

assert(documentCollection.includes('replacedBy: CURRENT_USER_DISPLAY_NAME'), 'Replace behavior does not persist replacedBy')
assert(documentCollection.includes('uploadedBy: document.uploadedBy'), 'Replace behavior does not preserve original uploader')

assert(projectForm.includes('updateProjectDocuments'), 'Project Documents is not using the immediate child-object persistence action')
assert(projectForm.includes('cloneProjectDraft(committedProject)'), 'Project Documents does not sync the draft from the committed Project record')
assert(!projectForm.includes("subtitle=\"Shared document workspace for this Project.\""), 'Project Documents still has the Project-only wrapper subtitle')
assert(!projectForm.includes("const sectionId: CollapsibleSectionId = 'documents'"), 'Project Documents still has a collapsible section state')

assert(tenantForm.includes('cloneTenant(committedTenant)'), 'Tenant Documents does not sync the draft from the committed Tenant record')
assert(infrastructureForm.includes('cloneInfrastructureItem(result.record)'), 'Infrastructure child-object commits do not sync from the committed record')

console.log('V1.3 documents verification passed')
