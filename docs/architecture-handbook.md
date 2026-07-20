# ERP Architecture Handbook

## Console, Workspace, And Business Object Ownership

The ERP models a Delivery organization, not a generic IT organization.

The product architecture is organized around:

```text
Console
  -> Workspace
    -> Business Object
```

It is not organized around job titles. Roles determine permissions. Workspaces determine where business objects are managed. Business objects determine ownership.

## Standard Personas

The standard product has these default personas:

| Console | Personas |
| --- | --- |
| Sales Console | Sales Manager, Customer Success |
| Delivery Console | Delivery Manager, Delivery Specialist |
| Admin Console | ERP Administrator |

There is no dedicated System Engineer persona in the standard product.

Systems and Tenants are operational business objects managed by the Delivery organization. They are supporting business objects inside the Delivery Console and Project Workspace, not objects owned by a separate role.

## Delivery Ownership

Delivery Specialist owns operational execution for:

- Projects
- Systems
- Tenants
- Warranty
- Allocations
- Milestones
- Tasks
- Change Requests
- Renewal execution

Delivery Manager oversees the same operational area and manages Delivery Specialists.

## Console Ownership

### Sales Console

Sales owns the commercial relationship.

Primary workspaces:

- Customer Workspace
- Opportunity Workspace

Sales-owned business objects include Customers, Opportunities, commercial renewal opportunities, deal packages, commercial POC information, and pipeline/commercial reporting.

Delivery may reference customer information, but does not own or edit the customer master.

### Delivery Console

Delivery owns execution.

Primary workspaces:

- Project Workspace
- Systems Workspace
- Tenant Workspace
- Warranty Workspace

Operational surfaces include Renewal Work Queue, Requirement Coverage, Delivery Dashboard, and Delivery Alerts. Requirement Coverage is a validation/read-model surface, not a Business Object Workspace.

Systems and Tenants belong here as delivery-managed operational business objects.

### Admin Console

Admin owns ERP administration.

Primary workspaces include future User, Role, Privilege, Picklist, Template, Metadata, System Settings, and Audit workspaces.

## Future Role Configuration

Future customers may configure different organizational roles, such as:

- Infrastructure Engineer
- Operations Engineer
- Implementation Consultant

These are privilege mappings only. They do not change the underlying ERP architecture.

The architecture remains:

```text
Console
  -> Workspace
    -> Business Object
```

## Product Development Methodology

ERP Version 1.0 follows this frozen product-engineering methodology:

```text
Architecture Handbook
  -> Enterprise Capability Model (ECM)
  -> Business Object Model (BOM)
  -> Business Object Specification (BOS)
  -> Product Design Specification (PDS)
  -> Implementation
  -> Product Readiness Review (PRR)
```

Do not add new methodology artifact types unless explicitly approved.

The Architecture Handbook defines governing principles. The ECM defines business capabilities. The BOM defines the ERP business domain map. BOS documents define object ownership and rules. PDS documents define workspace/page design. Implementation must conform to the approved PDS. PRR identifies readiness findings without expanding implementation scope.

## Future Implementation Process

For every future implementation request:

1. Review the requested feature from a product perspective.
2. Implement only the requested functionality.
3. Perform a Product Readiness Review.

Implementation must stay inside the approved scope. Do not redesign the product, introduce unrelated architecture, or change business behavior unless explicitly requested.

Additional findings discovered during review are reported separately and are not implemented unless explicitly approved.

Product Readiness Review findings should be classified as one of:

- Bug
- UX Improvement
- OO Refactoring
- Shared Component Candidate
- Domain Ownership Issue
- Performance Improvement
- Product Recommendation

## Scope-Based Save Boundary

Every explicit Save action is the commit boundary for the Business Object or save scope it owns. Child-object Save actions commit independently and do not require a subsequent parent-form Save.

A Save action is available only when its owned scope contains a valid change from its persisted baseline. Dirty state is based on normalized value comparison, not on whether a field was touched.

Uncommitted drafts do not affect shared read models. Clicking the Save action belonging to a draft commits that draft's owned scope. The main form Save / Apply Changes action commits parent Business Object fields and must not silently commit independently owned child-object drafts.

Every successful commit must update the authoritative shared store and publish or invalidate all dependent read models. All relevant mounted and subsequently opened consumers must reflect the committed state immediately, without a parent Save, refresh or re-navigation. Only committed values may be published; drafts remain local to their owning save scope.

Every mutation must have one explicit commit boundary. Parent-owned mutations activate the parent Save/Apply action. Independently owned child creates and updates commit through the child Save action, while deletion of a persisted child commits through its confirmed Delete action. Removing an uncommitted draft is local only. No visible mutation may remain without an available commit path.

## Navigation Specification

This section defines the ERP navigation principles. It is an Architecture Handbook enhancement, not a separate methodology artifact.

The ERP navigation hierarchy is:

```text
Console
  -> Workspace
    -> Tab
      -> Section
        -> Card
          -> Table
```

### Navigation Definitions

#### Console

A Console represents a major business capability grouping.

Examples:

- Sales Console
- Delivery Console
- Admin Console

#### Workspace

A Workspace represents one Business Object. Each Business Object owns exactly one Workspace.

Examples:

- Customer Workspace
- Opportunity Workspace
- Project Workspace
- Systems Workspace
- Tenant Workspace
- Warranty Workspace

#### Tab

Tabs represent different views, perspectives, or functional areas of the same Business Object.

Tabs do not represent Business Objects. Tabs do not own business logic.

Example:

Systems Workspace may have tabs such as:

- Production
- Allocated
- Reused

These are views of the Systems Business Object. They are not separate Workspaces.

#### Section, Card, And Table

Sections organize a Workspace or Tab into focused areas. Cards summarize focused information. Tables present collections, relationships, or operational rows.

Sections, Cards, and Tables do not own business rules. They render facts and actions owned by Business Objects, Core Services, or Shared Components.

### Navigation Rules

The left navigation sidebar should expose only:

- Consoles
- Workspaces

The sidebar should generally be limited to two navigation levels.

Third-level navigation items should be avoided unless they represent separate Business Objects with independent ownership.

Views, subsets, filters, operational modes, inventories, or perspectives of the same Business Object should be implemented as Workspace Tabs.

Routes may remain stable for compatibility, but visible navigation should follow Console -> Workspace ownership.

### Current Navigation Review

The current ERP navigation already follows the three-console model:

| Current Item | Current Location | Recommendation | Justification |
| --- | --- | --- | --- |
| Customers | Sales Console | Keep as Workspace | Customer / Account is a Sales-owned Business Object with its own Workspace. |
| Opportunities | Sales Console | Keep as Workspace | Opportunity is a Sales-owned Business Object with its own Workspace. |
| Projects | Delivery Console | Keep as Workspace | Project is a Delivery-owned Business Object and operational delivery center. |
| Systems Workspace | Delivery Console | Keep as Workspace | Systems is a Delivery-owned Business Object. |
| Allocated Systems | Delivery Console -> Systems Workspace | Convert to Workspace Tab | Allocated Systems is a view of the Systems Business Object, not a separate Business Object. |
| Production Inventory | Delivery Console -> Systems Workspace | Convert to Workspace Tab | Production Inventory is an inventory perspective of Systems, not a separate Business Object. |
| Reused Internal Systems | Delivery Console -> Systems Workspace | Convert to Workspace Tab | Reused Internal Systems is an operational subset of Systems, not a separate Business Object. |
| Tenants | Delivery Console | Keep as Workspace | Tenant is a Delivery-owned Business Object with independent lifecycle and identity. |
| Warranty Workspace | Delivery Console | Keep as Workspace | Warranty is a Delivery-owned Business Object with independent lifecycle and chain rules. |
| Renewal Work Queue | Delivery Console | Keep as Workspace for Version 1.0 | It is an operational workspace over Warranty/Renewal execution. It may later become a Warranty Workspace tab if the product consolidates operational queues. |
| Requirement Coverage | Delivery Console | Keep as dashboard/read-model surface for Version 1.0 | It exposes validation and traceability across opportunity requirements, projects, systems, and tenants. It is not a Business Object Workspace because it owns no editable lifecycle or master data. It may later become a Delivery Alerts/Traceability surface depending on product direction. |
| Activity / Audit Log | Admin Console | Keep as Workspace | Audit/activity review is an Admin-owned operational governance workspace. |

### Recommended Future Navigation Structure

Recommended visible navigation should remain:

```text
Sales Console
  Customers
  Opportunities

Delivery Console
  Projects
  Systems Workspace
  Tenants
  Warranty Workspace
  Renewal Work Queue
  Requirement Coverage (validation/read-model surface)

Admin Console
  Activity / Audit Log
```

Within Systems Workspace, the current third-level items should become tabs:

```text
Systems Workspace
  Allocated
  Production
  Reused
```

The existing routes may continue to support deep links and backward compatibility, but the visible sidebar should avoid exposing Systems subsets as third-level navigation items.

## Architecture Handbook Updates

Architecture documentation is a first-class deliverable.

Whenever implementation introduces a new architectural principle, shared component, domain ownership clarification, reusable pattern, or cross-cutting product rule, evaluate whether it belongs in this handbook.

If it does, update the handbook as part of the same work.

## Business Principles

Always preserve:

- Single ownership.
- One source of truth.
- Business Objects own business rules.
- Core Services own shared infrastructure.
- Shared Components own shared UI behavior.
- Pages compose objects and components only.

## Approved Business Forms Are Product Assets

Approved business forms represent proven operational workflows and are considered product assets, not implementation artifacts.

Unless explicitly requested by the Product Owner, architectural work must not redesign, reorganize, simplify, modernize, or otherwise alter the visual structure, workflow, field placement, table layout, interaction patterns, or information density of approved business forms.

The purpose of the ERP architecture is to improve:

- Maintainability
- Clear Business Object ownership
- Dependency management
- Consistency
- Shared Services
- Shared Components
- Navigation
- Extensibility
- Long-term product evolution

while preserving the proven operational user experience.

Business Object ownership, Core Services, Shared Components, and internal architecture are implementation concerns.

They should improve the product without requiring experienced users to relearn proven workflows.

### Operational Workflow Principle

When there is a conflict between architectural purity and an established, efficient operational workflow, preserve the operational workflow.

The architecture must support the workflow, not force the workflow to mirror the architecture.

### Workspace Composition Principle

Business Object ownership determines where business rules live.

Workspace and form composition determine how users perform their work.

A Workspace or Form may compose multiple Business Objects when doing so improves the operational workflow, provided ownership boundaries remain intact.

Therefore:

- Project Form may display Systems and Tenants together.
- Customer Form may display Opportunities and Projects.
- System Form may display hosted Tenants.

This composition does not transfer Business Object ownership.

### UI Preservation Principle

The existing approved business forms are the product baseline.

Future architectural work should be largely invisible to end users.

Users should benefit from:

- Better consistency
- Better navigation
- Better performance
- Better maintainability

without unnecessary visual redesign or workflow changes.

This principle becomes part of the permanent Architecture Handbook and applies to all future implementations unless explicitly overridden by the Product Owner.

## Global Form And Dashboard Standards

These standards apply to approved Version 1.0 business forms and dashboards unless explicitly overridden by the Product Owner.

### Form Field Standards

- Mandatory fields must show a red asterisk next to the field label.
- Read-only fields must render as plain read-only values without editable borders, contours, or input styling.
- Header field presentation must be resolved by effective editability. Effective field editability is the intersection of business editability and the current user's field-level privilege. Authorized users receive the configured metadata editor. All other visible users receive the shared contour-free `HeaderReadonlyValue` presenter. The same privilege definition must be enforced at the commit boundary when field-level privileges are implemented.
- Business forms must support View mode and Edit mode.
- View mode presents business data without accidental edit affordances.
- Edit mode enables approved editable fields and actions.
- Pages compose field metadata, owning-domain validation, and shared form components; pages must not redefine mandatory/read-only behavior independently.

### Dashboard Row Action Standards

- Dashboard rows must not be the primary navigation control.
- Dashboards use a dedicated left-side action column for record actions.
- The View action, represented by an eye icon, opens the target form/workspace in read-only View mode.
- The Edit action, represented by a pencil icon, opens the target form/workspace in Edit mode.
- Dashboard action columns are UI controls only. They are not business data, object fields, report columns, or saved-view business columns.
- Saved dashboard views may preserve user display preferences, but action controls must not become editable business facts or domain-owned fields.

### Date And Time Presentation Standard

- Business data storage keeps canonical date and timestamp values. Transactional timestamps should remain ISO-compatible values where already used.
- Canonical date-only fields may remain date-only values when required by browser date inputs, persistence, or owning-domain rules.
- UI rendering must use the shared DateTimePresentation service for user-facing date and time display.
- Raw ISO timestamps must not be exposed to end users in forms, dashboards, activity timelines, history tables, remarks, or other read-only display surfaces.
- Date and time display must always separate the date and time with a visible space.
- Date and time rendering should use the current browser/user locale until explicit ERP user locale settings are introduced.
- Shared presentation formats include Date, Time, Date + Time, and Date + Time + Seconds.
- The DateTimePresentation service is presentation-only. It must not own business deadline rules, timezone policy, persistence normalization, or domain date calculations.

### Tenant Warranty Status Standard

- Tenant Warranty Status is a derived aggregate of committed Warranty Business Objects.
- WarrantyCollection owns the Tenant Warranty Status derivation and exposes it through the shared domain/read-model layer. Pages must not calculate the aggregate independently.
- Draft Warranty rows do not affect Tenant Warranty Status. The aggregate changes only after the Warranty record is committed through Save or Apply Changes.
- Tenant Warranty Status displays only `Not Set Yet`, `Under Contract`, or `Out of Contract`.
- Precedence is:
  - `Under Contract` when any committed Warranty record is `Planned`, `Valid`, `Pending Renewal`, or `Expired`. `Expired` is intentionally included in this contract category.
  - `Out of Contract` when at least one committed Warranty record is `No Warranty` and every committed Warranty record is only `No Warranty` or `Renewed`.
  - `Not Set Yet` when there are no committed Warranty records, or all committed Warranty records are `Not Set Yet`.
- Aggregate labels may reuse an approved individual Warranty status visual without reusing the individual label. `Under Contract` reuses the individual `Valid` visual, `Out of Contract` reuses the individual `No Warranty` visual, and `Not Set Yet` reuses the individual `Not Set Yet` visual.
- Tenant collection grouping, filtering, summarization, and tabbing by warranty state must consume the shared Tenant-derived Warranty Contract Status. Project, System, Dashboard, Renewal Queue, and future consumers must not inspect Warranty records or duplicate Warranty derivation logic for Tenant grouping.

## Reusable Child Object Principle

Some child structures are reusable across multiple parent Business Objects while still remaining scoped to their parent object instance.

Reusable child objects may include Remarks and Owner/Responsible Contact tables. They can be introduced first under one parent object, such as System, and later reused under Project, Tenant, Customer, Opportunity, Warranty, or other approved parent objects.

Reusable child objects do not transfer ownership of the parent object. The parent object's owning domain controls where the child object is used, while shared metadata/components may standardize rendering and behavior.

Remark author metadata is part of the Remark record. It is not the same concept as the Owner child table.

## Implementation Completion Checklist

Before considering a task complete, verify:

- Functional correctness.
- Object ownership.
- OO consistency.
- Shared component reuse.
- Metadata consistency.
- UI consistency.
- Navigation consistency.
- Product readiness.

## Commercial Product Mindset

The ERP should be treated as a commercial product.

Product engineering should look beyond the requested feature, but implementation must remain limited to the requested scope. Everything else should be reported separately as recommendations.

The Version 1.0 objective is to finish a commercially releasable Delivery ERP.

The Version 1.0 objective is not to build the future configurable ERP platform.

Version 2.0 may introduce configurable ERP platform capabilities after Version 1.0 is complete.
