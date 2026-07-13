import type { Location } from 'react-router-dom'

export function routeMode(location: Location): string | null {
  const stateMode = (location.state as { mode?: string } | null)?.mode
  if (stateMode) return stateMode
  return new URLSearchParams(location.search).get('mode')
}

export function isRouteViewMode(location: Location): boolean {
  return routeMode(location) === 'view'
}
