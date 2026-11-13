"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DECISION_LABELS,
  loadDecisions,
  saveDecision,
  type DecisionMap,
} from "@/lib/decisions";
import { fetchReview } from "@/lib/reviewClient";
import type {
  CallView,
  ReviewerDecision,
  ReviewResponse,
  ReviewResult,
} from "@/types/review";
import { DecisionForm } from "./DecisionForm";
import { IssueList, ReviewFindings } from "./ReviewFindings";
import { TranscriptView } from "./TranscriptView";

type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; review: ReviewResult };

interface Props {
  calls: CallView[];
  /** Injected for tests; defaults to the real API client. */
  reviewFn?: (callId: string) => Promise<ReviewResponse>;
}

function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function ReviewWorkspace({ calls, reviewFn = fetchReview }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    calls[0]?.id ?? null,
  );
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<DecisionMap>({});

  // Read persisted decisions after mount so server and client HTML match.
  useEffect(() => {
    const stored = loadDecisions(browserStorage());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off hydration from browser storage
    setDecisions(stored);
  }, []);

  const call = calls.find((c) => c.id === selectedId);
  const state: ReviewState = useMemo(
    () => (selectedId && reviews[selectedId]) || { status: "idle" },
    [reviews, selectedId],
  );

  const cited = useMemo(() => {
    const ids = new Set<string>();
    if (state.status === "done") {
      for (const c of state.review.claims)
        c.evidence.forEach((e) => ids.add(e.turnId));
      for (const i of state.review.issues)
        i.evidence.forEach((e) => ids.add(e.turnId));
    }
    return ids;
  }, [state]);

  const runReview = useCallback(
    async (id: string) => {
      setReviews((r) => ({ ...r, [id]: { status: "loading" } }));
      const res = await reviewFn(id);
      setReviews((r) => ({
        ...r,
        [id]: res.ok
          ? { status: "done", review: res.review }
          : { status: "error", message: res.error.message },
      }));
    },
    [reviewFn],
  );

  const onSave = useCallback(
    (d: ReviewerDecision) => {
      const { map, persisted } = saveDecision(browserStorage(), decisions, d);
      setDecisions(map);
      return { persisted };
    },
    [decisions],
  );

  if (calls.length === 0) {
    return (
      <p className="p-8 text-slate-700">
        No calls to review. The dataset is empty.
      </p>
    );
  }

  const reviewedCount = Object.keys(decisions).length;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <nav
        aria-label="Calls"
        className="border-b border-slate-200 bg-slate-50 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0"
      >
        <p className="px-4 pt-3 text-xs text-slate-600">
          {reviewedCount} of {calls.length} decided
        </p>
        <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
          {calls.map((c) => {
            const d = decisions[c.id];
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    setSelectedId(c.id);
                    setHighlighted(null);
                  }}
                  className={`w-full rounded px-3 py-2 text-left text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    active
                      ? "bg-blue-700 text-white"
                      : "text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  <span className="font-mono font-semibold">{c.id}</span>
                  <span
                    className={`block text-xs ${active ? "text-blue-100" : "text-slate-600"}`}
                  >
                    {d ? `✓ ${DECISION_LABELS[d.decision]}` : "Not decided"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {call && (
        <main className="grid flex-1 gap-6 p-4 lg:grid-cols-2 lg:p-6">
          <section aria-labelledby="summary-heading" className="space-y-4">
            <header>
              <h2
                id="summary-heading"
                className="text-xl font-semibold text-slate-900"
              >
                {call.id}
              </h2>
              <p className="text-sm text-slate-600">
                Call date {call.callDate} · Estimated duration {call.duration}
              </p>
            </header>

            <div>
              <h3 className="mb-1 font-semibold text-slate-900">
                Summary under review
              </h3>
              <blockquote className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900">
                {call.summary || (
                  <span className="text-slate-500 italic">(empty summary)</span>
                )}
              </blockquote>
            </div>

            <ReviewArea
              state={state}
              onRun={() => runReview(call.id)}
              onSelectTurn={setHighlighted}
              automaticIssues={call.automaticIssues}
            />

            <DecisionForm
              key={call.id}
              callId={call.id}
              existing={decisions[call.id]}
              onSave={onSave}
            />
          </section>

          <section
            aria-labelledby="transcript-heading"
            className="lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
          >
            <h2
              id="transcript-heading"
              className="mb-2 text-lg font-semibold text-slate-900"
            >
              Transcript
            </h2>
            <TranscriptView
              turns={call.turns}
              highlighted={highlighted}
              cited={cited}
            />
          </section>
        </main>
      )}
    </div>
  );
}

function ReviewArea({
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
