"use client";

import { useState } from "react";
import { DECISION_LABELS } from "@/lib/decisions";
import {
  DECISIONS,
  type DecisionValue,
  type ReviewerDecision,
} from "@/types/review";

interface Props {
  callId: string;
  existing: ReviewerDecision | undefined;
  onSave: (d: ReviewerDecision) => { persisted: boolean };
}

export function DecisionForm({ callId, existing, onSave }: Props) {
  const [decision, setDecision] = useState<DecisionValue | "">(
    existing?.decision ?? "",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!decision) {
      setError("Choose a decision before saving.");
      return;
    }
    setError("");
    const { persisted } = onSave({
      callId,
      decision,
      note: note.trim(),
      decidedAt: new Date().toISOString(),
    });
    setStatus(
      persisted
        ? `Saved: ${DECISION_LABELS[decision]}.`
        : `Recorded for this session only (browser storage unavailable): ${DECISION_LABELS[decision]}.`,
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-slate-300 bg-slate-50 p-4"
      aria-labelledby="decision-heading"
    >
      <h3 id="decision-heading" className="font-semibold text-slate-900">
        Your decision
      </h3>
      <fieldset>
        <legend className="mb-1 text-sm text-slate-700">
          Does the summary accurately reflect the transcript?
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {DECISIONS.map((d) => (
            <label
              key={d}
              className="flex items-center gap-2 text-sm text-slate-900"
            >
              <input
                type="radio"
                name={`decision-${callId}`}
                value={d}
                checked={decision === d}
                onChange={() => {
                  setDecision(d);
                  setStatus("");
                }}
                className="h-4 w-4 accent-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              {DECISION_LABELS[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label
          htmlFor={`note-${callId}`}
          className="mb-1 block text-sm text-slate-700"
        >
          Notes (optional)
        </label>
        <textarea
          id={`note-${callId}`}
          value={note}
          maxLength={2000}
          onChange={(e) => {
            setNote(e.target.value);
            setStatus("");
          }}
          rows={3}
          className="w-full rounded border border-slate-300 bg-white p-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Save decision
        </button>
        <p role="status" className="text-sm text-slate-700">
          {status}
        </p>
      </div>
    </form>
  );
}
