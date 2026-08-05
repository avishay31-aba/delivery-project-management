import { BriefcaseBusiness, Building2, FolderKanban, HardDrive, History, Server, Timer, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path?: string
  icon: LucideIcon
  description: string
  children?: NavItem[]
}

export type NavRouteItem = NavItem & { path: string }

export interface NavConsoleGroup {
  label: string
  items: NavItem[]
}

export const consoleNavigation: NavConsoleGroup[] = [
  {
    label: 'Sales Console',
    items: [
      {
        label: 'Customers',
        path: '/customers',
        icon: Building2,
        description: 'Customer and account database',
      },
      {
        label: 'Opportunities',
        path: '/opportunities',
        icon: BriefcaseBusiness,
        description: 'Sales opportunity intake',
      },
    ],
  },
  {
    label: 'Delivery Console',
    items: [
      {
        label: 'Projects',
        path: '/projects',
        icon: FolderKanban,
        description: 'Delivery project list',
      },
      {
        label: 'Systems Workspace',
        path: '/systems',
        icon: Server,
        description: 'System operations and inventory',
      },
      {
        label: 'Infrastructure',
        path: '/infrastructure',
        icon: HardDrive,
        description: 'Global infrastructure item inventory',
      },
      {
        label: 'Tenants',
        path: '/tenants',
        icon: Users,
        description: 'Tenant list',
      },
    ],
  },
  {
    label: 'Admin Console',
    items: [
      {
        label: 'Activity / Audit Log',
        path: '/activity-log',
        icon: History,
        description: 'Operational activity timeline',
      },
      {
        label: 'Time Group Settings',
        path: '/admin/time-groups',
        icon: Timer,
        description: 'Time Zone to Time Group reference mapping',
      },
    ],
  },
]

function flattenNavigation(items: NavItem[]): NavRouteItem[] {
  return items.flatMap((item) => [
    ...(item.path ? [item as NavRouteItem] : []),
    ...(item.children ? flattenNavigation(item.children) : []),
  ])
}

export const mainNavigation: NavRouteItem[] = consoleNavigation.flatMap((group) => flattenNavigation(group.items))
