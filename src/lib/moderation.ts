import { ai } from "./ai";
import { SlidingWindow } from "./limits";

export type ModerationCode = "CONTENT_BLOCKED" | "POSTING_SUSPENDED" | "MODERATION_UNAVAILABLE";
export type ScreenResult = { ok: true } | { ok: false; code: ModerationCode; message: string };

export const BLOCKED_MESSAGE =
  "This can't be posted because it violates our content guidelines. Repeated violations lead to temporary suspensions.";
const UNAVAILABLE_MESSAGE = "Safety checks are unavailable right now. Please try again shortly.";

/**
 * Local word list, checked before the AI classifier. AI moderation targets
 * harassment/hate/sexual content and does not reliably catch plain swearing.
 *
 * Seed list only: the product owner signs off on the final words before
 * production. ponytail: whole-word match, no obfuscation handling (sh1t);
 * swap for a maintained list if misses show up in the logs.
 */
const BLOCKED_WORDS = ["fuck", "fucking", "shit", "bullshit", "bitch", "asshole", "cunt", "wtf", "stfu"];
const BLOCKED_REGEX = new RegExp(`\\b(?:${BLOCKED_WORDS.join("|")})\\b`, "i");

export const containsBlockedWord = (text: string) => BLOCKED_REGEX.test(text);

// ---------------------------------------------------------------------------
// Strikes: violations in a sliding window suspend posting on every surface.
// ---------------------------------------------------------------------------

const MIN = 60_000;
const SHORT_WINDOW = 30 * MIN;
const SHORT_LIMIT = 3; // more than 3 in 30 min -> suspended
const DAY_WINDOW = 24 * 60 * MIN;
const DAY_LIMIT = 10; // more than 10 in 24 h -> suspended

const strikes = new SlidingWindow(DAY_WINDOW);

export function recordStrike(userId: string, now = Date.now()) {
  strikes.record(userId, now);
}

/**
 * Both rules are enforced independently, so a quiet last 15 minutes never
 * overrides the 24 h rule.
 */
export function standing(userId: string, now = Date.now()): { allowed: true } | { allowed: false; message: string } {
  // Posting resumes when enough strikes age out to bring the count back to
  // the limit, i.e. when strike [count - limit - 1] (oldest first) expires.
  const short = strikes.within(userId, SHORT_WINDOW, now);
  if (short.length > SHORT_LIMIT) {
    const mins = Math.max(1, Math.ceil((short[short.length - SHORT_LIMIT - 1] + SHORT_WINDOW - now) / MIN));
    return { allowed: false, message: `Posting is paused after repeated violations. Try again in ${mins} minute(s).` };
  }
  const day = strikes.within(userId, DAY_WINDOW, now);
  if (day.length > DAY_LIMIT) {
    const hours = Math.max(1, Math.ceil((day[day.length - DAY_LIMIT - 1] + DAY_WINDOW - now) / (60 * MIN)));
    return { allowed: false, message: `Posting is paused after reaching the daily violation limit. Try again in ${hours} hour(s).` };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** Word list then AI classifier. Fails closed: if the classifier errors, nothing is posted. */
export async function classifyText(texts: string[]): Promise<"clean" | "flagged" | "unavailable"> {
  if (texts.some(containsBlockedWord)) return "flagged";
  // Ops kill switch for a provider outage: the word list and strikes still run.
  if (process.env.AI_MODERATION_ENABLED === "false") return "clean";
  try {
    return (await ai.moderate(texts)).flagged ? "flagged" : "clean";
  } catch (e) {
    // Never log the user's text, only the failure.
    console.error("moderation_unavailable", e instanceof Error ? e.message : e);
    return "unavailable";
  }
}

/**
 * Screen user text before it is posted anywhere (chat, announcements, polls,
 * AI composer input). Order: suspension -> word list -> AI.
 */
export async function screen(userId: string, fields: Array<string | null | undefined>): Promise<ScreenResult> {
  const texts = [...new Set(fields.map((f) => f?.trim() ?? "").filter(Boolean))];

  // Suspension applies even with no text to classify (e.g. a composer request
  // built only from facts), so check it before the empty-input shortcut.
  const s = standing(userId);
  if (!s.allowed) return { ok: false, code: "POSTING_SUSPENDED", message: s.message };

  if (texts.length === 0) return { ok: true };

  const verdict = await classifyText(texts);
  if (verdict === "unavailable") return { ok: false, code: "MODERATION_UNAVAILABLE", message: UNAVAILABLE_MESSAGE };
  if (verdict === "flagged") {
    recordStrike(userId);
    return { ok: false, code: "CONTENT_BLOCKED", message: BLOCKED_MESSAGE };
  }
  return { ok: true };
}
