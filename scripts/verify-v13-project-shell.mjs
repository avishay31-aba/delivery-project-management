import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectForm = readFileSync(resolve(ROOT, 'src/pages/projects/ProjectFormPage.tsx'), 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(
  projectForm.includes('<WorkspaceScrollContent className="space-y-4" viewMode={isViewMode}>'),
  'Project form must use the shared spaced WorkspaceScrollContent shell',
)
assert(
  projectForm.includes('className="sticky top-0 z-10 flex flex-nowrap overflow-x-auto border-b border-sf-border bg-sf-surface-alt"'),
  'Project tab bar must be non-wrapping and horizontally scrollable',
)
assert(
  projectForm.includes("'sf-view-mode-allow shrink-0 border-b-2 px-4 py-2 text-base font-semibold'"),
  'Project tab buttons must keep stable width in the horizontal tab strip',
)
assert(
  projectForm.includes('<div className="min-h-80 p-3" role="tabpanel"'),
  'Project tab panel must use stable shared padding/min-height',
)
assert(!projectForm.includes('className="mt-4 rounded border border-sf-border bg-sf-surface"'), 'Project tab shell still uses the old manual margin wrapper')
assert(!projectForm.includes('className="mt-4 space-y-4"'), 'Project Requirements wrapper still uses old manual margin spacing')
assert(!projectForm.includes('className="min-h-[360px]"'), 'Project tab panel still uses the old Project-only min-height')
assert(!projectForm.includes("'documents' | 'activity'"), 'Project Documents still participates in collapsible section state')
assert(!projectForm.includes("documents: false"), 'Project Documents still has collapsible default state')
assert(!projectForm.includes('Shared document workspace for this Project'), 'Project Documents still has Project-specific workspace text')

console.log('V1.3 Project shell verification passed')
