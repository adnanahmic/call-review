import type { Certainty, OverallStatus, Verdict } from "@/types/review";

const VERDICT_STYLE: Record<
  Verdict,
  { label: string; icon: string; className: string; help: string }
> = {
  supported: {
    label: "Supported",
    icon: "✓",
    className: "bg-emerald-50 text-emerald-900 ring-emerald-600/40",
    help: "The transcript states this.",
  },
  contradicted: {
    label: "Contradicted",
    icon: "✗",
    className: "bg-red-50 text-red-900 ring-red-600/40",
    help: "The transcript says something different.",
  },
  unsupported: {
    label: "Not in transcript",
    icon: "!",
    className: "bg-orange-50 text-orange-900 ring-orange-600/40",
    help: "Nothing in the transcript supports this.",
  },
  uncertain: {
    label: "Uncertain",
    icon: "?",
    className: "bg-amber-50 text-amber-900 ring-amber-600/40",
    help: "Evidence is partial, ambiguous or unverified. Check it yourself.",
  },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      title={s.help}
      className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ring-1 ${s.className}`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}

export function CertaintyBadge({ certainty }: { certainty: Certainty }) {
  return certainty === "definite" ? (
    <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-900 ring-1 ring-red-600/40">
      <span aria-hidden="true">●</span> Definite
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-600/40">
      <span aria-hidden="true">◐</span> Possible
    </span>
  );
}

const OVERALL: Record<
  OverallStatus,
  { label: string; icon: string; className: string }
> = {
  "issues-found": {
    label: "Issues found",
    icon: "✗",
    className: "border-red-600 bg-red-50 text-red-950",
  },
  "needs-attention": {
    label: "Needs your attention",
    icon: "?",
    className: "border-amber-600 bg-amber-50 text-amber-950",
  },
  "no-issues-found": {
    label: "No issues found by AI",
    icon: "✓",
    className: "border-emerald-600 bg-emerald-50 text-emerald-950",
  },
};

export function OverallBanner({
  status,
  reasons,
}: {
  status: OverallStatus;
  reasons: string[];
}) {
  const s = OVERALL[status];
  return (
    <div
      className={`rounded-md border-l-4 px-4 py-3 ${s.className}`}
      data-testid="overall"
    >
      <p className="font-semibold">
        <span aria-hidden="true">{s.icon} </span>
        AI assessment: {s.label}
      </p>
      {reasons.length > 0 && <p className="text-sm">{reasons.join(" · ")}</p>}
      <p className="mt-1 text-xs opacity-80">
        This is a suggestion. Check the evidence before deciding.
      </p>
    </div>
  );
}
