# Project Business Object Specification

## 1. Business Object Name

Project

## 2. Business Purpose

Project represents the Delivery-owned execution container for delivering, renewing, changing, or proving a customer solution.

Project is the central orchestration Business Object of the Delivery Capability. It coordinates delivery execution, milestones, tasks, allocation context, linked systems, linked tenants, requirement fulfillment context, documents, and activity.

Project may originate from Opportunity intent, but once created it belongs to Delivery execution.

## 3. Business Ownership

Project is Delivery-owned.

Delivery Manager and Delivery Specialist own project execution activities. Sales may reference Project context, but does not own Project execution.

## 4. Primary Capability

Delivery Capability -> Project Delivery Management

Supporting capabilities referenced:

- Sales Capability -> Opportunity Management
- Delivery Capability -> Systems Management
- Delivery Capability -> Tenant Operations
- Delivery Capability -> Warranty Management
- Delivery Capability -> Requirement Coverage
- Administration Capability -> Activity / Audit

## 5. Console Ownership

Delivery Console

## 6. Workspace Ownership

Project Workspace

The Project Workspace is the primary working environment for Delivery Managers and Delivery Specialists.

It may display Sales-owned Opportunity context and Customer context read-only, but Project Workspace owns only Project execution behavior.

## 7. Data Ownership

Project owns delivery execution state and planning context.

Project owns:

- Project identity
- Delivery lifecycle
- Delivery status
- Project type/subtype as delivery execution classification
- Delivery planning dates
- POC project dates where the project itself represents POC execution
- Delivery timeline
- Project health read model
- Delivery alerts derived from Project/Milestone/Allocation facts
- Project milestone/task execution context through MilestonePlan
- Project-level document/activity context
- Project-to-system allocation orchestration
- Project-to-tenant delivery context
- Delivery progress

Project does not own System, Tenant, Warranty, Customer, Opportunity, or Requirement Coverage business rules.

## 8. Fields Owned

Exact field names should follow the existing seed/model types.

Project-owned fields include:

- `id`
- `pid`
- `projectName`
- `mainType`
- `subType`
- `progressStatus`
- `deliveryDate`
- `pocStartDate`
- `pocEndDate`
- `owner`
- `createdAt`
- `updatedAt`
- Project milestone plan reference / embedded milestone data where currently modeled
- Project task data where currently modeled through milestones
- Project document references where currently modeled
- Project activity context references where currently modeled

Project-owned derived/read-model fields include:

- Project health status
- Project health label
- Project health alerts
- Completion percent
- Current milestone
- Last completed milestone
- Open task count
- Completed task count
- Overdue task count
- Overdue milestone count
- Upcoming deadline counts
- Next deadline
- Deadline risk status
- Delivery date status
- Missing systems flag
- Missing tenants flag
- Active system count
- Active tenant count
- Project alerts

## 9. Referenced Fields

Customer / Account fields:

- Account code
- Account name
- Account manager
- Region
- Country
- Customer type

Opportunity fields:

- Opportunity ID
- Opportunity name
- Stage
- Type
- Subtype
- Commercial/POC intent
- Requirement definitions
- Delivery intent dates

Requirement fields:

- Requirement ID
- Requirement type/grid
- Product/configuration intent
- Hosting/configuration intent

Requirement Coverage fields:

- Coverage status
- Missing step
- Coverage alerts
- Coverage summary counts

System fields:

- SID/MID
- Product
- Hosting
- Cloud platform
- Operational status
- Allocation type
- Configuration fields

Tenant fields:

- TID
- Tenant name
- Operational status
- Environment
- Source requirement ID
- Warranty header status
- Configuration fields

Warranty fields:

- Warranty ID
- Warranty row status
- Tenant warranty header status
- Start/end dates
- Renewal/no-warranty context

Activity fields:

- Event summary
- Category
- Severity
- Occurred at
- Related objects

Document fields:

- File name
- Parent object
- File metadata

## 10. Relationships

- Project belongs to one Opportunity where created from Opportunity intent.
- Project is associated with one Customer, usually derived through Opportunity/account context.
- Project has many Milestones.
- Milestone has many Tasks.
- Project may have many allocated Systems through AllocationContext.
- Project may have many linked/delivered Tenants through TenantOperations and project/tenant links.
- Project may reference Requirement Coverage rows derived from Opportunity requirements and Delivery fulfillment.
- Project may display Warranty context through linked Tenants, but WarrantyCollection owns warranty behavior.
- Project may have Documents.
- Project may have Activity Events.
- Project may be referenced from Customer Workspace, Opportunity Workspace, Requirement Coverage, Warranty, Renewal Work Queue, Systems Workspace, Tenant Workspace, and Activity / Audit Log.

## 11. Lifecycle

ProjectLifecycle owns the Project lifecycle.

Approved V1 project execution states include current modeled states such as:

- Open
- Done

Project health states are derived read-model states, not manual lifecycle states:

- Healthy
- Warning
- At Risk
- Blocked, only if explicit blocker data exists
- Completed

Project lifecycle must not infer unapproved states or introduce new workflow stages without explicit approval.

## 12. Business Rules

- Project is Delivery-owned.
- Project owns delivery execution and delivery lifecycle.
- Project may coordinate Systems, Tenants, Milestones, Tasks, Requirement Coverage context, Warranty context, Documents, and Activity.
- Project must not duplicate SystemInventory rules.
- Project must not duplicate TenantOperations rules.
- Project must not duplicate WarrantyCollection rules.
- Project must not duplicate RequirementCoverage rules.
- Project must not duplicate CustomerAccount rules.
- Project must not duplicate OpportunityLifecycle rules.
- Project health is owned by ProjectLifecycle.
- Milestone/task progress and deadline facts are owned by MilestonePlan.
- Allocation relationship semantics are owned by AllocationContext.
- System facts are owned by SystemInventory.
- Tenant facts are owned by TenantOperations.
- Warranty facts are owned by WarrantyCollection.
- Requirement coverage facts are owned by RequirementCoverage.
- CustomerAccount aggregates only and does not own Project execution.
- Opportunity may trigger Project creation/update through approved store/domain behavior, but does not own execution.

## 13. Validation Rules

ProjectLifecycle-owned validations may include:

- PID is required and unique.
- Project name is required where business process requires it.
- Project type/subtype must be valid.
- Delivery date must be valid when present.
- POC start/end dates must be valid for POC projects.
- POC end date should not precede POC start date.
- Project status must be valid.
- Opportunity reference must resolve when project is Opportunity-generated.
- Customer/account context must resolve where required.
- Project owner must resolve where modeled.
- Delivery project creation/update must preserve approved Opportunity handoff rules.

MilestonePlan-owned validations may include:

- Milestone order normalization.
- Task order normalization.
- Milestone/task status validity.
- Deadline validity.
- Required task/milestone fields where modeled.

AllocationContext-owned validations may include:

- Project/system allocation relationship validity.
- Prevent invalid duplicate allocations where applicable.
- Enforce allocation source semantics where approved.

No page-level validation duplication.

## 14. Actions Owned

Project-owned actions include:

- Create Project through approved Opportunity handoff or Delivery flow where supported.
- Edit Project delivery profile.
- Update Project delivery status.
- Update delivery dates.
- Edit POC project dates for POC projects.
- Manage project milestones.
- Manage project tasks.
- Reorder milestones/tasks where supported.
- Complete/reopen project tasks through MilestonePlan helpers.
- View delivery health.
- View project alerts.
- View linked systems.
- View linked tenants.
- View requirement coverage context.
- View documents.
- View activity.

Project Workspace may coordinate allocation UI, but AllocationContext/SystemInventory own allocation and system rules.

## 15. Actions Triggered But Executed Elsewhere

Project may trigger or coordinate:

- System allocation: executed by AllocationContext/SystemInventory.
- System deallocation: executed by AllocationContext/SystemInventory.
- Link existing system: executed by AllocationContext/SystemInventory.
- Tenant creation from requirement: executed by TenantOperations and store transaction boundary.
- Tenant movement/deletion from system: executed by TenantOperations/SystemInventory transaction boundary.
- Requirement coverage recalculation: executed by RequirementCoverage selectors/read models.
- Warranty context display: executed by WarrantyCollection read models.
- Activity event creation: executed by approved store transaction boundaries, not Project page code.
- Document actions: executed by DocumentCollection.

Project must not directly execute Opportunity commercial lifecycle changes.

## 16. Statuses Owned

ProjectLifecycle owns:

- Project delivery status.
- Project progress/completion read model.
- Project health status.
- Project health alerts.
- Delivery date status.
- Deadline risk integration at project health level, using MilestonePlan facts.
- Missing allocation health indicators, using AllocationContext facts.
- Missing tenant health indicators, using TenantOperations/RequirementCoverage summaries where approved.

MilestonePlan owns:

- Milestone status.
- Task status.
- Milestone/task completion math.
- Milestone/task deadline alert facts.

## 17. Statuses Displayed

Project Workspace may display, read-only from owning domains:

- Opportunity stage/type/subtype from OpportunityLifecycle.
- Customer/account identity from CustomerAccount.
- System operational status from SystemInventory.
- Tenant operational status from TenantOperations.
- Warranty row/header status from WarrantyCollection.
- Requirement Coverage status from RequirementCoverage.
- Activity severity/category from ActivityLog.
- Document metadata/status from DocumentCollection where present.

Project must not recalculate these statuses.

## 18. Events Emitted

Existing/future Project events may include:

- `project.created`
- `project.updated`
- `project.statusChanged`
- `project.deliveryDateChanged`
- `project.pocDatesChanged`
- `project.milestoneAdded`
- `project.milestoneUpdated`
- `project.milestoneCompleted`
- `project.taskAdded`
- `project.taskUpdated`
- `project.taskCompleted`
- `project.taskReopened`
- `project.systemAllocationRequested`
- `project.tenantCreationRequested`

Current V1 event emission may be partial.

Events must be emitted only from approved store/domain transaction boundaries, not React pages or selectors.

## 19. Events Consumed

Project Workspace may consume ActivityLog events where Project is primary or related object.

Examples:

- Project created.
- System allocated to project.
- System deallocated from project.
- Existing system linked.
- Tenant created from requirement.
- Tenant moved to system.
- Tenant deleted from system.
- Future milestone/task events.
- Future warranty events related to linked project/tenant.

ActivityLog owns event shape, selectors, and timeline presentation.

## 20. Core Services Used

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- ActivityLog
- DashboardView for Project dashboard saved views
- Persistence boundary
- Business Object Links
- Object Registry / Runtime where metadata-driven views are used

## 21. Shared Components Used

- BusinessObjectLink
- BusinessIdLink
- StatusBadge
- AlertStatusIcon
- ProgressBar
- ActivityTimeline
- RichTextEditor for comments/free-text fields
- Shared Configuration Renderer
- Shared Delivery Tables
- DataDashboard for Project dashboard
- FormField / read-only field components
- DocumentsPanel / document display components where relevant
- ClampedTableCellContent
- Shared dialog components where existing

## 22. Permission Principles

Delivery Manager can view and manage Project execution.

Delivery Specialist can view and execute assigned operational Project work according to future privilege mapping.

Sales Manager and Customer Success may view Project context from Sales workspaces, but do not own Project execution.

ERP Administrator may access governance/admin capabilities.

No new permission logic is defined by this BOS.

Permissions are future hooks unless explicitly implemented.

## 23. Audit / Activity Expectations

Project-related activity should be visible in Project Workspace and Activity / Audit Log.

Audit/activity should include:

- Project created.
- Project updated.
- Project status changed.
- Project dates changed.
- Milestone/task changes.
- System allocation/deallocation.
- Existing system linked.
- Tenant created/moved/deleted in project context.
- Document actions.
- Future warranty/renewal execution events where related to project.

Project page code must not emit events directly.

## 24. Invariants

- Every Project has a stable ERP-generated PID.
- PID is not user-generated or page-generated.
- Project remains Delivery-owned.
- Project owns execution, not commercial opportunity lifecycle.
- Project may reference Opportunity but does not own Opportunity rules.
- Project may coordinate System/Tenant/Warranty context but does not own their rules.
- Project health is derived by ProjectLifecycle.
- Milestone/task progress is owned by MilestonePlan.
- Requirement Coverage status is owned by RequirementCoverage.
- Allocation semantics are owned by AllocationContext.
- Business object navigation uses Business Reference Resolver/shared links.
- Project Workspace renders owning-domain facts; it does not create page-local business calculations.

## 25. Explicit Non-Ownership Boundaries

Project does not own:

- Customer identity or commercial account profile.
- Opportunity commercial lifecycle.
- Opportunity requirement definition ownership.
- System operational state.
- System inventory rules.
- Tenant operational state.
- Tenant lifecycle rules.
- Warranty chains or warranty status.
- Requirement Coverage status/missing-step rules.
- Activity event taxonomy.
- Document behavior beyond project context.
- Dashboard saved view lifecycle.
- Admin metadata/picklists/templates, except consuming approved templates.

Project may coordinate and display these as context only.

## 26. Version 1.0 Scope

V1 includes:

- Project dashboard.
- Project Workspace.
- Project identity and delivery profile.
- Delivery dates and POC dates where modeled.
- Delivery status display.
- Project health read model.
- Delivery alerts using approved safe signals.
- Milestones and tasks.
- Milestone/task ordering, deadlines, comments, progress, and status.
- Systems/Tenants operational context.
- Allocation/deallocation behavior already supported.
- Requirement Coverage context.
- Documents where already supported.
- Activity timeline where already supported.
- Shared reference links and shared status presentation.
- Read-only Customer/Opportunity context.

V1 does not require new configurable workflow, configurable fields, configurable project lifecycle, advanced permissions, or new unapproved delivery workflows.

## 27. Version 2.0 Exclusions

Do not include in V1:

- Configurable Project schema.
- Configurable Project Workspace layout.
- Configurable project lifecycle builder.
- Configurable milestone/task workflow designer.
- Configurable project health rules.
- Configurable allocation workflow.
- Configurable delivery SLA engine.
- Configurable project approval workflows.
- Configurable privilege designer.
- Generic project object builder.
- External project-management integrations.
- Advanced resource planning engine.
- Advanced portfolio analytics engine beyond approved V1 dashboards/read models.
