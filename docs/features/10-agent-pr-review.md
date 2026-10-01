# 10 · AI pull request review

## 1. Purpose
Give every PR, human or agent, a fast, consistent first review against the team's rubric, so human reviewers can focus on design and intent.

## 2. Status in this sample
Implemented: `.github/workflows/agent-pr-review.yml`, `.claude/skills/pr-review/SKILL.md`.

## 3. Flow
On PR opened, synchronized, reopened or marked ready for review, the review job runs the `/pr-review` skill. It reads the diff and surrounding code, reconciles earlier threads, posts inline comments, and posts one summary comment.

## 4. Functional rules
- **R1 Triggers:** `opened`, `synchronize`, `ready_for_review`, `reopened`. Skip drafts **except** agent drafts (`agent/*` branches), so agent work is reviewed before a human looks. Skip fork PRs, which get no secrets.
- **R2 Concurrency:** one run per PR, and a newer push cancels the older run.
- **R3 Rubric, in priority order:**
  1. **Security:** authz on every server entry point; validation at trust boundaries; no secrets or PII in code, logs or issue bodies; model output never rendered as HTML; untrusted text never treated as instructions; XSS sinks (`innerHTML`, sanitizer bypasses, rich text).
  2. **Correctness:** edge cases, error handling that doesn't swallow failures, fail-closed safety paths.
  3. **AI usage:** structured outputs, refusal handling, timeouts, rate limits, cost per call.
  4. **Performance:** client bundle and lazy loading, needless client components, N+1 calls, leaked subscriptions or listeners, list keys.
  5. **Maintainability:** layering, naming, duplication vs. premature abstraction, function complexity under ~10.
  6. **Framework-specific anti-patterns:** keep a short, stack-specific checklist in the skill (the source had one for its UI framework covering subscription teardown, nested subscribes, state mutation outside actions, wrong import entry points, missing list tracking, missing keyboard handlers in modals, mobile keyboard overlap, and design-token misuse).
  7. **Tests:** new logic has a check that would fail if it broke.
- **R4 Thread reconciliation:** load earlier review comments. For each unresolved thread, if the diff now addresses it, **resolve it** through the GraphQL `resolveReviewThread` mutation. Otherwise list it under "Previous review comments".
- **R5 Output:** inline comments only for concrete, actionable issues with a suggested fix, ranked Critical > High > Medium > Low. One summary comment: what changed, blocking issues, prioritized suggestions, overall assessment, previous comments resolved or open, and good patterns.
- **R6 Review only:** it never approves, requests changes, edits, pushes or merges.
- **R7 Tools:** Read/Grep/Glob; `git diff|log`; `gh pr view|diff|comment`; `gh api` for PR comments and GraphQL; the inline-comment tool. Contents read, pull-requests write.
- **R8** Pin the model in the workflow (`claude-opus-5-5`), not in the skill.

## 5. Data contracts
One summary PR comment per run (don't use a sticky progress comment as well, it duplicates noise) plus inline comments.

## 6. AI design
A read-mostly agent. **Alternative used in the source:** Anthropic's official `code-review` plugin, loaded through the action's plugin marketplace inputs, which needs no custom rubric. Use the plugin to start fast, and a custom skill once you have house rules.

## 7. Security and privacy
The PR head code is checked out, but nothing from it runs: no install, no build. GraphQL access is limited by the job token's permissions (contents read).

## 8. Failure modes
A missing secret or fork PR means the job is skipped. Budget hit: no summary, and the run shows as failed.

## 9. Configuration
Secret `ANTHROPIC_API_KEY`. 40 turns, 30 minutes.

## 10. Acceptance checks
- A PR with a planted XSS sink gets a High or Critical finding.
- A fixed earlier thread gets resolved.
- Draft human PRs are skipped; agent drafts are reviewed.

## 11. Rebuild checklist
Workflow, then skill (rubric plus stack checklist), then secret, then try it on three recent real PRs and tune the rubric to cut noise.

## 12. Pitfalls seen in the source system
- The model was pinned to an older version. Revisit it when models change.
- Agent drafts were identified by bot actor name. A branch prefix is more robust and easier to test.
