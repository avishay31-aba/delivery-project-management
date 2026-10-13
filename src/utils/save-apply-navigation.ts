interface SaveApplyNavigationOptions {
  isCreateMode: boolean
  stayOnPage: boolean
  persistedRoute: string
  returnTo?: string
  fallbackExitRoute: string
}

interface CancelNavigationOptions {
  isCreateMode: boolean
  persistedRoute?: string | null
  returnTo?: string
  fallbackExitRoute: string
  currentRoute?: string
}

export function readOnlyRoutePath(routePath: string): string {
  if (/[?&]mode=/.test(routePath)) return routePath
  const separator = routePath.includes('?') ? '&' : '?'
  return `${routePath}${separator}mode=view`
}

export function successfulSaveApplyNavigationTarget({
  isCreateMode,
  stayOnPage,
  persistedRoute,
  fallbackExitRoute,
}: SaveApplyNavigationOptions): string | null {
  if (stayOnPage) return isCreateMode ? persistedRoute : null
  return fallbackExitRoute
}

export function cancelFormNavigationTarget({
  isCreateMode,
  persistedRoute,
  returnTo,
  fallbackExitRoute,
  currentRoute,
}: CancelNavigationOptions): string {
  if (returnTo) return returnTo
  if (!isCreateMode && persistedRoute) {
    const target = readOnlyRoutePath(persistedRoute)
    return currentRoute && target === currentRoute ? fallbackExitRoute : target
  }
  return fallbackExitRoute
}
