# 05 · Feature request intake

## 1. Purpose
Capture product ideas from users in a consistent shape, so the planning agent (08) can turn an approved idea into a PRD and task list on the same issue.

## 2. Status in this sample
Implemented: `FeatureRequest`, `buildFeatureIssue` in `src/lib/feedback.ts`, and `src/app/feedback/feature-form.tsx`. It shares the GitHub client, neutralization and dry-run with 04.

## 3. User flow
1. **Account → Request a feature.**
2. The user enters a title, the area it relates to, a description of what they want, an optional "why / use case", and optional mockups (up to 3 images).
3. Submit. The user gets a confirmation.

## 4. Functional rules
- **R1** Validation: title 5-120 characters, description **20**-8000 (longer than for bugs, because planning needs substance), use case ≤ 500, area from the fixed list, mockups ≤ 3 HTTPS URLs on allowlisted hosts.
- **R2** Labels: `feature-request` + `area:<id>`, with the same 422 fallback as 04.
- **R3** The body **must start with `## User request`**. The planning evaluator (07, plan mode) checks for that heading to confirm the issue came from the app.
- **R4** **Planning scope:** the same area-to-paths map as 04 (R10), headed "Read these paths first when drafting the plan".
- **R5** Same neutralization, opaque reporter ID, 60k body cap and timeouts as 04. No console logs.
- **R6** Rate limit: 5 per user per hour, separate from the bug limit.
- **R7** The related page (last page visited) is recorded when available.

## 5. Data contracts
```
## User request
<description>

## Context
- **Reporter ID**: `<id>`
- **Area**: `<id>`
- **Use case**: <text>          (optional)
- **Related page**: <path>      (optional)

## Planning scope
Read these paths first when drafting the plan:
- `src/...`

## Mockups
![mockup 1](https://cdn.example/...)
```
The planning agent later **appends** `## Product Requirements Document`, `## Epic`, `## Acceptance criteria` and `## Implementation tasks` to this same body (08).

## 6. AI design
No AI at submit time.

## 7. Security and privacy
Same as 04. Feature text often contains business ideas, so keep the repo private.

## 8. Failure modes
Same as 04, with "Too many requests this hour…" for the rate limit.

## 9. Configuration
Same as 04.

## 10. Acceptance checks
- The body starts with `## User request` and includes a planning scope (tested).
- The labels are `feature-request` + `area:*` (tested).

## 11. Rebuild checklist
Reuse the 04 pipeline with this schema, body template and limit. Create the `feature-request`, `planned`, `agent:plan-approved` and `agent:implement-approved` labels.

## 12. Pitfalls seen in the source system
- The description was written **twice**: once at the top and again under `## User request`. Keep a single copy.
- The reporter's email and name were included, as in 04.
