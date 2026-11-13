"use client";

import { useEffect, useRef } from "react";
import type { Turn } from "@/types/review";

interface Props {
  turns: Turn[];
  highlighted: string | null;
  /** All turn ids cited anywhere in the current review. */
  cited: Set<string>;
}

export function TranscriptView({ turns, highlighted, cited }: Props) {
  const refs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!highlighted) return;
    const el = refs.current.get(highlighted);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
    }
  }, [highlighted]);

  if (turns.length === 0) {
    return (
      <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        This transcript is empty. Under the summary rules the summary should
        read &ldquo;Incomplete call.&rdquo;
      </p>
    );
  }

  return (
    <ol className="space-y-1" aria-label="Transcript turns">
      {turns.map((t) => {
        const isHi = highlighted === t.id;
        const isCited = cited.has(t.id);
        return (
          <li
            key={t.id}
            id={`turn-${t.id}`}
            tabIndex={-1}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            className={[
              "rounded px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
              isHi ? "bg-yellow-100 ring-2 ring-yellow-500" : "",
              t.kind === "note" ? "text-slate-500 italic" : "",
              t.suspectedArtefact ? "bg-slate-100 text-slate-500" : "",
            ].join(" ")}
          >
            <span className="mr-2 font-mono text-xs font-semibold text-slate-700">
              {t.id}
              {isCited && <span className="sr-only"> (cited as evidence)</span>}
              {isCited && (
                <span aria-hidden="true" className="ml-0.5 text-blue-700">
                  •
                </span>
              )}
            </span>
            <span className="mr-2 font-mono text-xs text-slate-500">
              {t.time}
            </span>
            <span className="font-semibold">{t.speaker}:</span> {t.text}
            {t.suspectedArtefact && (
              <span className="ml-2 inline-block rounded bg-slate-200 px-1.5 text-xs font-medium text-slate-700 not-italic">
                Likely hold/transcription artefact (ignored)
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
