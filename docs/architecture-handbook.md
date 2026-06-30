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

Operational workspaces include Renewal Work Queue, Requirement Coverage, Delivery Dashboard, and Delivery Alerts.

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
