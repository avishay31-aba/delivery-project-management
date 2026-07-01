# Customer Workspace Product Design Specification

## 1. Workspace Purpose

The Customer Workspace is the Sales Console's complete working environment for one customer/account.

Its purpose is to give Sales Manager and Customer Success users one commercially owned view of the customer relationship, while showing read-only operational context from Delivery.

Primary questions:

- Who is this customer?
- Who owns the commercial relationship?
- What opportunities exist?
- What projects are active or complete?
- What systems and tenants are delivered?
- What warranty/renewal risks exist?
- What documents and activity are associated with the customer?

## 2. Business Ownership

Owning console: Sales Console.

Owning business object: Customer / Account.

Owning domain: CustomerAccount.

Customer is owned only by Sales. Delivery may reference customer information but does not own or edit customer master data.

Delivery-owned facts shown in this workspace must remain read-only and sourced from their owning domains.

## 3. Workspace Responsibilities

The Customer Workspace owns customer identity display, customer commercial profile, account manager display, customer type display, customer relationship summary, aggregated read-only customer portfolio view, navigation to related workspaces, customer-level document visibility if supported, and customer-level activity timeline.

It does not own Project health calculation, Warranty status calculation, RequirementCoverage validation/read-model calculation, System or Tenant operational status, Opportunity lifecycle rules, Document behavior, or Activity event generation.

## 4. Objects Referenced

Sales-owned:

- Customer / Account
- Opportunity
- Deal package context, if exposed through Opportunity

Delivery-owned read-only references:

- Project
- System
- Tenant
- Warranty
- RequirementCoverage validation output
- Document
- Activity Event

Core services:

- Business Identity Service
- Business Reference Resolver
- Status & Visual State Engine
- Shared Business Object Links

## 5. Complete Page Hierarchy

```text
Sales Console
  Customer Workspace
    Header
    Toolbar
    Summary cards
    Tabs
      Overview
      Opportunities
      Projects
      Systems
      Tenants
      Warranties
      Requirements
      Documents
      Activity
```

Route remains `/customers/:accountCode`.

Visible name: Customer Workspace.

## 6. Header Design

Header should show customer name, account ID/account code, customer type, account manager, region, country, state if available, time zone/time group if available, and last updated if useful and already available.

Customer identity fields come from CustomerAccount. Related operational counts are not header identity fields. Header should use shared field/read-only display patterns. Visible customer/account IDs should use shared Business Object Link behavior where applicable.

## 7. Toolbar / Actions

V1-safe actions:

- Back to Customers
- Edit customer only if customer editing is currently supported
- Save / Apply / Cancel only if edit mode exists
- Revert / Undo if shared form behavior supports it
- Open related objects through links

Do not add Create Opportunity, Create Project, Create Tenant, Create Warranty, Assign Account Manager workflow, Merge Customer, or Archive Customer unless separately approved.

Toolbar must not trigger Delivery-owned workflows.

## 8. Navigation Model

Customer dashboard row click opens Customer Workspace. Customer Workspace tabs switch within the workspace. Related object IDs link to their owning workspace.

Navigation rules:

- Use Business Reference Resolver.
- Use shared Business Object Links.
- Do not build page-specific route strings.
- Cross-console links are allowed, but ownership does not move.

## 9. Sections

Overview section:

- Commercial profile
- Relationship summary
- Operational context summary
- Risk/readiness summary

Related object sections:

- Opportunities
- Projects
- Systems
- Tenants
- Warranties
- Requirements
- Documents
- Activity

Each section must state facts from the owning domain.

## 10. Cards

Recommended V1 summary cards:

- Opportunities
- Open Projects
- Systems
- Tenants
- Under Contract
- Out Of Contract
- Expiring 30 Days
- Requirements
- Covered
- Partially Covered
- Missing System
- Missing Tenant
- Unknown Coverage
- Overdue Project Deadlines, if already available through CustomerAccount aggregation

Card ownership follows the owning domains. Cards must not calculate business status directly in the page.

## 11. Tabs

V1 tabs:

1. Overview
2. Opportunities
3. Projects
4. Systems
5. Tenants
6. Warranties
7. Requirements
8. Documents
9. Activity

Tabs are read-only except customer-owned fields if edit mode is supported. Delivery data tabs are contextual, not ownership transfer. Tables should use shared table/cell/link/status patterns.

## 12. Fields

Customer header/profile fields:

- Account ID / account code
- Customer name
- Customer type
- Account manager
- Region
- Country
- State
- Time zone
- Time group
- Updated at

Opportunity tab fields include Opportunity ID, Opportunity name, Stage, Opportunity type, Opportunity subtype, Financial profile, Delivery date, POC start date, POC end date, Validation status, and Updated at.

Project tab fields include PID, Project name, Type, Status, Health status, Deadline risk, Completion %, Current milestone, Last milestone, Open tasks, Completed tasks, and Alerts.

Systems tab fields include SID/MID, Product, Hosting, Cloud platform, CSP, Region, Country, Time group, Operational status, Linked PIDs, and Hosted tenant count.

Tenants tab fields include TID, Tenant name, SID/MID, Product, Hosting, Environment, Operational status, Warranty header status, and Source requirement ID.

Warranty tab fields include Warranty ID, TID, Tenant name, SID/MID, Product, Related Project ID, Warranty type, First, Start date, End date, Days to expiration, Warranty status, Tenant header status, Alerts, Predecessor count, and Successor count.

Requirements tab fields include Requirement ID, Opportunity ID, Requirement grid, Product, Hosting, PID, SID/MID, TID, Coverage status, Missing step, and Alerts.

Documents and Activity tabs use DocumentCollection and ActivityLog fields.

## 13. Related Business Objects

Customer Workspace references Opportunities, Projects, Systems, Tenants, Warranties, Requirements, Documents, and Activity Events.

Reference rules:

- Use Business Reference Resolver for labels/routes/stale checks.
- Missing references should display safely.
- Valid references should be clickable.
- Stale references should be visibly indicated if supported by shared components.

## 14. Business Rules

- CustomerAccount owns customer aggregation.
- CustomerAccount does not recalculate warranty status.
- CustomerAccount does not recalculate project health.
- CustomerAccount does not recalculate requirement coverage.
- WarrantyCollection owns warranty facts/status.
- ProjectLifecycle owns project health/deadline facts.
- RequirementCoverage owns coverage status, missing-step derivation, and coverage alerts as validation/read-model output only.
- SystemInventory owns system identity/status.
- TenantOperations owns tenant identity/status.
- OpportunityLifecycle owns opportunity lifecycle.

Page code must not contain customer portfolio business rules.

## 15. Validation Rules

V1 validation should be limited to existing customer-edit validation if edit mode exists.

Potential CustomerAccount validations include required/unique account code, required customer name, valid customer type, valid account manager, valid region/country, and safe normalization for missing customer identity.

Read-only related tabs do not validate Delivery-owned records.

## 16. Permissions

No permission logic implementation in this phase.

Future permission hooks:

- Sales Manager may view and edit customer commercial profile.
- Customer Success may view customer profile and possibly edit future customer success fields.
- Delivery Manager / Delivery Specialist may view customer context from Delivery objects but do not own customer master data.
- ERP Administrator has governance access.

## 17. Lifecycle States

Customer lifecycle states are not clearly modeled yet.

V1 should avoid inventing new lifecycle states unless explicitly required.

## 18. Status Behavior

Status display must use Status & Visual State Engine.

Customer Workspace should not hard-code status colors, badges, or icons.

## 19. Activity Integration

Activity tab should use ActivityLog selectors and `activityEventsForCustomer`.

Display is read-only, most recent first, uses shared ActivityTimeline, severity from Status & Visual State Engine, and references from Business Reference Resolver.

Customer Workspace must not emit events directly.

## 20. Audit Integration

Audit ownership belongs to ActivityLog / Admin Console.

Customer Workspace may show customer-related audit events. Do not implement new audit events in this PDS.

## 21. Search Behavior

Customer dashboard search should find customers by account code/name. Within Customer Workspace, related object tabs may use table-level search/filter if shared table support exists.

Future search includes cross-object customer workspace search and full-text document search.

## 22. Filtering

Recommended V1 filters, only if existing shared table support is used:

- Opportunities: Stage, Type, Sub type, Financial profile.
- Projects: Status, Health status, Deadline risk, Type.
- Systems: Product, Hosting, Operational status.
- Tenants: Product, Environment, Operational status, Warranty header status.
- Warranties: Warranty status, Tenant header status, Expiration bucket.
- Requirements: Coverage status, Missing step.
- Activity: Category, Severity, future Date range.

## 23. Sorting

Default sorting should use shared dashboard/table behavior where available:

- Opportunities: most recently updated or commercial lifecycle priority.
- Projects: active/open first, then delivery date.
- Systems: SID/MID.
- Tenants: TID.
- Warranties: nearest end date first.
- Requirements: coverage gaps first, then requirement ID.
- Activity: occurredAt descending.

## 24. Future Extension Points

V1-safe future extension points include Customer edit mode, customer commercial notes using Shared Rich Text Editor, customer-level document aggregation, customer alerts, customer health score if explicitly defined, account manager assignment workflow, customer follow-up tasks, Sales dashboard/pipeline integration, Delivery context deep links, privilege-based tab visibility, and stale reference indicators.

Each extension must preserve ownership boundaries.

## 25. Explicit Version 2.0 Items Not Included In V1

Do not include in V1:

- Configurable Customer Workspace layout.
- Configurable tabs.
- Configurable fields.
- Customer object schema builder.
- Customer-specific workflow builder.
- Dynamic rules engine.
- Tenant/customer-specific metadata configuration.
- Customer lifecycle automation engine.
- Pluggable CRM integration framework.
- Configurable permission designer.
- Configurable report builder.
- Configurable alert designer.
- Generic ERP platform object builder.

These belong to Version 2.0: Configurable ERP Platform.
