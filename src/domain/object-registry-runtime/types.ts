import type { ObjectFieldDefinition, ObjectMetadataSourceRef } from '@/domain/object-registry'

export type RuntimeFieldType = ObjectFieldDefinition['type']

export interface RuntimeSourceResolution<T = unknown> {
  ref?: ObjectMetadataSourceRef
  resolved: boolean
  value?: T
  message?: string
}

export interface RuntimeSourceResolverOptions {
  strict?: boolean
}

export interface RuntimeFormField {
  key: string
  label: string
  type: RuntimeFieldType
  editable: boolean
  required: boolean
  section?: string
  tab?: string
  options?: string[]
  source?: ObjectMetadataSourceRef
  picklistSource?: ObjectMetadataSourceRef
}

export interface RuntimeDashboardField<T> {
  id: string
  label: string
  getValue: (row: T) => string | number | null
  editKey?: keyof T
  editable?: boolean
  options?: string[]
}

