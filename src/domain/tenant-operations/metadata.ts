import type { TenantHostingSnapshot } from '@/data/seed.types'

export const TENANT_REMARK_TYPES = ['Note', 'Warranty', 'Temporary change', 'Permanent change', 'Task']

export const TENANT_HOSTING_FIELDS: Array<{ key: keyof TenantHostingSnapshot | 'tenantCount'; label: string }> = [
  { key: 'currentSystem', label: 'Current system' },
  { key: 'sid', label: 'SID' },
  { key: 'tenantCount', label: 'Number of Tenants' },
  { key: 'operationalStatus', label: 'Operational Status' },
  { key: 'machineNumber', label: 'Machine Number' },
  { key: 'versionNumber', label: 'Version Number' },
  { key: 'hostingType', label: 'Hosting type' },
  { key: 'url', label: 'URL' },
  { key: 'performanceTier', label: 'Performance tier' },
  { key: 'vpnEnabled', label: 'VPN' },
  { key: 'vpnType', label: 'VPN type' },
  { key: 'ipRestrictionEnabled', label: 'IP restriction' },
  { key: 'platform', label: 'Platform' },
  { key: 'csp', label: 'CSP' },
  { key: 'awsRegion', label: 'AWS Region' },
  { key: 'azureRegion', label: 'Azure Region' },
]
