# 08 · Feature planning agent

## 1. Purpose
Turn an approved feature request (05) into a reviewable plan (PRD, epic, acceptance criteria, task checklist) written **onto the same issue**, so product and engineering can review it in one place before anything gets built.

## 2. Status in this sample
Implemented: `agent-issues.yml` (plan mode), `.claude/skills/feature-plan/SKILL.md`.

## 3. Flow
1. A triager validates the request and applies `agent:plan-approved`.
2. The evaluator checks: label `feature-request` present, `## User request` present, body ≤ 12,000 characters.
3. The agent reads the issue and the related code, checks for duplicates, and rewrites the issue body: the original sections stay, and the plan sections are appended.
4. The agent adds `planned` and comments: "plan ready; apply `agent:implement-approved` to build".

## 4. Functional rules
- **R1** Planning only: no code changes, no PRs, **no child issues**. Everything lives on one issue, which keeps a single source of truth and makes `Fixes #N` close it.
- **R2 Triage gate:** if it's really a bug, spam, or too vague, comment saying what's missing and stop.
- **R3 Duplicate check** against the 30 most recent open `feature-request` issues. If it duplicates one, comment with the link and stop.
- **R4 Context:** read the **Planning scope** paths first (05 R4) so the plan matches the real architecture. Note dependencies on other services.
- **R5 Sections to append** (exact headings, because the implement evaluator looks for them):
  - `## Product Requirements Document`: problem, goals, non-goals, user stories ("As a… I want… so that…"), UX notes including empty and error states, technical considerations, risks, dependencies, open questions, out of scope.
  - `## Epic`: one paragraph, a success metric, size S/M/L.
  - `## Acceptance criteria`: numbered and testable.
  - `## Implementation tasks`: **3-8** items in the form `- [ ] <imperative task>`. Extra tasks go under "Future tasks" inside the PRD.
- **R6** Keep the whole body ≤ 12,000 characters (the implement evaluator's limit).
- **R7** No tasks that only touch CI, secrets, env files or infrastructure unless the user asked for it.
- **R8 Tools:** Read/Grep/Glob; `gh issue view|list|edit|comment`. No write access to code (`contents: read` is enough).
- **R9 Budgets:** 40 turns, 60 minutes.

## 5. Data contracts
The issue body after planning: `## User request`, `## Context`, `## Planning scope`, optional `## Mockups`, then the four plan sections. Label `planned` added.

## 6. AI design
An agent with read-only repo tools, using `gh issue edit --body-file -` to rewrite the issue. Model `claude-opus-5-5`.

## 7. Security and privacy
The user request is untrusted. The agent can't change code, so injection is limited to the issue text, which a human reviews before approving implementation.

## 8. Failure modes
Evaluator block: comment. Budget hit: failure comment. Duplicate or vague: triage comment and no plan.

## 9. Configuration
Labels `feature-request`, `agent:plan-approved`, `planned`.

## 10. Acceptance checks
- The plan appears on the same issue, with no child issues.
- Original sections are preserved.
- 3-8 tasks.
- Body ≤ 12k characters.
- A duplicate request gets a link instead of a plan.

## 11. Rebuild checklist
Evaluator plan rules, then the workflow step with read-only tools, then the skill with exact headings, then labels, then a dry run.

## 12. Pitfalls seen in the source system
- The turn budget was the most common failure ("planning turn limit"). Keep the skill focused, and raise turns only from metrics.
- The editor-specific copy of the planning skill drifted from the CI copy. Keep one canonical skill.
