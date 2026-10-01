import { getChangelog, type ChangelogEntry } from "@/lib/feedback";

// Rendered per request so the server-side 5-minute cache applies.
export const dynamic = "force-dynamic";

export default async function WhatsNewPage() {
  let entries: ChangelogEntry[] = [];
  let failed = false;
  try {
    entries = await getChangelog();
  } catch (e) {
    console.error("changelog_failed", e instanceof Error ? e.message : e);
    failed = true;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">What&apos;s New</h1>
      <p className="text-sm text-muted">User-facing <code>feat:</code> and <code>fix:</code> commits from the release branch.</p>
      {failed && <p className="notice-err">Couldn&apos;t load updates right now.</p>}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.sha} className="card flex items-start gap-3 py-3">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${e.type === "feat" ? "bg-brand text-brand-ink" : "bg-amber-500/20"}`}>
              {e.type === "feat" ? "New" : "Fix"}
            </span>
            <span className="flex-1 text-sm">{e.summary}</span>
            <code className="text-xs text-muted">{e.sha}</code>
            <time className="text-xs text-muted" dateTime={e.date}>{new Date(e.date).toLocaleDateString("en-US")}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
