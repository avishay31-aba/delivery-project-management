# System Business Object Specification

## 1. Business Object Name

System

System includes both production systems and reused internal systems as operational views of the same Delivery-owned infrastructure resource concept.

## 2. Business Purpose

System represents a reusable Delivery infrastructure resource.

It captures the infrastructure identity, hosting model, deployment topology, operational state, application configuration, installed product/version context, capacity, and readiness needed to host customer or internal tenants.

System is the infrastructure object that Projects allocate and Tenants run inside.

During delivery execution, the allocated System is configured according to its own System-owned Application Configuration Summary.

## 3. Business Ownership

System is Delivery-owned.

Delivery Manager and Delivery Specialist own system operational use within the Delivery Console.

System is not owned by a separate System Engineer persona in the standard ERP product. Future customer-specific infrastructure or operations roles are privilege mappings only and do not change System ownership.

## 4. Primary Capability

Delivery Capability -> Infrastructure & Resource Management

Supporting capabilities referenced:

- Delivery Capability -> Project Delivery Management
- Delivery Capability -> Tenant Operations
- Delivery Capability -> Requirement Fulfillment Tracking / RequirementCoverage read models
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
- System Configuration History for Application Configuration Summary snapshots
- System-level documents/activity context where supported

System does not own Customer, Opportunity, Project, Tenant, Warranty, or RequirementCoverage validation/read-model rules.

Application Configuration Summary remains System-owned regardless of which Project allocates the System or which Tenant consumes the configured runtime result. Project references it. Tenant consumes the result.

System may host reusable child structures in Version 1.0:

- Remarks
- Owner / Responsible Contact rows
- Configuration History

Remarks and Owner rows are reusable child Business Objects/tables that may later be reused under Project, Tenant, Opportunity, Customer, Warranty, or other parent objects. In V1 they may be implemented first under System. Their use under System does not make them System-only concepts.

Configuration History is System-owned. It is not generic and is not Activity Log. It records System Application Configuration Summary snapshots/history when the System-owned configuration changes.

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
- System remarks where modeled
- System owner/responsible-contact rows where modeled
- System configuration history where modeled
- `createdAt`
- `updatedAt`

Remark child rows own:

- Generated unique remark ID
- Full created timestamp
- Created by / author user metadata
- Optional last modified by / last modified timestamp where supported
- Type
- Rich text content
- Due date
- Deadline alert read-model output

Owner / Responsible Contact child rows own:

- User ID where available
- User name
- Full name
- Title
- Company
- Phone number
- Email

System Configuration History child rows own:

- Generated unique history ID
- Full timestamp
- User name that caused the configuration change where available
- Application Configuration Summary snapshot columns using the same structure as the current System Application Configuration Summary

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

RequirementCoverage read-model output:

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
- System may satisfy RequirementCoverage validation output through Project allocation and Tenant hosting.
- System may be associated with Customer context through hosted Tenants, allocated Projects, or account-owned inventory context.
- System may have Documents.
- System may have Activity Events.
- System may have Remarks.
- System may have Owner / Responsible Contact rows.
- System may have Configuration History records.
- System may appear in Systems Workspace, Project Workspace, Tenant Workspace, Requirement Coverage validation surfaces, Customer Workspace, Activity / Audit Log, and future Delivery Alerts.

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
- Application Configuration Summary belongs to System and aggregates active hosted Tenant configuration values, but its Product-to-final-column structure comes from the shared Application Configuration metadata used by Opportunity New Tenant Requirements, Tenant Configuration, and System Tenant tables.
- System is configured according to its own Application Configuration Summary.
- SystemInventory owns system identity, configuration, operational state, and readiness facts.
- AllocationContext owns project-system relationship semantics.
- TenantOperations owns tenant lifecycle and tenant operational facts.
- RequirementCoverage owns coverage status, missing-step derivation, and coverage alerts as validation/read-model output only.
- WarrantyCollection owns warranty status through tenants.
- System must not duplicate Tenant business rules.
- System must not duplicate Project business rules.
- System may expose operational context, but does not own Delivery execution.
- System Remarks are editable child records under the System context in V1.
- Remark author metadata is auto-generated from the current user at creation time where user context exists and is not the same concept as System Owner.
- Editing a Remark should preserve original author metadata where appropriate; last-modified metadata may be tracked where supported.
- System Owner rows identify responsible people/contacts for the System; they do not define ERP roles or privileges.
- System Configuration History records are read-only business history and must not be edited manually.
- System Configuration History records System Application Configuration Summary snapshots; Activity Log records events and must not replace this business-history table.

## 13. Validation Rules

Number of Tenants is an authoritative derived System value: the distinct complete set of Tenant records actively associated with the System across the Not Set Yet, Under Contract, and Out of Contract views. Pagination, search, filters, and movement between those views do not affect the total. All System, Tenant Hosting, Project Systems, dashboard, and read-model presentations consume this same derivation.

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
- Remark type must be a valid picklist value where constrained.
- Remark due date must be a valid date where supplied.
- Remark content may use shared rich text value format.
- Owner email should use existing email validation where available.
- Configuration History records are generated by approved transactions and are read-only to users.

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
- Add/edit/delete System Remarks where supported.
- View System Configuration History.
- Add/edit/remove System Owner / Responsible Contact rows where supported.
- Add Tenant from System Form where currently supported, with tenant creation executed by TenantOperations.
- Navigate to related Project/Tenant workspaces.
- Preserve system configuration across allocations.

## 15. Actions Triggered But Executed Elsewhere

System may trigger or coordinate:

- Project allocation/deallocation: executed by AllocationContext and Project transaction boundaries.
- Tenant creation from System context: executed by TenantOperations/store transaction boundary.
- Tenant move/delete from system: executed by TenantOperations/SystemInventory transaction boundary.
- RequirementCoverage validation output: derived by RequirementCoverage.
- Warranty display through tenants: derived by WarrantyCollection.
- Activity event creation: emitted by approved store transaction boundaries, not page code.
- Document actions: executed by DocumentCollection.

System must not directly execute Project delivery lifecycle, Opportunity lifecycle, Warranty chain behavior, or RequirementCoverage validation calculations.

When an approved Delivery/Renewal Upsell retains an eligible POC Tenant already hosted on a Production System, the existing System remains the hosting System and is related to the Upsell Project for visibility; no duplicate allocation resource is created merely to represent the retained Tenant.

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
- Requirement coverage status from RequirementCoverage validation output.
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
- `system.remarkAdded`
- `system.remarkUpdated`
- `system.remarkDeleted`
- `system.ownerAdded`
- `system.ownerUpdated`
- `system.ownerRemoved`
- `system.configurationHistoryRecorded`

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
- Future remark events.
- Future owner/responsible-contact events.
- Future configuration history events.

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
- Shared RichTextEditor for Remark content
- Shared deadline alert/status presentation for Remark deadline alerts
- Shared editable table/grid pattern for Remarks and Owner rows where available

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
- Configuration history recorded.
- Remark added/updated/deleted.
- Owner/responsible contact added/updated/removed.
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
- System Configuration History preserves System-owned Application Configuration Summary snapshots independently of Activity Log.
- System Remarks preserve their generated identity, timestamp, and author metadata.
- Remark author metadata is not the Owner child table.
- System Owner rows do not define ERP roles/privileges.
- Project allocation does not transfer System ownership to Project.
- Tenant hosting does not transfer System ownership to Tenant.
- System operational status is owned by SystemInventory.
- Tenant operational status is owned by TenantOperations.
- Warranty status is owned by WarrantyCollection.
- Requirement coverage status is owned by RequirementCoverage as read-model validation output.
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
- RequirementCoverage status/missing-step read-model rules.
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
- System Remarks as a reusable child Business Object implemented first under System.
- System Owner / Responsible Contact rows as a reusable child table implemented first under System.
- System Configuration History as a System-owned read-only child history table.
- View/Edit mode behavior for Systems Workspace when global form standards are implemented.

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
- Generic cross-object Remarks rollout beyond approved parent objects.
- Generic cross-object Owner rollout beyond approved parent objects.
- Generic Configuration History framework outside System.

## V1.2 Time Group Hosting Governance

System Time Group represents the external Customer/POC working-hours context used to schedule maintenance outside customer working hours. Only active Customer and POC Tenants are eligible sources. A valid active explicit governor selected by Change has precedence; otherwise the most veteran active Customer/POC Tenant governs. Internal Tenants never govern, establish, or replace System Time Group and never trigger the mismatch workflow.

A mismatch on later eligible creation/allocation pauses before mutation: Continue adds the Tenant and preserves System governance, Cancel performs no mutation, and Change atomically adds the Tenant and makes it the explicit governor. When a governor leaves active hosting through Delete, Cancel, Move, deallocation, or an equivalent lifecycle, the most veteran remaining active Customer/POC Tenant governs; if none remains, System Time Group is empty. An Internal-only or tenant-less System therefore has an empty Time Group. Project Time Group, Project age, and Region are never fallbacks.

The three contract-status Tenant tables retain visible Time Group text and display a compact accessible globe on the row identified by the authoritative System Time Group source read model. The globe means `System Time Group source`. Number of Tenants still derives from the complete active hosting relationship, while the System Tenant tables present read-only individual Tenant configuration values and the System Application Configuration Summary remains the shared read-only aggregation of all active hosted Tenant configuration. Both use the shared Application Configuration Product-to-final-column metadata structure.
