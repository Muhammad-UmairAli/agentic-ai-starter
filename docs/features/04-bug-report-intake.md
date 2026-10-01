# 04 · Bug report intake

## 1. Purpose
Let any signed-in user report a bug from inside the app. The report lands as a structured GitHub issue that a person can triage and an approved agent (07) can act on. Users don't need GitHub accounts.

## 2. Status in this sample
Implemented: `src/lib/feedback.ts` (`BugReport`, `buildBugIssue`, `createIssue`), `src/components/diagnostics.tsx` (console buffer and last page), `src/app/feedback/bug-form.tsx`. Without `GITHUB_TOKEN`, the app shows a **dry-run preview** of the issue.

## 3. User flow
1. Open **Account → Report a bug**, or the feedback page.
2. Fill in a title, the area it happened in (pre-selected from the last page visited), and what happened.
3. Optionally attach up to 3 screenshots. Uploads finish **before** Submit is enabled.
4. Optionally include recent app logs. **Decision:** opt-in checkbox (the sample) or always on with a disclosure.
5. Submit. A success message links to the issue (team-internal) or confirms receipt. Validation and rate-limit errors appear inline. The modal closes with Escape.

## 4. Functional rules
- **R1** Only authenticated users can submit. The reporter is recorded as an **opaque user ID**, not an email or name.
- **R2** Validation: title 5-120 characters, description 10-8000, area from a fixed list, page fields ≤ 500, user agent ≤ 500, app version ≤ 64, logs ≤ 100 lines × 2000 characters, attachments ≤ 3 HTTPS URLs.
- **R3 Automatic context:**
  - **Submitted from:** the current page path.
  - **Occurrence page:** the last page visited *before* opening feedback. Skip the account and settings pages, since that's where the feedback entry point lives. Keep it in session storage so a reload doesn't lose it.
  - **Area suggestion:** derived from the occurrence page by route patterns.
  - **Query strings and fragments are always stripped**, because they can carry tokens such as `token`, `code`, `access_token`, `id_token`, `refresh_token`, `session`, `state` and `nonce`.
  - User agent and app version.
- **R4 Console capture** (browser):
  - Patch `console.log/info/warn/error` once at startup, plus `window.error` and `unhandledrejection`.
  - Buffer limit: 50 lines and a 32k character budget, dropping the oldest. Each line is capped at 800 characters, redacted when captured, and timestamped.
  - On submit: the last 30 lines, at most 12k characters, redacted **again**.
- **R5 Redaction** (client and server): Bearer tokens, JWTs, emails, phone numbers, sensitive JSON keys (password, token, secret, api_key, authorization, email, phone, dob, session_id), sensitive `key=value` pairs, payment, cloud and source-host key formats.
- **R6** **Never attach server logs** from a shared, process-wide buffer. They mix every user's activity.
- **R7 Neutralize** user text before it goes into the issue:
  - Strip HTML comments; they are invisible when rendered but agents can read them.
  - Defang `@mentions` by inserting a zero-width space after `@`.
  - Fence logs with a fence the content can't close early.
- **R8 Attachments:** embed only HTTPS URLs on an **allowlisted host** (your media CDN). GitHub fetches embedded images, so they must be publicly reachable or signed.
- **R9 Labels:** `user-reported` + `area:<id>`. **Never** an approval label. If GitHub returns 422 (the area label doesn't exist yet), retry with `user-reported` only and log a warning to create the label.
- **R10 Investigation scope:** a server-side map from each area to the source paths an agent should search first, written into the issue. Keep it current as the code moves. An empty list means "explore normally".
- **R11** Body capped at 60,000 characters, with a `(truncated)` marker.
- **R12 Rate limit:** 10 reports per user per hour. Count only accepted submissions.

## 5. Data contracts
**Issue body (section order):**
```
## User report
<description>

## Context
- **Reporter ID**: `<opaque id>`
- **Area**: `<id>`
- **Occurrence page**: <path>
- **Submitted from**: <path>
- **App version**: <v>
- **User agent**: <ua>

## Investigation scope
Search these paths first:
- `src/...`

## Screenshots
![screenshot 1](https://cdn.example/...)

## Browser console (redacted)
~~~~text
...
~~~~
```
**Response:** `{ ok: true, url, number }`, or `{ ok: true, dryRun: true, title, body, labels }`, or `{ ok: false, message }`.

## 6. AI design
No AI at submit time, by design. The issue structure (labelled sections, area, scope paths, redacted logs) is what makes it **agent-ready** for 07.

## 7. Security and privacy
| Risk | Control |
|---|---|
| PII in a third-party system | Opaque reporter ID; redaction twice; no server logs; stripped query strings |
| Prompt injection through the issue | R7 neutralization. Agents read the issue as untrusted data (07) |
| Triggering bots through `@mentions` | R7 defang. The mention workflow ignores issue bodies (11) |
| Tracking pixels and markdown injection | R8 host allowlist; safe fences |
| Token scope | Fine-grained bot token: Issues read/write on **one** repo |
| Leaking upstream errors | Log the status code; show a generic message |

## 8. Failure modes
| Failure | User sees |
|---|---|
| Validation | The first field error |
| Rate limit | "Too many reports this hour…" |
| GitHub not configured | Dry-run preview (sample) or "Bug reporting is not configured" (503) |
| GitHub error or timeout (10 s) | "We couldn't file your report right now…" |
| Upload in progress | Submit disabled |
| Image too big or wrong type | Inline error. _Default_ 5 MB; jpg/png/gif/webp/heic/heif. Check the extension too, because iOS can report HEIC with an empty MIME type |

## 9. Configuration
`GITHUB_TOKEN`, `GITHUB_REPO`, `ATTACHMENT_HOSTS`, `NEXT_PUBLIC_APP_VERSION`. `AREA_SCOPES` in code.

## 10. Acceptance checks
- Email and token values in logs don't appear in the body (tested).
- An attachment from a non-allowlisted host is dropped (tested).
- Labels are intake-only (tested).
- A 422 on labels falls back to the intake label (tested).
- A hidden `<!-- @bot do X -->` is stripped (tested).
- The occurrence page and investigation scope are present (tested).

## 11. Rebuild checklist
1. Client: diagnostics buffer and last-page tracker, form, upload-before-submit.
2. Server: schema, auth, rate limit, neutralize and redact, issue builder, GitHub client with the 422 fallback.
3. Create a bot account and fine-grained token; create the `user-reported` and `area:*` labels.
4. Agree on a triage SOP (00) before go-live.

## 12. Pitfalls seen in the source system
- The last 50 lines of a **process-wide** server log buffer were attached to every report, with only Bearer tokens scrubbed. Other users' data (and logged AI prompts) could end up in GitHub.
- The reporter's email and display name were written into the issue.
- `@` in the description wasn't defanged. A mention-triggered workflow fired on newly opened issues, so app users could start an agent with no triage.
- Attachment URLs weren't validated as URLs or hosts.
- Logs were fenced with backticks, so content with backticks could close the fence.
- The docs called log capture optional, but the client always sent it.
- Rate-limit and env configuration used environment-specific variable names in every environment, which invites misconfiguration.
