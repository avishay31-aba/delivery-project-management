# MVP Implementation Plan — Delivery Project Management

**Version:** 1.0  
**Date:** 2026-05-25  
**Parent document:** [DESIGN.md](./DESIGN.md)  
**Strategy:** Mock/local data first · UI and relationships before automation

---

## 1. MVP goal

Deliver a **clickable, Salesforce-style prototype** that proves the three-object model (Project, System, Tenant) end-to-end:

- Three **list dashboards** with filter, search, and inline edit where appropriate  
- Three **record forms** with sticky header, tabs, and linked navigation (PID / SID / TID)  
- **Basic relationships** wired in local state (allocate system to project, attach tenant to system, link tenant to project)  
- **No advanced automation** (no SF sync, alerts engine, pool cut/paste, email, Octopus, or workflow guards beyond simple validation)

Success = a delivery specialist can demo: open Project list → open a project → see allocated systems and tenants → drill to System and Tenant forms → edit grid cells → changes persist in browser storage for the session.

---

## 2. In scope vs out of scope

### In scope

| Area | MVP delivery |
|------|----------------|
| **Project list dashboard** | Sortable/filterable table, key columns, link to form |
| **System list dashboard** | Same; SID/MID, purpose, linked PIDs |
| **Tenant list dashboard** | Same; TID, warranty summary columns |
| **Project form** | One consolidated form (all project types); type selector switches visible sections |
| **System form** | Customer + POC modes via type toggle |
| **Tenant form** | Customer + POC modes via type toggle |
| **Relationships** | Manual allocate/deallocate in UI; FK-style links in mock store |
| **Inline grids** | Milestones, tasks, tenants-on-system, requirements, engagement circles |
| **Navigation** | PID/SID/TID as links between list ↔ form |
| **Data** | JSON mock seed + in-memory store (optional `localStorage` persistence) |
| **Export** | CSV export from dashboards (client-side) |
| **UX shell** | App layout, sidebar nav, SF-inspired colors/status badges |

### Out of scope (defer to post-MVP)

| Area | Reason |
|------|--------|
| Salesforce / Opportunity sync | Automation |
| Production & POC **pool dashboards** | Advanced operational UI |
| Cut/paste · copy/paste allocation services | Automation |
| Auto-populate System & Tenant tab from renewal rules | Automation |
| Alerts (overdue delivery, POC overdue, warranty) | Automation |
| Email, Outlook, Freshdesk | Automation |
| Upgrade Scheduler | Separate module |
| Infrastructure tab (full) | Complexity |
| Usage tab | Not designed |
| Octopus integration | External |
| Full RBAC / field-level permissions | Use single “DS” role for MVP |
| Auth / SSO | Optional stub (“Logged in as Demo User”) |
| PostgreSQL / real API | Phase after UI validation |
| All 6 separate project form layouts | Single form + conditional sections for MVP |
| Warranty predecessor chain logic | Show static warranty rows only |
| Form audit log / “last changed by” | Simple `updatedAt` on mock records only |

---

## 3. Recommended stack (MVP)

| Layer | Choice | Why |
|-------|--------|-----|
| **App** | React 18 + TypeScript + Vite | Fast scaffold, good table ecosystem |
| **Routing** | React Router | List ↔ detail routes |
| **State** | Zustand (or React Context) | Simple mock CRUD without backend |
| **Tables** | TanStack Table v8 | Inline edit, sort, filter |
| **Forms** | React Hook Form + Zod | Header fields + grid row validation |
| **Styling** | Tailwind + small SF-token palette | Blue headers, status colors, dense grids |
| **Icons** | Lucide | Lightweight |
| **Persistence** | `src/data/seed.json` + optional `localStorage` | Mock-first per requirement |

**No backend for MVP.** API-shaped functions (`projectsApi.list()`) called against the local store so a real API can swap in later.

---

## 4. Minimal data model (mock)

```mermaid
erDiagram
    PROJECT ||--o{ PROJECT_SYSTEM : has
    SYSTEM ||--o{ PROJECT_SYSTEM : allocated
    SYSTEM ||--o{ TENANT : hosts
    PROJECT ||--o{ PROJECT_TENANT : links
    TENANT ||--o{ PROJECT_TENANT : linked
    PROJECT ||--o{ MILESTONE : has
    MILESTONE ||--o{ TASK : has
    PROJECT ||--o{ TENANT_REQUIREMENT : defines

    PROJECT {
        string pid PK
        string mainType
        string subType
        string accountName
        date deliveryDate
        string progressStatus
    }
    SYSTEM {
        string sid PK
        string machineId
        string systemClass
        string purpose
        string availability
    }
    TENANT {
        string tid PK
        string sid FK
        string tenantType
        string operationalStatus
    }