import type { HostingContext, HostingValidationMessage } from './types'
import { cspOptionsForCloudPlatform, requiresCloudPlatform, requiresCloudRegion } from './service'

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

export function validateHostingContext(context: Partial<HostingContext>): HostingValidationMessage[] {
  const messages: HostingValidationMessage[] = []
  const url = textValue(context.url)
  const hostingType = textValue(context.hostingType)
  const cloudPlatform = textValue(context.cloudPlatform)
  const csp = textValue(context.csp)
  const cloudRegion = textValue(context.cloudRegion)
  const vpnEnabled = textValue(context.vpnEnabled)
  const vpnType = textValue(context.vpnType)

  if (!url) {
    messages.push({ field: 'url', message: 'URL is required.' })
  } else if (!/^https?:\/\/\S+$/.test(url) || url.includes(' ')) {
    messages.push({ field: 'url', message: 'URL must start with http:// or https:// and contain no spaces.' })
  }

  if (!hostingType) {
    messages.push({ field: 'hostingType', message: 'Hosting is required.' })
  }

  if (requiresCloudPlatform(hostingType) && !cloudPlatform) {
    messages.push({ field: 'cloudPlatform', message: 'Cloud Platform is required.' })
  }

  if (requiresCloudPlatform(hostingType) && cloudPlatform && cspOptionsForCloudPlatform(cloudPlatform).length > 0 && !csp) {
    messages.push({ field: 'csp', message: 'CSP is required.' })
  }

  if (requiresCloudPlatform(hostingType) && requiresCloudRegion(cloudPlatform) && !cloudRegion) {
    messages.push({ field: 'cloudRegion', message: 'Cloud Region is required.' })
  }

  if (vpnEnabled === 'YES' && !vpnType) {
    messages.push({ field: 'vpnType', message: 'VPN Type is required.' })
  }

  return messages
}

export function sanitizeHostingContext<T extends Partial<HostingContext>>(context: T): T {
  const hostingType = textValue(context.hostingType)
  const cloudPlatform = textValue(context.cloudPlatform)
  const vpnEnabled = textValue(context.vpnEnabled)
  const next = { ...context }

  if (!requiresCloudPlatform(hostingType)) {
    next.cloudPlatform = ''
    next.csp = ''
    next.cloudRegion = ''
  } else if (!cloudPlatform) {
    next.csp = ''
    next.cloudRegion = ''
  } else if (cloudPlatform === "Customer's datacenter") {
    next.cloudRegion = ''
  }

  if (vpnEnabled !== 'YES') {
    next.vpnType = ''
  }

  return next
}

export function hostingContextPatchForFieldChange(key: string, value: unknown): Partial<HostingContext> {
  if (key === 'hostingType') {
    return { cloudPlatform: '', csp: '', cloudRegion: '' }
  }
  if (key === 'cloudPlatform') return { csp: '', cloudRegion: '' }
  if (key === 'vpnEnabled' && value !== 'YES') return { vpnType: '' }
  return {}
}
