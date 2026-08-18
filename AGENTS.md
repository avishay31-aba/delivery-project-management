# Delivery ERP agent instructions

Before implementation work:

1. Determine the authoritative target branch for the current task from the Product Owner/task, repository context, or clearly intended checked-out branch. Do not silently switch development streams; if ambiguous, stop and ask.
2. Run `git fetch origin`, synchronize the local authoritative branch with `origin/<authoritative-branch>`, and verify the working tree is clean.
3. Read, in order: `AGENTS.md`, [`docs/codex-project-context.md`](docs/codex-project-context.md), V1.2 rules when doing V1.2 work, [`docs/architecture-handbook.md`](docs/architecture-handbook.md), relevant Business Object specifications, [`docs/product-decision-log.md`](docs/product-decision-log.md), relevant Product Design specifications, and additional authoritative documents referenced by the project context.
4. Treat repository documentation and implementation as authoritative. Chat history is not authoritative and must not be required to reconstruct the product.
5. Before coding, report the current branch, HEAD SHA, git status, relevant authoritative docs reviewed, and the impact/completeness analysis.
6. Identify and reuse existing domain, shared, and generic implementations before creating new logic. Resolve business rules in the authoritative domain/service/store layer, not only in React/UI.
7. Check every equivalent usage plus upstream/downstream save, reload, history, export, navigation, lifecycle, and runtime workflows.
8. If a request conflicts with a documented rule, stop and report the conflict before implementation.

After implementation:

1. Run required build, lint, targeted verification/tests, runtime verification where applicable, and `git diff --check`.
2. Commit the approved work on the working branch, push it, and create a PR targeting the same authoritative branch established at startup.
3. Before merge, verify the correct base branch, intended files only, no unexpected conflicts, required validation passed, unrelated development streams untouched, and protected/frozen tags untouched.
4. If the task authorizes automatic merge and all checks pass, merge the PR.
5. After merge, fetch origin, synchronize the local authoritative branch with `origin/<authoritative-branch>`, verify local equals origin, and verify the working tree is clean.
6. Report the authoritative branch, starting HEAD, implementation commit, PR number, merge commit, final authoritative branch HEAD, verification performed, and documentation updated.

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
