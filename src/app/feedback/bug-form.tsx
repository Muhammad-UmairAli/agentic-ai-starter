"use client";

import { useActionState, useState } from "react";
import { bugReportAction } from "@/app/actions";
import { lastPage, recentConsole } from "@/components/diagnostics";
import { Select } from "@/components/select";
import { AREAS } from "@/lib/options";
import { trimLogs } from "@/lib/redact";
import { IssueResultView } from "./issue-result";

export function BugForm() {
  const [state, action, pending] = useActionState(bugReportAction, null);
  const [includeLogs, setIncludeLogs] = useState(false);

  // Context is attached at submit time; logs only with explicit consent.
  const submit = (form: FormData) => {
    form.set("pageUrl", window.location.pathname);
    form.set("occurrenceUrl", lastPage() ?? "");
    form.set("userAgent", navigator.userAgent);
    form.set("appVersion", process.env.NEXT_PUBLIC_APP_VERSION ?? "dev");
    form.set("consoleLogs", JSON.stringify(includeLogs ? trimLogs(recentConsole()) : []));
    return action(form);
  };

  return (
    <form action={submit} className="card space-y-3">
      <h2 className="font-medium">Report a bug</h2>
      <div>
        <label htmlFor="bug-title" className="label">Title</label>
        <input id="bug-title" name="title" required minLength={5} maxLength={120} className="field" />
      </div>
      <Select name="area" id="bug-area" label="Where did it happen?" options={AREAS} />
      <div>
        <label htmlFor="bug-description" className="label">What happened?</label>
        <textarea id="bug-description" name="description" required minLength={10} maxLength={8000} rows={5} className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeLogs} onChange={(e) => setIncludeLogs(e.target.checked)} />
        Include recent app logs (personal data is redacted)
      </label>
      <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send report"}</button>
      <div aria-live="polite"><IssueResultView state={state} /></div>
    </form>
  );
}
