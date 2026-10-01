"use client";

import { useActionState } from "react";
import { featureRequestAction } from "@/app/actions";
import { lastPage } from "@/components/diagnostics";
import { Select } from "@/components/select";
import { AREAS } from "@/lib/options";
import { IssueResultView } from "./issue-result";

export function FeatureForm() {
  const [state, action, pending] = useActionState(featureRequestAction, null);
  const submit = (form: FormData) => {
    form.set("occurrenceUrl", lastPage() ?? "");
    return action(form);
  };
  return (
    <form action={submit} className="card space-y-3">
      <h2 className="font-medium">Request a feature</h2>
      <div>
        <label htmlFor="fr-title" className="label">Title</label>
        <input id="fr-title" name="title" required minLength={5} maxLength={120} className="field" />
      </div>
      <Select name="area" id="fr-area" label="Area" options={AREAS} />
      <div>
        <label htmlFor="fr-description" className="label">What would you like?</label>
        <textarea id="fr-description" name="description" required minLength={20} maxLength={8000} rows={5} className="field" />
      </div>
      <div>
        <label htmlFor="fr-usecase" className="label">Why? (optional)</label>
        <input id="fr-usecase" name="useCase" maxLength={500} className="field" />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send request"}</button>
      <div aria-live="polite"><IssueResultView state={state} /></div>
    </form>
  );
}
