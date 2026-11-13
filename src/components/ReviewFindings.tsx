"use client";

import type {
  Evidence,
  ReviewedClaim,
  ReviewedIssue,
  ReviewResult,
} from "@/types/review";
import { CertaintyBadge, OverallBanner, VerdictBadge } from "./Badges";

interface Props {
  review: ReviewResult;
  onSelectTurn: (turnId: string) => void;
}

function EvidenceList({
  evidence,
  onSelectTurn,
}: {
  evidence: Evidence[];
  onSelectTurn: (id: string) => void;
}) {
  if (evidence.length === 0) {
    return (
      <p className="text-xs text-slate-600 italic">
        No transcript evidence cited.
      </p>
    );
  }
  return (
    <ul className="space-y-1" aria-label="Evidence">
      {evidence.map((e) => (
        <li
          key={`${e.turnId}-${e.quote}`}
          className="flex items-start gap-2 text-xs"
        >
          <button
            type="button"
            onClick={() => onSelectTurn(e.turnId)}
            className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono font-semibold text-blue-800 underline decoration-dotted ring-1 ring-blue-300 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            aria-label={`Show turn ${e.turnId} in transcript`}
          >
            {e.turnId}
          </button>
          <q className="text-slate-700">{e.quote}</q>
        </li>
      ))}
    </ul>
  );
}

function Flags({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {flags.map((f) => (
        <li key={f} className="text-xs text-amber-900">
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">Warning: </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

function ClaimItem({
  claim,
  onSelectTurn,
}: {
  claim: ReviewedClaim;
  onSelectTurn: (id: string) => void;
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-slate-900">
          &ldquo;{claim.summaryText}&rdquo;
        </p>
        <VerdictBadge verdict={claim.verdict} />
      </div>
      {claim.explanation && (
        <p className="mt-1 text-sm text-slate-700">{claim.explanation}</p>
      )}
      <div className="mt-2">
        <EvidenceList evidence={claim.evidence} onSelectTurn={onSelectTurn} />
      </div>
      <Flags flags={claim.flags} />
    </li>
  );
}

function IssueItem({
  issue,
  onSelectTurn,
}: {
  issue: ReviewedIssue;
  onSelectTurn: (id: string) => void;
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CertaintyBadge certainty={issue.certainty} />
        <span className="text-sm font-semibold text-slate-900">
          {issue.rule}
        </span>
        <span className="text-xs text-slate-500">
          {issue.source === "automatic" ? "Automatic check" : "AI"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-800">{issue.description}</p>
      {issue.summaryText && (
        <p className="mt-1 text-xs text-slate-600">
          In summary: <q>{issue.summaryText}</q>
        </p>
      )}
      {(issue.evidence.length > 0 || issue.kind === "omission") && (
        <div className="mt-2">
          <EvidenceList evidence={issue.evidence} onSelectTurn={onSelectTurn} />
        </div>
      )}
      <Flags flags={issue.flags} />
    </li>
  );
}

export function IssueList({
  title,
  issues,
  onSelectTurn,
  emptyText,
}: {
  title: string;
  issues: ReviewedIssue[];
  onSelectTurn: (id: string) => void;
  emptyText: string;
}) {
  return (
    <section aria-labelledby={`h-${title}`}>
      <h3 id={`h-${title}`} className="mb-2 font-semibold text-slate-900">
        {title} ({issues.length})
      </h3>
      {issues.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {issues.map((i) => (
            <IssueItem key={i.id} issue={i} onSelectTurn={onSelectTurn} />
          ))}
        </ul>
      )}
    </section>
  );
}

const VERDICT_ORDER = {
  contradicted: 0,
  unsupported: 1,
  uncertain: 2,
  supported: 3,
} as const;

export function ReviewFindings({ review, onSelectTurn }: Props) {
  const omissions = review.issues.filter((i) => i.kind === "omission");
  const breaches = review.issues.filter((i) => i.kind === "rule-breach");
  // Problems first; keep summary order within each verdict.
  const claims = [...review.claims].sort(
    (a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict],
  );
  return (
    <div className="space-y-5">
      <OverallBanner
        status={review.overall.status}
        reasons={review.overall.reasons}
      />
      <section aria-labelledby="h-claims">
        <h3 id="h-claims" className="mb-2 font-semibold text-slate-900">
          Summary claims ({claims.length})
        </h3>
        {claims.length === 0 ? (
          <p className="text-sm text-slate-600">
            The summary contains no claims to check.
          </p>
        ) : (
          <ul className="space-y-2">
            {claims.map((c) => (
              <ClaimItem key={c.id} claim={c} onSelectTurn={onSelectTurn} />
            ))}
          </ul>
        )}
      </section>
      <IssueList
        title="Required information missing"
        issues={omissions}
        onSelectTurn={onSelectTurn}
        emptyText="No omissions found."
      />
      <IssueList
        title="Rule breaches"
        issues={breaches}
        onSelectTurn={onSelectTurn}
        emptyText="No rule breaches found."
      />
      <p className="text-xs text-slate-500">Reviewed with {review.model}.</p>
    </div>
  );
}
