# Project Workspace Product Design Specification

## 1. Workspace Purpose

Project Workspace is the Delivery-owned working environment for executing a customer delivery project.

It gives Delivery Managers and Delivery Specialists one place to manage:

- Delivery status
- Delivery planning
- Project health
- Milestones
- Tasks
- Allocated systems
- Delivered tenants
- Requirement coverage context
- Documents
- Activity

Project Workspace is not a Sales workspace. It may show Customer and Opportunity context read-only, but it does not own commercial lifecycle or customer master data.

## 2. Business Ownership

Project is owned by Delivery.

Primary users:

- Delivery Manager
- Delivery Specialist

Read-only/cross-console users:

- Sales Manager
- Customer Success
- ERP Administrator

Ownership rules:

- ProjectLifecycle owns project delivery status, health, progress, and project read models.
- MilestonePlan owns milestone/task status, ordering, progress, deadlines, and deadline alerts.
- AllocationContext owns allocation relationships.
- SystemInventory owns system facts and operational status.
- TenantOperations owns tenant facts and operational status.
- WarrantyCollection owns warranty facts and warranty status.
- RequirementCoverage owns requirement coverage status and missing steps.
- CustomerAccount owns customer facts and aggregation.
- OpportunityLifecycle owns opportunity facts and commercial lifecycle.

## 3. Workspace Responsibilities

Project Workspace is responsible for rendering and coordinating Project execution UI.

It should:

- Display Project identity and delivery profile.
- Show read-only Customer and Opportunity context.
- Show Project health and delivery alerts from ProjectLifecycle.
- Allow supported Project execution edits.
- Allow milestone/task management through MilestonePlan.
- Coordinate supported system allocation/deallocation workflows.
- Display systems in Project context.
- Display tenants in Project context.
- Display Requirement Coverage read-only.
- Display Warranty context read-only where relevant.
- Display Project documents where supported.
- Display Project activity where supported.

It should not:

- Calculate delivery health in page code.
- Calculate milestone/task progress in page code.
- Calculate warranty status.
- Calculate requirement coverage.
- Calculate system/tenant operational status.
- Edit Customer or Opportunity master data.
- Introduce new workflows not already supported.

## 4. Objects Referenced

Owned object:

- Project

Referenced objects:

- Customer / Account
- Opportunity
- Requirement definitions
- Requirement Coverage
- Milestones
- Tasks
- Systems
- Tenants
- Warranties
- Allocations
- Documents
- Activity Events

## 5. Complete Page Hierarchy

```text
Delivery Console
  -> Project Workspace
    -> Header
    -> Toolbar
    -> Tabs
      -> Overview
        -> Delivery Health Section
        -> Needs Attention Section
        -> Planning Summary Section
        -> Execution Summary Section
      -> Requirements
        -> Requirement Coverage Summary
        -> Requirement Coverage Table
        -> Read-only Opportunity Requirement Grids
      -> Milestones
        -> Milestone Table
        -> Milestone Detail/Edit Dialogs
      -> Tasks
        -> Task Table
        -> Task Bulk Actions
      -> Systems
        -> Systems Summary
        -> Systems Table
        -> Allocation Dialog
      -> Tenants
        -> Tenants Summary
        -> Under Contract Tenants
        -> Out of Contract Tenants
      -> Documents
        -> Project Documents
      -> Activity
        -> Activity Timeline
```

No third-level sidebar navigation should be introduced. Systems and Tenants are independent Project Workspace tabs because they are separate Delivery Business Objects coordinated by Project Workspace.

## 6. Header Design

Header should show:

- Project name
- PID
- Project type
- Project subtype
- Delivery status
- Project health status
- Customer / Account link
- Opportunity link
- Owner
- Delivery date
- POC start/end dates when relevant

Header principles:

- PID uses BusinessObjectLink / BusinessIdLink.
- Customer and Opportunity are read-only links.
- Status display uses Status & Visual State Engine.
- Header must remain stable and readable during scrolling.

## 7. Toolbar / Actions

V1-safe toolbar actions:

- Save
- Apply Changes
- Cancel
- Revert
- Undo, where supported
- Back to Projects
- Project-level actions already supported by current workflows

Supported execution actions may include:

- Allocate system
- Deallocate system
- Link existing system
- Manage milestones/tasks
- Add/edit supported project documents

Toolbar must not add:

- Customer edit
- Opportunity edit
- Warranty redesign actions
- Requirement creation actions
- New workflow actions
- Permission-management actions

## 8. Navigation Model

Route should remain stable for existing Project Workspace route.

Navigation behavior:

- Project dashboard rows open Project Workspace.
- PID links resolve through Business Reference Resolver.
- Related Customer / Opportunity / System / Tenant links use shared Business Object Links.
- Missing/stale references display safely.
- Tabs are internal workspace navigation only.

Tabs represent views of Project, not sidebar workspaces.

## Delivery Specialist Daily Workflow

The approved Delivery Specialist daily workflow is:

```text
Project Dashboard
  -> Prioritize Projects
  -> Open Project
  -> Review Requirements
  -> Allocate System
  -> Open System Workspace
  -> Configure the allocated System according to the System-owned Application Configuration Summary
  -> Return to Project
  -> Create / Update Tenant
  -> Update Warranty
  -> Continue updating Project Tasks until delivery completion
```

Workflow clarifications:

- Project Dashboard is the operational entry point for Delivery Specialists.
- Requirements drive delivery execution.
- Systems tab manages allocation context.
- System Workspace owns the Application Configuration Summary used for physical/system configuration.
- Tenants tab manages delivered runtime context.
- Warranty follow-up happens after tenant delivery context exists.
- Tasks are continuously updated throughout delivery.
- Project coordinates this workflow but does not own System, Tenant, Warranty, or Requirement Coverage business rules.

## 9. Sections

Recommended V1 sections:

- Project Header / Delivery Profile
- Delivery Health
- Needs Attention
- Planning Dates
- Current Milestone
- Last Completed Milestone
- Task Summary
- Requirement Coverage
- Systems
- Tenants
- Milestones
- Tasks
- Documents
- Activity

## 10. Cards

Overview cards should be read-model driven:

- Health Status
- Completion %
- Current Milestone
- Last Completed Milestone
- Open Tasks
- Completed Tasks
- Overdue Tasks
- Overdue Milestones
- Systems Allocated
- Tenants Allocated
- Requirement Coverage
- Missing System
- Missing Tenant
- Deadline Risk

Systems tab cards:

- Linked Systems
- Production Systems
- Reused/Internal Systems
- Allocation Status

Tenants tab cards:

- Linked Tenants
- Customer Tenants
- POC Tenants
- Tenant Status

Cards must consume owning-domain values and not recalculate them.

## 11. Tabs

V1 tabs:

1. Overview
2. Requirements
3. Milestones
4. Tasks
5. Systems
6. Tenants
7. Documents
8. Activity

Tab ownership:

- Overview: Project read model composition
- Requirements: RequirementCoverage read-only context plus Opportunity requirement intent context
- Milestones: MilestonePlan execution
- Tasks: MilestonePlan execution
- Systems: Allocation/System context
- Tenants: Tenant/Warranty context
- Documents: DocumentCollection
- Activity: ActivityLog

## 12. Fields

Project-owned editable fields, where already supported:

- Project name
- Delivery status
- Delivery date
- POC start date
- POC end date
- Owner
- Project type/subtype only if existing workflow supports editing
- Project comments/notes where modeled

Read-only fields:

- PID
- Customer
- Opportunity
- Requirement coverage status
- System operational status
- Tenant operational status
- Warranty status
- Activity events
- Derived health/progress fields

Milestone/task fields:

- Order
- Status
- Deadline
- DL Alert
- Comment
- Progress
- First/current/last derivations where applicable

## 13. Related Business Objects

Project Workspace should expose related objects as links/context:

- Customer: read-only Sales-owned context
- Opportunity: read-only Sales-owned context
- Requirement Coverage: read-only Delivery traceability
- Systems: Delivery-owned supporting objects
- Tenants: Delivery-owned supporting objects
- Warranty: Delivery-owned warranty context
- Documents: Project-context attachments
- Activity: Project-context timeline

## 14. Business Rules

- Project owns delivery execution.
- Project owns delivery status and health through ProjectLifecycle.
- Milestone/task execution belongs to MilestonePlan.
- Requirement Coverage must not be recalculated in Project page.
- Warranty status must not be recalculated in Project page.
- System/Tenant status must not be recalculated in Project page.
- Customer and Opportunity are read-only context.
- Allocation actions must use AllocationContext/SystemInventory rules.
- Tenant actions must use TenantOperations rules.
- Project Workspace must use shared reference links for IDs.
- Project Workspace must use shared status presentation.

## 15. Validation Rules

Project validation should come from ProjectLifecycle and supporting domains.

Possible validations:

- PID exists and is unique.
- Project name required if required by current model.
- Project type/subtype valid.
- Delivery date valid.
- POC dates valid for POC projects.
- POC end date not before POC start date.
- Project status valid.
- Opportunity reference valid.
- Customer context resolvable.
- Milestone/task order normalized by MilestonePlan.
- Milestone/task deadlines valid.
- Allocation action validation owned by AllocationContext/SystemInventory.
- Tenant action validation owned by TenantOperations.

No page-level duplicate validation.

## 16. Permissions

V1 permission principles:

- Delivery Manager: full Project execution access.
- Delivery Specialist: operational execution access based on future privileges.
- Sales Manager / Customer Success: read-only Project context unless explicitly authorized.
- ERP Administrator: governance/admin access.

No new permissions logic in this PDS.

## 17. Lifecycle States

Project lifecycle states currently modeled:

- Open
- Done

Project health states:

- Healthy
- Warning
- At Risk
- Blocked only with explicit blocker data
- Completed

Milestone/task states:

- Open
- Done
- Blocked only if already modeled

No new lifecycle states are introduced.

## 18. Status Behavior

All visual status behavior must use Status & Visual State Engine.

Project Workspace may display:

- Project status from ProjectLifecycle
- Project health from ProjectLifecycle
- Milestone/task status from MilestonePlan
- Deadline risk from ProjectLifecycle/MilestonePlan
- System operational status from SystemInventory
- Tenant operational status from TenantOperations
- Warranty status from WarrantyCollection
- Requirement coverage status from RequirementCoverage
- Activity severity from ActivityLog

No page-owned icons/colors/badges.

## 19. Activity Integration

If ActivityLog is available:

- Add Activity tab.
- Use `activityEventsForProject`.
- Show read-only timeline.
- Include project-related allocation/tenant/system events.
- Sort most recent first.
- Do not emit events from Project page.

## 20. Audit Integration

Audit expectations:

- Project created/updated
- Project status changed
- Project dates changed
- System allocated/deallocated
- Tenant created/moved/deleted
- Milestone/task changes, when event emission exists
- Document changes, when event emission exists

Audit is append-only and owned by ActivityLog/store transaction boundaries.

## 21. Search / Filter / Sort Behavior

Within Project Workspace:

- Milestones sortable by order/status/deadline.
- Tasks sortable/filterable by milestone/status/deadline.
- Systems filterable by allocation type/status/product.
- Tenants filterable by contract status/system/environment/status.
- Requirements filterable by coverage status/missing step.
- Activity filterable by category/severity if already supported.

No saved-view/dashboard behavior required inside Project Workspace unless already present.

## 22. Future Extension Points

Future V1 or later extensions:

- Project Alerts workspace/dashboard.
- Delivery SLA rules.
- Resource/staffing assignment.
- Project approval workflow.
- Advanced document governance.
- Milestone/task Activity emission.
- Project timeline visualization.
- Project portfolio analytics.
- Delivery manager workload views.
- Project-level security/privilege enforcement.

These are not part of this PDS implementation scope unless separately approved.

## 23. Explicit Version 2.0 Exclusions

Do not include in V1:

- Configurable Project schema.
- Configurable Project Workspace layout.
- Configurable tabs.
- Configurable lifecycle/state designer.
- Configurable milestone/task workflow designer.
- Configurable validation engine.
- Configurable health rules.
- Configurable alert designer.
- Configurable permission designer.
- Generic workflow engine.
- External project-management integrations.
- Generic configurable ERP platform behavior.
