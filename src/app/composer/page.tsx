import { groups } from "@/lib/demo-data";
import { getCurrentUser } from "@/lib/session";
import { ComposerForm } from "./composer-form";

export default async function ComposerPage() {
  const user = await getCurrentUser();
  // Every group is listed on purpose, so you can see the server reject a group you don't belong to.
  const options = groups.map((g) => ({ id: g.id, name: g.memberIds.includes(user.id) ? g.name : `${g.name} (not a member)` }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI message composer</h1>
      <p className="text-sm text-muted">
        The server builds facts from data you can access, screens your draft, generates a message, then screens the
        output before showing it.
      </p>
      <ComposerForm groups={options} />
    </div>
  );
}
