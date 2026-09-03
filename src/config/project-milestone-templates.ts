import type { Opportunity, Project, ProjectMilestone, ProjectTask } from '@/data/seed.types'
import { isServerHosting } from '@/domain/hosting-context'

export type ProjectMilestoneTemplateId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface ProjectTemplateRow {
  milestoneOrder: number
  milestone: string
  task: string
  department: string
  resource: string
}

export interface ProjectMilestoneTaskTemplate {
  id: ProjectMilestoneTemplateId
  name: string
  description: string
  sourceSheet: string
  rows: ProjectTemplateRow[]
}

export interface ProjectTemplateResolution {
  templateId: ProjectMilestoneTemplateId
  reason: string
}

export const PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS = {
  pocNewTenantPreferred: 'POC with Grid A only or Grid A plus Grid B selects POC Template #1.',
  pocChangeOnly: 'POC with Grid B only selects POC Template #2.',
  mixedDeliveryHosting: 'Any on-prem/hybrid new tenant requirement selects the on-prem/hybrid delivery template.',
  deliveryUpsellChangeOnly: 'Delivery upsell with change requests and no new tenant requirements selects the change-request-only template.',
  renewalChangeOnly: 'Renewal upsell/down sell without new tenant requirements selects the renewal change-only template.',
  mixedRenewalHosting: 'Any on-prem/hybrid new tenant requirement in renewal upsell selects the on-prem/hybrid renewal template.',
} as const

export const PROJECT_MILESTONE_TASK_TEMPLATES: Record<ProjectMilestoneTemplateId, ProjectMilestoneTaskTemplate> = {
  "1": {
    "id": "1",
    "name": "POC - New Tenant or New Tenant plus Change Request",
    "description": "POC with Grid A only or Grid A plus Grid B",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying start and end date are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System(s) assigned",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System is ON",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System(s) is ready for installation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "DB Deletion & Creation (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Creating End User License document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Configuring Tangles",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Users creation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running sanity tests",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Going over check list and save file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running ATP",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Saving ATP report file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Saving system configuration files",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Clean activity log",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Project documents",
        "task": "Project - Upload end user license document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Project documents",
        "task": "Project - Upload Lynx extension settings (when exists)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "End of POC",
        "task": "POC completed",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "2": {
    "id": "2",
    "name": "POC - Change Request only",
    "description": "POC with Grid B only",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying start and end date are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "End of POC",
        "task": "POC completed",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "3": {
    "id": "3",
    "name": "Delivery New/Upsell - Cloud",
    "description": "Delivery New or Upsell with new tenant requirements and all Cloud hosting",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System(s) assigned",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System is ON",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment assignment",
        "task": "System(s) is ready for installation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Setting system time zone",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Setting recovery policy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Site 24x7 - Activate Alerts",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "DB Deletion & Creation (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Creating End User License document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Configuring Tangles",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Users creation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running sanity tests",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Going over check list and save file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Running ATP",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Saving ATP report file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Saving system configuration files",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Factory installation",
        "task": "Clean activity log",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Project documents",
        "task": "Project - Upload end user license document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Project documents",
        "task": "Project - Upload Lynx extension settings (when exists)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Features obligations",
        "task": "Feature1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Features obligations",
        "task": "Feature 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Features obligations",
        "task": "Feature 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "R&D open issues",
        "task": "Issue 1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "R&D open issues",
        "task": "Issue 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "R&D open issues",
        "task": "Issue 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Access control",
        "task": "System -Update VPN type",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Access control",
        "task": "System - update IP restriction",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Access control",
        "task": "System - Update External interface",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Sending End User License",
        "task": "Ask for warranty dates",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Sending End User License",
        "task": "Ask for Freshdesk account(s) details",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "4": {
    "id": "4",
    "name": "Delivery New/Upsell - On-prem/Hybrid",
    "description": "Delivery New or Upsell with at least one Server/on-prem/hybrid new tenant requirement",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Sending Deployment Prepare New Environment request",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Hardware readiness",
        "task": "Server and firewall were ordered",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Hardware readiness",
        "task": "Server and firewall arrived",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Hardware readiness",
        "task": "Environment is ready to continue with delivery process",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Site preparations",
        "task": "Sending SOW to customer or Sales manager",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Environment assignment",
        "task": "System(s) assigned",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Environment assignment",
        "task": "System is ON",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Environment assignment",
        "task": "System(s) is ready for installation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Setting system time zone",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Setting recovery policy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Site 24x7 - Activate Alerts",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "DB Deletion & Creation (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Creating End User License document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Configuring Tangles",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Users creation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Running sanity tests",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Going over check list and save file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Running ATP",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Saving ATP report file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Saving system configuration files",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Clean activity log",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Factory installation",
        "task": "Getting FW settings documents",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory Version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory Version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory Version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory Version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Project documents",
        "task": "Project - Upload end user license document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Project documents",
        "task": "Project - Upload Lynx extension settings (when exists)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Project documents",
        "task": "Project - Upload FW settings file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Validating addressee details (address, contact etc.)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Preparing packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Preparing commercial invoice",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Validating MSDS and Safty material documents",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Validating hipping method (door-to-door vs. door-to-airport)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Ordering and coordination shipping with shipping agency",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Verifying packing list content in server package",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Server package(s) are silled with battery label",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Server package(s) are silled with consignee detatils label",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Server is ready for pickup",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Receiving AWB and tracking number from shipping agnecy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Printing AWB and commercial invoice and packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Equipment was picked up",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Sending customer/sales AWB, Commercial invoice and packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Update/validate with customer upon system arrival",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Shipment",
        "task": "Schedule with customer and deployment installation date and time",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "System - Update VPN connetivity details",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Verifing deployment has connectivity with the system",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Installing infrastructure (if needed)",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Veirying system configuration",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Running sanity tests",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Going over check list and save file",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Running ATP",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Saving ATP report file",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Saving system configuration files",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "On site installation",
        "task": "Clean activity log",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Access control",
        "task": "System -Update VPN type",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Access control",
        "task": "System - update IP restriction",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Access control",
        "task": "System - Update External interface",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Features obligations",
        "task": "Feature1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Features obligations",
        "task": "Feature 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Features obligations",
        "task": "Feature 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "R&D open issues",
        "task": "Issue 1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "R&D open issues",
        "task": "Issue 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "R&D open issues",
        "task": "Issue 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 15,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 15,
        "milestone": "Sending End User License",
        "task": "Sending FW settings to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 16,
        "milestone": "SAT",
        "task": "SAT execution",
        "department": "Sales",
        "resource": "<Opportunity owner>"
      },
      {
        "milestoneOrder": 16,
        "milestone": "SAT",
        "task": "Ask for warranty dates",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 16,
        "milestone": "SAT",
        "task": "Ask for Freshdesk account(s) details",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "5": {
    "id": "5",
    "name": "Delivery Upsell - Change Request only",
    "description": "Delivery Upsell with Grid B only",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 1,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "6": {
    "id": "6",
    "name": "Renewal Standard",
    "description": "Renewal Standard with warranty extension requirements",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "License renewal",
        "task": "License renewed",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "7": {
    "id": "7",
    "name": "Renewal Upsell/Down Sell - Change Request only",
    "description": "Renewal Upsell or Down Sell with Grid B and Grid C only",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "License renewal",
        "task": "License renewed",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "8": {
    "id": "8",
    "name": "Renewal Upsell - Cloud New Tenant",
    "description": "Renewal Upsell with new tenant requirements and all Cloud hosting",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "License renewal",
        "task": "License renewed",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Environment assignment",
        "task": "System(s) assigned",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Environment assignment",
        "task": "System is ON",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Environment assignment",
        "task": "System(s) is ready for installation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Setting system time zone",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Setting recovery policy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Site 24x7 - Activate Alerts",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "DB Deletion & Creation (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Creating End User License document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Configuring Tangles",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Users creation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Running sanity tests",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Going over check list and save file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Running ATP",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Saving ATP report file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Saving system configuration files",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Factory installation",
        "task": "Clean activity log",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Project documents",
        "task": "Project - Upload end user license document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Project documents",
        "task": "Project - Upload Lynx extension settings (when exists)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Features obligations",
        "task": "Feature1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Features obligations",
        "task": "Feature 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Features obligations",
        "task": "Feature 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "R&D open issues",
        "task": "Issue 1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "R&D open issues",
        "task": "Issue 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "R&D open issues",
        "task": "Issue 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Access control",
        "task": "System -Update VPN type",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Access control",
        "task": "System - update IP restriction",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "Access control",
        "task": "System - Update External interface",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Sending End User License",
        "task": "Ask for warranty dates",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "Sending End User License",
        "task": "Ask for Freshdesk account(s) details",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  },
  "9": {
    "id": "9",
    "name": "Renewal Upsell - On-prem/Hybrid New Tenant",
    "description": "Renewal Upsell with at least one Server/on-prem/hybrid new tenant requirement",
    "sourceSheet": "Milestones and Tasks Template",
    "rows": [
      {
        "milestoneOrder": 1,
        "milestone": "License renewal",
        "task": "License renewed",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment configuration",
        "task": "Verifying system requirments are clear",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 2,
        "milestone": "Environment configuration",
        "task": "Sending Deployment Prepare New Environment request",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Hardware readiness",
        "task": "Server and firewall were ordered",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Hardware readiness",
        "task": "Server and firewall arrived",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 3,
        "milestone": "Hardware readiness",
        "task": "Environment is ready to continue with delivery process",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 4,
        "milestone": "Site preparations",
        "task": "Sending SOW to customer or Sales manager",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Environment assignment",
        "task": "System(s) assigned",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Environment assignment",
        "task": "System is ON",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 5,
        "milestone": "Environment assignment",
        "task": "System(s) is ready for installation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Setting system time zone",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Setting recovery policy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Site 24x7 - Activate Alerts",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "DB Deletion & Creation (if needed)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Creating End User License document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Configuring Tangles",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Users creation",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Running sanity tests",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Going over check list and save file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Running ATP",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Saving ATP report file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Saving system configuration files",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Clean activity log",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 6,
        "milestone": "Factory installation",
        "task": "Getting FW settings documents",
        "department": "Deployment",
        "resource": "Roman"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 7,
        "milestone": "Factory Version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Factory Project documents",
        "task": "Project - Upload end user license document",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Factory Project documents",
        "task": "Project - Upload Lynx extension settings (when exists)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 8,
        "milestone": "Factory Project documents",
        "task": "Project - Upload FW settings file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Validating addressee details (address, contact etc.)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Preparing packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Preparing commercial invoice",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Validating MSDS and Safty material documents",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Validating hipping method (door-to-door vs. door-to-airport)",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Ordering and coordination shipping with shipping agency",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Verifying packing list content in server package",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Server package(s) are silled with battery label",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Server package(s) are silled with consignee detatils label",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Server is ready for pickup",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Receiving AWB and tracking number from shipping agnecy",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Printing AWB and commercial invoice and packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Equipment was picked up",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Sending customer/sales AWB, Commercial invoice and packing list",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Update/validate with customer upon system arrival",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 9,
        "milestone": "Shipment",
        "task": "Schedule with customer and deployment installation date and time",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "System - Update VPN connetivity details",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Verifing deployment has connectivity with the system",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Installing infrastructure (if needed)",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Running software upgrade  (if needed)",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Veirying system configuration",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Running sanity tests",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Going over check list and save file",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Running ATP",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Saving ATP report file",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Saving system configuration files",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 10,
        "milestone": "On site installation",
        "task": "Clean activity log",
        "department": "Project",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "On site version update",
        "task": "System - Update software version number and build",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "On site version update",
        "task": "System - Upload ATP report  file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "On site version update",
        "task": "System - Upload check list file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 11,
        "milestone": "On site version update",
        "task": "System - Upload configuration file",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Access control",
        "task": "System -Update VPN type",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Access control",
        "task": "System - update IP restriction",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 12,
        "milestone": "Access control",
        "task": "System - Update External interface",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Configuration changes",
        "task": "Activity 1",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Configuration changes",
        "task": "Activity 2",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 13,
        "milestone": "Configuration changes",
        "task": "Activity 3",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "Features obligations",
        "task": "Feature1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "Features obligations",
        "task": "Feature 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 14,
        "milestone": "Features obligations",
        "task": "Feature 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 15,
        "milestone": "R&D open issues",
        "task": "Issue 1",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 15,
        "milestone": "R&D open issues",
        "task": "Issue 2",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 15,
        "milestone": "R&D open issues",
        "task": "Issue 3",
        "department": "R&D",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 16,
        "milestone": "Sending End User License",
        "task": "Sending End User License to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 16,
        "milestone": "Sending End User License",
        "task": "Sending FW settings to customer/sales",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 17,
        "milestone": "SAT",
        "task": "SAT execution",
        "department": "Sales",
        "resource": "<Opportunity owner>"
      },
      {
        "milestoneOrder": 17,
        "milestone": "SAT",
        "task": "Ask for warranty dates",
        "department": "Projects",
        "resource": "Moshe"
      },
      {
        "milestoneOrder": 17,
        "milestone": "SAT",
        "task": "Ask for Freshdesk account(s) details",
        "department": "Projects",
        "resource": "Moshe"
      }
    ]
  }
} as Record<ProjectMilestoneTemplateId, ProjectMilestoneTaskTemplate>

function hasServerHostedNewTenant(opportunity: Opportunity | undefined): boolean {
  return Boolean(opportunity?.newTenantRequirements?.some((requirement) => isServerHosting(requirement.hostingType)))
}

function hasNewTenant(opportunity: Opportunity | undefined): boolean {
  return Boolean(opportunity?.newTenantRequirements?.length)
}

function hasChangeRequest(opportunity: Opportunity | undefined): boolean {
  return Boolean(opportunity?.changeRequestRequirements?.length)
}

export function resolveProjectMilestoneTemplate(project: Project, opportunity: Opportunity | undefined): ProjectTemplateResolution {
  const serverHostedNewTenant = hasServerHostedNewTenant(opportunity)
  const includesNewTenant = hasNewTenant(opportunity)
  const includesChangeRequest = hasChangeRequest(opportunity)

  if (project.mainType === 'POC') {
    return includesChangeRequest && !includesNewTenant
      ? { templateId: '2', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.pocChangeOnly }
      : { templateId: '1', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.pocNewTenantPreferred }
  }

  if (project.mainType === 'DELIVERY') {
    if (project.subType === 'UPSELL' && includesChangeRequest && !includesNewTenant) {
      return { templateId: '5', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.deliveryUpsellChangeOnly }
    }
    return serverHostedNewTenant
      ? { templateId: '4', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.mixedDeliveryHosting }
      : { templateId: '3', reason: 'Delivery new tenant flow defaults to Cloud template' }
  }

  if (project.mainType === 'RENEWAL') {
    if (project.subType === 'STANDARD') return { templateId: '6', reason: 'Renewal standard' }
    if (project.subType === 'DOWN_SELL') return { templateId: '7', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.renewalChangeOnly }
    if (!includesNewTenant) return { templateId: '7', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.renewalChangeOnly }
    return serverHostedNewTenant
      ? { templateId: '9', reason: PROJECT_TEMPLATE_RESOLVER_ASSUMPTIONS.mixedRenewalHosting }
      : { templateId: '8', reason: 'Renewal upsell with cloud new tenant requirements' }
  }

  return { templateId: '3', reason: 'Default delivery template' }
}

export function buildProjectMilestonesAndTasks(templateId: ProjectMilestoneTemplateId): { milestones: ProjectMilestone[]; tasks: ProjectTask[] } {
  const template = PROJECT_MILESTONE_TASK_TEMPLATES[templateId]
  const milestoneMap = new Map<string, ProjectMilestone>()
  const tasks: ProjectTask[] = []

  template.rows.forEach((row, index) => {
    const milestoneId = `${templateId}-milestone-${row.milestoneOrder}-${row.milestone.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    if (!milestoneMap.has(milestoneId)) {
      milestoneMap.set(milestoneId, {
        id: milestoneId,
        name: row.milestone,
        order: row.milestoneOrder,
        status: 'OPEN',
        deadline: null,
        comment: '',
      })
    }
    tasks.push({
      id: `${templateId}-task-${index + 1}`,
      milestoneId,
      name: row.task,
      department: row.department,
      resource: row.resource,
      status: 'OPEN',
      order: index + 1,
      deadline: null,
      comment: '',
    })
  })

  return {
    milestones: Array.from(milestoneMap.values()).sort((first, second) => first.order - second.order),
    tasks,
  }
}

export function projectMilestonePlanMatchesTemplate(project: Project, templateId: ProjectMilestoneTemplateId): boolean {
  const templateData = buildProjectMilestonesAndTasks(templateId)
  const milestones = [...(project.milestones ?? [])].sort((first, second) => first.order - second.order)
  const tasks = [...(project.tasks ?? [])].sort((first, second) => first.order - second.order)
  if (milestones.length !== templateData.milestones.length || tasks.length !== templateData.tasks.length) return false
  return templateData.milestones.every((expected, index) => {
    const actual = milestones[index]
    return actual?.order === expected.order && actual.name === expected.name
  }) && templateData.tasks.every((expected, index) => {
    const actual = tasks[index]
    return actual?.name === expected.name &&
      actual.department === expected.department &&
      actual.resource === expected.resource
  })
}
