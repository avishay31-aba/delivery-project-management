# Tenant Business Object Specification

## 1. Business Object Name

Tenant

## 2. Business Purpose

Tenant represents the customer-facing runtime entity deployed inside a System.

A Tenant is the deployable and movable customer/runtime environment used to deliver a product configuration, POC environment, renewal context, or operational customer environment.

System is the reusable Delivery Resource. Tenant is the runtime entity that lives inside a System.

Tenant reflects the deployed customer runtime after the allocated System has been configured according to the System-owned Application Configuration Summary.

## 3. Business Ownership

Tenant is Delivery-owned.

Delivery Manager and Delivery Specialist own tenant operational lifecycle and tenant execution context.

Tenant is not owned by Sales, Customer, Opportunity, Project, System, Warranty, or RequirementCoverage validation/read-model capability.

## 4. Primary Capability

Delivery Capability -> Tenant Management

Supporting capabilities referenced:

- Delivery Capability -> Infrastructure & Resource Management
- Delivery Capability -> Project Delivery Management
- Delivery Capability -> Warranty Management
- Delivery Capability -> Requirement Fulfillment Tracking / RequirementCoverage read models
- Administration Capability -> Activity / Audit

## 5. Console Ownership

Delivery Console

## 6. Workspace Ownership

Tenant Workspace

Tenant Workspace is the complete working environment for the Tenant Business Object.

Tenant Workspace has one dashboard view:

- Tenant Dashboard: all Tenants, including Deleted Tenants and retained legacy Cancelled Tenant records.

Warranty Status values such as `Not Set Yet`, `Under Contract`, and `Out of Contract` are Tenant data/filter/grouping values, not Tenant Workspace dashboard partitions.

Project Workspace and Systems Workspace may show tenant context, but do not own Tenant lifecycle.

## 7. Data Ownership

Tenant owns customer/runtime environment facts.

Tenant owns:

- Tenant identity
- Tenant runtime/environment identity
- Tenant operational status
- Tenant lifecycle
- Tenant customer linkage
- Tenant project linkage context
- Tenant system linkage context
- Tenant-specific configuration context where modeled
- Tenant movement history where supported
- Tenant source requirement reference
- Tenant delivery/source context
- Tenant documents/activity context where supported
- Tenant warranty header context display, sourced from WarrantyCollection

Tenant does not own System infrastructure configuration, System Application Configuration Summary, Project delivery execution, Customer commercial identity, Opportunity commercial lifecycle, Warranty chain/status rules, or RequirementCoverage validation/read-model rules.

Tenant never owns Application Configuration Summary. Tenant consumes the configured runtime result from the System that hosts it.

## 8. Fields Owned

Exact field names should follow existing seed/model types.

Tenant-owned fields include:

- `id`
- `tid`
- There is no Tenant Name business field; Tenant identity is TID plus related Account/System/Project context.
- `tenantType`
- `environment`
- `operationalMode`
- `operationalStatus`
- `lastManualOperationalStatus`
- `individualLifecyclePreviousOperationalStatus`
- `systemForcedPreviousOperationalStatus`
- `systemForcedBySystemId`
- `accountId`
- `accountName`
- `country`
- `timeGroup`
- `systemId`
- `hostedSystemId`
- `deliveryPid`
- `projectId`
- `sourceRequirementId`
- `createdFromRequirementId`
- `productType` where tenant-specific
- `hostingType` where tenant-specific/displayed as delivered tenant context
- `cloudPlatform` where tenant-specific/displayed as delivered tenant context
- Tenant-specific configuration fields where modeled
- Movement/source system history where modeled
- Tenant documents where modeled
- Tenant activity context where modeled
- `createdAt`
- `updatedAt`

Tenant-owned derived/read-model fields include:

- Tenant display name
- Tenant runtime/environment label
- Tenant operational status label
- Tenant current system identity
- Tenant delivery project identity
- Tenant customer identity
- Tenant source requirement identity
- Tenant contract grouping, sourced from WarrantyCollection/header context where appropriate
- Tenant move readiness where modeled

## 9. Referenced Fields

System fields:

- SID/MID
- System identity
- System source/type
- Hosting model
- System operational status
- Application Configuration Summary
- Product/version/context
- Region/location

Project fields:

- PID
- Project name
- Project type/subtype
- Delivery status
- Project tenant link context

Customer / Account fields:

- Account code
- Account name
- Country
- Region
- Account manager

Opportunity fields:

- Opportunity ID
- Requirement source context

Requirement fields:

- Requirement ID
- Requirement grid/type
- Requirement product/configuration intent

Warranty fields:

- Warranty ID
- Warranty row status
- Tenant header warranty status
- Warranty start/end dates
- No warranty / renewal context

RequirementCoverage read-model output:

- Coverage status
- Missing step
- Requirement/tenant linkage context

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

- Tenant executes inside one current System.
- Tenant may move between Systems over time where supported.
- System may host many Tenants.
- Tenant's selected PID/Project ID is the authoritative Origin Project relationship. It is established at creation and retained for Tenant lifetime/history regardless of Operational Status.
- Individual Tenant Delete stores the exact previous Operational Status for historical audit. System-forced statuses store a separate previous Operational Status and forcing System ID, and are restored only by returning that System to `On`.
- Tenant manual Operational Status choices are only `Active` and `Access Blocked - Password Reset`; System-derived/forced statuses are read-only.
- Requirement history records the same-Project Requirement relationships for Customer/POC Tenants. A Requirement may be associated with more than one Tenant; released/historical rows remain visible as history.
- Requirement IDs are generated from the shared application-wide human-readable sequence (`A-001`, `A-002`, ...). Tenant Requirement pickers for Create and Attach show the same Requirement rows, and rows are not disabled merely because another Tenant already references them.
- A Tenant's current Project membership is established by active ProjectTenant attachment plus active allocation of the Tenant's hosting System to that Project. Historical Origin Project/PID and Requirement provenance are retained but must not reattach the Tenant to a deallocated Project.
- Warranty predecessor selection is by searchable TID; retained legacy Cancelled Tenants are excluded and Deleted Tenants remain eligible historical predecessors.
- Project may create or link Tenant context, but does not own Tenant lifecycle.
- Tenant may originate from an Opportunity requirement.
- Tenant may satisfy RequirementCoverage validation output through source requirement linkage and system/project context.
- Tenant belongs to or is associated with one Customer / Account.
- Tenant may have many Warranty records through WarrantyCollection.
- Tenant may have Documents.
- Tenant may have Activity Events.
- Tenant may appear in Tenant Workspace, Project Workspace, Systems Workspace, Warranty Workspace, Requirement Coverage validation surfaces, Customer Workspace, Activity / Audit Log, and future Delivery Alerts.

## 11. Lifecycle

TenantOperations owns the Tenant lifecycle.

Approved/current tenant operational states include existing modeled values such as:

- Operative / System On-derived
- Service Blocked-derived
- Access Blocked-derived
- Deleted
- Cancelled
- Access Blocked - Password Reset

Lifecycle principles:

- The first group may reflect current System operational state when no manual override applies.
- Manual tenant operational values represent tenant-specific business/operational actions.
- Manual tenant status may override the derived System state where approved.
- Tenant may move between Systems.
- Tenant deletion/removal must preserve historical references safely.

No new lifecycle states are introduced by this BOS.

## 12. Business Rules

- Tenant Application Configuration is Tenant-owned delivered-runtime configuration. Its editor uses the single authoritative shared Application Configuration Product-to-final-column metadata structure also consumed by Opportunity New Tenant Requirements, System Tenant tables, and System Application Configuration Summary. Field IDs/keys, order, labels, field types, option metadata, validation metadata, and product-dependent applicability are not Tenant-page-owned. Tenant Configuration is read-only in view mode, editable in edit mode, and persists only through the Tenant save transaction.
- Tenant is Delivery-owned.
- Tenant executes inside System.
- Tenant may move between Systems.
- Moving a Tenant does not transfer System ownership.
- Tenant lifecycle belongs to TenantOperations.
- System configuration belongs to SystemInventory.
- Application Configuration Summary remains System-owned.
- Tenant reflects the deployed customer runtime after the allocated System has been configured.
- Tenant never owns Application Configuration Summary.
- Project may create/link tenant context, but Project does not own Tenant lifecycle.
- Warranty status belongs to WarrantyCollection.
- RequirementCoverage validation output belongs to RequirementCoverage.
- Customer commercial identity belongs to CustomerAccount.
- Opportunity commercial lifecycle belongs to OpportunityLifecycle.
- Tenant may store tenant-specific configuration context only where it represents delivered tenant runtime context, not System infrastructure configuration.
- Tenant must not duplicate System infrastructure rules.
- Tenant must not duplicate Warranty rules.
- Tenant must not duplicate Project execution rules.
- Tenant must not duplicate RequirementCoverage validation/read-model rules.

## 13. Validation Rules

TenantOperations-owned validations may include:

- TID is required and unique.
- Tenant name is required where business process requires it.
- Tenant type must be valid.
- Tenant type is determined at creation by the existing authoritative Project mapping or explicit Internal creation flow and is immutable afterward; Tenant edit and hosting-move transactions must preserve it.
- Operational status/mode must be valid.
- Manual operational override values must be valid.
- Current System reference must resolve unless tenant is in an allowed detached/deleted state.
- Hosted System reference must resolve where required.
- Account/customer reference must resolve where required.
- Delivery project reference must resolve where required.
- Source requirement ID must resolve when tenant is created from a requirement.
- Tenant creation from a requirement must prevent duplicate tenant creation for the same requirement where approved.
- Tenant move must target a valid System.
- Tenant delete/remove must preserve historical references safely.
- Tenant warranty header display must be sourced from WarrantyCollection, not persisted stale header status if canonical read model exists.
- Tenant warranty header status is presented only for Customer Tenants and is visually empty for non-Customer Tenants.
- An active POC Tenant relationship derives header POC Start Date and POC End Date from the active linked POC Project; Tenant does not separately own or persist those presentation values.
- The Warranty section is composed for a Customer Tenant with Tenant-owned Delivery or Renewal Project context, including retained Origin PID/Project, Requirement history, current ProjectTenant membership, or existing Warranty records. The section must remain available for valid Customer Tenants with no Warranty rows yet and must continue to display existing Warranty records even when the Tenant/Project relationship is historical; Add/Edit manageability may still require resolvable Project/Opportunity context. POC, Internal, and other non-Customer Tenants do not qualify.
- Tenant cancellation is no longer an active Tenant lifecycle workflow. The Tenant form does not expose a `Cancel Tenant` header control, and System/Tenant relationship sections must not expose Cancel or Restore Tenant actions. Retained legacy Cancelled Tenants display read-only `Cancelled By`, `Cancellation Timestamp`, and rich-text `Cancellation Reason` where those historical audit fields exist.

SystemInventory-owned validations may apply to system existence/readiness.

AllocationContext-owned validations may apply to project/system/tenant relationship context.

WarrantyCollection-owned validations apply to warranty records/status.

No page-level validation duplication.

## 14. Actions Owned

Tenant-owned actions include:

- Create Tenant where supported.
- Create Tenant from approved requirement context.
- Edit Tenant identity/profile fields.
- Edit tenant operational status/manual override.
- Move Tenant to another System where supported.
- Remove/delete Tenant from System where supported.
- View current System.
- View delivery Project.
- View related Customer.
- View source Requirement context.
- View Warranty records/header context.
- View Tenant documents.
- View Tenant activity.

## 15. Actions Triggered But Executed Elsewhere

Tenant may trigger or coordinate:

- System hosting update: executed through TenantOperations/SystemInventory transaction boundary.
- Project tenant link update: executed through TenantOperations/AllocationContext where applicable.
- Warranty read model refresh/display: executed by WarrantyCollection.
- RequirementCoverage validation output: derived by RequirementCoverage.
- Activity event creation: emitted by approved store transaction boundaries, not page code.
- Document actions: executed by DocumentCollection.

Tenant must not directly execute Project lifecycle, System configuration changes, Warranty chain behavior, Opportunity lifecycle, or RequirementCoverage validation calculations.

## 16. Statuses Owned

TenantOperations owns:

- Tenant operational status.
- Tenant manual operational override status.
- Tenant lifecycle state where modeled.
- Tenant runtime/environment display state.
- Tenant current system linkage state.
- Tenant deleted/cancelled state where modeled.

Status & Visual State Engine owns presentation only.

## 17. Statuses Displayed

Tenant Workspace may display, read-only from owning domains:

- System operational status from SystemInventory.
- Project delivery status from ProjectLifecycle.
- Warranty row/header status from WarrantyCollection.
- Requirement coverage status from RequirementCoverage validation output.
- Customer/account display from CustomerAccount.
- Opportunity/requirement context from OpportunityLifecycle/TenantRequirement.
- Activity severity/category from ActivityLog.
- Document metadata/status from DocumentCollection where present.

Tenant must not recalculate these statuses.

## 18. Events Emitted

Existing/future Tenant events may include:

- `tenant.created`
- `tenant.createdFromRequirement`
- `tenant.updated`
- `tenant.operationalStatusChanged`
- `tenant.manualOperationalOverrideChanged`
- `tenant.movedToSystem`
- `tenant.deletedFromSystem`
- `tenant.projectLinkChanged`
- `tenant.warrantyContextChanged`
- `tenant.documentAdded`

Current V1 event emission may be partial.

Events must be emitted only from approved store/domain transaction boundaries, not React pages or selectors.

## 19. Events Consumed

Tenant Workspace may consume ActivityLog events where Tenant is primary or related object.

Examples:

- Tenant created.
- Tenant created from requirement.
- Tenant moved to system.
- Tenant deleted from system.
- System allocated/deallocated where tenant is affected.
- Warranty created/renewed/changed.
- Future operational status changes.
- Future document events.

ActivityLog owns event shape, selectors, and timeline presentation.

## 20. Core Services Used

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- ActivityLog
- DashboardView for Tenant dashboards/saved views
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
- RichTextEditor where comments/notes are present
- DataDashboard for Tenant dashboard
- ClampedTableCellContent
- Shared dialog components where existing

## 22. Permission Principles

Delivery Manager can view and manage Tenants.

Delivery Specialist can view and execute supported operational Tenant work according to future privilege mapping.

Sales Manager / Customer Success may view Tenant context from Sales workspaces, but do not own Tenant editing.

ERP Administrator may access governance/admin capabilities.

No new permission logic is defined by this BOS.

Permissions are future hooks unless explicitly implemented.

## 23. Audit / Activity Expectations

Tenant-related activity should be visible in Tenant Workspace and Activity / Audit Log.

Audit/activity should include:

- Tenant created.
- Tenant created from requirement.
- Tenant updated.
- Operational status changed.
- Manual operational override changed.
- Tenant moved to System.
- Tenant removed/deleted from System.
- Project link changed.
- Warranty context changes.
- Document actions.

Tenant page code must not emit events directly.

## 24. Invariants

- Every Tenant has a stable ERP-generated TID.
- TID is not user-generated or page-generated.
- Tenant remains Delivery-owned.
- Tenant executes inside a System.
- Tenant may move between Systems.
- Moving Tenant does not transfer System ownership.
- Tenant lifecycle belongs to TenantOperations.
- System configuration belongs to SystemInventory.
- Application Configuration Summary remains System-owned.
- Tenant never owns Application Configuration Summary.
- Warranty status belongs to WarrantyCollection.
- RequirementCoverage validation output belongs to RequirementCoverage.
- Project may create/link tenant context but does not own Tenant lifecycle.
- Customer and Opportunity remain referenced context only.
- Business object navigation uses Business Reference Resolver/shared links.
- Tenant Workspace renders owning-domain facts; it does not create page-local business calculations.

## 25. Explicit Non-Ownership Boundaries

Tenant does not own:

- System infrastructure configuration.
- Application Configuration Summary.
- System operational state.
- Project delivery lifecycle.
- Project health.
- Allocation relationship semantics.
- Customer commercial identity.
- Opportunity commercial lifecycle.
- Requirement definition ownership.
- Warranty chain/status rules.
- RequirementCoverage status/missing-step read-model rules.
- Activity event taxonomy.
- Document behavior beyond tenant context.
- Dashboard saved view lifecycle.
- Admin metadata/picklists/templates, except consuming approved metadata.

Tenant may coordinate and display these as context only.

## 26. Version 1.0 Scope

V1 includes:

- Tenant dashboard/list where implemented.
- Tenant Workspace/Form.
- Tenant identity/profile.
- Tenant operational status / operational mode behavior where supported.
- Manual operational override where supported.
- Current System linkage.
- Delivery Project linkage.
- Source requirement context.
- Tenant configuration context where already modeled.
- Tenant movement/delete from System where already supported.
- Warranty table/header context display sourced from WarrantyCollection where implemented.
- Documents where already supported.
- Activity timeline where already supported.
- Shared reference links and shared status presentation.
- Safe validation for TID uniqueness and tenant-system linkage.

V1 does not require advanced tenant lifecycle automation, configurable tenant schemas, tenant SLA engine, or external runtime orchestration.

## 27. Version 2.0 Exclusions

Do not include in V1:

- Configurable Tenant schema.
- Configurable Tenant Workspace layout.
- Configurable tenant lifecycle designer.
- Configurable operational override model.
- Configurable tenant validation engine.
- Configurable tenant move workflow.
- Automated runtime orchestration.
- Tenant observability integration.
- Tenant capacity forecasting.
- Generic tenant object builder.
- Configurable permission designer.

## V1.2 Geography, Configuration, and Hosting

Tenant geography follows its Project/Customer context. Country/State derives Time Zone and active Time Group Settings resolves Time Group; absent Time Zone produces no Time Group and Region is not a fallback. Tenant Configuration is Tenant-owned and editable through its existing save/history boundary, while its Product-to-final-column structure comes from the shared Application Configuration metadata. The hosted System Application Configuration Summary is a distinct read-only System-owned aggregation over the same shared configuration structure.

Tenant Type is not manually editable after creation. The only lifecycle-controlled exception is POC-to-Customer conversion through fulfillment of a Delivery-Upsell or Renewal-Upsell Change Request for a surviving POC Tenant already hosted on a customer Production System. The same Tenant and System are retained; historical POC Project/Requirement relationships remain intact; the new Upsell Project/Requirement relationships are additional; Warranty Status becomes `Not Set Yet`; and Activity records the transition. Customer warranty rules apply only after conversion.

The Tenant Dashboard uses `Origin Project` for the Tenant's authoritative selected creation PID/Project and `PIDs` for current Project membership only. `Requirement IDs` displays PID-qualified Requirement history/current rows for Customer/POC Tenants created from Project Tenant Requirements; Requirement ID is not the universal Project owner. Internal Tenants may have a PID with no Requirement ID. Multi-value cells use semicolon-delimited display when multiple values are explicitly modeled. Account Name and Region remain Tenant Customer/Account-context values. Project Type and Project Sub Type immediately follow Tenant Type and describe the Project in which the Tenant was originally created; later Project participation does not overwrite them. Its approved default order ends with Warranty Initial/Start/End Date, active POC Project Start/End Date, Update Date, and Creation Date; Creation Date is last. The Tenant Dashboard includes all Tenants regardless of Warranty Status or Operational Status, including Deleted Tenants and retained legacy Cancelled Tenant records.
