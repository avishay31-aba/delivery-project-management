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
