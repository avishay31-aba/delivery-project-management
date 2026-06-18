import type { ObjectFieldDefinition } from '@/domain/object-registry'
import type { RuntimeFormField } from './types'

export function objectFieldToRuntimeFormField(field: ObjectFieldDefinition): RuntimeFormField {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    editable: field.editable === true,
    required: field.required === true,
    section: field.section,
    tab: field.tab,
    source: field.source,
    picklistSource: field.picklistSource,
  }
}

