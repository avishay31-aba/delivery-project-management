export type BusinessEntityType =
  | 'account'
  | 'opportunity'
  | 'project'
  | 'productionSystem'
  | 'internalReusedSystem'
  | 'tenant'
  | 'warranty'
  | 'document'

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
