"use client";

import { useCallback, useMemo, useState } from "react";
import { useDecisions } from "@/hooks/useDecisions";
import { fetchReview } from "@/lib/reviewClient";
import type { CallView } from "@/types/review";
import { CallList } from "./CallList";
import { DecisionForm } from "./DecisionForm";
import { ReviewArea, type ReviewState } from "./ReviewArea";
import { TranscriptView } from "./TranscriptView";

const IDLE: ReviewState = { status: "idle" };

export function ReviewWorkspace({ calls }: { calls: CallView[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    calls[0]?.id ?? null,
  );
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const { decisions, save } = useDecisions();

  const call = calls.find((c) => c.id === selectedId);
  const state = (selectedId && reviews[selectedId]) || IDLE;

  const cited = useMemo(() => {
    if (state.status !== "done") return new Set<string>();
    const all = [...state.review.claims, ...state.review.issues];
    return new Set(all.flatMap((x) => x.evidence.map((e) => e.turnId)));
  }, [state]);

  const runReview = useCallback(async (id: string) => {
    setReviews((r) => ({ ...r, [id]: { status: "loading" } }));
    const res = await fetchReview(id);
    setReviews((r) => ({
      ...r,
      [id]: res.ok
        ? { status: "done", review: res.review }
        : { status: "error", message: res.error.message },
    }));
  }, []);

  if (calls.length === 0) {
    return (
      <p className="p-8 text-slate-700">
        No calls to review. The dataset is empty.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <CallList
        calls={calls}
        selectedId={selectedId}
        decisions={decisions}
        onSelect={(id) => {
          setSelectedId(id);
          setHighlighted(null);
        }}
      />

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
              onSave={save}
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
