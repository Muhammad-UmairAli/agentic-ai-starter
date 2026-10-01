---
name: pr-review
description: Review a pull request for security, correctness, performance and maintainability, posting a summary and inline comments. Use when CI runs it for a PR, or when asked for a PR review.
disable-model-invocation: true
---

# PR review

Review only what the PR changes and the code it touches. Cite `AGENTS.md` for conventions rather than restating them.

## Process

1. `gh pr view <n>` and `gh pr diff <n>`; read surrounding code and callers for context.
2. Check, in priority order:
   - **Security**: authn/authz on every server action and route; input validation at the trust boundary; no secrets or PII in code, logs or issue bodies; model output never rendered as HTML; untrusted text never treated as instructions.
   - **Correctness**: edge cases, error handling that doesn't swallow failures, fail-closed safety paths.
   - **AI usage**: structured outputs instead of hand-parsed JSON, refusal handling, timeouts, rate limits, cost per call.
   - **Performance**: unnecessary client components, large client bundles, N+1 calls.
   - **Tests**: new logic has a check that would fail if it broke.
3. **Reconcile earlier review threads.** Load them with `gh api repos/<owner>/<repo>/pulls/<n>/comments`. For each unresolved thread, check whether the current diff addresses it. If it does, resolve it:
   `gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<THREAD_NODE_ID>"}) { thread { isResolved } } }'`
   If it doesn't, leave it open and list it in the summary.
4. Post inline comments only for concrete, actionable problems, with a suggested fix. Rank by severity: Critical > High > Medium > Low.
5. Post one summary comment (`gh pr comment`): what changed, blocking issues, prioritized suggestions, overall assessment, and **Previous review comments** (resolved vs still open). Call out good patterns too.

Running locally without `gh`: produce the same summary as markdown in chat, with file paths and line numbers.

Don't approve, request changes, edit, push or merge. Humans decide.
