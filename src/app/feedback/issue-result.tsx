import type { IssueResult } from "@/lib/feedback";

export function IssueResultView({ state }: { state: IssueResult | null }) {
  if (!state) return null;
  if (!state.ok) return <p className="notice-err">{state.message}</p>;
  if (!state.dryRun) {
    return (
      <p className="notice-ok">
        Thanks! Filed as <a className="underline" href={state.url} target="_blank" rel="noreferrer">#{state.number}</a>.
      </p>
    );
  }
  return (
    <div className="notice-ok space-y-2">
      <p>Dry run (GitHub not configured). Issue that would be created, labels: {state.labels.join(", ")}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{`# ${state.title}\n\n${state.body}`}</pre>
    </div>
  );
}
