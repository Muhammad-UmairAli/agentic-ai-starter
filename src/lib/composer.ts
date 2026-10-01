import { z } from "zod";
import { ai, AiRefusalError, type Draft } from "./ai";
import { events, groups, type User } from "./demo-data";
import { allowRequest } from "./limits";
import { classifyText, screen } from "./moderation";
import { KINDS, LENGTHS, TONES } from "./options";


export const ComposeRequest = z
  .object({
    groupId: z.string().min(1),
    kind: z.enum(KINDS),
    tone: z.enum(TONES),
    length: z.enum(LENGTHS),
    draft: z.string().trim().max(5000).default(""),
    subject: z.string().trim().max(150).default(""),
    includeEmojis: z.literal("on").optional().transform(Boolean),
    // Checkbox value; the real product persists acceptance per user (see docs/features/01).
    policyAccepted: z.literal("on", { message: "Please accept the AI use policy first." }),
  })
  .refine((r) => r.kind !== "regular" || r.draft.length >= 10, {
    message: "A 'regular' message needs a draft of at least 10 characters to improve.",
    path: ["draft"],
  });
export type ComposeRequest = z.infer<typeof ComposeRequest>;

export type ComposeResult = { ok: true; draft: Draft } | { ok: false; message: string };

/** In the event's own zone (fallback UTC), never the server's: the host zone is arbitrary. */
const fmt = (iso: string, timeZone = "UTC") =>
  new Date(iso).toLocaleString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

/**
 * Facts the model may use. Built server-side from data the caller is allowed
 * to see, so the prompt never carries another group's schedule.
 */
function buildFacts(user: User, groupId: string, kind: ComposeRequest["kind"]) {
  const group = groups.find((g) => g.id === groupId);
  if (!group || !group.memberIds.includes(user.id)) return null; // authorization check
  const now = Date.now();
  const mine = events.filter((e) => e.groupId === groupId).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = mine.filter((e) => Date.parse(e.start) >= now);
  const past = mine.filter((e) => Date.parse(e.start) < now);

  const facts: Record<string, unknown> = { group: group.name, sender: user.name };
  const describe = (e: (typeof mine)[number]) => ({ title: e.title, when: fmt(e.start, e.timeZone), venue: e.venue, opponent: e.opponent, result: e.result });

  if (kind === "pre-event") {
    const next = upcoming.find((e) => e.kind === "match");
    if (next) facts.next_event = describe(next);
  } else if (kind === "post-event") {
    const last = past.filter((e) => e.kind === "match").at(-1);
    if (last) facts.last_event = describe(last);
  } else if (kind === "weekly-update") {
    const weekEnd = now + 7 * 24 * 60 * 60_000;
    facts.next_7_days = upcoming.filter((e) => Date.parse(e.start) <= weekEnd).map(describe);
  }
  return facts;
}

/**
 * AI composer pipeline:
 * authorize -> rate limit -> screen input -> generate -> screen output.
 */
export async function composeMessage(user: User, req: ComposeRequest): Promise<ComposeResult> {
  const facts = buildFacts(user, req.groupId, req.kind);
  if (!facts) return { ok: false, message: "You are not a member of that group." };

  if (!allowRequest(`compose:${user.id}`, 30)) {
    return { ok: false, message: "You've reached the hourly limit for AI drafts. Try again later." };
  }

  // Gate 1: input. Counts toward the user's strikes, like any post.
  const input = await screen(user.id, [req.draft, req.subject]);
  if (!input.ok) return { ok: false, message: input.message };

  let draft: Draft;
  try {
    draft = await ai.compose({
      kind: req.kind,
      tone: req.tone,
      length: req.length,
      facts,
      draft: req.draft,
      subject: req.subject,
      emojis: req.includeEmojis,
    });
  } catch (e) {
    if (e instanceof AiRefusalError) return { ok: false, message: "We couldn't write that message. Try rephrasing your draft." };
    console.error("compose_failed", e instanceof Error ? e.message : e);
    return { ok: false, message: "The AI writer is unavailable right now. Please try again." };
  }

  // Gate 2: output. No strike: the user did not write this text.
  const verdict = await classifyText([draft.subject, ...draft.paragraphs]);
  if (verdict === "unavailable") {
    return { ok: false, message: "Safety checks are unavailable right now. Please try again shortly." };
  }
  if (verdict === "flagged") {
    return { ok: false, message: "We couldn't produce a safe draft. Try rephrasing your instructions." };
  }
  return { ok: true, draft };
}
