export const YES_NO_OPTIONS = ['', 'YES', 'NO']
export const YES_NO_REQUIRED_OPTIONS = ['YES', 'NO']

export const CROSS_SYSTEM_OPTIONS = ['Weaver', 'Dark web', 'Lynx']
export const AI_OPTIONS = ['Face Detection', 'OCR', 'Object Detection', 'Reverse Face', 'Landmark', 'Video Analysis', 'CoAnalyst']
export const ADDITIONAL_FEATURE_OPTIONS = ['SSO', '2FA', 'Export to PDF', 'Enhanced Search', 'Post Translation']

export const REGION_OPTIONS = ['NA', 'EU', 'APAC']
export const PERFORMANCE_TIER_OPTIONS = ['STANDARD', 'POWERED']
export const VPN_TYPE_OPTIONS = ['OpenVPN', 'FortiGate', 'CheckPoint', 'Cisco', 'Palo Alto', 'Jump server', 'Apache Guacamole', 'Add new...']

export const REUSED_PURPOSE_OPTIONS = ['POC', 'Demo', 'Training', 'Support']
export const REUSED_STATUS_OPTIONS = ['Available', 'Occupied', 'Obsolete']
export const REUSED_OPERATIONAL_STATUS_OPTIONS = ['On', 'Off', 'Access blocked', 'Service blocked', 'Deleted']
export const PRODUCTION_OPERATIONAL_STATUS_OPTIONS = [...REUSED_OPERATIONAL_STATUS_OPTIONS, 'Canceled']

export const TENANT_FORM_TYPE_OPTIONS = [
  { value: 'POC', label: 'POC' },
  { value: 'CUSTOMER', label: 'Customer' },
]
