# Delivery ERP Enterprise Capability Model V1.0

## Methodology Position

```text
Architecture Handbook
  -> Enterprise Capability Model (ECM)
  -> Business Object Model (BOM)
  -> Business Object Specification (BOS)
  -> Product Design Specification (PDS)
  -> Implementation
  -> Product Readiness Review (PRR)
```

The ECM is the highest-level business architecture artifact. It defines what business capabilities the Delivery ERP provides.

Capabilities own business objects. Business objects own business rules and data. Workspaces expose business objects. Pages compose workspaces.

## 1. Product Vision

The Delivery ERP is a commercial, enterprise-ready system for managing the full lifecycle from commercial opportunity through delivery execution and operational warranty/renewal readiness.

Its purpose is to give Sales, Delivery, and Administration users one coherent operating system for:

- Managing customers and opportunities.
- Capturing delivery intent and requirements.
- Converting commercial intent into delivery projects.
- Managing projects, milestones, tasks, systems, tenants, allocations, warranties, and renewals.
- Providing visibility into requirement coverage, operational risk, delivery health, and activity.
- Preserving clear ownership across business domains.
- Preparing the product for commercial Version 1.0 before future configurable-platform expansion.

The ERP is not yet a configurable ERP platform. Version 1.0 focuses on a releasable Delivery ERP.

## 2. Capability Hierarchy

```text
Delivery ERP
  Sales Capability
    Customer Management
    Opportunity Management
    Commercial Requirement Capture
    POC Commercial Management
    Commercial Renewal Management
    Deal Package Management
    Sales Reporting / Pipeline, future
    Sales Alerts, future

  Delivery Capability
    Project Delivery Management
    Requirement Fulfillment Tracking
    Allocation Management
    Systems Management
    Tenant Management
    Warranty Management
    Operational Renewal Management
    Milestone Management
    Task Management
    Delivery Document Management
    Delivery Activity Visibility
    Delivery Alerts, future
    Delivery Dashboard, future

  Administration Capability
    Activity / Audit Governance
    Dashboard View Governance
    Metadata Governance
    Picklist / Configuration Management
    Template Management
    User Management, future
    Role Management, future
    Privilege Management, future
    System Settings, future
    Admin Alerts, future

  Shared Platform Capability
    Business Identity
    Business Reference Integrity
    Status / Visual State Presentation
    Persistence Boundary
    Object Registry
    Object Registry Runtime
    Shared UI Components
```

Shared Platform Capability is not a user console. It provides infrastructure consumed by business capabilities.

## 3. Capability Catalog

| Capability | Purpose | Business Owner | Primary Console | Business Objects Owned | Status | Planned Version |
| --- | --- | --- | --- | --- | --- | --- |
| Customer Management | Own customer/account commercial identity and portfolio context | Sales | Sales Console | Customer / Account | Implemented | V1 |
| Opportunity Management | Own commercial opportunity lifecycle | Sales | Sales Console | Opportunity | Implemented | V1 |
| Commercial Requirement Capture | Capture delivery intent in opportunity requirements | Sales | Sales Console | Requirement definitions | Implemented | V1 |
| POC Commercial Management | Manage POC-stage commercial profile and POC project intent | Sales | Sales Console | Opportunity POC fields, POC intent | Implemented | V1 |
| Commercial Renewal Management | Manage renewal opportunity as commercial deal | Sales | Sales Console | Renewal Opportunity | Partial | V1 |
| Deal Package Management | Capture commercial package/context for opportunity | Sales | Sales Console | Deal package context | Partial | V1 |
| Sales Reporting / Pipeline | Provide pipeline and commercial reporting | Sales | Sales Console | Opportunity reporting models | Missing | Future V1 / V2 |
| Sales Alerts | Surface commercial alerts | Sales | Sales Console | Sales alert read models | Missing | Future |
| Project Delivery Management | Own delivery project execution | Delivery | Delivery Console | Project | Implemented | V1 |
| Requirement Fulfillment Tracking | Track requirement coverage and missing delivery steps | Delivery | Delivery Console | Requirement coverage read models and validation output | Implemented | V1 |
| Allocation Management | Link systems to projects and delivery needs | Delivery | Delivery Console | Allocation, ProjectSystemLink | Implemented | V1 |
| Systems Management | Manage allocated systems and inventory pools | Delivery | Delivery Console | System, Production Inventory, Reused Internal System | Implemented | V1 |
| Tenant Management | Manage delivered customer tenants | Delivery | Delivery Console | Tenant, ProjectTenantLink | Implemented | V1 |
| Warranty Management | Manage tenant warranty records and warranty chains | Delivery | Delivery Console | Warranty | Implemented | V1 |
| Operational Renewal Management | Surface renewal readiness and execution queue | Delivery | Delivery Console | Renewal candidate read models | Implemented | V1 |
| Milestone Management | Manage project milestone execution | Delivery | Delivery Console | Milestone | Implemented | V1 |
| Task Management | Manage project task execution | Delivery | Delivery Console | Task | Implemented | V1 |
| Delivery Document Management | Manage documents attached to delivery objects | Delivery | Delivery Console | Document, parent-context documents | Partial | V1 |
| Delivery Activity Visibility | Show operational activity in workspaces | Delivery | Delivery Console | Activity references | Partial | V1 |
| Delivery Dashboard | Unified delivery command center | Delivery | Delivery Console | Delivery dashboard read models | Missing | Future V1 |
| Delivery Alerts | Console-specific operational alerts | Delivery | Delivery Console | Delivery alert read models | Missing | Future |
| Activity / Audit Governance | Provide global activity/audit visibility | Admin | Admin Console | Activity Event | Implemented | V1 |
| Dashboard View Governance | Own saved dashboard view lifecycle | Admin / Platform | Admin Console / Shared | Dashboard View | Implemented | V1 |
| Metadata Governance | Govern ERP object metadata | Admin | Admin Console | Object metadata | Core implemented, UI missing | V1 core / V2 UI |
| Picklist / Configuration Management | Manage ERP option values | Admin | Admin Console | Picklist options | Partial | V1 partial |
| Template Management | Manage milestone/task templates | Admin | Admin Console | Milestone templates, task templates | Partial | V1 partial |
| User Management | Manage ERP users | Admin | Admin Console | User | Missing | Future V1/Admin |
| Role Management | Manage role groupings | Admin | Admin Console | Role | Missing | Future V1/Admin |
| Privilege Management | Manage access control | Admin | Admin Console | Privilege | Missing | Future V1/Admin |
| System Settings | Manage global ERP settings | Admin | Admin Console | Settings | Missing | Future |
| Admin Alerts | Surface admin/security/configuration alerts | Admin | Admin Console | Admin alert read models | Missing | Future |
| Business Identity | Generate stable ERP business IDs | Platform | None | Business IDs | Implemented | V1 |
| Reference Integrity | Resolve object references and links | Platform | None | Business references | Implemented | V1 |
| Status Presentation | Centralize visual state presentation | Platform | None | Status presentation models | Implemented | V1 |
| Persistence Boundary | Separate storage mechanics from business normalization | Platform | None | Persisted app state | Implemented | V1 |
| Object Registry | Centralize metadata ownership | Platform | None | Object metadata | Implemented | V1 |
| Shared UI Components | Provide reusable UI patterns | Platform | None | Shared components | Implemented / evolving | V1 |

## 4. Capability To Business Object Matrix

| Capability | Owns | References |
| --- | --- | --- |
| Customer Management | Customer / Account | Opportunity, Project, System, Tenant, Warranty, requirement coverage read models, Document, Activity |
| Opportunity Management | Opportunity | Customer, Project, System, Tenant |
| Commercial Requirement Capture | Requirement definitions | Customer, Opportunity, Product/config metadata, existing Systems/Tenants |
| POC Commercial Management | Opportunity POC fields and intent | Project, Reused Internal Systems |
| Commercial Renewal Management | Renewal opportunity | Warranty, Tenant, Project as context |
| Deal Package Management | Deal package context | Opportunity, Requirement |
| Project Delivery Management | Project | Customer, Opportunity, System, Tenant, requirement coverage read models, Activity |
| Requirement Fulfillment Tracking | Requirement coverage read models and validation output | Requirement definitions, Opportunity, Project, System, Tenant |
| Allocation Management | Allocation / ProjectSystemLink | Project, System |
| Systems Management | System, Production Inventory, Reused Internal System | Project, Tenant, Customer |
| Tenant Management | Tenant, ProjectTenantLink | Project, System, Customer, Requirement |
| Warranty Management | Warranty | Tenant, Project, Customer |
| Operational Renewal Management | Renewal candidate read models | Warranty, Tenant, Customer, Project |
| Milestone Management | Milestone | Project |
| Task Management | Task | Milestone, Project |
| Delivery Document Management | Parent-context documents | Project, System, Tenant, future Customer |
| Delivery Activity Visibility | Activity references | Project, System, Tenant, Allocation |
| Activity / Audit Governance | Activity Event | All business objects |
| Dashboard View Governance | Dashboard View | Dashboard scopes |
| Metadata Governance | Object metadata | All business objects |
| Picklist / Configuration Management | Picklist options | Forms, dashboards |
| Template Management | Milestone/Task templates | Project Workspace |
| User Management | User | Role, Activity |
| Role Management | Role | User, Privilege |
| Privilege Management | Privilege | Role, Console, Workspace |
| Business Identity | Business ID policies | All business objects |
| Reference Integrity | Business references | All business objects |
| Status Presentation | Presentation models | All status-bearing objects |

Ownership rule: if a capability references an object, it may display it but may not own or modify its business rules unless listed under Owns.

## 5. Capability Interactions

Sales creates and maintains customer and opportunity context. Opportunity Management defines commercial intent, while Commercial Requirement Capture defines requirements. Opportunity may trigger approved Project creation/update.

Delivery receives project and requirement intent, executes Projects, manages Allocations, Systems, Tenants, Warranties, Milestones, Tasks, requirement coverage validation output, and Operational Renewal readiness.

Administration governs Activity/Audit, metadata, dashboard views, picklists, templates, and future users/roles/privileges.

Shared Platform capabilities supply identity, reference resolution, status presentation, persistence, metadata/runtime, and shared UI behavior.

## 6. Capability Boundaries

Sales owns Customer commercial relationship, Opportunity lifecycle, Commercial Renewal opportunity, Requirement intent capture, POC commercial profile, and Deal Package context. Sales does not own Project execution, System operations, Tenant operations, Warranty status, requirement coverage validation output, Allocation, or Milestone/Task execution.

Delivery owns Project execution, Systems, Tenants, Allocations, Warranty chain/status, Operational Renewal Work Queue, Requirement Fulfillment Tracking, Milestones, Tasks, delivery documents, and delivery activity context. Delivery does not own Customer master data, Opportunity commercial lifecycle, commercial renewal deal, or Sales pipeline.

Administration owns Users/Roles/Privileges, audit/activity governance, metadata/configuration, picklists, templates, system settings, and admin alerts. Administration does not own Sales or Delivery business rules.

Shared Platform owns cross-cutting infrastructure only. It does not own business rules, lifecycle decisions, or console-specific workflows.

## 7. Console Mapping

| Console | Capabilities |
| --- | --- |
| Sales Console | Customer Management, Opportunity Management, Commercial Requirement Capture, POC Commercial Management, Commercial Renewal Management, Deal Package Management, future Sales Reporting/Pipeline, future Sales Alerts |
| Delivery Console | Project Delivery Management, Requirement Fulfillment Tracking, Allocation Management, Systems Management, Tenant Management, Warranty Management, Operational Renewal Management, Milestone Management, Task Management, Delivery Document Management, Delivery Activity Visibility, future Delivery Dashboard/Alerts |
| Admin Console | Activity / Audit Governance, Dashboard View Governance, Metadata Governance, Picklist / Configuration Management, Template Management, future User/Role/Privilege/System Settings/Admin Alerts |
| No Console / Platform | Business Identity, Reference Integrity, Status Presentation, Persistence Boundary, Object Registry, Shared UI Components |

## 8. Version 1.0 Capability Scope

Included in V1:

- Customer Management
- Opportunity Management
- Commercial Requirement Capture
- POC Commercial Management
- Commercial Renewal Management, partial
- Deal Package Management, partial
- Project Delivery Management
- Requirement Fulfillment Tracking
- Allocation Management
- Systems Management
- Tenant Management
- Warranty Management
- Operational Renewal Management
- Milestone Management
- Task Management
- Delivery Document Management, partial
- Delivery Activity Visibility, partial
- Activity / Audit Governance
- Dashboard View Governance
- Metadata Governance, core only
- Picklist / Configuration Management, partial
- Template Management, partial
- Business Identity
- Reference Integrity
- Status Presentation
- Persistence Boundary
- Object Registry
- Shared UI Components

Missing or partial but likely important before commercial V1 hardening:

- User Management
- Role Management
- Privilege Management
- Admin settings
- Delivery Dashboard
- Console-specific alerts
- Sales Pipeline / Sales Dashboard

## 9. Version 2.0 Capability Expansion

Version 2.0 is the configurable ERP platform phase.

Potential V2 capabilities:

- Configurable Object Modeling
- Configurable Workspace Designer
- Configurable Lifecycle Designer
- Configurable Validation Designer
- Configurable Workflow Designer
- Configurable Alert Designer
- Configurable Report/Dashboard Builder
- Configurable Role/Privilege Designer
- Customer-specific Metadata Packs
- Integration Framework
- Backend/API Synchronization
- Import/Export Framework
- Product/Package Master Data Management
- Configurable Navigation Model

Do not redesign V1 around these capabilities.

## 10. Architecture Observations

| Type | Observation | Recommendation |
| --- | --- | --- |
| Missing Capability | User/Role/Privilege management is not implemented. | Needed before commercial release or shortly after, depending deployment context. |
| Missing Capability | Console-specific Alerts are conceptually defined but not implemented. | Add after core workspaces stabilize. |
| Missing Capability | Delivery Dashboard is missing as a consolidated command center. | Valuable for Delivery Manager persona. |
| Missing Capability | Sales Pipeline/Sales Dashboard is missing. | Needed for complete Sales Console maturity. |
| Overlap Risk | Renewal exists in both Sales and Delivery. | Keep Commercial Renewal under Opportunity; Operational Renewal under Warranty/Renewal Work Queue. |
| Overlap Risk | Requirements originate in Sales but fulfillment validation is Delivery-owned. | Keep Opportunity-owned requirement definitions separate from RequirementCoverage read-model validation output. |
| Overlap Risk | Customer aggregates Delivery data. | Preserve CustomerAccount as aggregator only. |
| Risk | Admin capability is underdeveloped compared to Sales/Delivery. | Do not block product completion, but plan Admin hardening. |
| Risk | Documents are parent-context only, not a full document capability. | Accept for V1 unless document workflows become central. |
| Future Shared Service Candidate | Console-specific alert aggregation. | Do not introduce until concrete alert rules are approved. |
| Future Shared Component Candidate | Workspace-level read-only table and summary-card patterns. | Useful after more workspace implementations reveal repeated shapes. |
| Risk | Activity events are partially implemented. | Avoid treating Activity Log as complete audit compliance until event coverage is broader. |
