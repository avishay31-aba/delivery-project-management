# Customer / Account Business Object Specification

## 1. Business Object Name

Customer / Account

## 2. Owning Console

Sales Console

## 3. Owning Domain

CustomerAccount

## 4. Business Purpose

Customer / Account represents the commercial relationship with an end customer or account.

It is the Sales-owned master object used to organize opportunities, commercial ownership, account context, and read-only operational visibility.

Customer is the commercial anchor for Opportunities, Projects, Systems, Tenants, Warranties, RequirementCoverage validation output, Documents, and Activity.

## 5. Data Ownership

Customer / Account owns customer identity and commercial account profile.

It owns account code, account name, customer type, sales manager/account manager reference, region, country, state, time zone/time group where modeled as account context, display helpers, and customer portfolio aggregation.

It does not own Delivery execution data.

## 6. Fields Owned By This Object

- `id`
- `accountCode`
- `accountName`
- `customerType`
- `salesManagerId`
- `region`
- `country`
- `state`
- `timeZone`
- `updatedAt`
- Customer display name
- Customer type label
- Account manager display
- Customer identity

## 7. Fields Referenced From Other Objects

Opportunity fields include Opportunity ID, name, stage, type, subtype, delivery date, and POC dates.

Project fields include PID, project name, status, health, completion, current milestone, and deadline risk.

System fields include SID/MID, product, hosting, operational status, and region/country.

Tenant fields include TID, tenant name, product, environment, operational status, and warranty header status.

Warranty fields include Warranty ID, status, tenant header warranty status, expiration, and renewal candidate status.

RequirementCoverage read-model output includes Requirement ID, coverage status, missing step, and alerts.

Document fields include file name, source object, and file metadata.

Activity fields include event summary, category, severity, and occurred at.

## 8. Relationships To Other Objects

- Customer to Opportunities: 1:N.
- Customer to Projects: derived through opportunities and/or account matching.
- Customer to Systems: derived through account ownership, tenant hosting, and project relationships.
- Customer to Tenants: 1:N.
- Customer to Warranties: derived through customer tenants.
- Customer to RequirementCoverage validation output: derived through customer opportunities/projects.
- Customer to Documents: aggregated from related projects, systems, tenants, and future customer documents.
- Customer to Activity Events: customer may be primary or related object.

CustomerAccount owns aggregation. Related object domains own their facts and statuses.

## 9. Allowed State / Lifecycle Model

No explicit Customer lifecycle model is approved for Version 1.0.

Current customer type model:

- New
- Veteran

Do not invent lifecycle states such as Active, Dormant, Churned, Strategic, or Blocked in V1 unless explicitly approved.

## 10. Business Rules

- Customer is Sales-owned.
- CustomerAccount owns customer identity and commercial display helpers.
- CustomerAccount may aggregate portfolio facts.
- CustomerAccount must not calculate Delivery-owned status.
- CustomerAccount may compose WarrantyCollection summaries, but WarrantyCollection owns warranty status logic.
- CustomerAccount may aggregate ProjectLifecycle health summaries, but ProjectLifecycle owns health logic.
- CustomerAccount may aggregate RequirementCoverage summaries, but RequirementCoverage owns coverage validation/read-model logic.
- CustomerAccount may aggregate Tenant/System facts, but TenantOperations/SystemInventory own those facts.

## 11. Validation Rules

Potential CustomerAccount-owned validations:

- Account code is required.
- Account code is unique.
- Account name is required.
- Customer type must be valid.
- Sales manager reference must be valid if present.
- Region/country values must be valid if constrained by metadata.
- Missing customer identity must normalize safely.

No new validations are approved solely by this BOS.

## 12. Actions Owned By This Object

Customer-owned actions include create customer, edit customer commercial profile, update account manager, update location fields, view customer portfolio, and open related object workspaces where supported.

V1 currently appears primarily read-only in Customer Workspace.

## 13. Actions Triggered By This Object But Executed Elsewhere

Customer may navigate to Opportunity Workspace, Project Workspace, Systems Workspace item, Tenant Workspace, Warranty context, documents, and activity.

Customer should not execute Delivery workflows.

Customer should not create Projects, Systems, Tenants, Warranties, or allocations directly in V1.

## 14. Statuses Owned By This Object

Customer currently owns no approved lifecycle status beyond customer type display.

Owned display:

- Customer type label.

Future statuses require explicit approval.

## 15. Statuses Displayed From Other Objects

- Opportunity stage from OpportunityLifecycle.
- Project status and health from ProjectLifecycle.
- System operational status from SystemInventory.
- Tenant operational status from TenantOperations.
- Warranty status from WarrantyCollection.
- Requirement coverage status from RequirementCoverage validation output.
- Activity severity from ActivityLog.

CustomerAccount may aggregate counts but must not derive the underlying statuses.

## 16. Events Emitted

Existing/future customer events may include:

- `customer.created`
- `customer.updated`
- `customer.accountManagerChanged`

If implemented, events should be emitted from approved store/domain transaction boundaries, not pages.

Current V1 event emission for Customer may be absent.

## 17. Events Consumed

Customer Workspace may consume ActivityLog events where Customer is primary or related object.

Examples include Project created for customer, System allocated for customer project, Tenant created for customer, future Warranty events, and future Opportunity events.

## 18. Core Services Used

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- ActivityLog
- DashboardView where customer dashboard uses saved views
- Persistence boundary
- Object Registry / Runtime where metadata-driven views are used

## 19. Shared Components Typically Used

- BusinessObjectLink
- BusinessIdLink
- StatusBadge
- AlertStatusIcon
- ProgressBar
- ActivityTimeline
- ReadonlyField / ReadonlyGrid
- Shared delivery tables where relevant
- ClampedTableCellContent
- DocumentsPanel / document display components where relevant

## 20. Permission Principles

Sales Manager owns customer commercial data, can view full Customer Workspace, and may edit customer profile if edit mode is supported.

Customer Success can view customer profile and operational context and may edit customer success fields if such fields are introduced.

Delivery Manager / Delivery Specialist may view customer context through Delivery objects but do not own Customer master data.

ERP Administrator may access governance/admin capabilities.

Permissions are future hooks in V1 unless explicitly implemented.

## 21. Audit / Activity Expectations

Customer-related activity should be visible in Customer Workspace.

Audit/activity should include Customer created/updated, Opportunity created/updated for customer, Project created for customer, System allocated for customer project, Tenant created for customer, future Warranty events, and future Document events.

ActivityLog owns event shape, selection, and display support.

## 22. Invariants

- Every Customer has a stable business ID/account code.
- Customer business ID is ERP-owned and not page-generated.
- Customer remains Sales-owned.
- Delivery data shown in Customer Workspace is read-only context.
- CustomerAccount does not calculate Delivery statuses.
- Customer Workspace does not execute Delivery workflows.
- Related object navigation uses Business Reference Resolver/shared links.
- Customer aggregation must preserve owning-domain status semantics.

## 23. Explicit Non-Ownership Boundaries

Customer / Account does not own Project execution, Project health, System operational status, Tenant operational status, Warranty status, Requirement coverage status, Allocation logic, Milestone/task execution, Renewal execution, Activity event taxonomy, or Document behavior beyond approved customer-level aggregation.

## 24. Version 1.0 Scope

V1 includes Customer dashboard, Customer Workspace, customer identity/profile display, account manager display, portfolio summaries, read-only operational context, related object links, documents aggregation if already supported, and activity timeline if available.

V1 does not require full customer edit workflow, customer lifecycle states, customer-specific alerts workspace, or customer document collection as a standalone owned collection unless approved.

## 25. Version 2.0 Exclusions

Do not include in V1:

- Configurable Customer schema.
- Configurable Customer Workspace layout.
- Dynamic customer lifecycle builder.
- Customer workflow builder.
- Configurable customer alert designer.
- Configurable customer permission designer.
- CRM integration framework.
- Customer-specific metadata customization.
- Generic account object builder.
