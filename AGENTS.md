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

For current V1.2 Final QA, work only on `release/v1.2-final-gap-corrections`. Do not merge to `main`, create or move `v1.2`, or implement V2.0 without explicit approval.
