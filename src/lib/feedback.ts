import { z } from "zod";
import type { User } from "./demo-data";
import { AREAS } from "./options";
import { trimLogs } from "./redact";

/** Intake labels the API may set. Approval labels are human-only (see .github/workflows). */
export const LABELS = { bug: "user-reported", feature: "feature-request" } as const;

/** Path only, never query strings (they can carry tokens). */
const pagePath = z
  .string()
  .max(500)
  .default("")
  .transform((v) => v.split(/[?#]/)[0]);

const Attachments = (max: number) => z.array(z.string().url().max(500)).max(max).default([]);

export const BugReport = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(8000),
  area: z.enum(AREAS),
  /** Page the report was submitted from. */
  pageUrl: pagePath,
  /** Last page visited before opening feedback: usually where the bug happened. */
  occurrenceUrl: pagePath,
  userAgent: z.string().max(500).default(""),
  appVersion: z.string().max(64).default(""),
  consoleLogs: z.array(z.string().max(2000)).max(100).default([]),
  attachmentUrls: Attachments(3),
});
export type BugReport = z.infer<typeof BugReport>;

export const FeatureRequest = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(8000),
  area: z.enum(AREAS),
  useCase: z.string().trim().max(500).default(""),
  occurrenceUrl: pagePath,
  attachmentUrls: Attachments(3),
});
export type FeatureRequest = z.infer<typeof FeatureRequest>;

/**
 * Where an agent should look first for each area. Written into the issue as
 * "Investigation scope" (bugs) or "Planning scope" (features) so agents
 * search a few directories instead of the whole repo. Update when the code
 * layout changes; an empty list means "explore normally".
 */
export const AREA_SCOPES: Record<(typeof AREAS)[number], string[]> = {
  composer: ["src/lib/composer.ts", "src/lib/ai.ts", "src/app/composer/"],
  moderation: ["src/lib/moderation.ts", "src/lib/limits.ts", "src/app/moderation/"],
  feedback: ["src/lib/feedback.ts", "src/lib/redact.ts", "src/app/feedback/", "src/components/diagnostics.tsx"],
  "whats-new": ["src/app/whats-new/", "src/lib/feedback.ts"],
  other: [],
};

/**
 * Makes user text inert before it lands in an issue that AI agents will read:
 * - HTML comments are invisible in GitHub's rendered view, so a triager would
 *   approve an issue without seeing instructions hidden in them.
 * - @mentions would ping people and can trigger mention-driven CI bots.
 */
export function neutralize(text: string): string {
  return text
    .replace(/<!--[\s\S]*?(-->|$)/g, "")
    .replace(/@(?=[A-Za-z0-9-])/g, "@\u200b");
}

/**
 * For user prose rendered as markdown (not inside a code fence): also escape
 * raw HTML, image syntax and line-leading headings, so user text can't embed
 * tracking images that skip the attachment allowlist, or forge sections such
 * as "## Investigation scope" that agents and the evaluator trust.
 */
export function neutralizeProse(text: string): string {
  return neutralize(text)
    .replace(/</g, "&lt;")
    .replace(/!\[/g, "!\\[")
    .replace(/^(\s{0,3})(#{1,6})(?=\s|$)/gm, "$1\\$2");
}

/** Fenced block whose fence can't be closed early by the content. */
const fenced = (lines: string[]) => ["~~~~text", ...lines.map((l) => l.replace(/~{3,}/g, "~ ~ ~")), "~~~~"].join("\n");

/** Only https images on allowlisted hosts are embedded (GitHub fetches them). */
function allowedAttachment(url: string): boolean {
  const hosts = (process.env.ATTACHMENT_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  try {
    const u = new URL(url);
    return u.protocol === "https:" && hosts.includes(u.hostname);
  } catch {
    return false;
  }
}

const images = (urls: string[], alt: string) =>
  urls.filter(allowedAttachment).map((u, i) => `![${alt} ${i + 1}](${u})`).join("\n");

const scope = (heading: string, hint: string, area: (typeof AREAS)[number]) =>
  AREA_SCOPES[area].length ? `## ${heading}\n${hint}\n${AREA_SCOPES[area].map((p) => `- \`${p}\``).join("\n")}` : "";

/** Opaque reporter reference: support looks the person up in the admin tool, not in GitHub. */
const reporter = (user: User) => `- **Reporter ID**: \`${user.id}\``;

const MAX_BODY = 60_000;
const cap = (s: string) => (s.length > MAX_BODY ? `${s.slice(0, MAX_BODY)}\n\n_(truncated)_` : s);
const orNa = (v: string) => neutralizeProse(v) || "n/a";

export function buildBugIssue(r: BugReport, user: User): { title: string; body: string; labels: string[] } {
  const logs = trimLogs(r.consoleLogs.map(neutralize));
  const shots = images(r.attachmentUrls, "screenshot");
  const body = [
    "## User report",
    neutralizeProse(r.description),
    "## Context",
    [
      reporter(user),
      `- **Area**: \`${r.area}\``,
      `- **Occurrence page**: ${orNa(r.occurrenceUrl)}`,
      `- **Submitted from**: ${orNa(r.pageUrl)}`,
      `- **App version**: ${orNa(r.appVersion)}`,
      `- **User agent**: ${orNa(r.userAgent)}`,
    ].join("\n"),
    scope("Investigation scope", "Search these paths first:", r.area),
    shots ? `## Screenshots\n${shots}` : "",
    logs.length ? `## Browser console (redacted)\n${fenced(logs)}` : "",
  ].filter(Boolean).join("\n\n");
  return { title: neutralizeProse(r.title), body: cap(body), labels: [LABELS.bug, `area:${r.area}`] };
}

export function buildFeatureIssue(r: FeatureRequest, user: User): { title: string; body: string; labels: string[] } {
  const mockups = images(r.attachmentUrls, "mockup");
  const body = [
    "## User request",
    neutralizeProse(r.description),
    "## Context",
    [
      reporter(user),
      `- **Area**: \`${r.area}\``,
      r.useCase ? `- **Use case**: ${neutralizeProse(r.useCase)}` : "",
      r.occurrenceUrl ? `- **Related page**: ${neutralizeProse(r.occurrenceUrl)}` : "",
    ].filter(Boolean).join("\n"),
    scope("Planning scope", "Read these paths first when drafting the plan:", r.area),
    mockups ? `## Mockups\n${mockups}` : "",
  ].filter(Boolean).join("\n\n");
  return { title: neutralizeProse(r.title), body: cap(body), labels: [LABELS.feature, `area:${r.area}`] };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export type IssueResult =
  | { ok: true; dryRun: false; url: string; number: number }
  | { ok: true; dryRun: true; title: string; body: string; labels: string[] }
  | { ok: false; message: string };

const gh = (path: string, init?: RequestInit) =>
  fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

const githubConfigured = () => Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);

/** Creates the issue, or returns a dry-run preview when GitHub isn't configured. */
export async function createIssue(issue: { title: string; body: string; labels: string[] }): Promise<IssueResult> {
  if (!githubConfigured()) return { ok: true, dryRun: true, ...issue };
  try {
    const post = (labels: string[]) => gh("/issues", { method: "POST", body: JSON.stringify({ ...issue, labels }) });
    let res = await post(issue.labels);
    // 422 usually means an area:* label doesn't exist in the repo yet. Keep the
    // report: retry with the intake label only, and tell ops to create the label.
    if (res.status === 422 && issue.labels.length > 1) {
      console.warn("github_label_rejected", issue.labels.slice(1).join(","));
      res = await post(issue.labels.slice(0, 1));
    }
    if (!res.ok) {
      // Log the upstream status only; don't echo GitHub's error text to users.
      console.error("github_issue_failed", res.status);
      return { ok: false, message: "We couldn't file your report right now. Please try again later." };
    }
    const data = (await res.json()) as { html_url: string; number: number };
    return { ok: true, dryRun: false, url: data.html_url, number: data.number };
  } catch (e) {
    console.error("github_issue_failed", e instanceof Error ? e.message : e);
    return { ok: false, message: "We couldn't file your report right now. Please try again later." };
  }
}

// ---------------------------------------------------------------------------
// What's New: user-facing Conventional Commits from the release branch
// ---------------------------------------------------------------------------

export interface ChangelogEntry {
  type: "feat" | "fix";
  summary: string;
  date: string;
  /** Short commit SHA, for support to trace an entry back to a change. */
  sha: string;
}

const CC = /^(feat|fix)(?:\([^)]*\))?!?:\s*(.+)$/;

export function parseCommits(commits: { sha: string; message: string; date: string }[]): ChangelogEntry[] {
  return commits
    .map((c) => ({ m: CC.exec(c.message.split("\n")[0]), c }))
    .filter((x): x is { m: RegExpExecArray; c: (typeof commits)[number] } => x.m !== null)
    .map(({ m, c }) => ({ type: m[1] as "feat" | "fix", summary: m[2], date: c.date, sha: c.sha.slice(0, 7) }))
    .slice(0, 20);
}

const SAMPLE_COMMITS = [
  { sha: "a1b2c3d4", message: "feat(composer): add weekly update template", date: "2026-09-28T10:00:00Z" },
  { sha: "b2c3d4e5", message: "chore: bump dependencies", date: "2026-09-27T10:00:00Z" },
  { sha: "c3d4e5f6", message: "fix(feedback): keep screenshots when the form errors", date: "2026-09-25T10:00:00Z" },
];

let cache: { at: number; entries: ChangelogEntry[] } | null = null;
let failedAt = 0;
const CACHE_MS = 5 * 60_000;
const FAILURE_BACKOFF_MS = 60_000;

/**
 * 5-minute server cache. No client-controlled bypass, so users can't burn the
 * GitHub quota. After a failure, serve the last good entries (or fail fast)
 * for a minute instead of calling GitHub on every page view.
 */
export async function getChangelog(): Promise<ChangelogEntry[]> {
  if (!githubConfigured()) return parseCommits(SAMPLE_COMMITS);
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.entries;
  if (now - failedAt < FAILURE_BACKOFF_MS) {
    if (cache) return cache.entries;
    throw new Error("GitHub commits recently failed; backing off");
  }
  const branch = encodeURIComponent(process.env.GITHUB_CHANGELOG_BRANCH || "main");
  const res = await gh(`/commits?sha=${branch}&per_page=100`).catch((e: unknown) => {
    failedAt = now;
    throw e;
  });
  if (!res.ok) {
    failedAt = now;
    if (cache) return cache.entries;
    throw new Error(`GitHub commits failed: ${res.status}`);
  }
  const data = (await res.json()) as { sha: string; commit: { message: string; committer: { date: string } } }[];
  const entries = parseCommits(data.map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.committer.date })));
  cache = { at: Date.now(), entries };
  return entries;
}
