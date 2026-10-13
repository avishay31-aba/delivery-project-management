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

## Retroactive Correction Standard

Any approved fix, correction, validation rule, UI behavior, relationship rule, derivation rule, lifecycle rule, or business-rule change applies retroactively to all relevant records and object instances unless the Product Owner explicitly approves an exception before implementation.

Corrections must cover existing seeded records, existing persisted records, manually created records, records created before the correction, records created after the correction, and future records. Implementation must inspect and align the relevant create, edit/update, view/render, validation, derived-state, relationship, persistence and hydration paths so the corrected behavior is not limited to a New/Create flow.

Prefer shared authoritative runtime, domain, service, store, read-model, or adapter logic so legacy and future records naturally receive the same behavior when opened, rendered, validated, saved, reconciled, or processed. When persisted legacy data is structurally incompatible with the corrected rule, use safe idempotent compatibility normalization or migration where necessary. Do not blindly rewrite protected seed data merely to achieve retroactivity.

If a correction cannot or should not apply retroactively, stop and report the reason before implementing an exception.

## ERP UI/UX Consistency

New functionality must first reuse existing shared application patterns.

Equivalent business meanings must use identical shared components, icons, labels, colors, typography, spacing and interaction patterns. External product concepts may guide behavior, but they must not introduce a separate visual language into the ERP. Any new local UI pattern requires explicit approval and Architecture Handbook documentation.

Equivalent control patterns, including tabs and sub-tabs, must reuse the established product component or be minimally extracted to one shared component before reuse. A visually similar local implementation is not sufficient when an approved pattern already exists.

## Scope-Based Save Boundary

Every explicit Save action is the commit boundary for the Business Object or save scope it owns. Child-object Save actions commit independently and do not require a subsequent parent-form Save.

A Save action is available only when its owned scope contains a valid change from its persisted baseline. Dirty state is based on normalized value comparison, not on whether a field was touched.

Uncommitted drafts do not affect shared read models. Clicking the Save action belonging to a draft commits that draft's owned scope. The main form Save / Apply Changes action commits parent Business Object fields and must not silently commit independently owned child-object drafts.

Every successful commit must update the authoritative shared store and publish or invalidate all dependent read models. All relevant mounted and subsequently opened consumers must reflect the committed state immediately, without a parent Save, refresh or re-navigation. Only committed values may be published; drafts remain local to their owning save scope.

Every mutation must have one explicit commit boundary. Parent-owned mutations activate the parent Save/Apply action. Independently owned child creates and updates commit through the child Save action, while deletion of a persisted child commits through its confirmed Delete action. Removing an uncommitted draft is local only. No visible mutation may remain without an available commit path.

Every persisted mutation must have an explicit and visible commit boundary. Parent-owned staged mutations activate Save/Apply. Independently owned child Save actions commit explicitly. Destructive persisted actions require confirmation before immediate commit. Successful commits provide visible confirmation; failed commits provide visible error feedback. Removing an uncommitted draft is local and must be distinguished from deleting persisted data. No mutation may commit silently.

Application form-action semantics are standardized. Successful Save validates, persists, writes applicable Activity, confirms persistence, establishes the committed record as the new baseline, clears dirty/unsaved presentation, exits edit/create mode, and navigates to the relevant object dashboard. Successful Apply Changes performs the same validation, persistence, Activity, confirmation, baseline reset, and clean-state sequence, but remains on the current persisted form in edit mode. If Apply Changes is used while creating a new object, it creates the object once, navigates the create route to that persisted object's form in edit mode, and subsequent Apply Changes update the same object. Cancel discards unsaved changes without Activity and exits to the originating page when available, otherwise to the existing object's read-only view; cancelling a new unsaved object exits to the relevant dashboard. Undo and Revert are in-form draft actions: they do not persist, navigate, close the form, or write Activity; Undo reverses the latest applicable unsaved edit and Revert restores the last successfully persisted baseline. Validation or persistence failure explains the failure, stays on the form, preserves dirty/unsaved state, and must not show success feedback.

In V1.3, Documents, Configuration History, Remarks, and Activity Log are global reusable child-object workspaces. Each approved child-object type must have one shared domain lifecycle, one shared UI/workspace implementation, one global ID allocator for its namespace, and thin parent adapters limited to parent identity, parent aggregate persistence, and genuinely different permissions or business rules. Parent forms must not implement separate child-object lifecycle behavior or wrappers that change scrolling, focus, pagination, headers, messages, actions, save behavior, or reload behavior for the same child object.

Global child-record IDs are application-wide and sequential within their own namespace, never parent-local. The approved V1.2 formats remain `DOC######` for Documents, `R######` for Remarks, `CH######` for Configuration History, and `ACT######` for Activity. Normalization and persistence reconcile the effective current counter from the greater of persisted `idCounters` and the highest existing ID found anywhere in the application. Existing V1.2 IDs are retained and historical records are not renumbered. Deleted, removed, replaced, or historical records do not release IDs for reuse.

In V1.3, global Document child objects follow the System Documents behavior as the reference implementation. Upload, replace, and remove actions commit immediately through the owning parent object's authorized persistence path, refresh the mounted UI from the committed parent record, and survive browser-local reload. Rendering the shared Documents component is not sufficient by itself; the parent onChange/save/update path must preserve synchronized parent state and persisted state.

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

Derived states are computed from the authoritative owner and must not be edited independently by consumers. For Tenant hosting lifecycle, System owns the supported hosted-Tenant deletion relationship action because it changes or terminates hosting participation. Tenant cancellation and Tenant restore are not active V1.2 workflows. Tenant owns Tenant-specific commercial and operational information, but it must not expose hosting lifecycle mutations.

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
- Read-only Details, Advanced, Expand, and View-details controls that only reveal read-only information remain available in both View mode and Edit mode. Do not tie these disclosure controls to `isEditing`; separate permission to view read-only information from permission to edit business data. Editable advanced editors and mutation actions continue to follow the established Edit-mode, lifecycle, and role-permission rules.
- Manual creation is only a creation method and must preserve the exact authoritative field attributes for the item. Create mode must not make all fields editable; effective editability is the intersection of create/form mode, authoritative field metadata, lifecycle/business rules, role/permission rules, and source/parent-object ownership, with the most restrictive rule prevailing.
- Optional source records remain optional in manual creation. When an optional source such as Opportunity is absent, dependent derived/read-only fields may remain empty and must not become mandatory or produce validation errors solely because their source is absent. When the source is present, the normal derivation chain and validation rules apply.
- Pages compose field metadata, owning-domain validation, and shared form components; pages must not redefine mandatory/read-only behavior independently.

### Dashboard Row Action Standards

- Dashboard rows must not be the primary navigation control.
- Dashboards use a dedicated left-side action column for record actions.
- The View action, represented by an eye icon, opens the target form/workspace in read-only View mode.
- The Edit action, represented by a pencil icon, opens the target form/workspace in Edit mode.
- Dashboard action columns are UI controls only. They are not business data, object fields, report columns, or saved-view business columns.
- Shared dashboards permanently fix only `Update/New` first and `Actions` second. Creation Date and Labels are ordinary business columns. Freeze Through begins with eligible business columns, and grouping preserves configured column order while presenting its indicator in the grouped column's own header.
- Project Dashboard's constrained table frame is the approved scrolling reference. Equivalent dashboard workspaces use the shared constrained dashboard-content container so the body owns vertical scrolling, the header remains continuously visible, and horizontal header/body alignment is preserved.
- Saved dashboard views may preserve user display preferences, but action controls must not become editable business facts or domain-owned fields.

### Business ID Link Standard

- Every displayed Business Object ID must render through the shared Business ID link presenter whenever that object has a supported route.
- The standard presenter owns route-aware fallback behavior. Pages, dashboards, forms, tables, dialogs, tooltips, activity references, and history views must not create local anchor tags or duplicate routing logic for Business Object IDs.
- Read-only summaries, child tables, configuration history, and historical/activity tables follow the same rule when the displayed ID is a current navigable Business Object reference. Empty values, self identity labels, non-business technical keys, and historical snapshots without a valid target remain plain text through the established fallback presentation.
- Empty IDs display the shared empty value. IDs without a supported route may render as read-only text through the shared fallback.
- Export and persistence paths keep plain ID text only; presentation components must not enter domain/read-model values.

### Business ID Generation Standard

- Application-owned Business IDs are allocated by the store/domain save transaction from the authoritative namespace for that ID type. Create forms initialize unsaved drafts without committing, reserving, or advancing those IDs. When the established UI shows an ID before Save, it must use a non-mutating read-only preview; the Save transaction must either commit that preview if still unique or replace it with the next valid ID.
- ID allocators must consider retained, cancelled, deleted, historical, and otherwise dashboard-filtered records. They must not derive a next ID from visible row count, array length, or form-local row count.
- When one save transaction creates multiple same-namespace IDs, the allocator advances within that transaction so every generated ID is distinct.
- MID is user-supplied and uniqueness-validated; it is not part of the automatic application-owned ID generators.
- System identity has two different business meanings. MID identifies a reusable internal resource; SID identifies an allocated System instance. Reused Internal System allocation must retain the MID and allocate a new globally sequential SID for the allocation instance. Shared references, dashboards, saved views, and navigation must route allocated Systems by SID and reused-internal inventory resources by MID; source alone is not sufficient to determine route identity.
- Reused Internal System Purpose and Availability are separate domain concepts. `None` is the Purpose value for no specific business purpose and derives Availability/Status `Available`; every other RIS Purpose, including `OBSOLETE`, derives Availability/Status `Occupied`. `Available` is not a valid RIS Purpose value in V1.3 and is normalized forward only when found in persisted RIS Purpose or Purpose History fields.

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
- The shared Project alert derivation owns Delivery Overdue, POC end date overdue, No Delivery Date, No End Date, their date/status rules, and their stable display order.
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
- Tenant effective Operational Status is resolved by the shared TenantOperations precedence model: individual Tenant lifecycle terminal states, then persisted System-forced lifecycle state, then hosted System-derived read-only state, then the last saved manual Tenant status when the hosted System is `On`.
- System-forced statuses must store their own previous Tenant Operational Status and forcing System ID. They must not overwrite `lastManualOperationalStatus` or the individual Delete/Cancel previous-status field; when the System returns to `On`, only Tenants forced by that System restore the exact stored previous status.
- Tenant form manual status pick lists must expose only the two manual values. System-derived and action-derived values are read-only effective states and must not be manually selectable.
- Tenant status presentation must use the shared Operational Status presenter everywhere Tenant effective status is shown.

### Status Presentation Standard

- Each business Status family has one shared presentation owner.
- Forms, dashboards, tables, dialogs, related-object views, and future consumers must render equivalent status values through that same shared presenter.
- Equivalent status values must never use different labels, icons, colors, badge treatment, spacing, typography, tooltip, or accessibility behavior across the application.
- Status presentation is visual only. Sorting, filtering, searching, export, and business logic must continue to use the raw status value or approved status label text, never React markup or icon content.

### Project Cancellation Lifecycle Standard

- Project cancellation is a lifecycle transition to `Project Status = Cancelled`.
- Cancellation preserves the Project record, PID, relationships, tasks, documents, Activity, Configuration History, and other historical/business data.
- Cancellation is not archive, hiding, unlinking, or physical removal.
- Cancelled Projects remain persisted, navigable from explicit history/audit contexts, visible in dedicated cancelled/history dashboards, and audit-visible.
- Project cancellation is initiated from the individual Project form header, not from the Active Projects dashboard.
- Project cancellation is blocked while any active Project-System allocation remains. The user must explicitly deallocate all Systems first; cancellation must not automatically release or rewrite allocation relationships.
- Each Project cancellation creates a persisted cancellation-history entry containing timestamp, cancelling user, and reason. Current cancelled Projects expose the latest reason as header metadata while preserving the original cancelling user on that event; restored Projects retain all cancellation-history entries as read-only header metadata, newest first.
- Restore is a Project store/domain lifecycle transaction. It returns the Project to Active Projects and restores the previous legitimate `Open`/`Done` lifecycle status while preserving task-completion invariants and cancellation history.
- Cancellation Reason is a shared rich-text business field. Header cancellation metadata, historical header entries, and cancelled-object dashboard cells must reuse the product rich-text editor/read-only renderer rather than plain text controls.
- Project, System, and Infrastructure Item cancellation controls live on a separate final header row so cancellation/audit fields do not interrupt the normal business header layout.
- Cancelled object dashboards reuse the shared `DataDashboard` architecture with independent saved-view scopes. Search/filter/grouping/sorting behavior belongs to `DataDashboard`; grouped dashboards preserve group structure while sorting leaf records within each group.
- A recoverable Delete/Restore implementation may reuse the Project pattern only when that Business Object has an explicit approved lifecycle requirement. Recoverable deletion never implies eligibility for irreversible Permanent Delete.
- Infrastructure Item Delete/Restore was superseded during V1.2 Final QA. The current Infrastructure workspace has no Delete action or Deleted Items dashboard. `Obsolete` remains an independent valid operational status. Infrastructure Item cancellation is blocked while linked to any System; the user must explicitly unlink first. See the [V1.2 standing product rules](v1.2-standing-product-rules.md#i-infrastructure-lifecycle).

### Tenant Lifecycle And Hosting Standard

- Tenant is a virtual commercial and configuration Business Object. System is the physical infrastructure Business Object.
- System Application Configuration Summary represents the accumulated configuration contribution of currently active Tenants hosted on that System.
- Tenant Application Configuration has one authoritative Product-to-final-column metadata structure owned by the shared Application Configuration domain. Opportunity New Tenant Requirements, Tenant Configuration, System Tenant tables, System Application Configuration Summary, and configuration history consumers must reference that same metadata for field IDs/keys, order, labels, field types, option metadata, validation metadata, and product-dependent applicability. Consumers may differ only in value semantics: Opportunity captures editable requirement intent, Tenant captures editable delivered Tenant values, System Tenant tables present read-only individual Tenant values, and System Application Configuration Summary presents read-only aggregated values.
- The shared Application Configuration presentation order places AI before Additional Features, then API Enable, API Daily Qty, and API Monthly Qty as the final three configuration columns. Additional Features must not be rendered after the API fields in any recurring configuration table.
- Opportunity requirement operational consumers must use the shared currently-applicable requirement read model. Persisted hidden rows from prior Opportunity configurations are historical/restoration data and must not be reinterpreted independently by validation, Project generation, System allocation, Tenant creation, Requirement Coverage, or summaries.
- The selected PID/Project ID is the authoritative Tenant Origin Project relationship and is retained for Tenant lifetime/history. Current Tenant Project membership is allocation-backed and must not be reconstructed solely from Origin Project history.
- Requirement ID is globally unique. Tenant Requirement history stores PID-qualified same-Project Requirement relationships for Customer/POC Tenants where applicable; Internal Tenants may have a PID without Requirement ID. A Tenant Requirement may be referenced by multiple Tenants. Requirement ID is a one-to-many relationship from Tenant Requirement to Tenant and is not an exclusive allocation resource. A Requirement must not become unavailable merely because a Tenant already references it.
- Tenant continuation on another System is represented by the approved Tenant lifecycle and creation/predecessor workflows rather than a generic active move mutation. Tenant ID, Tenant-owned scalar fields, Tenant-owned child records, Warranty records, configuration requirements, and historical Project relationships must be preserved.
- Delete is commercial termination. It sets Tenant Operational Status to `Deleted`, preserves the Tenant's TID, System, Project, Tenant Requirement, Warranty, document, configuration, remarks, activity, and relationship-history links, and excludes the Tenant only from active System counts, active System Tenant tables, active System Application Configuration Summary, and other projections where Deleted Tenants are explicitly ineligible.
- Tenant cancellation is mistake-removal. The System form Tenant row exposes Cancel for active hosted Tenants; confirming Cancel physically removes that Tenant from the ERP Tenant model and all Tenant-related operational, deleted, historical, dashboard, read-model, selector, report, activity, and relationship presentations. Cancel does not convert the Tenant to `Deleted` or retained `Cancelled`, and it must remove Tenant-owned child records plus Tenant-specific System/Project/Opportunity references without affecting other Tenants that share the same Requirement ID. Retained legacy Cancelled Tenant records remain visible only through explicit historical/audit/provenance contexts with existing audit fields where present; normal operational Tenant dashboards, relationship tables, selectors, summaries, and lookup sources exclude them. The UI must not expose a Tenant Restore action.
- System-forced Deleted/Cancelled is not an individual Tenant lifecycle action. It is restored only by returning the forcing System to `On`; no Tenant `Restore` action may override it.
- Active hosting calculations and Project history are separate concepts. Move, Delete, Project completion, and reused internal System reuse must not rewrite completed/historical Project-System-Tenant relationship snapshots. Explicit Deallocate actions may remove active allocation relationships according to their approved lifecycle semantics.
- Delete is a lifecycle transition, never hard deletion. Historical retention, operational visibility, and configuration contribution eligibility are separate concerns owned by TenantOperations/SystemInventory read models. Tenant Cancel is the only active Tenant mistake-removal workflow and must use the authoritative store transaction rather than a retained lifecycle status. Legacy Cancelled records are retained for history, excluded from normal operational read models, and are not created by active V1.3 workflows.
- System inventory existence is independent from Project allocation and Tenant hosting. Standalone Production or Reused Internal Systems with no Tenant, no Project allocation, or neither are valid inventory states. Integrity checks must classify those as valid standalone Systems while still enforcing Tenant PID -> Project resolution, required same-Project Tenant Requirement resolution for Customer/POC Tenants, and active Tenant -> current hosting System resolution.
- Tenant-related Project read models must distinguish current membership from historical provenance. Current Project membership uses active ProjectTenant links backed by active System allocation; historical visibility may use retained Origin Project/PID and Requirement history. Pages must not infer Tenant Project relationships from unrelated hosting System allocation links.
- Tenant Move is not a supported lifecycle mutation. Cross-System continuation is modeled by lifecycle termination of the old Tenant plus creation of a new Tenant and optional Warranty predecessor linkage.

## Reusable Child Object Principle

Some child structures are reusable across multiple parent Business Objects while still remaining scoped to their parent object instance.

Reusable child objects may include Remarks and Owner/Responsible Contact tables. They can be introduced first under one parent object, such as System, and later reused under Project, Tenant, Customer, Opportunity, Warranty, or other approved parent objects.

Reusable child objects do not transfer ownership of the parent object. The parent object's owning domain controls where the child object is used, while shared metadata/components may standardize rendering and behavior.

Remark author metadata is part of the Remark record. It is not the same concept as the Owner child table.

Document child objects are global reusable child objects for approved editable parent forms, including Project, System, Tenant, and Infrastructure, and read-only aggregate consumers such as Customer must reuse the shared Document presentation rather than rendering independent obsolete tables. The standard Document table excludes generic file type and rename/edit behavior, preserves Open/Replace/Remove subject to existing business rules, and displays persisted Uploaded By and Replaced By metadata. Replacement preserves the original uploader metadata and stores the replacing user only when a replacement occurs; historical records without reliable Replaced By metadata use the standard empty presentation.

Action and navigation presentation is centralized. Actionable Edit controls use the shared Pencil/Edit icon presentation with tooltip and accessibility label `Edit`; visible text `Edit` is reserved for explanatory titles, dialog text, or edit-scope choices. Clickable business-object references open existing destination records in read-only/view mode by default. Entering edit mode requires an explicit Pencil/Edit action subject to the existing permissions and lifecycle rules.

### V1.3 Roles, Permissions, Notifications, And Alerts

V1.3 introduces an application/domain Roles & Permissions capability for configurable role definitions, application authorization evaluation, and recipient-role references used by Notifications & Alerts. The authorization evaluator is centralized in the shared domain layer. UI and store/domain entry points must ask the evaluator whether the current user can view an object, edit an object or field, or execute an action; components must not scatter role-name checks such as direct comparisons to a job title.

Permission precedence is restrictive and deterministic. Page/Object `Hidden` makes fields and actions inaccessible. Page/Object `Read Only` prevents fields from becoming writable and prevents write actions even if a child field/action grant is more permissive. Action `Not Allowed` means unavailable at the UI and domain/store action boundary where implemented. Field `Hidden` never renders the value, Field `Read Only` renders without modification, and Field `Read / Write` is writable only when the parent page/object is also writable. Multiple user roles combine grants, but the parent page/object restriction remains authoritative for the effective permission.

This V1.3 implementation is an application-governance layer for the frontend/browser-persisted milestone. It is not a production security boundary. Trusted authentication, backend/API authorization enforcement, secure sessions, database ownership, outbound email dispatch, and permission-proof server-side mutation checks remain V2 backend requirements.

Notifications & Alerts are a centralized recipient-oriented capability and are not the same thing as Activity Log. Activity Log remains the immutable audit/history record of business activity. Notifications communicate that a business event occurred and follow `Unread -> Read`. Alerts represent a current unresolved business condition and follow `Open -> Resolved`. Condition alerts use deterministic rule/object condition identity so repeated reconciliation or weekly reminders do not create duplicate open alert records. Alerts resolve automatically when their authoritative condition no longer exists; if the same condition returns later, a new occurrence is created.

Notification and alert records must preserve enough snapshot context to remain historically understandable even if the referenced business object is later cancelled, deleted, or otherwise unavailable. Deep links are convenience links and must use the shared read-only business-object navigation rule. Email payloads are generated as self-contained delivery contracts, but actual outbound email transport is deferred to the V2 backend unless a trusted backend mail service is introduced.

The V1.3 Notifications & Alerts master catalogue is authoritative for rule existence, type, severity, category, recipient roles, reminder behavior, email eligibility, and deep-link contract. Catalogue categories use business-domain labels such as `Project`, `System`, `Tenant`, `Tenant Warranty`, `Infrastructure Item`, and `Infrastructure Warranty`; allocation-related events in the catalogue remain System notifications when specified that way by the master table. Persistent actionable conditions are Alerts, not repeated Notifications. Warranty Pending and Warranty Expired conditions are Alerts. Weekly reminder behavior updates/reminds from the same open Alert and must never create weekly duplicate Alert records.

The catalogue may retain reserved Request rules for approved next-step workflows without implementing those workflows in the same release task. Physical System Provisioning is such a reserved V1.3 catalogue entry: its Request/Completion notification rules may exist in the shared catalogue and recipient/email contract, while the actual provisioning request workflow remains explicitly deferred until the Product Owner authorizes that task.

The Notifications & Alerts workspace is one Delivery Console workspace with two top-level workspace tabs: Alerts and Notifications. The tabs use the same shared WorkspaceTabs pattern as the Systems Workspace. Alerts and Notifications are separate dashboard instances with separate dashboard scopes, saved views, filters, sorting, column configuration, pagination preferences, search, and export state. Alerts default to Open conditions and may expose reconciliation controls. Notifications default to Unread event records and must not expose Alert-specific reconciliation controls. The selected tab renders only its own dashboard and must not include an additional Alerts/Notifications selector inside the dashboard.

Each Notification or Alert has one canonical full message. The canonical full message is the complete human-readable business communication for both ERP Details display and future email body rendering. It should use compact, event-specific business sections such as `EVENT`, `PROJECT`, `SYSTEM`, `TENANT`, `WARRANTY`, `INFRASTRUCTURE`, `PERFORMED BY`, `DETECTED`, `REQUIRED ACTION`, and `LINK` only where relevant to the master-table row. It must not expose developer/domain terms such as internal event keys, rule IDs, primary/related object implementation labels, or snapshot/debug terminology. Email rendering may add subject, styling, and button presentation, but it must not independently reconstruct a different business description. The canonical full message includes the primary Open-in-ERP action text and is paired with structured primary/related object references so ERP and email renderers can turn supported business IDs into read-only business-object links.

Alert lifecycle and Notification read state are different concepts. Alerts represent unresolved business conditions and resolve only when the authoritative condition clears through domain reconciliation; opening an Alert or clicking a generic action must not mark it resolved. Notifications represent events; their Read/Unread state is a recipient/user interaction state. Opening Notification Details is a view-only action and must not change read state or any business lifecycle state. If explicit read-state management is required, it must remain per recipient/user and must not mark the same Notification read for other recipients.

Reminders are a separate Delivery module, not a third Notification/Alert type. Reminders are derived from authoritative source records such as Remarks with Due Date and Tasks with Deadline/Due Date, and the Calendar view is only another presentation of the same derived Reminder read model. Reminder lifecycle state is explicit and source-scoped: Pending, Executed, and Restored to Pending. Execution/restoration state is persisted against a stable source identity and parent-object reference; the source remark/task remains authoritative for Due Date/Deadline. ERP remains the authoritative source for Reminders. The Reminder domain must preserve stable identities, source references, due dates/deadlines, execution/restoration state, and optional external-calendar synchronization metadata so a future Outlook integration can create or update calendar events without redesigning the Reminder architecture. V1.3 does not implement Outlook, Microsoft Graph, email, or calendar synchronization.

## Geographic Configuration And Time Groups

In V1.3, Country, US State, and Time Group configuration is authoritative from the approved V1.3 workbook source. Country records expose Country Name, Country Code Name, Region, and UTC / Time Zone. US State records expose State and UTC / Time Zone. Time Groups retain their Time Group ID and editable Time Group name / Time Zone selection, while Countries and States are read-only derived memberships from selected UTC offsets against the authoritative Country and US State masters.

Persisted V1.2 `timeGroupLookups.countries` and `timeGroupLookups.states` values may remain in browser-local storage for compatibility, but they are not authoritative in V1.3 operational behavior. Time Group Country and State membership must be derived on load/save/read-model refresh rather than rewritten into every Time Group when a Country or US State UTC value changes.

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
