# Delivery ERP Business Object Model V1.0

## Methodology Position

```text
Architecture Handbook
  -> Enterprise Capability Model (ECM)
  -> Business Object Model (BOM)
  -> Business Object Specification (BOS)
  -> Product Design Specification (PDS)
  -> Implementation
  -> Product Readiness Review (PRR)
```

The BOM is the authoritative business-domain map for the ERP. BOS documents define each object in detail. PDS documents define workspace/page implementation design.

## 1. Business Object Catalog

| Business Object | Owning Console | Owning Domain | Primary Responsibility | Current Status | Planned Version |
| --- | --- | --- | --- | --- | --- |
| Customer / Account | Sales | CustomerAccount | Commercial customer identity and portfolio aggregation | Implemented | V1 |
| Opportunity | Sales | OpportunityLifecycle | Commercial lifecycle and delivery intent | Implemented | V1 |
| Requirement | Sales origin, Delivery fulfillment | TenantRequirement | Requirement identity, metadata, and intent rows | Implemented | V1 |
| Project | Delivery | ProjectLifecycle | Central Delivery orchestration object for delivery execution | Implemented | V1 |
| Milestone | Delivery | MilestonePlan | Delivery milestone execution | Implemented | V1 |
| Task | Delivery | MilestonePlan | Delivery task execution | Implemented | V1 |
| System | Delivery | SystemInventory | Reusable Delivery infrastructure resource, application configuration summary, and operational readiness | Implemented | V1 |
| Production System Inventory Item | Delivery | SystemInventory | Systems Workspace production inventory view/tab | Implemented | V1 |
| Reused Internal System | Delivery | SystemInventory | Systems Workspace reused internal systems view/tab | Implemented | V1 |
| Tenant | Delivery | TenantOperations | Delivered customer tenant/environment | Implemented | V1 |
| Warranty | Delivery | WarrantyCollection | Warranty chain, status, renewal readiness | Implemented | V1 |
| Allocation | Delivery | AllocationContext | Project-system relationship | Implemented | V1 |
| Project Tenant Link | Delivery | TenantOperations / AllocationContext | Project-tenant relationship | Implemented | V1 |
| Document | Parent object context | DocumentCollection | Attached document metadata and behavior | Partial | V1 |
| Activity Event | Admin | ActivityLog | Audit/activity record | Implemented | V1 |
| Dashboard View | Admin infrastructure | DashboardView | Saved dashboard view lifecycle | Implemented | V1 |
| User | Admin | Future domain | ERP user identity | Missing | Future V1/Admin or V2 |
| Role | Admin | Future domain | Role grouping | Missing | Future V1/Admin or V2 |
| Privilege | Admin | Future domain | Permission control | Missing | Future V1/Admin or V2 |
| Picklist Option | Admin | Current config/storage | Configurable option values | Partial | V1 partial, V2 mature |
| Milestone Template | Admin | Config / MilestonePlan | Reusable delivery plan template | Partial | V1 partial |
| Task Template | Admin | Config / MilestonePlan | Reusable task template | Partial | Future |
| Product / Package Definition | Admin | Future domain | Commercial/product master data | Missing | V2 |
| Metadata Object | Admin | ObjectRegistry | ERP object metadata | Implemented as core metadata | V1 core, V2 expanded |

## 2. Read-Model / Validation Capabilities

These capabilities are not Business Objects. They do not own independent lifecycle, user-created identity, editable workflow, or master data. They validate, aggregate, or present facts owned by Business Objects and domains.

| Capability | Owning Console | Owning Domain | Responsibility | Current Status | Planned Version |
| --- | --- | --- | --- | --- | --- |
| Requirement Coverage | Delivery | RequirementCoverage | Delivery-owned validation/read-model capability that evaluates Opportunity-owned requirement definitions against Delivery fulfillment facts from ProjectLifecycle, AllocationContext, SystemInventory, and TenantOperations | Implemented | V1 |

Requirement Coverage owns coverage status, missing-step derivation, and coverage alerts as read-model outputs only. It does not own requirement definitions, Project execution, System allocation, Tenant creation, or any editable workflow.

## 3. Reusable Child Business Objects And System-Owned Child Structures

Reusable child Business Objects are scoped to a parent object instance but may be reused across multiple parent object types over time. They are not independent top-level workspaces in Version 1.0 unless explicitly approved.

| Child Structure | Ownership Model | Initial V1 Parent Scope | Responsibility | Current Status | Planned Version |
| --- | --- | --- | --- | --- | --- |
| Remark | Reusable child Business Object | System first | User-authored note/task/change record with generated identity, timestamp, author metadata, type, rich text content, due date, and deadline alert output | Planned | V1 |
| Owner / Responsible Contact | Reusable child Business Object/table | System first | Responsible people/contact rows associated with the parent object | Planned | V1 |
| System Configuration History | System-owned child history/read model | System only | Read-only System Application Configuration Summary snapshot history caused by approved configuration changes | Planned | V1 |

Remarks may later be reused under System, Project, Tenant, Opportunity, Customer, Warranty, or other parent objects. The Remark `author` / `created by` value is metadata of the Remark record and must not be confused with the Owner child table.

Owner / Responsible Contact may later be reused under System, Project, Tenant, Customer, or other parent objects. It represents responsible people or contacts related to the parent object; it does not replace user/role/privilege governance.

System Configuration History is not generic and is not Activity Log. It belongs to SystemInventory because it records System-owned Application Configuration Summary snapshots/history. Activity Log records that an event happened; Configuration History preserves the business configuration snapshot.

## 4. Business Object Hierarchy

```text
Customer / Account
  -> Opportunities
       -> Requirement definitions
       -> Deal package context
       -> Created / linked Projects
  -> Projects
       -> Milestones
            -> Tasks
       -> Allocations
            -> Systems
                 -> Tenants
       -> Project Tenant Links
       -> Documents
       -> Activity
  -> Systems
       -> Tenants
       -> Remarks
       -> Owner / Responsible Contacts
       -> Configuration History
       -> Documents
       -> Activity
  -> Tenants
       -> Warranties
       -> Documents
       -> Activity
  -> Requirement Coverage validation output
  -> Customer Documents / aggregated documents
  -> Customer Activity

Opportunity
  -> Requirements
  -> Project creation/update intent
  -> Related existing systems/tenants context

Project
  -> Milestones
  -> Tasks
  -> Allocated Systems
  -> Linked Tenants
  -> Future reusable Remarks / Owner child structures where approved
  -> Requirement Coverage validation output
  -> Documents
  -> Activity

Tenant
  -> Warranty records
  -> Operational status
  -> Future reusable Remarks / Owner child structures where approved
  -> Documents

Warranty
  -> Predecessor / successor chain
  -> Renewal candidate read models

Admin
  -> Activity Events
  -> Dashboard Views
  -> Metadata
  -> Picklists
  -> Templates
  -> Future users/roles/privileges
```

Hierarchy describes business relationship, not ownership transfer. Customer may aggregate projects/systems/tenants, but Delivery owns those objects. Project is the central Delivery orchestration Business Object: it owns delivery execution and composes delivery context, while consuming facts from MilestonePlan, AllocationContext, RequirementCoverage read models, SystemInventory, TenantOperations, and WarrantyCollection. System is the reusable Delivery Resource of the ERP: it owns infrastructure configuration, Application Configuration Summary, and operational readiness independently of current Project allocation. Reusable child structures such as Remarks and Owner tables remain scoped to their parent object instance and do not transfer parent ownership.

## 5. Relationship Matrix

| Object | Parent Objects | Child Objects | Referenced Objects | Referencing Objects |
| --- | --- | --- | --- | --- |
| Customer | None | Opportunities 1:N | Sales Manager 1:1 | Opportunities, Projects, Systems, Tenants |
| Opportunity | Customer N:1 | Requirements 1:N, Project intent 1:N | Customer, Sales Manager, existing Systems/Tenants | Projects, RequirementCoverage read models |
| Requirement | Opportunity N:1 | RequirementCoverage validation output | Product/config metadata, Tenant/System refs | Project, Tenant, RequirementCoverage read models |
| Project | Opportunity N:1, Customer N:1 derived | Milestones 1:N, Tasks through milestones, Allocations 1:N | Customer, Opportunity, Systems, Tenants, RequirementCoverage read models, Warranty context | Customer, Activity |
| Milestone | Project N:1 | Tasks 1:N | Project | Project health |
| Task | Milestone N:1 | None | Project/Milestone | Project health |
| System | Project N:N through Allocation | Tenants 1:N, Remarks 1:N, Owner rows 1:N, Configuration History 1:N | Customer, Product/config metadata | Project, Tenant, Customer |
| Production Inventory Item | Systems Workspace view/tab | Allocation target | Product/config metadata | Project allocation |
| Reused Internal System | Systems Workspace view/tab | Allocation target | Product/config metadata | POC Project allocation |
| Tenant | System N:1, Project N:N | Warranties 1:N | Customer, Project, Requirement, System | Customer, Project, Warranty |
| Warranty | Tenant N:1 | Successor warranties N:N chain | Project, Tenant | Warranty dashboard, Renewal queue |
| Allocation | Project N:1, System N:1 | None | Project, System | Project Workspace |
| Document | Parent object N:1 | None | Project/System/Tenant/future Customer | Parent workspace |
| Activity Event | None | None | Primary object, related objects | Timelines, audit dashboard |
| Dashboard View | Dashboard scope N:1 | View state | Dashboard rows/columns | Dashboards |
| User | Admin | None | Role | Future audit/permissions |
| Role | Admin | Privileges N:N | Users, Privileges | Future permissions |
| Privilege | Admin | None | Role | Future permissions |

## 6. Ownership Matrix

| Object | Business Owner | Console Owner | Domain Owner | Workspace Owner | May Modify | May Reference Only |
| --- | --- | --- | --- | --- | --- | --- |
| Customer | Sales | Sales | CustomerAccount | Customer Workspace | Sales-authorized users | Delivery, Admin |
| Opportunity | Sales | Sales | OpportunityLifecycle | Opportunity Workspace | Sales-authorized users | Delivery, Admin |
| Requirement | Sales intent / Delivery fulfillment | Sales origin | TenantRequirement | Opportunity Workspace | Opportunity Workspace | Project, Coverage |
| Project | Delivery | Delivery | ProjectLifecycle | Project Workspace | Delivery execution; consumes MilestonePlan, AllocationContext, RequirementCoverage read-model output, SystemInventory, TenantOperations, and WarrantyCollection facts | Sales, Admin |
| Milestone | Delivery | Delivery | MilestonePlan | Project Workspace | Delivery | Sales via read-only |
| Task | Delivery | Delivery | MilestonePlan | Project Workspace | Delivery | Sales via read-only |
| System | Delivery | Delivery | SystemInventory | Systems Workspace | Delivery infrastructure configuration, Application Configuration Summary, and operational readiness | Sales, Admin |
| Tenant | Delivery | Delivery | TenantOperations | Tenant Workspace | Delivery | Sales, Admin |
| Warranty | Delivery | Delivery | WarrantyCollection | Warranty Workspace / Tenant Workspace | Delivery | Sales, Admin |
| Allocation | Delivery | Delivery | AllocationContext | Project Workspace | Delivery | Sales |
| Remark | Parent object owner | Parent console | Parent domain / future shared Remark service | Parent workspace | Parent-authorized users | Related workspaces |
| Owner / Responsible Contact | Parent object owner | Parent console | Parent domain / future shared child-object service | Parent workspace | Parent-authorized users | Related workspaces |
| Document | Parent object owner | Parent console | DocumentCollection | Parent workspace | Parent owner | Related workspaces |
| Activity Event | Admin governance | Admin | ActivityLog | Audit / Activity Log | System/store transactions | All relevant workspaces |
| Dashboard View | Admin infrastructure | Admin/shared | DashboardView | Dashboard surface | User/dashboard owner | Admin governance |
| Picklist | Admin | Admin | Config/storage | Future Admin Workspace | Admin | All object forms |
| Templates | Admin | Admin | Config/MilestonePlan | Future Admin Workspace | Admin | Project Workspace |

## 7. Lifecycle Dependencies

```text
Customer
  -> Opportunity

Opportunity
  -> Requirements
  -> Project creation/update intent

Project
  -> Milestones
  -> Tasks
  -> System allocation through AllocationContext
  -> Tenant linkage / tenant creation context

System
  -> Tenant hosting
  -> Remarks
  -> Owner / Responsible Contacts
  -> Configuration History

Tenant
  -> Warranty records

Warranty
  -> Renewal candidate
  -> Operational Renewal Work Queue

Requirement
  -> Requirement Coverage validation output
  -> Project/System/Tenant fulfillment references

Project/System/Tenant/Allocation transactions
  -> Activity Events
```

Customer must exist before Opportunity. Opportunity may trigger Project creation/update. Project execution begins in Delivery. Project allocates Systems through AllocationContext and does not own System configuration. Tenant executes inside System, but Tenant lifecycle remains owned by TenantOperations. Warranty belongs to Tenant. Requirement Coverage is a Delivery-owned validation/read-model capability, not a Business Object or manually created workflow object. System Configuration History is generated from System-owned configuration changes. Activity Events are emitted by transaction boundaries, not pages.

Operational renewal belongs to Delivery through Warranty / Renewal Work Queue. Project may display renewal project context, but WarrantyCollection owns warranty chain/status and Renewal Work Queue owns renewal readiness visibility.

## 8. Navigation Model

All business-object navigation uses Business Reference Resolver. Visible business IDs use shared Business Object Links. Routes remain stable. Cross-console navigation is allowed but does not transfer ownership.

| From Workspace | May Navigate To |
| --- | --- |
| Customer Workspace | Opportunities, Projects, Systems, Tenants, Warranty context, Documents, Activity |
| Opportunity Workspace | Customer, related Projects, existing Systems/Tenants |
| Project Workspace | Opportunity, Customer, Systems, Tenants, Requirement Coverage validation output, Documents, Activity |
| Systems Workspace | Projects, Tenants, Customer context |
| Tenant Workspace | System, Project, Warranty, Customer context |
| Warranty Workspace | Tenant, Project, Customer |
| Requirement Coverage validation surface | Opportunity, Project, System, Tenant |
| Activity / Audit Log | Primary and related object routes |

Deep links should use business IDs where available. Missing/stale references must display safely.

## 9. Event Flow

| Object | Typical Emitted Events | Typical Consumed Events |
| --- | --- | --- |
| Customer | customer.created, customer.updated, accountManagerChanged | Related opportunity/project/system/tenant/warranty events |
| Opportunity | opportunity.created, stageChanged, requirementChanged, projectCreateRequested | Project created/updated from opportunity |
| Requirement | requirement.created, requirement.updated | Coverage state changes, future |
| Project | project.created, project.updated | Opportunity project intent |
| Milestone | milestone.created, milestone.completed, milestone.reordered | Project activity timeline |
| Task | task.created, task.completed, task.reopened | Project activity timeline |
| System | system.created, system.updated | Allocation events |
| Remark | remark.created, remark.updated, remark.deleted, remark.completed future | Parent object timelines |
| Owner / Responsible Contact | owner.added, owner.updated, owner.removed future | Parent object timelines |
| Allocation | allocation.systemAllocated, allocation.systemDeallocated | Project/system timelines |
| Tenant | tenant.createdFromRequirement, tenant.movedToSystem, tenant.deletedFromSystem | Allocation/system/project context |
| Warranty | warranty.created, warranty.renewed, predecessorLinked, noWarrantyOverride | Renewal queue, customer timeline |
| Document | document.added, document.replaced, document.deleted | Parent object timeline |
| Dashboard View | dashboardView.created, renamed, duplicated, deleted | Audit/admin |
| Activity Event | None, append-only records | Dashboard/timeline selectors |

Current event implementation is partial. Do not infer events unless approved.

## 10. Ownership Boundaries

Customer owns customer identity, commercial account profile, and customer aggregation. It does not own delivery statuses, Project execution, Warranty status, or Tenant/System operational status.

Opportunity owns commercial lifecycle, delivery intent, requirement definitions, and Project creation/update intent. It does not own Project execution, Requirement Coverage validation output, Allocation, Tenant creation execution, or Warranty.

Project owns Delivery execution, Delivery health, milestone/task context, and Delivery workspace composition. It consumes facts from MilestonePlan, AllocationContext, RequirementCoverage read models, SystemInventory, TenantOperations, and WarrantyCollection. It does not own Customer master, Opportunity lifecycle, System logic, Tenant logic, Warranty status, or Requirement Coverage validation logic.

System owns system identity/configuration/operational facts, Application Configuration Summary, System Configuration History, and operational readiness. System is the reusable Delivery Resource of the ERP. Production Inventory and Reused Internal Systems are Systems Workspace views/tabs, not separate business objects with separate ownership. Systems are Delivery-owned supporting Business Objects, not separate role-owned objects. Project allocates Systems through AllocationContext and does not own System configuration. System does not own Tenant warranty, Tenant lifecycle, Project health, or Customer commercial data.

Remarks are reusable child Business Objects scoped to a parent object instance. They own remark row identity, timestamp, author metadata, type, rich text content, due date, and deadline alert output. In V1 they may be implemented first under System. Remark author metadata is not the Owner table.

Owner / Responsible Contact is a reusable child Business Object/table scoped to a parent object instance. It represents responsible people or contacts for that parent. In V1 it may be implemented first under System.

Tenant owns tenant identity/lifecycle facts and tenant operational mode/status context. Tenant executes inside System, but Tenant lifecycle remains owned by TenantOperations. Tenants are Delivery-owned supporting Business Objects, not separate role-owned objects. Tenant does not own Warranty chain/status, System state, or Project health.

Warranty owns warranty chain, warranty status, tenant warranty header status, and renewal candidate facts. It does not own Opportunity commercial renewal or Project execution.

RequirementCoverage owns coverage status, missing-step derivation, and coverage alerts as validation/read-model outputs only. It does not own requirement definitions, Project execution, System allocation, Tenant creation, or any editable workflow.

ActivityLog owns event structure, event selectors, and timeline/audit read models. It does not own business rules of emitted facts.

## 11. Core Services Usage Matrix

| Object | Identity | Reference Resolver | Status Engine | Rich Text | Config Renderer | Delivery Tables | Business Links | ActivityLog |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer | Yes | Yes | Display only | Future notes | No | Read-only context | Yes | Yes |
| Opportunity | Yes | Yes | Yes | Future notes/comments | Yes, requirements | Context only | Yes | Future |
| Requirement | Future RID | Yes | Coverage display only | Comments if present | Yes | No | Yes | Future |
| Project | Yes | Yes | Yes | Task/comment fields | Yes for config context | Yes | Yes | Yes |
| Milestone | Future MS | Yes future | Yes | Comment | No | Tables | Future | Future |
| Task | Future TK | Yes future | Yes | Comment | No | Tables | Future | Future |
| System | Yes | Yes | Yes | Comments/docs | Yes | Yes | Yes | Yes |
| Remark | Yes | Future parent refs | Deadline alerts | Yes | No | Tables | Parent link | Yes future |
| Owner / Responsible Contact | User ID if available | Future parent refs | No | No | No | Tables | Parent link | Yes future |
| Tenant | Yes | Yes | Yes | Comments/docs | Yes | Yes | Yes | Yes |
| Warranty | Yes | Yes partial | Yes | Remarks | No | Dashboard tables | Yes where route exists | Future |
| Allocation | Generated/internal | Yes via related refs | Alerts only | No | No | Yes | Yes | Yes |
| Document | Yes | Yes partial | No | No | No | Lists | Yes where parent route exists | Future |
| Activity Event | Generated | Yes | Yes | No | No | Dashboard tables | Yes | Owns |
| Dashboard View | Internal/scope | No | No | No | No | DataDashboard | No | Future |
| Picklist | Future | No | No | No | No | No | No | Future |
| Templates | Future | No | No | Rich comments future | No | No | No | Future |

## 12. Shared Component Usage Matrix

| Object | Typical Shared Components |
| --- | --- |
| Customer | BusinessObjectLink, BusinessIdLink, StatusBadge, ProgressBar, ActivityTimeline, read-only tables |
| Opportunity | BusinessObjectLink, FormField, RichTextEditor, ConfigurationRenderer, StatusBadge, dialogs |
| Requirement | ConfigurationRenderer, FormField, BusinessIdLink, ClampedTableCellContent |
| Project | PageHeader, FormField, ProgressBar, AlertStatusIcon, StatusBadge, DeliveryTables, RichTextEditor |
| Milestone | StatusBadge, AlertStatusIcon, ProgressBar, RichTextEditor |
| Task | StatusBadge, AlertStatusIcon, RichTextEditor |
| System | FormField, ConfigurationRenderer, DeliveryTables, BusinessObjectLink, Operational status display |
| Remark | FormField, RichTextEditor, AlertStatusIcon, editable table/grid |
| Owner / Responsible Contact | FormField, editable table/grid, BusinessObjectLink where user reference exists |
| Tenant | FormField, ConfigurationRenderer, DeliveryTables, BusinessObjectLink, Operational status display |
| Warranty | StatusBadge, AlertStatusIcon, BusinessIdLink, dialogs/forms |
| Allocation | DeliveryTables, BusinessIdLink, AlertStatusIcon |
| Document | DocumentsPanel, BusinessObjectLink |
| Activity Event | ActivityTimeline, DataDashboard, StatusBadge, AlertStatusIcon, BusinessObjectLink |
| Dashboard View | DataDashboard controls |
| Picklist | FormField, select/picklist components |
| Templates | Admin tables/forms, future |

## 13. Console Architecture

```text
Sales Console
  Customers
  Opportunities
  Future: Sales Dashboard
  Future: Sales Alerts
  Future: Pipeline
  Future: Commercial Reports

Delivery Console
  Projects
  Systems Workspace
    Allocated Systems
    Production Inventory
    Reused Internal Systems
  Tenants
  Warranty Workspace
  Renewal Work Queue
  Requirement Coverage (validation/read-model surface)
  Future: Delivery Dashboard
  Future: Delivery Alerts

Admin Console
  Activity / Audit Log
  Future: Users
  Future: Roles
  Future: Privileges
  Future: Picklists
  Future: Templates
  Future: Metadata
  Future: Settings
  Future: Admin Alerts
```

Consoles are operational areas. Workspaces are complete environments for business objects. Business objects define ownership. Some visible console entries, such as Requirement Coverage, may be dashboard/read-model surfaces rather than Business Object Workspaces when they own no editable lifecycle or master data.

## 14. Version 1.0 Scope

Included in V1:

- Customer / Account
- Opportunity
- Requirement definitions
- Requirement Coverage validation/read-model capability
- Project
- Milestone
- Task
- System
- System Remarks, Owner rows, and Configuration History as child structures
- Production System Inventory
- Reused Internal System
- Tenant
- Warranty
- Allocation
- Project Tenant Link
- Document aggregation/attachment behavior, partial
- Activity Log, partial
- Dashboard View
- Picklists/custom values, partial
- Milestone templates, partial
- Core metadata/object registry infrastructure

Not fully included but likely needed for commercial V1:

- Users
- Roles
- Privileges
- Admin settings
- Admin template management
- Product/package definitions

## 15. Version 2.0 Expansion

Version 2.0 is the configurable ERP platform phase.

Potential V2 expansions:

- Configurable object schemas
- Configurable workspaces
- Configurable navigation
- Configurable lifecycle/state models
- Configurable validation rules
- Configurable dashboards/reports
- Configurable alert designer
- Configurable role/privilege designer
- Metadata management UI
- Product/package master data
- Integration framework
- Import/export framework
- API/backend synchronization
- Customer-specific configuration packs
- Dynamic workflow engine

Do not redesign V1 around V2 configurability.

## 16. Architecture Observations

| Type | Observation | Recommendation |
| --- | --- | --- |
| Risk | Customer aggregates many Delivery facts. | Continue enforcing CustomerAccount as aggregator only. |
| Risk | Requirements have Sales-owned definitions and Delivery-owned fulfillment validation. | Keep TenantRequirement-owned definitions separate from RequirementCoverage validation/read-model output. |
| Risk | Renewal has commercial and operational meanings. | Continue naming commercial Renewal under Opportunity and operational Renewal as Renewal Work Queue. |
| Risk | Activity Log is partial but already visible. | Treat as Admin-owned audit surface; avoid page-level event emission. |
| Risk | Documents are attached to multiple parent types but no full document workspace exists. | Keep parent-context document behavior in V1 unless a Document Workspace is approved. |
| Risk | Admin objects are missing while the architecture references permissions/configuration. | Add Admin scope later, but do not block current product completion. |
| Risk | Templates and picklists are partly config-backed. | Accept for V1; plan Admin maturity later. |
| Circular dependency risk | Customer -> Project -> Customer and Opportunity -> Project -> Opportunity references can become tangled. | Use references/read models, not ownership transfer. |
| Shared service candidate | Console-specific Alerts may eventually need a domain/service. | Do not introduce until alert requirements are concrete. |
| Shared component candidate | Read-only workspace tables repeat. | Consider shared read-only table pattern later. |
| Missing ownership | Product/package definitions are not yet a first-class object. | Defer to V2 or later V1 admin planning. |
