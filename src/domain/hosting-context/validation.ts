import type { HostingContext, HostingValidationMessage } from './types'
import { requiresCloudRegion } from './service'

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

export function validateHostingContext(context: Partial<HostingContext>): HostingValidationMessage[] {
  const messages: HostingValidationMessage[] = []
  const url = textValue(context.url)

  if (url && (!/^https?:\/\/\S+$/.test(url) || url.includes(' '))) {
    messages.push({ field: 'url', message: 'URL must start with http:// or https:// and contain no spaces.' })
  }

  if (requiresCloudRegion(textValue(context.cloudPlatform)) && !textValue(context.cloudRegion)) {
    messages.push({
      field: 'cloudRegion',
      message: 'Cloud Region is required when Cloud Platform is AWS, AWS Gov, Azure, or Azure Gov.',
    })
  }

  return messages
}

export function sanitizeHostingContext<T extends Partial<HostingContext>>(context: T): T {
  const hostingType = textValue(context.hostingType)
  const cloudPlatform = textValue(context.cloudPlatform)
  const vpnEnabled = textValue(context.vpnEnabled)
  const next = { ...context }

  if (hostingType === 'On premise') {
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
  if (key === 'hostingType') return { cloudPlatform: '', csp: '', cloudRegion: '' }
  if (key === 'cloudPlatform') return { csp: '', cloudRegion: '' }
  if (key === 'vpnEnabled' && value !== 'YES') return { vpnType: '' }
  return {}
}
