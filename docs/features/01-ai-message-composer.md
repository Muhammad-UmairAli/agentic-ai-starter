# 01 · AI message composer

## 1. Purpose
Organizers write messages to their whole group (pre-event briefings, results recaps, weekly schedules, general announcements). The composer drafts or improves those messages from facts the system already holds, so organizers spend less time writing and send fewer factual errors.

## 2. Status in this sample
Implemented in `src/lib/composer.ts` (pipeline), `src/lib/ai.ts` (`compose`), and `src/app/composer/` (UI). Mock mode produces deterministic drafts.

## 3. User flow
1. The organizer opens the composer for one of their groups.
2. **First use only:** they accept the *AI Use & Acceptable Content Policy*. Acceptance is stored per user with a timestamp, and the policy text can be reopened in read-only form.
3. They pick a **message type**, **tone**, **length**, and **emojis on/off**, optionally typing a draft ("key points") and a subject.
4. They tap *Generate*. A preview shows the subject and body.
5. From the preview they can *Rewrite* (send the current draft back with the same settings), *Edit key points*, or *Use this draft*, which inserts the result into the normal editor. The user always reviews before sending. The composer never sends anything.

## 4. Functional rules
- **R1** Only members of a group can compose for it. Authorization runs **before** any group data is read for the prompt.
- **R2** A `regular` message needs a draft of at least 10 characters. The other types can run with no draft.
- **R3** Facts depend on the type:

  | Type | Facts included |
  |---|---|
  | `pre-event` | Group name, sender name, the **next upcoming** event of the competitive kind: title, date, start time, arrival time, venue, address, home/away, opponent, uniform/colour. Plus history against the same opponent (R4) |
  | `post-event` | The **most recently finished** event of that kind, plus its result. If no explicit result exists, derive Win/Loss/Draw from the scores and render the score as `ours-theirs`. Plus history (R4) |
  | `weekly-update` | All events starting in the **next 7 days**, in date order (title, kind, date/time, venue, address, opponent, home/away) |
  | `regular` | Group name and sender name only. No schedules or results unless the user's draft mentions them |

- **R4** History against an opponent: up to the 2 most recent earlier competitive events against the same opponent, matched by opponent ID for internal opponents or by name for external ones. Each entry has date, home/away, result and score.
- **R5** Format dates and times in **the event's own timezone**. Fall back to UTC, never the server's local zone.
- **R6** Omit any fact that is missing. Never send empty keys or placeholders.
- **R7** The draft and subject pass moderation (feature 02) **before** generation and count toward strikes.
- **R8** The generated output is classified **after** generation. A flagged result is rejected with a neutral message and **does not** add a strike, because the user didn't write it.
- **R9** A suspended user (02, R6) can't use the composer.
- **R10** Per-user rate limit, _default_ 30 drafts per hour.
- **R11** Analytics: log the event (type, tone, length, emojis, token counts, latency). **Never log content.**

## 5. Data contracts
**Request** (`ComposeRequest`):

| Field | Type | Rules |
|---|---|---|
| `groupId` | string | Required; caller must be a member |
| `kind` | `regular \| pre-event \| post-event \| weekly-update` | Required |
| `tone` | `formal \| casual \| excited` | Required |
| `length` | `short \| medium \| long` | Required (target 50-150, 150-300 or 300-500 words) |
| `draft` | string ≤ 5000 | Trimmed. Required (≥ 10 characters) for `regular` |
| `subject` | string ≤ 150 | Optional; the model improves it |
| `includeEmojis` | boolean | Default false |
| `policyAccepted` | true | Required. Persist it per user in production |

**Response:** `{ ok: true, draft: { subject, paragraphs[] } }` or `{ ok: false, message }`. Optional `meta`: token counts and latency, for analytics.

## 6. AI design
- **Tier:** one structured-output call. This is a workflow, not an agent. Model `claude-opus-5-5` at `effort: medium`, with server-side refusal fallback.
- **Prompt layers:**
  1. A **stable system prompt** for voice and rules (cacheable).
  2. **Parameters**: type, tone, length, emojis, facts as JSON.
  3. **User content** in `<draft>` and `<subject>` tags, marked as data.
- **System rules that proved necessary:**
  - It is a **broadcast**, so use a group greeting. Never "Dear Member".
  - Use only the given facts. Never invent weekdays, places, scores or times, and never write TBD or N/A.
  - No stock AI openers, no padding to reach a length, no repeating an idea.
  - Event details go first. A multi-event schedule is chronological, one event per line.
  - Exactly **one** sign-off, using the sender's name. Strip any sign-off already in the draft, which matters when a finished email comes back for a *Rewrite*.
  - Use emojis only when asked.
- **Output schema:** `{ subject: string, paragraphs: string[] }`, enforced by structured outputs. Render it as **text**.
- **If you need rich HTML** (tables), ask for a structured block list instead, such as `[{type:"table", rows}]`, and render it with your own components. Don't accept model-written HTML.

## 7. Security and privacy
| Control | Why |
|---|---|
| Membership check before hydration (R1) | Otherwise any signed-in user can pull another group's schedule, venues and results into an email |
| Validate requests at the boundary (schema) | Without it, length and enum limits are only advisory and anything reaches the model |
| User text in tags, labeled as data | Reduces prompt injection |
| Output rendered as text | Model output can't inject markup or script |
| Input and output moderation, fail closed | Family-safe content |
| No content in logs | Drafts can contain minors' data; logs travel (see 04) |
| Per-user rate limit (R10) | Without one, the endpoint is a free LLM proxy |

## 8. Failure modes
| Failure | User sees | Logged |
|---|---|---|
| Not a member | "You are not a member of that group." | No |
| Draft flagged | Moderation message (02) | Strike + category |
| Suspended | Suspension message with time left | No |
| Rate limited | "You've reached the hourly limit…" | Counter |
| Model refusal | "We couldn't write that message. Try rephrasing." | Event name |
| Provider error or timeout | "The AI writer is unavailable right now." | Error class only |
| Output flagged | "We couldn't produce a safe draft…" | Category |

Don't show a canned template as a fallback when generation fails. A fake draft might get sent by accident.

## 9. Configuration
`ANTHROPIC_API_KEY`, `AI_MODEL` (_default_ `claude-opus-5-5`), `AI_MODE=mock`. Constants: rate limit 30/h, draft ≤ 5000, subject ≤ 150.

## 10. Acceptance checks
- A non-member gets a denial, and the model is **not** called (tested).
- A flagged output is rejected (tested).
- Policy consent is required (tested).
- `weekly-update` with no events in the next 7 days produces no invented events.
- A `post-event` with scores but no explicit result reports the right result.
- A draft with a sign-off comes back with exactly one.

## 11. Rebuild checklist
1. Define the request schema and validate at the server boundary.
2. Authorize the group, then build facts for that group only (R3-R6).
3. Add rate limits and the standing check, then screen the input.
4. Make one structured-output call with the stable system prompt cached.
5. Screen the output, then return text.
6. Build the UI: policy gate, options, preview, Rewrite, Use draft. Never auto-send.
7. Add analytics with no content, plus an eval set of real-shaped facts before any change of model or prompt.
