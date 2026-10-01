import Link from "next/link";

const USE_CASES = [
  {
    href: "/composer",
    title: "AI message composer",
    body: "Drafts group messages from trusted facts plus an optional user draft. Input and output pass through moderation gates; group membership is checked before any data reaches the prompt.",
  },
  {
    href: "/moderation",
    title: "Content moderation pipeline",
    body: "Suspension check, then local word list, then AI classifier. Fails closed. Violations feed a sliding-window strike system that pauses posting on every surface.",
  },
  {
    href: "/feedback",
    title: "Feedback intake for agents",
    body: "Bug reports and feature requests become GitHub issues with redacted diagnostics, neutralized @mentions and hidden comments, ready for human-gated AI triage.",
  },
  {
    href: "/whats-new",
    title: "What's New feed",
    body: "User-facing feat/fix Conventional Commits from the release branch, the loop that closes agent-authored changes back to users.",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Agentic AI reference app</h1>
        <p className="mt-2 text-muted">
          Four in-app patterns plus the human-gated GitHub agent pipeline in <code>.github/workflows</code>. See
          the README for the full flow and security model.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {USE_CASES.map((u) => (
          <Link key={u.href} href={u.href} className="card block transition hover:border-brand">
            <h2 className="font-medium">{u.title}</h2>
            <p className="mt-1 text-sm text-muted">{u.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
