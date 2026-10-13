import { Bell, BriefcaseBusiness, Building2, CalendarCheck, Database, Flag, FolderKanban, HardDrive, History, MapPinned, Rocket, ShieldCheck, Server, Timer, Users } from 'lucide-react'
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
        label: 'Tenants',
        path: '/tenants',
        icon: Users,
        description: 'Tenant list',
      },
      {
        label: 'Infrastructure',
        path: '/infrastructure',
        icon: HardDrive,
        description: 'Global infrastructure item inventory',
      },
      {
        label: 'Notifications & Alerts',
        path: '/notifications-alerts',
        icon: Bell,
        description: 'Recipient notifications and current business alerts',
      },
      {
        label: 'Reminders',
        path: '/reminders',
        icon: CalendarCheck,
        description: 'Due-date reminders from remarks and tasks',
      },
      {
        label: 'Version Upgrade Scheduler',
        path: '/version-upgrades',
        icon: Rocket,
        description: 'Coordinate Production System Version and Build upgrades',
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
        label: 'Roles & Permissions',
        path: '/admin/roles-permissions',
        icon: ShieldCheck,
        description: 'Role definitions, permissions and notification recipients',
      },
      {
        label: 'Countries',
        path: '/admin/countries',
        icon: Flag,
        description: 'Country, Region and UTC reference data',
      },
      {
        label: 'US States',
        path: '/admin/us-states',
        icon: MapPinned,
        description: 'US State UTC reference data',
      },
      {
        label: 'Time Group Settings',
        path: '/admin/time-groups',
        icon: Timer,
        description: 'Time Zone to Time Group reference mapping',
      },
      {
        label: 'Storage Diagnostics',
        path: '/admin/storage-diagnostics',
        icon: Database,
        description: 'Runtime browser storage metadata for QA',
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
