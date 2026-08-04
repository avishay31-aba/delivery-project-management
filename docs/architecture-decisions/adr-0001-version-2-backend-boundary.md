# ADR 0001: Version 2.0 Backend Boundary

Status: Proposed.

## Context

Version 1.2 is the final frontend-only Delivery ERP milestone. It uses React/Vite, browser-local persistence, and shared client-side domain/store logic to validate and demonstrate the approved business workflows.

Version 1.2 must not implement authentication, authorization, password management, backend persistence, or an Update Agent as browser-only prototypes.

The Version 1.2 application cannot safely own security-sensitive responsibilities because browser storage and client-side code are fully inspectable and modifiable by the user.

## Decision Drivers

- Password hashes must never be exposed to frontend read models, exports, browser persistence, or client code.
- Password hashing must occur on a trusted server using a mature algorithm such as Argon2id or bcrypt.
- Sessions must be server-managed or protected by secure signed tokens and HttpOnly cookies.
- Authorization must be enforced at the server-side transaction boundary.
- Administration, Metadata Settings, Application Upgrade, and Update Agent capabilities require trusted infrastructure and auditability.
- Browser-local Version 1.2 data needs a deliberate migration/import path.

## Candidate Backend Stacks

### Node.js / TypeScript

Pros:

- Reuses the repository's TypeScript skill set.
- Aligns well with existing domain and validation code.
- Strong ecosystem for API services, background jobs, authentication libraries, and migrations.

Tradeoffs:

- Requires careful service layering so domain rules do not remain frontend-owned.
- Operational hardening, dependency scanning, and runtime monitoring must be added.

### .NET

Pros:

- Mature enterprise stack for authentication, authorization, database access, background workers, and Windows-oriented deployment environments.
- Strong fit for internal ERP administration and long-running services.

Tradeoffs:

- Introduces a second language/runtime alongside the current frontend.
- Existing TypeScript domain logic would need migration or API-based integration.

### Python

Pros:

- Fast API development and mature data tooling.
- Good option if future reporting/import/export workloads dominate.

Tradeoffs:

- Less direct reuse of existing TypeScript logic.
- Requires strong discipline around typing, migrations, and domain boundaries.

## Candidate Databases

### PostgreSQL

Pros:

- Strong relational integrity for ERP Business Objects.
- Good migration tooling, reporting support, and concurrency controls.

Tradeoffs:

- Requires operational database management.

### SQL Server

Pros:

- Strong enterprise fit, especially in Microsoft-oriented environments.
- Mature backup, recovery, reporting, and security features.

Tradeoffs:

- Licensing and hosting model must be confirmed.

### SQLite

Pros:

- Simple local deployment and migration path for small single-site installations.

Tradeoffs:

- Not the preferred production choice for multi-user ERP concurrency unless the deployment model is intentionally constrained.

## Migration Strategy

- Define a Version 1.2 browser-state export/import contract.
- Validate all imported Business IDs, relationships, Activity records, Configuration History records, documents, and metadata references.
- Preserve existing Business IDs.
- Preserve immutable audit/history records.
- Reject or quarantine invalid records instead of silently changing business meaning.
- Create deterministic migration reports.

## Deployment And Update Agent Implications

- The Update Agent must run outside the browser.
- Deployment credentials must never be exposed to frontend code.
- Release packages must be validated before activation.
- Backend/database backup must precede upgrades.
- Health checks must run after activation.
- Rollback must use retained artifacts and database migration strategy.
- Upgrade history must be immutable and auditable.

## Outcome

Version 2.0 requires a trusted backend boundary before implementing internal authentication, roles, privileges, server-side authorization, Administration Console write operations, Metadata Settings administration, Application Upgrade, or Update Agent behavior.

The final backend stack remains undecided until options and tradeoffs are approved.
