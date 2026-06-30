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
