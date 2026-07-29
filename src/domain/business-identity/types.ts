export type BusinessEntityType =
  | 'account'
  | 'opportunity'
  | 'project'
  | 'productionSystem'
  | 'tenant'
  | 'warranty'
  | 'remark'
  | 'activity'
  | 'configurationHistory'
  | 'purposeHistory'
  | 'document'
  | 'versionNumber'
  | 'buildNumber'
  | 'versionUpdate'
  | 'versionUpdateAttachment'
  | 'infrastructureItem'
  | 'infrastructureCategory'
  | 'infrastructureType'
  | 'infrastructureManufacturer'
  | 'infrastructureOwner'
  | 'infrastructureBillingMethod'
  | 'infrastructureWarrantyType'
  | 'infrastructurePropertyValue'
  | 'infrastructureMaintenanceTask'

export interface BusinessIdentityPolicy {
  entityType: BusinessEntityType
  prefix: string
  minimumCounter: number
  minDigits?: number
}

export interface BusinessIdentityValidationResult {
  valid: boolean
  messages: string[]
}
