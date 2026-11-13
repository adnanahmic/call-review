"use client";

import { DECISION_LABELS, type DecisionMap } from "@/lib/decisions";
import type { CallView } from "@/types/review";

interface Props {
  calls: CallView[];
  selectedId: string | null;
  decisions: DecisionMap;
  onSelect: (id: string) => void;
}

export function CallList({ calls, selectedId, decisions, onSelect }: Props) {
  const decided = calls.filter((c) => decisions[c.id]).length;
  return (
    <nav
      aria-label="Calls"
      className="border-b border-slate-200 bg-slate-50 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0"
    >
      <p className="px-4 pt-3 text-xs text-slate-600">
        {decided} of {calls.length} decided
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
                onClick={() => onSelect(c.id)}
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
  );
}
