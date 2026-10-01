import { PostForm } from "./post-form";

export default function ModerationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Content moderation pipeline</h1>
      <p className="text-sm text-muted">
        Every post goes through: suspension check, then the local word list, then the AI classifier. If the classifier
        fails, the post is blocked (fail closed). More than 3 violations in 30 minutes, or more than 10 in 24 hours,
        pauses posting. Try a blocked word a few times to see the suspension.
      </p>
      <PostForm />
    </div>
  );
}
