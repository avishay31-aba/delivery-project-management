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

## ERP UI/UX Consistency

New functionality must first reuse existing shared application patterns.

Equivalent business meanings must use identical shared components, icons, labels, colors, typography, spacing and interaction patterns. External product concepts may guide behavior, but they must not introduce a separate visual language into the ERP. Any new local UI pattern requires explicit approval and Architecture Handbook documentation.

## Scope-Based Save Boundary

Every explicit Save action is the commit boundary for the Business Object or save scope it owns. Child-object Save actions commit independently and do not require a subsequent parent-form Save.

A Save action is available only when its owned scope contains a valid change from its persisted baseline. Dirty state is based on normalized value comparison, not on whether a field was touched.

Uncommitted drafts do not affect shared read models. Clicking the Save action belonging to a draft commits that draft's owned scope. The main form Save / Apply Changes action commits parent Business Object fields and must not silently commit independently owned child-object drafts.

Every successful commit must update the authoritative shared store and publish or invalidate all dependent read models. All relevant mounted and subsequently opened consumers must reflect the committed state immediately, without a parent Save, refresh or re-navigation. Only committed values may be published; drafts remain local to their owning save scope.

Every mutation must have one explicit commit boundary. Parent-owned mutations activate the parent Save/Apply action. Independently owned child creates and updates commit through the child Save action, while deletion of a persisted child commits through its confirmed Delete action. Removing an uncommitted draft is local only. No visible mutation may remain without an available commit path.

Every persisted mutation must have an explicit and visible commit boundary. Parent-owned staged mutations activate Save/Apply. Independently owned child Save actions commit explicitly. Destructive persisted actions require confirmation before immediate commit. Successful commits provide visible confirmation; failed commits provide visible error feedback. Removing an uncommitted draft is local and must be distinguished from deleting persisted data. No mutation may commit silently.

## Shared Audit Trail

Every Business Object in the ERP participates in the shared Audit Trail framework.

Every meaningful business event is recorded through the shared mutation lifecycle. Audit Trail coverage is mandatory for every new Business Object introduced into the ERP.

Audit Trail records are immutable chronological business records. They are created by authoritative domain/store transactions, not by React pages or presentation components. Corrections, cancellations, rollbacks and reversions create additional audit records rather than editing or deleting prior records.

Audit Trail records must include structured metadata where applicable: timestamp, user, Business Object, Business Object ID, parent Business Object, event category, event type, previous values, new values, human-readable description, correlation ID and source.

The Audit Trail covers lifecycle events, persisted field changes, operational events, child Business Object mutations, security events, cancelled or reverted business operations, and system-generated events. It excludes meaningless UI telemetry such as scrolling, tab opening, mouse movement, grid sorting, field typing before Save, and other draft-only interactions.

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

### Workspace UI Standard

Every ERP Workspace must reuse the shared Workspace template. The visual hierarchy, typography, spacing, tab positioning, and overall layout must be identical across all workspaces.

The approved hierarchy is:

```text
Workspace Title
Workspace Tabs
Workspace Content
```

Business Objects may differ in content only. A Workspace must not introduce workspace-specific UI patterns, duplicated tab styling, or an additional page title between the Workspace title and Workspace tabs unless explicitly approved in the Architecture Handbook.

### Business Object Mutation Ownership Principle

Every business mutation must be initiated only by the Business Object that owns the business responsibility. Referencing or displaying another Business Object does not grant ownership of that object's lifecycle.

Ownership is determined by business responsibility, not UI location. The UI exposes mutations from the owning Business Object; button placement is a consequence of ownership, not the definition of ownership.

Derived states are computed from the authoritative owner and must not be edited independently by consumers. For Tenant hosting lifecycle, System owns Move Tenant, Delete Tenant, and Cancel Tenant because those actions change or terminate hosting relationships. Tenant owns Tenant-specific commercial and operational information, but it must not expose hosting lifecycle mutations.

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

### Business ID Link Standard

- Every displayed Business Object ID must render through the shared Business ID link presenter whenever that object has a supported route.
- The standard presenter owns route-aware fallback behavior. Pages, dashboards, forms, tables, dialogs, tooltips, activity references, and history views must not create local anchor tags or duplicate routing logic for Business Object IDs.
- Empty IDs display the shared empty value. IDs without a supported route may render as read-only text through the shared fallback.
- Export and persistence paths keep plain ID text only; presentation components must not enter domain/read-model values.

### Operational Status Presentation Standard

- Every field or column representing `Operational Status` must use the shared icon-and-text operational status presentation where text display is required.
- Operational Status presentation must include the status text and the approved colored indicator. Color may reinforce status but must not be the only signal.
- The shared presenter receives the stored or derived Operational Status value exactly as owned by the Business Object. It must not infer Operational Status from Warranty Status, Maintenance Status, linked-object state, dates, allocation state, or other fields.
- Sorting, filtering, export, persistence, and read models operate on the raw Operational Status value, not on rendered icons.

### Related Object Read Model Standard

- Current attributes of a related Business Object must be resolved from the authoritative related-object store or shared read model.
- Relationship/history records may store the related Business Object identity and event-time facts, but they must not become a stale source of truth for current related-object attributes unless explicitly modeled as a separate historical snapshot column.
- Pages and tables render the shared read model result only; they must not duplicate current-status synchronization logic.

### Project Alert Standard

- Project alerts use one shared Project-domain derivation and one shared critical-alert presentation.
- The shared Project alert derivation owns Delivery Overdue, POC Overdue, No Delivery Date, No End Date, their date/status rules, and their stable display order.
- Forms, dashboards, exports and future Project references consume raw alert labels from the shared read model and render alerts through the shared presentation component.

### Pick List Interaction Standard

- Every custom ERP pick list must close when the user selects an option, clicks outside the control/menu, presses Escape, or tabs focus away.
- The shared pick-list controller owns open/close behavior, cleanup, and keyboard/outside-click handling. Business pages must not patch individual pick lists locally.
- Closing a pick list without selecting an option preserves the existing value and must not create a draft change or trigger a Save action.
- Custom dropdowns, multi-selects, lookup selectors, autocomplete lists, checkbox selectors, and menu-style pick lists must render through the shared floating overlay infrastructure.
- Floating selector overlays must be portaled outside scroll containers, detect available viewport space, open downward or upward as appropriate, clamp to the visible area, and provide their own internal scrolling when the list is taller than the available space.
- Parent forms, dialogs, dashboards, grids, and workspace scroll frames must not own dropdown clipping behavior or local overflow workarounds.

### Pageable Child Collection Standard

- Child collections that support pagination, search, date filtering, or record-count controls must use a shared pageable/filterable collection shell.
- The default Records per page value is 10, with the approved shared options 10, 20, 25, 50, 100, and All.
- The processing order is: all records, date filtering, text search, selected sort, then pagination.
- Empty collections display the standard no-records message. Collections with records but no filter matches display the standard no-matching-records message.

### User Presentation Preference Standard

- User-selected presentation defaults, such as Records per page, belong to the user presentation preference layer and must not dirty or mutate Business Objects.
- Preferences are scoped by the current user and a stable logical UI context such as a dashboard scope or shared table type. They must not be scoped by route, selected record, or object instance ID.
- Resolution precedence is user-specific preference, then future admin/global default when introduced, then the system default.
- In V1.2, preferences use the existing current-user abstraction and browser persistence. A future authenticated release should migrate the same logical preferences to backend User Preferences without changing table consumers.
- Shared pageable tables and dashboards expose Set as Default and Reset to Default through the shared framework wherever Records per page is available.

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

### Tenant Operational Status Standard

- Tenant Operational Status has separate stored manual state and derived effective presentation. `lastManualOperationalStatus` may only be `Active` or `Access Blocked - Password Reset`.
- Tenant effective Operational Status is resolved by the shared TenantOperations precedence model: Tenant action terminal states (`Deleted - By System`, `Cancelled - By System`), then hosted System-derived overrides (`Access Blocked - System Level`, `Service Blocked - System Level`, `Deleted - System Level`, `Cancelled - System Level`, `Off - System Level`), then the last saved manual Tenant status when the hosted System is `On`.
- System-level overrides must not overwrite `lastManualOperationalStatus`; when a temporary System `Off` state returns to `On`, the Tenant restores the exact last manual status.
- Tenant form manual status pick lists must expose only the two manual values. System-derived and action-derived values are read-only effective states and must not be manually selectable.
- Tenant status presentation must use the shared Operational Status presenter everywhere Tenant effective status is shown.

### Status Presentation Standard

- Each business Status family has one shared presentation owner.
- Forms, dashboards, tables, dialogs, related-object views, and future consumers must render equivalent status values through that same shared presenter.
- Equivalent status values must never use different labels, icons, colors, badge treatment, spacing, typography, tooltip, or accessibility behavior across the application.
- Status presentation is visual only. Sorting, filtering, searching, export, and business logic must continue to use the raw status value or approved status label text, never React markup or icon content.

### Project Delete Lifecycle Standard

- Project Delete is a lifecycle transition to `Project Status = Deleted`.
- Delete preserves the Project record, PID, relationships, tasks, documents, Activity, Configuration History, and other historical/business data.
- Delete is not archive, hiding, unlinking, or physical removal.
- Deleted Projects remain persisted, navigable, dashboard-visible, and audit-visible.
- Deleted is a terminal Project Status unless a future approved workflow explicitly introduces restoration.

### Tenant Lifecycle And Hosting Standard

- Tenant is a virtual commercial and configuration Business Object. System is the physical infrastructure Business Object.
- System Application Configuration Summary represents the accumulated configuration contribution of currently active Tenants hosted on that System.
- Move changes only the Tenant's active hosted System relationship. The Tenant ID, Tenant-owned scalar fields, Tenant-owned child records, Warranty records, configuration requirements, and Project relationships must be preserved.
- Delete is commercial termination. It sets Tenant Operational Status to `Deleted - By System`, ends active hosting, excludes the Tenant from active System Tenant tables and active System Application Configuration Summary, and preserves Project relationships plus historical System hosting.
- Cancel represents creation by mistake. It sets Tenant Operational Status to `Cancelled - By System`, ends active hosting, excludes the Tenant from active System Tenant tables and active System Application Configuration Summary, and removes active Project-Tenant relationships while preserving technical audit/history.
- Delete and Cancel are lifecycle transitions, never hard deletion. Historical retention, operational visibility, and configuration contribution eligibility are separate concerns owned by TenantOperations/SystemInventory read models.

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

## Milestone Boundary

### Version 1.2

Version 1.2 is the final frontend-only implementation milestone.

Status: Development Complete / Pending Publication.

Version 1.2 consolidates the approved business workflows, workspace structure, shared UI/UX standards, browser-local persistence, dashboards, Activity and Configuration History, Infrastructure capability, Warranty and Remarks frameworks, shared Business ID links, shared status presentation, shared validation behavior, POC allocation, and reused-system lifecycle behavior.

Version 1.2 remains suitable for product validation, QA, demonstrations, and release handoff. It is not the final production security or deployment architecture.

Version 1.2 intentionally retains these architectural boundaries:

- Frontend-only React/Vite application.
- Browser-local persistence.
- No secure multi-user authentication.
- No server-side authorization.
- No production backend database.
- No self-upgrade agent.

Do not add frontend-only login, local password storage, browser-stored password hashes, fake roles, fake permissions, or incomplete Application Upgrade actions to Version 1.2.

### Version 2.0

Version 2.0 is the active next development phase.

Version 2.0 transforms Delivery ERP from a frontend-only product implementation into a secure multi-user production platform.

Version 2.0 scope includes:

- Backend/API foundation.
- Database persistence.
- Internal authentication.
- Roles and privileges.
- Server-side authorization.
- Secure sessions.
- Audit/security events.
- Administration Console.
- Metadata Settings.
- Application Upgrade and Update Agent.
- Migration from browser-local data.
- Multi-user and concurrency support.
- Deployment hardening.

Version 2.0 security-sensitive capabilities must be implemented behind a trusted backend boundary, not as browser-only prototypes.
