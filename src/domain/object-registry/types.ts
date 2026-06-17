export type ObjectRegistryKey = 'opportunity' | 'project' | 'system' | 'tenant'

export interface ObjectRegistryEntry {
  key: ObjectRegistryKey
  label: string
}
