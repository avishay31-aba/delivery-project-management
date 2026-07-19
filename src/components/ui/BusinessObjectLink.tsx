import type { ReactNode } from 'react'
import { LinkId } from '@/components/ui/LinkId'
import {
  routePathForBusinessReference,
  type BusinessObjectReference,
  type BusinessObjectType,
} from '@/domain/business-reference'
import { cn } from '@/utils/cn'

interface BusinessObjectLinkProps {
  reference: BusinessObjectReference | null | undefined
  children?: ReactNode
  className?: string
}

interface BusinessIdLinkProps {
  objectType: BusinessObjectType | 'CUSTOMER'
  businessId: string | null | undefined
  children?: ReactNode
  className?: string
}

interface BusinessIdListLinksProps {
  objectType: BusinessObjectType | 'CUSTOMER'
  businessIds: string | string[] | null | undefined
  className?: string
}

interface LinkedProjectsLinksProps {
  projectIds: string | string[] | null | undefined
  className?: string
}

function fallbackLabel(reference: BusinessObjectReference | null | undefined, children?: ReactNode): ReactNode {
  return children ?? reference?.displayLabel ?? reference?.businessId ?? ''
}

export function BusinessObjectLink({ reference, children, className }: BusinessObjectLinkProps) {
  const label = fallbackLabel(reference, children)
  if (!reference || !label) return label
  if (!reference.routePath || reference.isMissing) {
    return (
      <span className={cn(reference.isMissing ? 'text-sf-text-muted' : undefined, className)} title={reference.isMissing ? 'Missing reference' : undefined}>
        {label}
      </span>
    )
  }

  return (
    <LinkId to={reference.routePath} className={className} title={reference.isStale ? 'Stale reference' : undefined}>
      {label}
    </LinkId>
  )
}

export function BusinessIdLink({ objectType, businessId, children, className }: BusinessIdLinkProps) {
  const label = children ?? businessId ?? ''
  const routePath = routePathForBusinessReference(objectType, businessId)
  if (!routePath || !label) return label
  return (
    <LinkId to={routePath} className={className}>
      {label}
    </LinkId>
  )
}

export function BusinessIdListLinks({ objectType, businessIds, className }: BusinessIdListLinksProps) {
  const ids = (Array.isArray(businessIds) ? businessIds : String(businessIds ?? '').split(';'))
    .map((businessId) => businessId.trim())
    .filter(Boolean)

  if (ids.length === 0) return ''

  return (
    <>
      {ids.map((businessId, index) => (
        <span key={`${businessId}-${index}`}>
          {index > 0 ? '; ' : null}
          <BusinessIdLink objectType={objectType} businessId={businessId} className={className}>
            {businessId}
          </BusinessIdLink>
        </span>
      ))}
    </>
  )
}

export function LinkedProjectsLinks({ projectIds, className }: LinkedProjectsLinksProps) {
  return <BusinessIdListLinks objectType="PROJECT" businessIds={projectIds} className={className} />
}
