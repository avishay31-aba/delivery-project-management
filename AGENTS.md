# Delivery ERP agent instructions

Before changing Delivery ERP code:

1. Read [`docs/architecture-handbook.md`](docs/architecture-handbook.md).
2. For V1.2 work, read [`docs/v1.2-standing-product-rules.md`](docs/v1.2-standing-product-rules.md).
3. Treat documented generic product rules as mandatory cross-application invariants.
4. Perform an impact/completeness analysis before implementation.
5. Identify and reuse the approved reference implementation for equivalent behavior.
6. Resolve business rules in the authoritative domain/service/store layer, not only in React/UI.
7. Reuse shared components and patterns rather than creating local approximations.
8. Check every equivalent usage plus upstream and downstream workflows.
9. If a request conflicts with a documented rule, stop and report the conflict before implementation.
10. Runtime- and build-verify interacting workflows, not only the immediate screen.

## Durable repository documentation

Whenever the Product Owner defines, changes, clarifies, or approves a rule intended to govern future work, determine whether it is a durable rule and update the appropriate authoritative repository documentation as part of the same change:

- `AGENTS.md` for agent and development working rules.
- `docs/v1.2-standing-product-rules.md` for approved V1.2 product behavior and cross-application invariants.
- `docs/architecture-handbook.md` for architectural principles and implementation architecture.
- The relevant Business Object specification for a rule specific to that Business Object.

Do not turn temporary QA observations, one-off bug details, or implementation-specific fixes into standing rules.

If a new instruction conflicts with an existing documented rule, do not silently overwrite either rule. Identify the conflict and ask the Product Owner for clarification.

If it is genuinely unclear whether an instruction is intended to become a durable standing rule, ask the Product Owner before documenting it.

For current V1.2 Final QA, work only on `release/v1.2-final-gap-corrections`. Do not merge to `main`, create or move `v1.2`, or implement V2.0 without explicit approval.
