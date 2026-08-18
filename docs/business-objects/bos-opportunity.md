# Opportunity Business Object Specification

## 1. Business Object Name

Opportunity

## 2. Owning Console

Sales Console

## 3. Owning Domain

OpportunityLifecycle

Supporting domain:

- TenantRequirement for requirement identity/metadata/defaults.

## 4. Business Purpose

Opportunity represents a commercial sales deal.

It captures commercial lifecycle state and delivery intent. It can trigger project creation/update through approved domain/store behavior, but it does not own delivery execution.

Opportunity defines deal identity, customer relationship, commercial stage, deal type and subtype, POC commercial profile, delivery/renewal commercial intent, requirement definitions, and Project creation/update intent.

## 5. Data Ownership

Opportunity owns identity, name, customer/account reference, sales manager/deal owner reference, stage, type, subtype, financial profile for POC-stage opportunity, commercial/delivery intent dates, requirement grids, requirement intent records, deal package context, validation state, and created project references where persisted as opportunity/project linkage.

Opportunity does not own project execution.

## 6. Fields Owned By This Object

- `id`
- `opportunityId`
- `opportunityName`
- `accountId`
- `salesManagerId`
- `stage`
- `type`
- `subType`
- `financialProfile`
- `region`
- `country`
- `state`
- `deliveryDate`
- `pocStartDate`
- `pocEndDate`
- `newTenantRequirements`
- `changeRequestRequirements`
- `standardRenewalRequirements`
- `dealPackages`
- `updatedAt`

Exact field names should follow the existing seed/model types.

## 7. Fields Referenced From Other Objects

Customer / Account fields include account code, account name, customer type, region/country defaults, and sales manager.

Project fields include PID, project name, project type/subtype, project status, and created/latest project relationship.

System fields include SID/MID, product, hosting, and existing system context.

Tenant fields include TID, tenant name, and existing tenant context.

Warranty context for renewal-related opportunity may be displayed read-only.

RequirementCoverage validation output may be displayed read-only later.

## 8. Relationships To Other Objects

- Opportunity belongs to one Customer / Account.
- Opportunity may create or update one or more Projects through approved behavior.
- Opportunity contains requirement definitions.
- Requirement definitions may later be fulfilled by Projects, Systems, and Tenants.
- Opportunity may reference existing Systems/Tenants for change request or renewal context.
- Opportunity may be commercially related to warranty/renewal context, but WarrantyCollection owns operational warranty facts.

## 9. Allowed State / Lifecycle Model

Opportunity lifecycle state is Stage-owned by OpportunityLifecycle.

Approved current direction:

- POC is a Stage.
- WON triggers Delivery or Renewal project creation/update according to type/subtype.
- Opportunity Type is limited to:
  - Delivery
  - Renewal

Subtypes remain owned by OpportunityLifecycle metadata/rules.

Do not introduce new opportunity lifecycle states in BOS without approval.

## 10. Business Rules

OpportunityLifecycle owns stage transitions, stage-driven POC behavior, Opportunity Type values, Opportunity Sub Type options, type/subtype compatibility, financial profile behavior for Stage = POC, POC project sync confirmation, WON transition confirmation, Project creation/update decision logic, Opportunity validation, visible requirement grids by opportunity type/stage, and the relationship between commercial opportunity and project generation intent.

TenantRequirement owns requirement row identity, requirement metadata, defaults, configuration fields, and grid definitions.

Opportunity may define delivery intent, but Delivery owns fulfillment.

## 11. Validation Rules

OpportunityLifecycle-owned validations may include:

- Opportunity ID required and unique.
- Opportunity name required.
- Account/customer required.
- Sales manager valid.
- Stage valid.
- Type valid.
- Subtype valid for type.
- Financial profile required/defaulted when Stage = POC.
- POC start/end dates valid when Stage = POC.
- When Stage = POC, Delivery Date must be on or before Start Date (`Delivery Date <= Start Date`); OpportunityLifecycle rejects an invalid save.
- Delivery date valid when required by stage/type.
- Requirement rows valid according to TenantRequirement metadata.
- Project creation blocked or warned when required fields are missing.

No page-level validation duplication.

## 12. Actions Owned By This Object

Opportunity-owned actions include create opportunity, edit commercial fields, change stage, change type/subtype, edit financial profile for POC-stage opportunity, add/edit/remove requirement rows, edit deal package context where supported, validate opportunity, and trigger project creation/update intent.

## 13. Actions Triggered By This Object But Executed Elsewhere

Opportunity may trigger Project creation, Project update, POC project creation/update selection, Renewal project creation/update, and Delivery project creation/update.

Execution ownership:

- Project creation/update execution belongs to ProjectLifecycle and store transaction boundary.
- Project execution belongs to Delivery Console.
- Allocation/tenant/warranty actions are not Opportunity-owned.

Opportunity must not directly execute allocation, tenant creation, warranty editing, milestone/task completion, or RequirementCoverage validation output generation.

## 14. Statuses Owned By This Object

Opportunity owns:

- Stage.
- Opportunity validation status, if modeled.
- Opportunity type/subtype display state.
- POC financial profile display state.

Opportunity does not own Project status, Project health, System operational status, Tenant operational status, Warranty status, or RequirementCoverage validation output.

## 15. Statuses Displayed From Other Objects

If displayed, Opportunity Workspace may show Project status from ProjectLifecycle, System operational status from SystemInventory, Tenant operational status from TenantOperations, Warranty status from WarrantyCollection, and requirement coverage validation output from RequirementCoverage.

These must be read-only and sourced from owning domains.

## 16. Events Emitted

Future opportunity events may include:

- `opportunity.created`
- `opportunity.updated`
- `opportunity.stageChanged`
- `opportunity.typeChanged`
- `opportunity.requirementAdded`
- `opportunity.requirementUpdated`
- `opportunity.projectCreateRequested`
- `opportunity.projectCreated`
- `opportunity.projectUpdated`

Events should be emitted only from approved store/domain transaction boundaries, not pages.

Current V1 emission may be absent.

## 17. Events Consumed

Opportunity Workspace may consume ActivityLog events where Opportunity is primary or related object.

Examples include Opportunity created/updated, Stage changed, Project created from opportunity, Project updated from opportunity, and Requirement changed.

Do not invent Activity integration unless event selectors/emission exist.

## 18. Core Services Used

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- ActivityLog, if opportunity events exist
- DashboardView for Opportunity dashboard saved views
- Object Registry / Runtime where metadata-driven forms/tables are used
- Persistence boundary
- Business Object Links

## 19. Shared Components Typically Used

- BusinessObjectLink
- BusinessIdLink
- StatusBadge
- AlertStatusIcon
- FormField
- ReadonlyField / ReadonlyGrid
- RichTextEditor for free-text fields if present
- Configuration renderer for requirement configuration fields
- DataDashboard for Opportunity dashboard

Customer Existing Tenants / Systems includes Customer Tenants and surviving POC Tenants only when hosted on a Production System; Deleted/Cancelled POC Tenants and POC-only infrastructure are excluded. Project Type follows Delivery PID in the table and is relationship-derived. Delivery-Upsell and Renewal-Upsell may select an eligible POC Tenant as an existing-Tenant Change Request; fulfillment reuses the Tenant and hosting System and must not create a duplicate Tenant.
- Shared table cells / clamped cell content
- Dialog components where existing

## 20. Permission Principles

Sales Manager owns opportunity editing, can manage opportunity requirements, and can trigger approved project creation/update.

Customer Success may view or assist depending on future privilege mapping.

Delivery Manager / Delivery Specialist may view opportunity context from Delivery workspaces but do not own opportunity commercial edits by default.

ERP Administrator has governance/admin access.

No new permission logic is defined by this BOS.

## 21. Audit / Activity Expectations

Opportunity activity should eventually track created, updated, stage changed, type/subtype changed, requirement added/updated/deleted, project created/updated from opportunity, POC project sync decision, and WON project update decision.

Audit must preserve commercial-to-delivery handoff traceability.

## 22. Invariants

- Every Opportunity has a stable ERP-generated Opportunity ID.
- Opportunity ID is not user-generated or page-generated.
- Opportunity remains Sales-owned.
- POC is a Stage, not a main Opportunity Type.
- Opportunity Type is Delivery or Renewal.
- Opportunity defines delivery intent but not delivery execution.
- Requirement definitions originate in Opportunity/TenantRequirement.
- RequirementCoverage is read-model validation output only and is not owned by Opportunity.
- Projects, Systems, Tenants, Warranties remain Delivery-owned.
- Page code must not own Opportunity business rules.
- Project creation/update happens through approved domain/store behavior.

## 23. Explicit Non-Ownership Boundaries

Opportunity does not own Project execution, Project health, Allocation execution, System operational state, Tenant operational state, Warranty state, RequirementCoverage validation output, Milestone/task execution, Renewal execution work queue, or Delivery alerts.

Opportunity may reference these only as read-only context or trigger approved handoff actions.

## 24. Version 1.0 Scope

V1 includes Opportunity dashboard, Opportunity Workspace, opportunity identity and commercial fields, stage/type/subtype behavior, POC financial profile behavior, requirement grids, existing customer context, Project creation/update behavior already approved, linked/created project display, validation using OpportunityLifecycle, shared reference links, and status presentation through Status & Visual State Engine.

## 25. Version 2.0 Exclusions

Do not include in V1:

- Configurable opportunity object schema.
- Configurable stage model.
- Configurable type/subtype model.
- Configurable requirement grid builder.
- Configurable validation engine.
- Configurable project-generation workflow.
- Configurable approval workflow.
- Configurable deal package designer.
- Configurable pipeline designer.
- CRM integration framework.
- Generic business object builder.
- Dynamic route/workspace builder.
