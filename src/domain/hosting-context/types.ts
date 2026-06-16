import type { YesNo } from '@/data/seed.types'

export type HostingType = string
export type CloudPlatform = string
export type CloudServiceProvider = string
export type CloudRegion = string
export type PerformanceTier = 'STANDARD' | 'POWERED' | ''

export interface HostingIntent {
  hostingType: HostingType
  cloudPlatform: CloudPlatform
}

export interface HostingContext extends HostingIntent {
  csp?: CloudServiceProvider
  cloudRegion?: CloudRegion
  url?: string
  performanceTier?: PerformanceTier
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
}

export interface HostingSnapshot {
  currentSystem: boolean
  sid: string
  operationalStatus: string
  machineNumber: string
  versionNumber: string
  hostingType: HostingType
  url: string
  performanceTier: PerformanceTier
  vpnEnabled: YesNo
  vpnType: string
  ipRestrictionEnabled: YesNo
  platform: CloudPlatform
  csp: CloudServiceProvider
  awsRegion: string
  azureRegion: string
}

export interface HostingValidationMessage {
  field?: keyof HostingContext
  message: string
}
