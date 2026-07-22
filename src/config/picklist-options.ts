import { BUSINESS_REGION_OPTIONS } from '@/domain/business-region'

export const YES_NO_OPTIONS = ['', 'YES', 'NO']
export const YES_NO_REQUIRED_OPTIONS = ['YES', 'NO']

export const CROSS_SYSTEM_OPTIONS = ['Weaver', 'Dark web', 'Lynx']
export const AI_OPTIONS = ['Face Detection', 'OCR', 'Object Detection', 'Reverse Face', 'Landmark', 'Video Analysis', 'CoAnalyst']
export const ADDITIONAL_FEATURE_OPTIONS = ['SSO', '2FA', 'Export to PDF', 'Enhanced Search', 'Post Translation', 'Advanced Search']

export const REGION_OPTIONS = BUSINESS_REGION_OPTIONS
export const COGNITO_REGION_OPTIONS = BUSINESS_REGION_OPTIONS
export { PERFORMANCE_TIER_OPTIONS, VPN_TYPE_OPTIONS } from '@/domain/hosting-context'

export {
  PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
  REUSED_OPERATIONAL_STATUS_OPTIONS,
  REUSED_PURPOSE_OPTIONS,
  REUSED_STATUS_OPTIONS,
} from '@/domain/system-inventory'

export const TENANT_FORM_TYPE_OPTIONS = [
  { value: 'POC', label: 'POC' },
  { value: 'CUSTOMER', label: 'Customer' },
]
