import type { AccountCustomerType } from '@/data/seed.types'

export const CUSTOMER_TYPE_LABELS: Record<AccountCustomerType, string> = {
  NEW_CUSTOMER: 'New',
  VETERAN_CUSTOMER: 'Veteran',
}

export const CUSTOMER_ACCOUNT_FIELD_LABELS = {
  accountCode: 'Customer / Account ID',
  accountName: 'Customer / Account Name',
  customerType: 'Customer Type',
  salesManager: 'Sales Manager / Deal Owner',
  region: 'Region',
  country: 'Country',
  state: 'State',
  timeZone: 'Time Zone',
  systemCount: 'Number of Systems',
  tenantCount: 'Number of Tenants',
  sids: 'SIDs',
  tids: 'TIDs',
  warrantySummary: 'Warranty Summary',
  updatedAt: 'Updated At',
} as const
