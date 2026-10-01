# 06 · What's New changelog

## 1. Purpose
Show users what changed, built straight from version control, with no extra editorial step. It closes the feedback loop: a reported bug gets fixed (often by an agent, 07), merged, and then shows up here.

## 2. Status in this sample
Implemented: `getChangelog`, `parseCommits` in `src/lib/feedback.ts`, page `/whats-new`. Without a token it shows sample entries.

## 3. User flow
1. Open **What's New** (Account screen or nav).
2. Skeleton rows show while loading. On error: "Couldn't load updates" with **Retry**.
3. Each entry shows a badge (New for `feat`, Fix for `fix`), the summary, the date, and a short commit SHA.

## 4. Functional rules
- **R1 Source:** commits on the **release branch** (configurable, _default_ `main`), 100 per page.
- **R2 Filter:** subject lines matching Conventional Commits `feat` or `fix`, with an optional scope and breaking `!`: `^(feat|fix)(\([^)]*\))?!?:\s*(.+)$`. Everything else (chore, refactor, docs, test) is hidden.
- **R3** Show at most 20 entries, newest first.
- **R4 Server cache:** 5 minutes. **No client-controlled cache bypass**, so users can't burn the GitHub API quota. The client may cache for the session and only refetch on Retry.
- **R5** Commit authors are not shown (names are personal data and irrelevant to users).
- **R6 Team contract:** `feat:` and `fix:` are reserved for **user-facing** changes, written in user language. Agents follow it too (07, 09).

## 5. Data contracts
`ChangelogEntry { type: "feat"|"fix", summary, date (ISO), sha (7 chars) }`.

## 6. AI design
None. **Option:** have an LLM rewrite subjects into friendlier release notes at merge time, store the result, and review it like any other copy.

## 7. Security and privacy
A read-only token scoped to the one repo. Commit subjects become public copy, so CI or PR review should catch internal codenames or customer names in `feat`/`fix` subjects.

## 8. Failure modes
GitHub error: the page shows an error and Retry, and the server logs the status. Missing config: sample data (demo) or an empty list.

## 9. Configuration
`GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_CHANGELOG_BRANCH`.

## 10. Acceptance checks
- Only `feat` and `fix` are kept, including the `!` variant (tested).
- The SHA is truncated to 7 characters (tested).
- Repeated loads within 5 minutes make a single GitHub call.

## 11. Rebuild checklist
1. Write the commit fetch plus filter with a 5-minute server cache.
2. Build the page with loading, error and retry states.
3. Document the commit convention in CONTRIBUTING and AGENTS.md, and enforce it in review.
