import type { ReactNode } from 'react'
import type { ApplicationConfigurationComparisonResult } from '@/domain/application-configuration'

function comparisonClassName(comparison: ApplicationConfigurationComparisonResult): string {
  if (comparison.matches) return ''
  if (comparison.dataType === 'number') {
    if (comparison.direction === 'increase') return 'configuration-change-increase'
    if (comparison.direction === 'decrease') return 'configuration-change-decrease'
    return 'configuration-change-changed'
  }
  if (comparison.dataType === 'boolean') {
    return comparison.requestedBooleanValue ? 'configuration-change-boolean-yes' : 'configuration-change-boolean-no'
  }
  if (comparison.dataType === 'list') {
    return comparison.removedItems.length > 0 ? 'configuration-change-removal' : ''
  }
  return 'configuration-change-changed'
}

function comparisonTitle(comparison: ApplicationConfigurationComparisonResult): string | undefined {
  if (comparison.matches) return undefined
  const details = [
    `Baseline: ${Array.isArray(comparison.currentValue) ? comparison.currentValue.join('; ') || '-' : comparison.currentValue ?? '-'}`,
    `Requested: ${Array.isArray(comparison.requestedValue) ? comparison.requestedValue.join('; ') || '-' : comparison.requestedValue ?? '-'}`,
    comparison.addedItems.length > 0 ? `Added: ${comparison.addedItems.join('; ')}` : '',
    comparison.removedItems.length > 0 ? `Removed: ${comparison.removedItems.join('; ')}` : '',
  ].filter(Boolean)
  return details.join('\n')
}

export function ApplicationConfigurationComparisonCell({
  children,
  comparison,
}: {
  children: ReactNode
  comparison: ApplicationConfigurationComparisonResult | null
}) {
  if (!comparison || comparison.matches) return <>{children}</>

  if (comparison.dataType === 'list' && Array.isArray(comparison.requestedValue)) {
    const addedKeys = new Set(comparison.addedItems.map((item) => item.toLocaleLowerCase()))
    const className = comparisonClassName(comparison)

    return (
      <span className={className} title={comparisonTitle(comparison)} aria-label={comparisonTitle(comparison)}>
        {comparison.requestedValue.map((item, index) => (
          <span key={`${item}-${index}`}>
            {index > 0 ? '; ' : ''}
            <span className={addedKeys.has(item.toLocaleLowerCase()) ? 'configuration-change-addition' : undefined}>{item}</span>
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className={comparisonClassName(comparison)} title={comparisonTitle(comparison)} aria-label={comparisonTitle(comparison)}>
      {children}
    </span>
  )
}
