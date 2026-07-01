# Opportunity Workspace Product Design Specification

## 1. Workspace Purpose

The Opportunity Workspace is the Sales Console's complete working environment for one opportunity/deal.

It defines the commercial deal context and delivery intent that later drives or links to Delivery-owned execution objects.

Primary questions:

- What is the deal?
- Which customer/account is it for?
- What commercial lifecycle stage is it in?
- What is the opportunity type and subtype?
- Is this Delivery or Renewal?
- Is this POC-stage and, if so, is it Free or Paid?
- What requirements has Sales captured?
- What delivery intent should be handed off to Delivery?
- Which Project(s) were created or updated from this opportunity?
- Which existing systems/tenants are relevant commercial context?
- What validation issues block or warn before project creation?

## 2. Business Ownership

Owning console: Sales Console.

Owning workspace: Opportunity Workspace.

Owning business object: Opportunity.

Owning domain: OpportunityLifecycle.

Opportunity is Sales-owned. Opportunity may define delivery intent, but it does not own delivery execution.

## 3. Workspace Responsibilities

The Opportunity Workspace owns Opportunity identity, commercial lifecycle stage, type/subtype, POC financial profile, commercial dates, customer/account linkage, sales manager/deal owner display, requirement definition and intent capture, deal package context, Opportunity validation state, Project creation/update decision triggers already supported, read-only visibility into linked/created projects, and read-only visibility into relevant existing systems/tenants.

It does not own Project execution, Project health, System operational status, Tenant operational status, Warranty status, RequirementCoverage validation output, Allocation execution, Milestone/task execution, or Renewal Work Queue state.

## 4. Objects Referenced

Sales-owned:

- Opportunity
- Customer / Account
- Sales Manager
- Deal Package
- Requirement definitions

Delivery-owned references:

- Project
- System
- Tenant
- Warranty, if visible through related tenants/projects
- RequirementCoverage validation output, read-only if later surfaced
- Activity Events

## 5. Complete Page Hierarchy

```text
Sales Console
  Opportunity Workspace
    Header
    Toolbar
    Commercial summary
    Validation / attention area
    Tabs
      Requirements
      Related Projects
      Existing Customer Context
      Documents, future if supported
      Activity, future if supported
```

Route remains `/opportunities/:opportunityId`.

Visible name: Opportunity Workspace.

## 6. Header Design

Header should show Opportunity ID, Opportunity name, Customer / Account, Sales manager / deal owner, Stage, Opportunity type, Opportunity subtype, Financial profile visible only for Stage = POC, Delivery date, POC start date, POC end date, Validation status, and Last updated if available.

Opportunity ID is ERP-generated and read-only. Customer link uses Business Reference Resolver. Stage/type/subtype use OpportunityLifecycle rules and metadata.

## 7. Toolbar / Actions

V1-safe actions:

- Back to Opportunities
- Save / Apply Changes
- Cancel
- Revert
- Undo, if existing shared undo support is active
- Create / Update Project, existing supported behavior only
- Confirm POC project sync, existing supported behavior only

Do not add allocation, tenant creation, warranty editing, milestone/task completion, renewal work item creation, delivery alert creation, or configurable workflow actions.

## 8. Navigation Model

Opportunity dashboard row opens Opportunity Workspace. Back action returns to Opportunities. Customer links to Customer Workspace. Created project IDs link to Project Workspace. System IDs link to Systems Workspace/System form. Tenant IDs link to Tenant Workspace.

Use Business Reference Resolver and shared Business Object Links. Cross-console links are allowed, but ownership does not move.

## 9. Sections

Recommended V1 sections:

- Opportunity header / commercial profile
- Existing customer tenants/systems context
- Requirement grids
- Created / linked project context
- Validation / warnings
- Project creation/update dialog flow, existing only

Optional V1 if already available:

- Documents
- Activity

Do not introduce new sections that imply Delivery execution ownership.

## 10. Cards

Recommended cards:

- Opportunity Stage
- Opportunity Type
- Opportunity Subtype
- Financial Profile, POC only
- Delivery Date
- POC Start Date, POC only
- POC End Date, POC only
- Requirement row count
- Validation status
- Created Project count
- Latest Project, if already available

Cards must not calculate Project health, Warranty status, Tenant status, System status, or RequirementCoverage validation output.

## 11. Tabs

Recommended V1 tabs:

1. Requirements
2. Related Projects

Optional tabs if already supported without new workflow:

3. Existing Customer Context
4. Documents
5. Activity

Tab ownership:

- Requirements: Sales-owned delivery intent.
- Related Projects: Delivery-owned read-only references.
- Existing Customer Context: read-only context.
- Documents: attached-object document behavior.
- Activity: read-only ActivityLog context.

## 12. Fields

Opportunity identity/commercial fields:

- Opportunity ID
- Opportunity name
- Customer / Account
- Sales manager / deal owner
- Stage
- Opportunity type
- Opportunity subtype
- Financial profile
- Region
- Country
- State
- Delivery date
- POC start date
- POC end date
- Updated at

Requirement fields use the current TenantRequirement model and configuration metadata.

Related project fields include PID, Project name, Project type, Project subtype, Delivery date, POC start/end date, Financial profile, Project status read-only, and link to Project Workspace.

Existing customer context fields include Tenant TID, System SID/MID, Product, Hosting, Operational status, and account/customer relationship.

## 13. Related Business Objects

Opportunity Workspace references Customer / Account, Project(s), System(s), Tenant(s), Requirement definitions, RequirementCoverage validation output future/read-only, Documents if attached, and Activity Events if available.

Reference rules:

- Use Business Reference Resolver.
- Missing references should fail safely.
- Valid references should be clickable.
- Stale references should be indicated if supported.

## 14. Business Rules

OpportunityLifecycle owns Stage rules, Type/subtype rules, POC-stage behavior, Financial profile behavior, Opportunity type transition behavior, Project creation/update decision rules, Opportunity validation, requirement visibility by type/stage, POC project sync confirmation rules, and WON transition confirmation rules.

TenantRequirement owns requirement identity, requirement metadata, requirement grid definitions, requirement row creation defaults, and requirement configuration field metadata.

ProjectLifecycle owns Project creation/update structure and Project execution object.

RequirementCoverage owns coverage status, missing-step derivation, coverage alerts, and linked fulfillment status as validation/read-model output only.

The page owns rendering, local draft UI state, dialog presentation, and calls to approved store/domain actions.

## 15. Validation Rules

Opportunity validation owner: OpportunityLifecycle.

Validation examples:

- Opportunity name required.
- Customer/account required.
- Sales manager valid.
- Stage valid.
- Opportunity type valid.
- Opportunity subtype valid for type.
- Financial profile required/defaulted when Stage = POC.
- POC start/end date validation when Stage = POC, if already supported.
- Delivery date required for relevant deal stages/types, if existing.
- Requirement rows valid according to TenantRequirement metadata.
- Required configuration fields present before project creation, where already supported.

Do not duplicate validation logic in the page.

## 16. Permissions

No new permission logic in this phase.

Future permission intent:

- Sales Manager can view/edit opportunity, manage requirement intent, and trigger approved project creation/update.
- Customer Success may view or assist depending on future privilege mapping.
- Delivery Manager / Delivery Specialist may view opportunity context through Delivery links but should not own opportunity commercial edits by default.
- ERP Administrator has platform governance only.

## 17. Lifecycle States

Opportunity lifecycle states are represented by Stage.

Current/expected stage behavior includes POC, WON, and other existing OpportunityLifecycle-supported stages.

Opportunity Type:

- Delivery
- Renewal

POC is a Stage, not a main Opportunity Type.

Commercial Renewal is an Opportunity concept. Operational Renewal is Delivery-owned through Warranty/Renewal Work Queue.

## 18. Status Behavior

Status display must use Status & Visual State Engine.

Statuses to present centrally include Opportunity stage, validation status, related Project status read-only, requirement attention indicators if already available, New/Updated badges, warnings, and errors.

Opportunity Workspace must not hard-code status colors/icons/badges.

## 19. Activity Integration

V1 should use ActivityLog only if existing selectors support opportunity-related events.

Activity display should be read-only, most recent first, use shared ActivityTimeline if used, use severity from Status & Visual State Engine, and use references from Business Reference Resolver.

Opportunity Workspace must not emit new events unless an approved Activity Log emission phase includes opportunity events.

## 20. Audit Integration

Audit ownership belongs to ActivityLog / Admin Console.

Opportunity Workspace may show opportunity-related audit events if already available.

Future audit events include Opportunity created, updated, Stage changed, Type/subtype changed, Requirement added/updated, Project created from opportunity, Project updated from opportunity, Deal package changed.

## 21. Search / Filter / Sort Behavior

Within Opportunity Workspace, requirement grid search may be future and is not required unless shared grid supports it.

Requirement grid visibility is controlled by OpportunityLifecycle/TenantRequirement rules.

Requirement grids should follow Opportunity/TenantRequirement metadata order.

Do not implement page-specific filtering/sorting logic outside approved metadata/domain behavior.

## 22. Future Extension Points

V1-safe future extension points include Opportunity Activity tab, Opportunity Documents tab, commercial notes using Shared Rich Text Editor, Sales Alerts integration, Pipeline dashboard integration, Deal package workspace, Opportunity validation summary improvements, commercial approval workflow, Customer follow-up actions, privilege-based action visibility, better handoff summary to Project Workspace, and read-only RequirementCoverage validation preview.

Each extension must preserve ownership boundaries.

## 23. Explicit Version 2.0 Exclusions

Do not include in V1:

- Configurable Opportunity layout.
- Configurable requirement grids.
- Configurable opportunity lifecycle builder.
- Configurable validation rules engine.
- Configurable project creation workflows.
- Configurable approval workflow designer.
- Dynamic object schema builder.
- Configurable sales pipeline designer.
- Configurable deal package designer.
- Configurable report builder.
- Configurable alert designer.
- Pluggable CRM integration framework.

These belong to Version 2.0: Configurable ERP Platform.
