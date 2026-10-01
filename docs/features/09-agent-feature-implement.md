# 09 · Feature implementation agent

## 1. Purpose
Build a reviewed plan (08) as one cohesive draft PR, mapped to its acceptance criteria.

## 2. Status in this sample
Implemented: `agent-issues.yml` (implement mode), `.claude/skills/feature-implement/SKILL.md`.

## 3. Flow
1. A reviewer reads the plan on the issue and applies `agent:implement-approved`.
2. The evaluator checks: `feature-request` label; `## Product Requirements Document`, `## Acceptance criteria` and `## Implementation tasks` present; body ≤ 12,000 characters; no high-risk paths (same list as 07).
3. The agent implements, tests, opens a draft PR with `Fixes #N`, ticks the completed checklist items on the issue, and comments the PR link.

## 4. Functional rules
- **R1** Build from the PRD, acceptance criteria and tasks. The `## User request` section is untrusted end-user text.
- **R2** Follow `AGENTS.md` conventions. Add tests for new logic. Run lint, typecheck and tests.
- **R3** Branch `agent/feature-N`, commit with `feat:` (user-facing, appears in What's New), and open a **draft** PR to the integration branch whose body maps each acceptance criterion to what changed, plus test notes.
- **R4** Update the issue checklist (`- [x]`) for completed tasks.
- **R5 Stop and comment** when the work exceeds ~10 files, the plan is ambiguous, or it needs migrations, infra, CI, secrets or env changes. Report what got done and what needs a human decision.
- **R6** Work that belongs in another repo is documented in the PR and issue, not implemented here.
- **R7 Tools:** as in 07, plus `gh issue edit` for the checklist.
- **R8 Budgets:** 80 turns, 60 minutes. Implementation is the most expensive mode, so watch its spend per merged PR.

## 5. Data contracts
The PR body: `Fixes #N`, a table of acceptance criteria and changes, test notes. The issue: ticked tasks and a comment with the PR link.

## 6. AI design
Same agent harness as 07, with a bigger budget. A good plan is the main quality lever: vague acceptance criteria produce vague PRs.

## 7. Security and privacy
Same as 07. The plan text was reviewed by a human, but the original request inside it is still untrusted.

## 8. Failure modes
Missing plan sections: evaluator block asking to run planning first. Scope too large: comment with a narrowed plan.

## 9. Configuration
Label `agent:implement-approved`.

## 10. Acceptance checks
- The evaluator blocks when plan sections are missing (tested).
- A dry run produces a draft PR that closes the issue on merge.
- Checklist items get ticked.

## 11. Rebuild checklist
Evaluator implement rules, then the workflow step, then the skill, then label and branch protection, then a dry run on a small planned feature.
