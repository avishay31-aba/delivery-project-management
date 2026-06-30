# System Business Object Specification

## 1. Business Object Name

System

System includes both production systems and reused internal systems as operational views of the same Delivery-owned infrastructure resource concept.

## 2. Business Purpose

System represents a reusable Delivery infrastructure resource.

It captures the infrastructure identity, hosting model, deployment topology, operational state, application configuration, installed product/version context, capacity, and readiness needed to host customer or internal tenants.

System is the infrastructure object that Projects allocate and Tenants run inside.

## 3. Business Ownership

System is Delivery-owned.

Delivery Manager and Delivery Specialist own system operational use within the Delivery Console.

System is not owned by a separate System Engineer persona in the standard ERP product. Future customer-specific infrastructure or operations roles are privilege mappings only and do not change System ownership.

## 4. Primary Capability

Delivery Capability -> Infrastructure & Resource Management

Supporting capabilities referenced:

- Delivery Capability -> Project Delivery Management
- Delivery Capability -> Tenant Operations
- Delivery Capability -> Requirement Coverage
- Administration Capability -> Activity / Audit
- Administration Capability -> Metadata / Picklists, where applicable

## 5. Console Ownership

Delivery Console

## 6. Workspace Ownership

Systems Workspace

The Systems Workspace is the complete working environment for the System Business Object.

Per the Navigation Specification, production inventory, allocated systems, and reused internal systems are views/tabs of Systems Workspace, not separate business-object workspaces.

## 7. Data Ownership

System owns infrastructure and application configuration facts.

System owns:

- Infrastructure identity
- SID/MID identity context
- Source/type classification
- Hosting model
- Deployment topology
- Cloud/on-prem characteristics
- Hardware/virtual resources
- Networking characteristics
- Operational status/readiness
- Installed product versions
- Application configuration summary
- Capacity/resource characteristics
- System-level region/location
- System-level documents/activity context where supported

System does not own Customer, Opportunity, Project, Tenant, Warranty, or Requirement Coverage business rules.

## 8. Fields Owned

Exact field names should follow existing seed/model types.

System-owned fields include:

- `id`
- `sid`
- `machineId`
- `source`
- `systemType`
- `operationalStatus`
- `productType`
- `hostingType`
- `cloudPlatform`
- `csp`
- `cloudRegion`
- `country`
- `timeGroup`
- `environment`
- `deploymentTarget`
- `versionNumber`
- `modules`
- `ai`
- `additionalFeatures`
- `licenses`
- `users`
- `concurrentSearches`
- `concurrentAnalyses`
- CPU/resource fields where modeled
- Memory/resource fields where modeled
- Storage/resource fields where modeled
- Network fields where modeled
- Hosted tenant references where persisted as system context
- System documents where modeled
- System activity context where modeled
- `createdAt`
- `updatedAt`

System-owned derived/read-model fields include:

- System identity label
- SID/MID display identity
- Source label
- Operational status presentation key
- Application configuration summary
- Hosting summary
- Product/module summary
- Capacity summary
- Hosted tenant count
- Allocation availability/readiness summary

## 9. Referenced Fields

Project fields:

- PID
- Project name
- Project type/subtype
- Delivery status
- Project allocation link context

Tenant fields:

- TID
- Tenant name
- Tenant operational status
- Environment
- Warranty header status
- Source requirement ID

Customer / Account fields:

- Account code
- Account name
- Country/region where displayed as context

Opportunity fields:

- Opportunity ID
- Requirement intent where shown as context

Requirement Coverage fields:

- Coverage status
- Missing step
- Requirement/system linkage context

Warranty fields:

- Warranty status through hosted tenants only

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

- System may be allocated to many Projects over its lifetime through AllocationContext.
- Project may allocate many Systems.
- System may host many Tenants.
- Tenant belongs to or is hosted on a System.
- System may satisfy Requirement Coverage through Project allocation and Tenant hosting.
- System may be associated with Customer context through hosted Tenants, allocated Projects, or account-owned inventory context.
- System may have Documents.
- System may have Activity Events.
- System may appear in Systems Workspace, Project Workspace, Tenant Workspace, Requirement Coverage, Customer Workspace, Activity / Audit Log, and future Delivery Alerts.

## 11. Lifecycle

SystemInventory owns the System lifecycle/operational state.

Approved current operational states include current modeled values such as:

- Operative / System On
- Service Blocked
- Access Blocked
- Access Blocked - Password Reset
- Deleted
- Cancelled

Operational state rules:

- Technical states may be derived from the system's actual operational readiness.
- Manual operational states may override derived technical state where approved.
- Tenant operational status may reflect linked System state, but TenantOperations owns tenant-level override behavior.

No new lifecycle states are introduced by this BOS.

## 12. Business Rules

- System is Delivery-owned.
- System represents reusable delivery infrastructure.
- System owns infrastructure configuration regardless of which Project currently allocates it.
- Project allocates Systems; Project does not own System configuration.
- Tenant runs inside Systems; Tenant does not own System configuration.
- System may host many Tenants.
- System may participate in many Projects over its lifetime.
- Application Configuration Summary belongs to System.
- SystemInventory owns system identity, configuration, operational state, and readiness facts.
- AllocationContext owns project-system relationship semantics.
- TenantOperations owns tenant lifecycle and tenant operational facts.
- RequirementCoverage owns coverage status and missing steps.
- WarrantyCollection owns warranty status through tenants.
- System must not duplicate Tenant business rules.
- System must not duplicate Project business rules.
- System may expose operational context, but does not own Delivery execution.

## 13. Validation Rules

SystemInventory-owned validations may include:

- System identity is required.
- SID uniqueness for production systems.
- MID/machine ID uniqueness for reused internal systems.
- Editing an existing System must ignore the current record during uniqueness validation.
- Source/type must be valid.
- Operational status must be valid.
- Product type must be valid.
- Hosting type must be valid.
- Cloud platform/CSP values must be valid when required by hosting.
- Cloud/on-prem fields must be compatible with hosting type.
- Required infrastructure fields must be present according to source/type.
- Capacity/resource values must be numeric where modeled as numeric.
- Version/product values must be valid where constrained by metadata.
- Deleted/Cancelled states must preserve historical links safely.

AllocationContext-owned validations may include:

- System can be allocated only through approved allocation modes.
- System availability/readiness must satisfy allocation rules.
- Duplicate active project-system links must be prevented where applicable.

TenantOperations-owned validations may include:

- Tenant hosted system reference must resolve.
- Tenant creation from system must not create orphan tenants.

No page-level validation duplication.

## 14. Actions Owned

System-owned actions include:

- Create System where supported.
- Edit System infrastructure profile.
- Edit hosting/deployment fields.
- Edit application configuration fields.
- Update operational status.
- View hosted tenants.
- View related Projects.
- View system documents.
- View system activity.
- Add Tenant from System Form where currently supported, with tenant creation executed by TenantOperations.
- Navigate to related Project/Tenant workspaces.
- Preserve system configuration across allocations.

## 15. Actions Triggered But Executed Elsewhere

System may trigger or coordinate:

- Project allocation/deallocation: executed by AllocationContext and Project transaction boundaries.
- Tenant creation from System context: executed by TenantOperations/store transaction boundary.
- Tenant move/delete from system: executed by TenantOperations/SystemInventory transaction boundary.
- Requirement Coverage updates: derived by RequirementCoverage.
- Warranty display through tenants: derived by WarrantyCollection.
- Activity event creation: emitted by approved store transaction boundaries, not page code.
- Document actions: executed by DocumentCollection.

System must not directly execute Project delivery lifecycle, Opportunity lifecycle, Warranty chain behavior, or Requirement Coverage business calculations.

## 16. Statuses Owned

SystemInventory owns:

- System operational status.
- System readiness/availability where modeled.
- System source/type display state.
- System configuration completeness where modeled.
- System allocation availability facts where modeled as system facts.

Status & Visual State Engine owns presentation only.

## 17. Statuses Displayed

Systems Workspace may display, read-only from owning domains:

- Project delivery status from ProjectLifecycle.
- Tenant operational status from TenantOperations.
- Warranty status/header status from WarrantyCollection through hosted tenants.
- Requirement Coverage status from RequirementCoverage.
- Activity severity/category from ActivityLog.
- Document metadata/status from DocumentCollection where present.

System must not recalculate those statuses.

## 18. Events Emitted

Existing/future System events may include:

- `system.created`
- `system.updated`
- `system.operationalStatusChanged`
- `system.configurationChanged`
- `system.hostingChanged`
- `system.allocatedToProject`
- `system.deallocatedFromProject`
- `system.existingSystemLinked`
- `system.tenantCreated`
- `system.tenantMoved`
- `system.tenantRemoved`
- `system.documentAdded`

Current V1 event emission may be partial.

Events must be emitted only from approved store/domain transaction boundaries, not React pages or selectors.

## 19. Events Consumed

Systems Workspace may consume ActivityLog events where System is primary or related object.

Examples:

- System created.
- System updated.
- System allocated to project.
- System deallocated from project.
- Existing system linked to project.
- Tenant created on system.
- Tenant moved to system.
- Tenant removed from system.
- Future operational status changes.
- Future document events.

ActivityLog owns event shape, selectors, and timeline presentation.

## 20. Core Services Used

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- ActivityLog
- DashboardView for Systems dashboards/saved views
- Persistence boundary
- Business Object Links
- Object Registry / Runtime where metadata-driven views are used

## 21. Shared Components Used

- BusinessObjectLink
- BusinessIdLink
- StatusBadge
- AlertStatusIcon
- Shared Configuration Renderer
- Shared Delivery Tables
- DocumentsPanel / document display components where relevant
- ActivityTimeline
- FormField / read-only field components
- DataDashboard for Systems dashboards
- ClampedTableCellContent
- Shared dialog components where existing

## 22. Permission Principles

Delivery Manager can view and manage Systems.

Delivery Specialist can view and execute supported operational System work according to future privilege mapping.

Sales Manager / Customer Success may view System context from Sales workspaces, but do not own System editing.

ERP Administrator may access governance/admin capabilities.

Future customer-specific infrastructure roles may be implemented as privilege mappings only. They do not change System ownership.

No new permission logic is defined by this BOS.

## 23. Audit / Activity Expectations

System-related activity should be visible in Systems Workspace and Activity / Audit Log.

Audit/activity should include:

- System created.
- System updated.
- Operational status changed.
- Hosting/configuration changed.
- System allocated/deallocated.
- Existing system linked.
- Tenant created/moved/removed.
- Document actions.
- Future capacity/readiness changes.

System page code must not emit events directly.

## 24. Invariants

- Every System has a stable ERP-generated business identity.
- Production systems use SID identity.
- Reused internal systems use MID/machine identity.
- System identity is not user-generated or page-generated.
- System remains Delivery-owned.
- System owns infrastructure/configuration facts.
- System configuration persists independently of current project allocation.
- Project allocation does not transfer System ownership to Project.
- Tenant hosting does not transfer System ownership to Tenant.
- System operational status is owned by SystemInventory.
- Tenant operational status is owned by TenantOperations.
- Warranty status is owned by WarrantyCollection.
- Requirement Coverage status is owned by RequirementCoverage.
- Business object navigation uses Business Reference Resolver/shared links.
- System Workspace renders owning-domain facts; it does not create page-local business calculations.

## 25. Explicit Non-Ownership Boundaries

System does not own:

- Customer identity or commercial account profile.
- Opportunity commercial lifecycle or delivery intent.
- Project delivery lifecycle.
- Project health.
- Allocation relationship semantics.
- Tenant lifecycle.
- Tenant operational override behavior.
- Warranty chain/status.
- Requirement Coverage status/missing-step rules.
- Activity event taxonomy.
- Document behavior beyond system context.
- Dashboard saved view lifecycle.
- Admin metadata/picklists/templates, except consuming approved metadata.

System may coordinate and display these as context only.

## 26. Version 1.0 Scope

V1 includes:

- Systems dashboards/views.
- Systems Workspace.
- Allocated Systems view.
- Production Inventory view.
- Reused Internal Systems view.
- System identity and operational profile.
- Hosting/deployment/configuration fields.
- Application Configuration Summary.
- Operational status display/editing where supported.
- Hosted tenant context.
- Related project links/context.
- Add Tenant behavior where already supported.
- Shared reference links and shared status presentation.
- Documents where already supported.
- Activity timeline where already supported.
- Safe validation for SID/MID uniqueness and persisted identities.

V1 does not require advanced capacity planning, infrastructure provisioning automation, external monitoring integration, or configurable infrastructure schemas.

## 27. Version 2.0 Exclusions

Do not include in V1:

- Configurable System schema.
- Configurable Systems Workspace layout.
- Configurable operational status model.
- Configurable hosting/deployment topology builder.
- Configurable infrastructure validation engine.
- Configurable allocation workflow.
- Automated infrastructure provisioning.
- Monitoring/observability integration framework.
- Capacity forecasting engine.
- Generic infrastructure object builder.
- Cloud provider API synchronization.
- Configurable permission designer.
