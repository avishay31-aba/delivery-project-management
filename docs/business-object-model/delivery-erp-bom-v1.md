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
| Requirement Coverage | Delivery | RequirementCoverage | Fulfillment status of requirements | Implemented | V1 |
| Project | Delivery | ProjectLifecycle | Central Delivery orchestration object for delivery execution | Implemented | V1 |
| Milestone | Delivery | MilestonePlan | Delivery milestone execution | Implemented | V1 |
| Task | Delivery | MilestonePlan | Delivery task execution | Implemented | V1 |
| System | Delivery | SystemInventory | Allocated operational system | Implemented | V1 |
| Production System Inventory Item | Delivery | SystemInventory | Production allocation pool | Implemented | V1 |
| Reused Internal System | Delivery | SystemInventory | POC/demo/training/support reusable pool | Implemented | V1 |
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

## 2. Business Object Hierarchy

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
       -> Documents
       -> Activity
  -> Tenants
       -> Warranties
       -> Documents
       -> Activity
  -> Requirement Coverage
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
  -> Requirement Coverage context
  -> Documents
  -> Activity

Tenant
  -> Warranty records
  -> Operational status
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

Hierarchy describes business relationship, not ownership transfer. Customer may aggregate projects/systems/tenants, but Delivery owns those objects. Project is the central Delivery orchestration Business Object: it owns delivery execution and composes delivery context, while consuming facts from MilestonePlan, AllocationContext, RequirementCoverage, SystemInventory, TenantOperations, and WarrantyCollection.

## 3. Relationship Matrix

| Object | Parent Objects | Child Objects | Referenced Objects | Referencing Objects |
| --- | --- | --- | --- | --- |
| Customer | None | Opportunities 1:N | Sales Manager 1:1 | Opportunities, Projects, Systems, Tenants |
| Opportunity | Customer N:1 | Requirements 1:N, Project intent 1:N | Customer, Sales Manager, existing Systems/Tenants | Projects, RequirementCoverage |
| Requirement | Opportunity N:1 | RequirementCoverage 1:1/N | Product/config metadata, Tenant/System refs | Project, Tenant, RequirementCoverage |
| Requirement Coverage | Requirement N:1 | None | Opportunity, Project, System, Tenant | Customer Workspace, Project Workspace, Dashboard |
| Project | Opportunity N:1, Customer N:1 derived | Milestones 1:N, Tasks through milestones, Allocations 1:N | Customer, Opportunity, Systems, Tenants, RequirementCoverage, Warranty context | Customer, RequirementCoverage, Activity |
| Milestone | Project N:1 | Tasks 1:N | Project | Project health |
| Task | Milestone N:1 | None | Project/Milestone | Project health |
| System | Project N:N through Allocation | Tenants 1:N | Customer, Product/config metadata | Project, Tenant, Customer |
| Production Inventory Item | None | Allocation target | Product/config metadata | Project allocation |
| Reused Internal System | None | Allocation target | Product/config metadata | POC Project allocation |
| Tenant | System N:1, Project N:N | Warranties 1:N | Customer, Project, Requirement, System | Customer, Project, Warranty |
| Warranty | Tenant N:1 | Successor warranties N:N chain | Project, Tenant | Warranty dashboard, Renewal queue |
| Allocation | Project N:1, System N:1 | None | Project, System | Project Workspace |
| Document | Parent object N:1 | None | Project/System/Tenant/future Customer | Parent workspace |
| Activity Event | None | None | Primary object, related objects | Timelines, audit dashboard |
| Dashboard View | Dashboard scope N:1 | View state | Dashboard rows/columns | Dashboards |
| User | Admin | None | Role | Future audit/permissions |
| Role | Admin | Privileges N:N | Users, Privileges | Future permissions |
| Privilege | Admin | None | Role | Future permissions |

## 4. Ownership Matrix

| Object | Business Owner | Console Owner | Domain Owner | Workspace Owner | May Modify | May Reference Only |
| --- | --- | --- | --- | --- | --- | --- |
| Customer | Sales | Sales | CustomerAccount | Customer Workspace | Sales-authorized users | Delivery, Admin |
| Opportunity | Sales | Sales | OpportunityLifecycle | Opportunity Workspace | Sales-authorized users | Delivery, Admin |
| Requirement | Sales intent / Delivery fulfillment | Sales origin | TenantRequirement | Opportunity Workspace | Opportunity Workspace | Project, Coverage |
| Requirement Coverage | Delivery | Delivery | RequirementCoverage | Requirement Coverage | Domain/read model only | Sales, Customer |
| Project | Delivery | Delivery | ProjectLifecycle | Project Workspace | Delivery execution; consumes MilestonePlan, AllocationContext, RequirementCoverage, SystemInventory, TenantOperations, and WarrantyCollection facts | Sales, Admin |
| Milestone | Delivery | Delivery | MilestonePlan | Project Workspace | Delivery | Sales via read-only |
| Task | Delivery | Delivery | MilestonePlan | Project Workspace | Delivery | Sales via read-only |
| System | Delivery | Delivery | SystemInventory | Systems Workspace | Delivery | Sales, Admin |
| Tenant | Delivery | Delivery | TenantOperations | Tenant Workspace | Delivery | Sales, Admin |
| Warranty | Delivery | Delivery | WarrantyCollection | Warranty Workspace / Tenant Workspace | Delivery | Sales, Admin |
| Allocation | Delivery | Delivery | AllocationContext | Project Workspace | Delivery | Sales |
| Document | Parent object owner | Parent console | DocumentCollection | Parent workspace | Parent owner | Related workspaces |
| Activity Event | Admin governance | Admin | ActivityLog | Audit / Activity Log | System/store transactions | All relevant workspaces |
| Dashboard View | Admin infrastructure | Admin/shared | DashboardView | Dashboard surface | User/dashboard owner | Admin governance |
| Picklist | Admin | Admin | Config/storage | Future Admin Workspace | Admin | All object forms |
| Templates | Admin | Admin | Config/MilestonePlan | Future Admin Workspace | Admin | Project Workspace |

## 5. Lifecycle Dependencies

```text
Customer
  -> Opportunity

Opportunity
  -> Requirements
  -> Project creation/update intent

Project
  -> Milestones
  -> Tasks
  -> System allocation
  -> Tenant linkage / tenant creation context

System
  -> Tenant hosting

Tenant
  -> Warranty records

Warranty
  -> Renewal candidate
  -> Operational Renewal Work Queue

Requirement
  -> Requirement Coverage
  -> Project/System/Tenant fulfillment references

Project/System/Tenant/Allocation transactions
  -> Activity Events
```

Customer must exist before Opportunity. Opportunity may trigger Project creation/update. Project execution begins in Delivery. Warranty belongs to Tenant. Requirement Coverage is derived/read-model behavior, not a manually created workflow object. Activity Events are emitted by transaction boundaries, not pages.

Operational renewal belongs to Delivery through Warranty / Renewal Work Queue. Project may display renewal project context, but WarrantyCollection owns warranty chain/status and Renewal Work Queue owns renewal readiness visibility.

## 6. Navigation Model

All business-object navigation uses Business Reference Resolver. Visible business IDs use shared Business Object Links. Routes remain stable. Cross-console navigation is allowed but does not transfer ownership.

| From Workspace | May Navigate To |
| --- | --- |
| Customer Workspace | Opportunities, Projects, Systems, Tenants, Warranty context, Documents, Activity |
| Opportunity Workspace | Customer, related Projects, existing Systems/Tenants |
| Project Workspace | Opportunity, Customer, Systems, Tenants, Requirement Coverage, Documents, Activity |
| Systems Workspace | Projects, Tenants, Customer context |
| Tenant Workspace | System, Project, Warranty, Customer context |
| Warranty Workspace | Tenant, Project, Customer |
| Requirement Coverage | Opportunity, Project, System, Tenant |
| Activity / Audit Log | Primary and related object routes |

Deep links should use business IDs where available. Missing/stale references must display safely.

## 7. Event Flow

| Object | Typical Emitted Events | Typical Consumed Events |
| --- | --- | --- |
| Customer | customer.created, customer.updated, accountManagerChanged | Related opportunity/project/system/tenant/warranty events |
| Opportunity | opportunity.created, stageChanged, requirementChanged, projectCreateRequested | Project created/updated from opportunity |
| Requirement | requirement.created, requirement.updated | Coverage state changes, future |
| Project | project.created, project.updated | Opportunity project intent |
| Milestone | milestone.created, milestone.completed, milestone.reordered | Project activity timeline |
| Task | task.created, task.completed, task.reopened | Project activity timeline |
| System | system.created, system.updated | Allocation events |
| Allocation | allocation.systemAllocated, allocation.systemDeallocated | Project/system timelines |
| Tenant | tenant.createdFromRequirement, tenant.movedToSystem, tenant.deletedFromSystem | Allocation/system/project context |
| Warranty | warranty.created, warranty.renewed, predecessorLinked, noWarrantyOverride | Renewal queue, customer timeline |
| Document | document.added, document.replaced, document.deleted | Parent object timeline |
| Dashboard View | dashboardView.created, renamed, duplicated, deleted | Audit/admin |
| Activity Event | None, append-only records | Dashboard/timeline selectors |

Current event implementation is partial. Do not infer events unless approved.

## 8. Ownership Boundaries

Customer owns customer identity, commercial account profile, and customer aggregation. It does not own delivery statuses, Project execution, Warranty status, or Tenant/System operational status.

Opportunity owns commercial lifecycle, delivery intent, requirement definitions, and Project creation/update intent. It does not own Project execution, Requirement Coverage, Allocation, Tenant creation execution, or Warranty.

Project owns Delivery execution, Delivery health, milestone/task context, and Delivery workspace composition. It consumes facts from MilestonePlan, AllocationContext, RequirementCoverage, SystemInventory, TenantOperations, and WarrantyCollection. It does not own Customer master, Opportunity lifecycle, System logic, Tenant logic, Warranty status, or Requirement Coverage status.

System owns system identity/configuration/operational facts. Systems are Delivery-owned supporting Business Objects, not separate role-owned objects. System does not own Tenant warranty, Project health, or Customer commercial data.

Tenant owns tenant identity/lifecycle facts and tenant operational mode/status context. Tenants are Delivery-owned supporting Business Objects, not separate role-owned objects. Tenant does not own Warranty chain/status, System state, or Project health.

Warranty owns warranty chain, warranty status, tenant warranty header status, and renewal candidate facts. It does not own Opportunity commercial renewal or Project execution.

RequirementCoverage owns coverage status, missing steps, and requirement fulfillment read models. It does not own requirement definitions or Project/System/Tenant creation.

ActivityLog owns event structure, event selectors, and timeline/audit read models. It does not own business rules of emitted facts.

## 9. Core Services Usage Matrix

| Object | Identity | Reference Resolver | Status Engine | Rich Text | Config Renderer | Delivery Tables | Business Links | ActivityLog |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer | Yes | Yes | Display only | Future notes | No | Read-only context | Yes | Yes |
| Opportunity | Yes | Yes | Yes | Future notes/comments | Yes, requirements | Context only | Yes | Future |
| Requirement | Future RID | Yes | Coverage display only | Comments if present | Yes | No | Yes | Future |
| Requirement Coverage | No direct ID | Yes | Yes | No | No | Dashboard tables | Yes | Future |
| Project | Yes | Yes | Yes | Task/comment fields | Yes for config context | Yes | Yes | Yes |
| Milestone | Future MS | Yes future | Yes | Comment | No | Tables | Future | Future |
| Task | Future TK | Yes future | Yes | Comment | No | Tables | Future | Future |
| System | Yes | Yes | Yes | Comments/docs | Yes | Yes | Yes | Yes |
| Tenant | Yes | Yes | Yes | Comments/docs | Yes | Yes | Yes | Yes |
| Warranty | Yes | Yes partial | Yes | Remarks | No | Dashboard tables | Yes where route exists | Future |
| Allocation | Generated/internal | Yes via related refs | Alerts only | No | No | Yes | Yes | Yes |
| Document | Yes | Yes partial | No | No | No | Lists | Yes where parent route exists | Future |
| Activity Event | Generated | Yes | Yes | No | No | Dashboard tables | Yes | Owns |
| Dashboard View | Internal/scope | No | No | No | No | DataDashboard | No | Future |
| Picklist | Future | No | No | No | No | No | No | Future |
| Templates | Future | No | No | Rich comments future | No | No | No | Future |

## 10. Shared Component Usage Matrix

| Object | Typical Shared Components |
| --- | --- |
| Customer | BusinessObjectLink, BusinessIdLink, StatusBadge, ProgressBar, ActivityTimeline, read-only tables |
| Opportunity | BusinessObjectLink, FormField, RichTextEditor, ConfigurationRenderer, StatusBadge, dialogs |
| Requirement | ConfigurationRenderer, FormField, BusinessIdLink, ClampedTableCellContent |
| Requirement Coverage | DataDashboard, StatusBadge, AlertStatusIcon, BusinessIdLink |
| Project | PageHeader, FormField, ProgressBar, AlertStatusIcon, StatusBadge, DeliveryTables, RichTextEditor |
| Milestone | StatusBadge, AlertStatusIcon, ProgressBar, RichTextEditor |
| Task | StatusBadge, AlertStatusIcon, RichTextEditor |
| System | FormField, ConfigurationRenderer, DeliveryTables, BusinessObjectLink, Operational status display |
| Tenant | FormField, ConfigurationRenderer, DeliveryTables, BusinessObjectLink, Operational status display |
| Warranty | StatusBadge, AlertStatusIcon, BusinessIdLink, dialogs/forms |
| Allocation | DeliveryTables, BusinessIdLink, AlertStatusIcon |
| Document | DocumentsPanel, BusinessObjectLink |
| Activity Event | ActivityTimeline, DataDashboard, StatusBadge, AlertStatusIcon, BusinessObjectLink |
| Dashboard View | DataDashboard controls |
| Picklist | FormField, select/picklist components |
| Templates | Admin tables/forms, future |

## 11. Console Architecture

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
  Requirement Coverage
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

Consoles are operational areas. Workspaces are complete environments for business objects. Business objects define ownership.

## 12. Version 1.0 Scope

Included in V1:

- Customer / Account
- Opportunity
- Requirement definitions
- Requirement Coverage
- Project
- Milestone
- Task
- System
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

## 13. Version 2.0 Expansion

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

## 14. Architecture Observations

| Type | Observation | Recommendation |
| --- | --- | --- |
| Risk | Customer aggregates many Delivery facts. | Continue enforcing CustomerAccount as aggregator only. |
| Risk | Requirement has split ownership: Sales intent, Delivery coverage. | Keep TenantRequirement and RequirementCoverage boundaries explicit. |
| Risk | Renewal has commercial and operational meanings. | Continue naming commercial Renewal under Opportunity and operational Renewal as Renewal Work Queue. |
| Risk | Activity Log is partial but already visible. | Treat as Admin-owned audit surface; avoid page-level event emission. |
| Risk | Documents are attached to multiple parent types but no full document workspace exists. | Keep parent-context document behavior in V1 unless a Document Workspace is approved. |
| Risk | Admin objects are missing while the architecture references permissions/configuration. | Add Admin scope later, but do not block current product completion. |
| Risk | Templates and picklists are partly config-backed. | Accept for V1; plan Admin maturity later. |
| Circular dependency risk | Customer -> Project -> Customer and Opportunity -> Project -> Opportunity references can become tangled. | Use references/read models, not ownership transfer. |
| Shared service candidate | Console-specific Alerts may eventually need a domain/service. | Do not introduce until alert requirements are concrete. |
| Shared component candidate | Read-only workspace tables repeat. | Consider shared read-only table pattern later. |
| Missing ownership | Product/package definitions are not yet a first-class object. | Defer to V2 or later V1 admin planning. |
