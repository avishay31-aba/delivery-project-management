# Codex Project Context

## Purpose

Delivery ERP is a commercial ERP-style React application for managing the delivery lifecycle from Sales opportunity through Delivery execution, System allocation, Tenant operations, Warranty/Renewal readiness, Requirement Coverage, dashboards, Activity, and Configuration History.

This document is an orientation handover for a fresh Codex Local instance. It is not a replacement for the authoritative product and architecture specifications listed below.

## Current Status

- Current V1.2 status: Development Complete / Pending Publication.
- V1.2 is the final frontend-only, browser-persisted milestone. It is suitable for QA validation, demonstration, and manual release handoff.
- V1.2 intentionally has no trusted backend, production database, secure multi-user authentication, server-side authorization, or browser-owned update agent.
- Version 2.0 is the phase for backend/API, database persistence, authentication, roles, privileges, server-side authorization, secure sessions, Administration Console maturity, Application Upgrade, Update Agent, and migration from browser-local state.
- Current authoritative branch for V1.2 Final QA/gap correction work: `release/v1.2-final-gap-corrections`.

Before starting work, fetch from the remote and confirm the local branch is current with `origin/release/v1.2-final-gap-corrections`. Do not merge to `main`, create or move `v1.2`, or implement V2.0 without explicit Product Owner approval.

## Authoritative Repository Documents

Use these documents as the durable source of truth:

- `AGENTS.md`: agent/development working rules, branch scope, impact analysis, shared reuse, documentation-update expectations, and conflict handling.
- `docs/architecture-handbook.md`: architecture principles, implementation methodology, ownership model, shared UI/component standards, mutation/save boundaries, audit standards, navigation, no-redesign principle, and milestone boundaries.
- `docs/v1.2-standing-product-rules.md`: approved cross-application V1.2 behavior and invariants. This is an invariant catalog, not a defect log.
- `docs/enterprise-capability-model/delivery-erp-ecm-v1.md`: business capabilities, capability ownership, console mapping, and capability boundaries.
- `docs/business-object-model/delivery-erp-bom-v1.md`: authoritative business-domain map, Business Object catalog, relationships, ownership matrix, read-model capabilities, and shared service/component matrices.
- `docs/business-objects/*.md`: object-specific ownership, fields, rules, validations, actions, statuses, events, invariants, and non-ownership boundaries.
- `docs/product-design/*.md`: workspace/page design specifications. Implementation must conform to approved PDS scope and preserve approved workflows.
- `docs/product-roadmap.md`: release baseline and V2.0 phase direction.
- `docs/release-management-backlog.md`: future release publishing/backlog architecture. V1 release deployment remains manual DevOps responsibility.
- `docs/architecture-decisions/*.md`: durable architecture decisions, currently including the V2.0 backend-boundary ADR.
- `docs/product-decision-log.md`: concise durable log of important product/architecture decisions whose rationale would otherwise be lost from chat history.

Root-level `README.md`, `DESIGN.md`, and `MVP-PLAN.md` contain earlier MVP/pre-implementation context and may be useful historically, but the current `docs/` architecture, V1.2 rules, BOS, PDS, roadmap, release notes, and AGENTS instructions are newer and should govern V1.2 work when they differ.

## Implementation Methodology

The approved methodology is:

```text
Architecture Handbook
  -> Enterprise Capability Model (ECM)
  -> Business Object Model (BOM)
  -> Business Object Specification (BOS)
  -> Product Design Specification (PDS)
  -> Implementation
  -> Product Readiness Review (PRR)
```

Do not add new methodology artifact types without explicit approval. For a future implementation request, review the product intent, implement only the approved scope, then perform a Product Readiness Review. Report extra findings separately unless the Product Owner approves expanding scope.

## Ownership Principles

The application is organized by:

```text
Console
  -> Workspace
    -> Business Object
```

Roles grant permissions. They do not redefine business ownership. Workspaces compose the user experience, but Business Objects and their authoritative domains own business rules, lifecycle state, validation, derived read models, and mutation semantics.

Pages and React components own input, rendering, local draft UI state, and composition. They must not become alternate sources of business truth.

Shared/Core services own cross-cutting infrastructure such as business identity, reference resolution, shared status presentation, date/time presentation, persistence boundaries, dashboard behavior, audit/activity read models, selectors, and reusable field/table controls.

## Required Work Method

Before implementation:

- Perform an impact/completeness analysis.
- Identify the authoritative Business Object/domain/store/service owner.
- Identify and reuse the approved reference implementation for equivalent behavior.
- Enumerate equivalent usages across forms, dashboards, dialogs, tables, history, activity, export, persistence, navigation, and reload flows.
- Check upstream and downstream workflows before changing behavior.
- Stop and report conflicts with documented rules instead of silently overriding them.

During implementation:

- Resolve business rules in authoritative domain/service/store/read-model layers, not only in React/UI.
- Reuse shared components and patterns. Extend shared infrastructure when the behavior is generic.
- Preserve approved business forms, workflows, field placement, density, and visual structure unless the Product Owner explicitly approves a redesign.
- Keep drafts local to their owning save scope. Persisted mutations need explicit visible commit boundaries and confirmation/error feedback where required.
- Do not introduce frontend-only security, fake roles, fake permissions, browser-stored password hashes, browser release publishing, or incomplete upgrade-agent behavior in V1.2.

Before completion:

- Build-verify the application.
- Runtime-verify interacting workflows where feasible, not only the immediate screen.
- Verify save, reload, history/activity, export, navigation, read-model refresh, lifecycle transitions, and related dashboards when affected.
- Report environment limitations separately and do not claim unperformed verification.
- Run a Product Readiness Review for the implemented scope.

## Documentation As Definition Of Done

Future Codex instances must not need chat history to reconstruct implemented product behavior.

Whenever implementation defines, changes, clarifies, or approves a durable product, business, technical, UI, lifecycle, or architecture rule, update the appropriate authoritative repository documentation in the same change:

- `AGENTS.md` for agent/development working rules.
- `docs/v1.2-standing-product-rules.md` for approved V1.2 cross-application behavior and invariants.
- `docs/architecture-handbook.md` for architecture, ownership, shared components, implementation methodology, and cross-cutting standards.
- The relevant `docs/business-objects/*.md` file for Business Object-specific rules.
- The relevant `docs/product-design/*.md` file for approved workspace/page design changes.
- `docs/product-decision-log.md` for durable decisions whose rationale would otherwise only exist in chat.

Do not document one-off QA observations, temporary debugging context, or implementation details as standing product rules. If it is unclear whether a new instruction is durable, ask the Product Owner.

## Git And PR Workflow

- Work on `release/v1.2-final-gap-corrections` for current V1.2 Final QA unless explicitly told otherwise.
- Fetch before work and confirm the branch is current with the remote.
- Keep commits scoped to the approved task.
- For documentation-only tasks, do not modify product code or runtime behavior.
- Create a commit after successful checks.
- Do not merge to `main`.
- Any PR for V1.2 Final QA must target `release/v1.2-final-gap-corrections`.
- Respect branch protection: use review/PR flow for protected branches and do not bypass protection.

## Recommended Reading Sequence

Before changing code, read:

1. `AGENTS.md`
2. `docs/codex-project-context.md`
3. `docs/architecture-handbook.md`
4. `docs/v1.2-standing-product-rules.md`
5. `docs/product-roadmap.md`
6. `docs/releases/v1.2-release-notes.md` if release scope matters
7. `docs/enterprise-capability-model/delivery-erp-ecm-v1.md`
8. `docs/business-object-model/delivery-erp-bom-v1.md`
9. Relevant `docs/business-objects/*.md`
10. Relevant `docs/product-design/*.md`
11. `docs/product-decision-log.md`
12. Relevant implementation files and reference implementations
