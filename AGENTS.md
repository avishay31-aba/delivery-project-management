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

## Durable resume, synchronization, commit, and publication workflow

GitHub is the authoritative source-code checkpoint. The mandatory lifecycle is:

```text
Resume task -> synchronize from the authoritative GitHub branch -> verify and report repository/checkpoint state -> receive explicit user approval -> implement -> verify -> commit -> publish to the authoritative GitHub branch -> verify GitHub HEAD and commit containment -> confirm a clean working tree -> report completion
```

For current V1.2 Final QA, the authoritative branch is `release/v1.2-final-gap-corrections`.

### Resume and pre-implementation approval gate

Whenever continuing a task after a break, on another day or laptop, or in another execution environment, synchronize and verify before changing code or documentation.

For local execution:

1. Require a clean working tree and the checked-out branch `release/v1.2-final-gap-corrections`.
2. Run `git fetch origin` and compare local HEAD with `origin/release/v1.2-final-gap-corrections`.
3. If the remote is ahead and the clean local branch can be fast-forwarded, run `git pull --ff-only origin release/v1.2-final-gap-corrections`.
4. Verify that local HEAD equals the authoritative remote-branch HEAD.

For Codex Cloud execution, a platform-provided temporary branch such as `work` is permitted and need not have the authoritative branch name. Cloud HEAD does not have to equal the authoritative GitHub branch HEAD: GitHub may wrap the Cloud source commit in a merge commit. A Cloud checkpoint is incorporated when authoritative GitHub/platform evidence establishes that its source commit is contained in the current `release/v1.2-final-gap-corrections` history. SHA equality is sufficient but not required. Valid evidence includes the source commit being a parent or ancestor of the release-branch HEAD, the task's pull request having been successfully merged into that branch, or equivalent authoritative Codex/GitHub evidence of incorporation.

Incorporation alone does not prove that a Cloud workspace is current for new implementation. Also verify whether newer release-branch work was added after the source commit was incorporated. If later changes are not present in the workspace, refresh or rematerialize it from the latest authoritative branch before implementing. The synchronization gate prevents work on stale code; it does not reject an incorporated Cloud source commit merely because GitHub created a different merge SHA. A temporary Cloud branch is never authoritative. If incorporation or freshness cannot be safely established, stop and report the ambiguity.

Before modifying anything on a resumed task, report and then wait for explicit user approval: execution mode; current local/temporary branch; workspace HEAD; authoritative branch; authoritative GitHub HEAD when available; working-tree status; whether synchronization was required and completed; and whether the workspace is current and ready.

Never automatically merge or rebase diverged branches, stash or reset work, overwrite local changes, or force synchronization. If the tree is dirty, branches diverged, fast-forward is impossible, origin or the expected branch is unavailable, or safe synchronization otherwise fails, stop and report the exact condition.

### Implementation and verification

After approval, perform the required impact/completeness analysis, read the applicable architecture, standing-rule, and Business Object documentation, implement only the approved scope, reuse authoritative domain/shared implementations, and apply the durable-documentation rule without creating competing local behavior.

Before commit, run appropriate targeted tests, lint, type, and build checks; run `git diff --check`; verify required interacting/upstream/downstream workflows; and confirm that only intended changes remain. Do not publish when required verification has materially failed. Stop and report significant problems or ambiguity.

### Mandatory commit and publication

Every completed, successfully verified implementation unit must receive a new descriptive commit and be published. It must not remain as uncommitted files, a local-only commit, or work existing only on a temporary/unpublished branch.

For local execution, stage only intended files, create a new commit, and push without force to `origin/release/v1.2-final-gap-corrections`. Fetch and verify afterward that local HEAD equals the remote branch HEAD and that the working tree is clean.

For Codex Cloud execution, create a new commit and publish it using the supported Codex/GitHub publication or pull-request mechanism with base `release/v1.2-final-gap-corrections`. A normal `git push origin` is not required when the sandbox exposes no remote; use the platform publication mechanism instead. Apply/Reapply is not publication. Ensure the accepted result lands on the authoritative branch and verify the resulting GitHub HEAD. If no supported publication mechanism is available, stop and report that exact blocker without claiming synchronization.

### Post-publication report and cross-laptop continuity

After publication, report the commit hash and subject, changed files, authoritative branch, publication method and push/PR/merge result, resulting authoritative GitHub HEAD, whether it contains the implementation commit, local/Cloud HEAD and working-tree status, and verification results. Work is not fully synchronized until the completed implementation exists on the authoritative GitHub branch.

Codex Cloud provides task/conversation continuity; GitHub provides authoritative source-code continuity. Every laptop and new Cloud workspace synchronizes from GitHub before resumed implementation, and every completed change returns to GitHub before it is considered synchronized.

### Prohibited operations

For current V1.2 Final QA, never merge to `main`, create or move the `v1.2` tag, force-push, amend or rewrite accepted commits/history, automatically resolve divergence by merge/rebase, overwrite uncommitted work, treat a temporary Cloud branch as authoritative, use Apply/Reapply as publication, or implement V2.0 without explicit approval. Stop and report rather than performing an ambiguous synchronization or publication operation.
