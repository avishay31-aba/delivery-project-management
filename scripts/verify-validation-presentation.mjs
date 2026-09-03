import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sourcePath = fileURLToPath(new URL('../src/components/ui/validationPresentation.ts', import.meta.url))
const source = readFileSync(sourcePath, 'utf8')
const projectForm = readFileSync(fileURLToPath(new URL('../src/pages/projects/ProjectFormPage.tsx', import.meta.url)), 'utf8')
const systemForm = readFileSync(fileURLToPath(new URL('../src/pages/systems/SystemInventoryFormPages.tsx', import.meta.url)), 'utf8')
const infrastructureForm = readFileSync(fileURLToPath(new URL('../src/pages/infrastructure/InfrastructureFormPage.tsx', import.meta.url)), 'utf8')
const patternBlock = source.match(/const ERROR_PATTERNS = \[([\s\S]*?)\]/)?.[1] ?? ''
const patterns = [...patternBlock.matchAll(/'([^']+)'|"([^"]+)"/g)].map((match) => (match[1] ?? match[2]).toLocaleLowerCase())

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function isValidationErrorMessage(message) {
  const normalized = message.trim().toLocaleLowerCase()
  return patterns.some((pattern) => normalized.includes(pattern))
}

const blockingMessages = [
  'System is currently allocated to project P000391. Deallocate the system from the project before cancelling it.',
  'Cancellation Reason is required.',
  'Select one destination System before moving the Tenant.',
  'Project not found.',
  'The current authoritative Version Update cannot be deleted.',
]

const successMessages = [
  'System inventory record saved.',
  'Reused internal system allocated.',
  'Opportunity OPP000391 saved.',
]

blockingMessages.forEach((message) => {
  assert(isValidationErrorMessage(message), `Blocking validation message must use error presentation: ${message}`)
})

successMessages.forEach((message) => {
  assert(!isValidationErrorMessage(message), `Success message must not use error presentation: ${message}`)
})

assert(
  /export function hasCancellationValidationError/.test(source),
  'Shared validation presentation must expose a cancellation invalid-state classifier.',
)

;[
  ['Project', projectForm],
  ['System', systemForm],
  ['Infrastructure', infrastructureForm],
].forEach(([name, form]) => {
  assert(
    /hasCancellationValidationError\(/.test(form),
    `${name} form must use the shared cancellation invalid-state classifier.`,
  )
  assert(
    /validationControlClassName\([^)]*cancellation/i.test(form) ||
      /validationControlClassName\(draft\.cancellationRequested === 'YES' && hasCancellationValidationError\(messages\)\)/.test(form),
    `${name} form must apply shared invalid control styling to cancellation controls.`,
  )
})

console.log(JSON.stringify({
  patterns,
  blockingMessagesChecked: blockingMessages.length,
  successMessagesChecked: successMessages.length,
}, null, 2))
