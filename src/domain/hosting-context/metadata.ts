export const HOSTING_OPTIONS = ['Cloud', 'On premise', 'Hybrid']

export const CLOUD_PLATFORM_OPTIONS = ['AWS', 'AWS Gov', 'Azure', 'Azure Gov', "Customer's datacenter"]

export const PRODUCT_OPTIONS = ['Tangles', 'Tangles Light', 'Webloc', 'Weaver', 'Trapdoor', 'Lynx', 'DataAPI']

export const AWS_CSP_OPTIONS = ['Automate IT']

export const AZURE_CSP_OPTIONS = ['SELA', 'Ingram Hongkong', 'Ingram DE', 'Ingram UK', 'Ingram NZ', 'Ingram Singapore']

export const CUSTOMER_DATACENTER_CSP_OPTIONS = ['Customer']

export const AWS_REGIONS = [
  'us-east-1 (N. Virginia)',
  'us-east-2 (Ohio)',
  'us-west-1 (N. California)',
  'us-west-2 (Oregon)',
  'af-south-1 (Cape Town)',
  'ap-east-1 (Hong Kong)',
  'ap-south-1 (Mumbai)',
  'ap-south-2 (Hyderabad)',
  'ap-southeast-1 (Singapore)',
  'ap-southeast-2 (Sydney)',
  'ap-southeast-3 (Jakarta)',
  'ap-southeast-4 (Melbourne)',
  'ap-northeast-1 (Tokyo)',
  'ap-northeast-2 (Seoul)',
  'ap-northeast-3 (Osaka)',
  'ca-central-1 (Canada Central)',
  'ca-west-1 (Calgary)',
  'eu-central-1 (Frankfurt)',
  'eu-central-2 (Zurich)',
  'eu-west-1 (Ireland)',
  'eu-west-2 (London)',
  'eu-west-3 (Paris)',
  'eu-south-1 (Milan)',
  'eu-south-2 (Spain)',
  'eu-north-1 (Stockholm)',
  'il-central-1 (Tel Aviv)',
  'me-south-1 (Bahrain)',
  'me-central-1 (UAE)',
  'sa-east-1 (Sao Paulo)',
]

export const AZURE_REGIONS = [
  'East US',
  'East US 2',
  'Central US',
  'North Central US',
  'South Central US',
  'West Central US',
  'West US',
  'West US 2',
  'West US 3',
  'Canada Central',
  'Canada East',
  'Brazil South',
  'North Europe',
  'West Europe',
  'UK South',
  'UK West',
  'France Central',
  'Germany West Central',
  'Switzerland North',
  'Norway East',
  'Sweden Central',
  'Poland Central',
  'Italy North',
  'Spain Central',
  'UAE North',
  'Qatar Central',
  'Israel Central',
  'South Africa North',
  'Central India',
  'South India',
  'West India',
  'East Asia',
  'Southeast Asia',
  'Japan East',
  'Japan West',
  'Korea Central',
  'Australia East',
  'Australia Southeast',
]

export const AZURE_GOV_REGIONS = ['USGov Virginia', 'USGov Texas', 'USGov Arizona']

export const AWS_GOV_REGIONS = ['us-gov-east-1', 'us-gov-west-1']

export const PERFORMANCE_TIER_OPTIONS = ['STANDARD', 'POWERED']

export const VPN_TYPE_OPTIONS = ['OpenVPN', 'FortiGate', 'CheckPoint', 'Cisco', 'Palo Alto', 'Jump server', 'Apache Guacamole', 'Add new...']

export const DEFAULT_HOSTING_CONTEXT = {
  hostingType: 'Cloud',
  cloudPlatform: 'AWS',
  csp: 'Automate IT',
  cloudRegion: 'us-east-1 (N. Virginia)',
  performanceTier: 'STANDARD' as const,
  vpnEnabled: 'NO' as const,
  vpnType: '',
  ipRestrictionEnabled: 'NO' as const,
}
