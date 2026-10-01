import { BugForm } from "./bug-form";
import { FeatureForm } from "./feature-form";

export default function FeedbackPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Feedback intake</h1>
      <p className="text-sm text-muted">
        Submissions become GitHub issues with intake labels only. No AI runs at submit time: a maintainer must add an
        approval label before any agent touches the issue. Without <code>GITHUB_TOKEN</code> you get a dry-run preview of
        the issue body.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <BugForm />
        <FeatureForm />
      </div>
    </div>
  );
}
