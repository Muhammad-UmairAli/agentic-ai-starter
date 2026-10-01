"use client";

import { useActionState } from "react";
import { composeAction } from "@/app/actions";
import { Select } from "@/components/select";
import { KINDS, LENGTHS, TONES } from "@/lib/options";

export function ComposerForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(composeAction, null);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={action} className="card space-y-3">
        <Select name="groupId" label="Group" options={groups} />
        <div className="grid grid-cols-3 gap-2">
          <Select name="kind" label="Type" options={KINDS} />
          <Select name="tone" label="Tone" options={TONES} />
          <Select name="length" label="Length" options={LENGTHS} />
        </div>
        <div>
          <label htmlFor="subject" className="label">Subject (optional)</label>
          <input id="subject" name="subject" maxLength={150} className="field" />
        </div>
        <div>
          <label htmlFor="draft" className="label">Your draft (optional except for &quot;regular&quot;)</label>
          <textarea id="draft" name="draft" rows={6} maxLength={5000} className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="includeEmojis" /> Include emojis
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="policyAccepted" required className="mt-1" />
          <span>I agree to the AI Use &amp; Acceptable Content Policy. Drafts are checked for safety, and violations can pause posting.</span>
        </label>
        <button className="btn" disabled={pending}>{pending ? "Writing…" : "Generate draft"}</button>
      </form>
      <section className="card" aria-live="polite">
        {!state && <p className="text-sm text-muted">Your draft will appear here.</p>}
        {state && !state.ok && <p className="notice-err">{state.message}</p>}
        {state?.ok && (
          <article className="space-y-3">
            <h2 className="font-medium">{state.draft.subject}</h2>
            {/* Rendered as text, never HTML: model output can't inject markup. */}
            {state.draft.paragraphs.map((p, i) => <p key={i} className="text-sm">{p}</p>)}
          </article>
        )}
      </section>
    </div>
  );
}
