import { BriefcaseBusiness, Building2, ClipboardCheck, FolderKanban, History, RefreshCcw, Server, ServerCog, ShieldCheck, Users } from 'lucide-react'
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
        icon: Server,
        description: 'System operations and inventory',
        children: [
          {
            label: 'Allocated Systems',
            path: '/systems',
            icon: Server,
            description: 'Allocated systems dashboard',
          },
          {
            label: 'Production Inventory',
            path: '/systems/production-inventory',
            icon: ServerCog,
            description: 'Available production systems',
          },
          {
            label: 'Reused Internal Systems',
            path: '/systems/reused-internal',
            icon: ServerCog,
            description: 'POC, demo, training, and support machines',
          },
        ],
      },
      {
        label: 'Tenants',
        path: '/tenants',
        icon: Users,
        description: 'Tenant list',
      },
      {
        label: 'Warranty Workspace',
        path: '/warranties',
        icon: ShieldCheck,
        description: 'Warranty work queue',
      },
      {
        label: 'Renewal Work Queue',
        path: '/renewals',
        icon: RefreshCcw,
        description: 'Renewal readiness queue',
      },
      {
        label: 'Requirement Coverage',
        path: '/requirement-coverage',
        icon: ClipboardCheck,
        description: 'Requirement delivery traceability',
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
