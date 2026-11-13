"use client";

import type { CallView, ReviewResult } from "@/types/review";
import { IssueList, ReviewFindings } from "./ReviewFindings";

export type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; review: ReviewResult };

export function ReviewArea({
  state,
  onRun,
  onSelectTurn,
  automaticIssues,
}: {
  state: ReviewState;
  onRun: () => void;
  onSelectTurn: (id: string) => void;
  automaticIssues: CallView["automaticIssues"];
}) {
  if (state.status === "done") {
    return <ReviewFindings review={state.review} onSelectTurn={onSelectTurn} />;
  }
  return (
    <div className="space-y-4">
      <div aria-live="polite">
        {state.status === "idle" && (
          <div className="rounded-md border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-700">
              No AI review yet. The AI splits the summary into claims and checks
              each one against the transcript, citing turn IDs.
            </p>
            <button
              type="button"
              onClick={onRun}
              className="mt-3 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Run AI review
            </button>
          </div>
        )}
        {state.status === "loading" && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent"
            />
            Reviewing the summary against the transcript. This usually takes
            10–30 seconds.
          </div>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="rounded-md border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-950"
          >
            <p className="font-semibold">
              <span aria-hidden="true">✗ </span>AI review failed
            </p>
            <p>{state.message}</p>
            <p className="mt-1">
              The automatic checks below still apply. You can also review the
              transcript manually.
            </p>
            <button
              type="button"
              onClick={onRun}
              className="mt-2 rounded border border-red-700 bg-white px-3 py-1.5 font-semibold text-red-900 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <IssueList
        title="Automatic rule checks"
        issues={automaticIssues}
        onSelectTurn={onSelectTurn}
        emptyText="No automatic rule-check failures. The AI review covers accuracy."
      />
    </div>
  );
}
