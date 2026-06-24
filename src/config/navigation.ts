import { BriefcaseBusiness, Building2, ClipboardCheck, FolderKanban, History, RefreshCcw, Server, ServerCog, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  description: string
}

export const mainNavigation: NavItem[] = [
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
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    description: 'Delivery project list',
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
  {
    label: 'Systems',
    path: '/systems',
    icon: Server,
    description: 'Allocated systems dashboard',
  },
  {
    label: 'Tenants',
    path: '/tenants',
    icon: Users,
    description: 'Tenant list',
  },
  {
    label: 'Warranties',
    path: '/warranties',
    icon: ShieldCheck,
    description: 'Warranty work queue',
  },
  {
    label: 'Renewals',
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
  {
    label: 'Activity Log',
    path: '/activity-log',
    icon: History,
    description: 'Operational activity timeline',
  },
]
