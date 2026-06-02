import { BriefcaseBusiness, FolderKanban, Server, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  description: string
}

export const mainNavigation: NavItem[] = [
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
