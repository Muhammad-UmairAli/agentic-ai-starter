# 02 · Text moderation and strikes

## 1. Purpose
Keep a community used by families and minors free of profanity, harassment, hate and sexual content on every surface where people post. Repeat offenders are paused automatically, so moderators don't have to step in.

## 2. Status in this sample
Implemented in `src/lib/moderation.ts` (`screen`, `classifyText`, `standing`) and `src/lib/ai.ts` (`moderate`). Demo page `/moderation`. Strikes are in memory (see §9).

## 3. User flow
1. The user writes a post: chat message, edit, file caption, group name, announcement or poll.
2. When they hit Send, the server screens it. If it is clean, it posts as normal.
3. If it is blocked, an alert says the post wasn't sent and that repeat violations lead to suspension. The draft stays in the field.
4. If the user is suspended, every surface shows "Posting is paused… try again in N minutes/hours".

## 4. Functional rules
- **R1 Order:** standing check, then local word list, then AI classifier. Cheapest first; the word list catches swearing that AI classifiers don't reliably flag.
- **R2 Screened fields per surface** (screen everything user-visible):

  | Surface | Fields |
  |---|---|
  | Chat | message text, edited text, file caption, file name, group name and description, reminder texts sent into chat |
  | Announcement (create) | title, plain-text body (strip HTML first), every image alt text |
  | Announcement (update) | only the fields this update changes |
  | Poll (create) | title, question, every option |
  | Poll (update) | title and question (options can't be edited) |
  | AI composer | user draft and subject (input gate, counts as a strike); generated output (no strike) |

- **R3** Trim the fields, drop empty ones, and **dedupe** them (a poll's title often equals its question). If nothing is left, return clean without touching the database, so non-text edits stay cheap.
- **R4** Send all of a post's fields to the classifier in **one call**. The post is flagged if any field is.
- **R5 Fail closed:** if the classifier errors or times out, block the post with a "safety checks unavailable" message. Never post unscreened text.
- **R6 Suspension** (both rules are evaluated independently, from one 24-hour query):
  - **more than 3** violations in the last **30 minutes**: paused until enough of them age out to bring the count back to 3, i.e. until strike number `count − 3` (oldest first) is 30 minutes old (report remaining minutes, minimum 1)
  - **more than 10** violations in the last **24 hours**: paused until strike number `count − 10` is 24 hours old (report remaining hours, minimum 1)
  - Computing the time left from the *oldest* strike under-reports the wait whenever there are more than limit + 1 strikes.
- **R7** A suspension applies to **every** surface, including the composer.
- **R8 Kill switch:** an ops flag skips **only** the AI step during a provider outage. The word list and suspensions keep running.
- **R9** Throttle the pre-send check endpoint per user (_default_ 30/min), so one account can't drain the shared provider quota.
- **R10** If clients write to a realtime database directly, the pre-send check is a **UX gate, not a security boundary**. Enforce server-side as well (a database trigger, or route writes through the API).

## 5. Data contracts
**Check endpoint:** `POST /moderation/check` with `{ texts: string[1..2] }` (each ≤ 5000). `204` means clean.

**Errors:** the body is `{ statusCode, error: CODE, message }`. Clients branch on `error`, never on message text:

| Code | HTTP | Message (default) |
|---|---|---|
| `CONTENT_BLOCKED` | 400 | "This can't be posted because it violates our content guidelines. Repeated violations lead to temporary suspensions." |
| `POSTING_SUSPENDED` | 403 | "Posting is paused after repeated violations. Try again in N minute(s)." / "…daily violation limit. Try again in N hour(s)." |
| `MODERATION_UNAVAILABLE` | 503 | "Safety checks are unavailable right now. Please try again shortly." |

**Violation record** (one row per block):

| Column | Notes |
|---|---|
| `id`, `createdAt` | Index on `(userId, createdAt)` for the standing query |
| `userId` | Nullable. Decide what happens on user deletion (see §7) |
| `groupId`, `organizationId` | **Populate both**, so retention purges work |
| `surface` | `composer \| chat \| announcement \| poll`, with a default for existing rows |
| `operation` | `input \| output` |
| `categories` (json), `scores` (json) | From the classifier |
| `text` | **Decision:** store it, a hash, or nothing. Raw text from minors needs a retention policy |

## 6. AI design
- Classifier call with structured output `{ flagged: boolean, categories: enum[] }`. Categories: harassment, hate, sexual, sexual_minors, violence, self_harm, illicit. Use `effort: low`, because classification doesn't need deep reasoning.
- The system prompt describes the audience (families and minors) and says ordinary banter isn't a violation. Texts go in `<text>` tags as data.
- **A refusal counts as flagged** (fail closed).
- **Alternative:** a dedicated moderation endpoint (e.g. OpenAI `omni-moderation-latest`, which is free) with a short timeout (~3 s) and one retry. Merge per-text results: flagged if any is, categories OR'd, max score per category. Choose per client on cost and latency.
- The client's own timeout must be shorter than the composer's safety reset.

## 7. Security and privacy
- **Never log** the screened text. Log event names, surface and categories only.
- **Retention:**
  - Purge violation rows when their group or organization is deleted. This only works if those columns are filled in.
  - Decide whether deleting a user deletes their rows or keeps them anonymized.
  - **Don't** accept a group ID from the client on the check endpoint. If group deletion purges rows by group ID, a client-supplied ID would let a user wipe their own history.
- The word list belongs to product. Get sign-off before production and avoid words with common innocent meanings.

## 8. Failure modes
| Failure | Behavior |
|---|---|
| Provider down or slow | 503 `MODERATION_UNAVAILABLE`; the client alerts and keeps the draft |
| Too many checks | 429; the client says "You're sending messages too quickly" |
| Multi-file send with one caption | Show one alert at a time; don't stack identical alerts |
| Text over the length cap | Blocked on the client before the call, with a length message |

## 9. Configuration
`AI_MODERATION_ENABLED=false` (kill switch). Constants: 30-minute window with more than 3 strikes, 24-hour window with more than 10 strikes, check throttle 30/min, text ≤ 5000.
**Production:** move strikes from memory to the violation table (or Redis) so they work across instances and restarts.

## 10. Acceptance checks (all in `tests/core.test.ts`)
- More than 3 strikes in 30 minutes suspends the user.
- More than 10 strikes in 24 hours suspends the user even when the last 15 minutes are quiet.
- A word-list hit blocks without calling the AI.
- A classifier error blocks (fail closed).
- Clean text passes.

## 11. Rebuild checklist
1. Write the `screen(userId, fields, surface)` service with the error codes above.
2. Call it in **every** create and update path that writes user-visible text (R2), server-side.
3. Store violations with all the IDs the purge jobs need.
4. On the client, map error codes to alerts and keep the draft.
5. For direct-to-database clients, add server-side enforcement (R10).
6. Add a kill switch, a throttle and dashboards (block rate per surface, provider error rate).
