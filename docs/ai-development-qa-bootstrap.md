# AI development and QA infrastructure bootstrap

Status: infrastructure trial only; ERP implementation is disabled.
Approved source branch: develop/v1.4-qa.
Bootstrap source HEAD: b1b00d00e5b35c879f9f5353fe174e6dbf7184c0.
Infrastructure branch: infra/ai-development-qa-bootstrap.

## Scope and authorization
The Product Owner explicitly approved infrastructure installation and a synthetic cloud trial on 2026-10-19.
This approval permits the infrastructure branch and its commits/pushes only. It does not authorize product changes, RIS implementation, merging, deployment, or automatic PR creation.
For this trial these restrictions override broader post-implementation push/PR instructions in root AGENTS.md.
No product dependency installation, application execution, or production data access occurs.

## Trial
A branch-scoped push starts GitHub Actions without merging to the default branch.
A trusted AST interpreter detects a deliberately broken synthetic clamp function.
Codex implementation and independent QA run in separate ephemeral processes, without shared conversation history.
QA uses a read-only sandbox and independently examines the candidate against the requirement.
A controller requires both deterministic tests and structured QA approval; maximum three QA cycles and two repairs.
Each agent task checks actual Git HEAD and repository cleanliness. Candidate digest binds each review to exact input.
Only temporary synthetic candidate files may change. Results are uploaded as Actions artifacts.
A failed or absent AI credential produces a failed run, never a claimed success.
Runner timeout is 20 minutes; each agent invocation is bounded to 180 seconds.
This trial has no repository write token and no merge/deploy step.

## Credential and trigger prerequisites
Configure OPENAI_API_KEY through GitHub repository Actions secrets; never put it in chat, source, or workflow inputs.
The current connector cannot manage secrets or dispatch new workflows.
The initial branch push supplies the trial trigger. Future automatic submission from ChatGPT still needs an authenticated integration and a validated task contract.
No claim of a complete autonomous ERP workflow is made until that handoff and a full cloud trial pass.

## Future production workflow acceptance
Before enabling product work, separately approve the implementation scope and publication permissions.
Use an approved requirement contract, exact expected base SHA, allowed paths, test commands, iteration/time/usage limits, and acceptance criteria.
Run QA against each exact candidate revision in a fresh environment, including browser/runtime tests where applicable.
Treat invalid/missing QA output and skipped/failed tests as failure.
Require human clarification for changed requirements or redesign outside approved scope.
Enforce existing-record and future-record correctness under the Architecture Handbook retroactive correction standard.
Keep merge and deployment behind explicit authorization.
