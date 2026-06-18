import type { ObjectMetadataSourceRef } from '@/domain/object-registry'
import type { RuntimeSourceResolution, RuntimeSourceResolverOptions } from './types'

export function resolveObjectRegistrySource<T = unknown>(
  ref: ObjectMetadataSourceRef | undefined,
  options: RuntimeSourceResolverOptions = {},
): RuntimeSourceResolution<T> {
  if (!ref) return { ref, resolved: false, message: 'No source reference provided.' }
  if (options.strict) throw new Error(`Unsupported ObjectRegistry source: ${ref.domain}.${ref.exportName ?? ''}`)
  return { ref, resolved: false, message: 'Unsupported ObjectRegistry source.' }
}

