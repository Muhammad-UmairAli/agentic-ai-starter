"use client";

import { useActionState } from "react";
import { postAction } from "@/app/actions";

export function PostForm() {
  const [state, action, pending] = useActionState(postAction, null);
  return (
    <form action={action} className="card space-y-3">
      <label htmlFor="text" className="label">Message</label>
      <textarea id="text" name="text" rows={4} maxLength={5000} className="field" placeholder="See everyone at practice at 5!" />
      <button className="btn" disabled={pending}>{pending ? "Checking…" : "Post"}</button>
      <div aria-live="polite">
        {state?.ok && <p className="notice-ok">Clean: this would be posted.</p>}
        {state && !state.ok && (
          <p className="notice-err"><strong>{state.code}</strong>: {state.message}</p>
        )}
      </div>
    </form>
  );
}
