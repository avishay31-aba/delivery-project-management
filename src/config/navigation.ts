import { BriefcaseBusiness, Building2, FolderKanban, Server, Users } from 'lucide-react'
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
    label: 'Systems',
    path: '/systems',
    icon: Server,
    description: 'System list',
  },
  {
    label: 'Tenants',
    path: '/tenants',
    icon: Users,
    description: 'Tenant list',
  },
]
