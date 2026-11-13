import {
  LlmReviewSchema,
  type Call,
  type Evidence,
  type LlmReview,
  type ReviewedClaim,
  type ReviewedIssue,
  type ReviewResult,
  type Turn,
  type Verdict,
} from "@/types/review";
import { checkSummaryRules } from "./rules";
import { summaryContains, uncoveredSentences } from "./summary";
import {
  isAmbiguousQuote,
  parseTranscript,
  quoteAppearsInTurn,
} from "./transcript";

/* ------------------------------------------------------------------ */
/* 1. Parse the raw model text                                         */
/* ------------------------------------------------------------------ */

export type ParseResult =
  { ok: true; data: LlmReview } | { ok: false; error: string };

/** Parse and schema-check model output. Never throws. */
export function parseLlmReview(raw: string): ParseResult {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Model output was not valid JSON." };
  }
  const parsed = LlmReviewSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Model output did not match the expected shape (${first?.path.join(".") || "root"}: ${first?.message ?? "invalid"}).`,
    };
  }
  return { ok: true, data: parsed.data };
}

/* ------------------------------------------------------------------ */
/* 2. Check every citation against the real transcript                 */
/* ------------------------------------------------------------------ */

/**
 * Accepts "T05", "T5", "turn 5" and "CALL-003 T05" (or "CALL-003:T05").
 * Anything else (e.g. a bare "CALL-003") does not resolve.
 */
export function resolveTurnId(raw: string, turns: Turn[]): Turn | undefined {
  const s = raw.trim();
  const m =
    /^(?:[A-Z]+-\d+[\s:/-]+)?T\s?0*(\d{1,4})$/i.exec(s) ??
    /^turn\s+0*(\d{1,4})$/i.exec(s);
  if (!m) return undefined;
  const n = Number(m[1]);
  return turns.find((t) => Number(t.id.slice(1)) === n);
}

interface CheckedEvidence {
  valid: Evidence[];
  rejected: number;
  ambiguous: number;
  citesArtefact: boolean;
}

export function checkEvidence(
  evidence: Array<{ turnId: string; quote: string }>,
  turns: Turn[],
): CheckedEvidence {
  const valid: Evidence[] = [];
  let rejected = 0;
  let ambiguous = 0;
  let citesArtefact = false;
  for (const e of evidence) {
    const turn = resolveTurnId(e.turnId, turns);
    if (!turn || !quoteAppearsInTurn(e.quote, turn)) {
      rejected++;
      continue;
    }
    if (isAmbiguousQuote(e.quote, turn, turns)) {
      ambiguous++;
      continue;
    }
    if (turn.suspectedArtefact) citesArtefact = true;
    if (!valid.some((v) => v.turnId === turn.id && v.quote === e.quote)) {
      valid.push({ turnId: turn.id, quote: e.quote.trim() });
    }
  }
  return { valid, rejected, ambiguous, citesArtefact };
}

function evidenceFlags(c: CheckedEvidence): string[] {
  const flags: string[] = [];
  if (c.rejected > 0) {
    flags.push(
      `${c.rejected} cited quote${c.rejected === 1 ? "" : "s"} did not match the transcript and ${c.rejected === 1 ? "was" : "were"} discarded.`,
    );
  }
  if (c.ambiguous > 0) {
    flags.push(
      `${c.ambiguous} cited quote${c.ambiguous === 1 ? " was" : "s were"} too short to pin to one turn (the same words appear elsewhere) and ${c.ambiguous === 1 ? "was" : "were"} discarded.`,
    );
  }
  if (c.citesArtefact) {
    flags.push(
      "Cites a turn flagged as a likely hold/transcription artefact (rule 8 says to ignore these).",
    );
  }
  return flags;
}

/* ------------------------------------------------------------------ */
/* 3. Build the validated review                                       */
/* ------------------------------------------------------------------ */

const NEEDS_EVIDENCE: Verdict[] = ["supported", "contradicted"];

export function buildReview(
  llm: LlmReview,
  call: Call,
  model: string,
): ReviewResult {
  const turns = parseTranscript(call.transcript);

  const claims: ReviewedClaim[] = llm.claims.map((c, i) => {
    const checked = checkEvidence(c.evidence, turns);
    const flags = evidenceFlags(checked);
    let verdict = c.verdict;
    if (NEEDS_EVIDENCE.includes(c.verdict) && checked.valid.length === 0) {
      verdict = "uncertain";
      flags.push(
        `AI marked this "${c.verdict}" but gave no verifiable transcript evidence, so it is shown as uncertain.`,
      );
    }
    if (!summaryContains(call.summary, c.summaryText)) {
      flags.push("This claim text was not found verbatim in the summary.");
    }
    return {
      id: `C${i + 1}`,
      summaryText: c.summaryText.trim(),
      verdict,
      modelVerdict: c.verdict,
      explanation: c.explanation.trim(),
      evidence: checked.valid,
      flags,
    };
  });

  // Every sentence of the summary must be traced to a claim, or flagged.
  for (const sentence of uncoveredSentences(
    call.summary,
    claims.map((c) => c.summaryText),
  )) {
    claims.push({
      id: `C${claims.length + 1}`,
      summaryText: sentence,
      verdict: "uncertain",
      modelVerdict: "uncertain",
      explanation: "The AI review did not assess this sentence.",
      evidence: [],
      flags: ["Not assessed by the AI: check this sentence manually."],
    });
  }

  const issues: ReviewedIssue[] = [];

  for (const o of llm.omissions) {
    const checked = checkEvidence(o.evidence, turns);
    const flags = evidenceFlags(checked);
    let certainty = o.certainty;
    if (checked.valid.length === 0) {
      certainty = "possible";
      flags.push(
        "No verifiable transcript evidence that this was discussed, so it is shown as possible only.",
      );
    }
    issues.push({
      id: `O${issues.length + 1}`,
      kind: "omission",
      source: "ai",
      rule: o.rule.trim(),
      description: o.description.trim(),
      certainty,
      evidence: checked.valid,
      flags,
    });
  }

  for (const b of llm.ruleBreaches) {
    const checked = checkEvidence(b.evidence, turns);
    const flags = evidenceFlags(checked);
    let certainty = b.certainty;
    const inSummary = b.summaryText.trim().length > 0;
    if (inSummary && !summaryContains(call.summary, b.summaryText)) {
      certainty = "possible";
      flags.push(
        "The quoted summary text was not found in the summary, so it is shown as possible only.",
      );
    }
    issues.push({
      id: `B${issues.length + 1}`,
      kind: "rule-breach",
      source: "ai",
      rule: b.rule.trim(),
      description: b.explanation.trim(),
      summaryText: inSummary ? b.summaryText.trim() : undefined,
      certainty,
      evidence: checked.valid,
      flags,
    });
  }

  // Merge deterministic checks; where the AI already reported the same rule,
  // keep one item and note that the automatic check agrees.
  for (const auto of automaticIssues(call.summary, issues.length)) {
    const twin = issues.find(
      (i) =>
        i.kind === "rule-breach" &&
        i.rule.toLowerCase() === auto.rule.toLowerCase(),
    );
    if (twin) {
      twin.certainty = "definite";
      twin.flags.push("Confirmed by an automatic rule check.");
    } else {
      issues.push(auto);
    }
  }

  return {
    callId: call.id,
    model,
    claims,
    issues,
    overall: assessOverall(claims, issues),
  };
}

/**
 * Rules Step 1: an empty / silent transcript must produce exactly "Incomplete call."
 * No model call is needed; every claim in the summary is unverifiable.
 */
export function reviewEmptyTranscript(call: Call): ReviewResult {
  const claims: ReviewedClaim[] = uncoveredSentences(call.summary, []).map(
    (sentence, i) => ({
      id: `C${i + 1}`,
      summaryText: sentence,
      verdict: "unsupported" as const,
      modelVerdict: "unsupported" as const,
      explanation: "The transcript is empty, so nothing in it supports this.",
      evidence: [],
      flags: ["Transcript is empty."],
    }),
  );
  const issues: ReviewedIssue[] = [];
  if (call.summary.trim() !== "Incomplete call.") {
    issues.push({
      id: "B1",
      kind: "rule-breach",
      source: "automatic",
      rule: "Step 1: transcript quality",
      description:
        'The transcript is empty, so the rules require the summary to be exactly "Incomplete call."',
      summaryText: call.summary.trim() || undefined,
      certainty: "definite",
      evidence: [],
      flags: [],
    });
  }
  return {
    callId: call.id,
    model: "none (empty transcript)",
    claims,
    issues,
    overall: assessOverall(claims, issues),
  };
}

export function automaticIssues(summary: string, offset = 0): ReviewedIssue[] {
  return checkSummaryRules(summary).map((f, i) => ({
    id: `A${offset + i + 1}`,
    kind: "rule-breach" as const,
    source: "automatic" as const,
    rule: f.rule,
    description: f.description,
    summaryText: f.summaryText || undefined,
    certainty: f.certainty,
    evidence: [],
    flags: [],
  }));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function assessOverall(
  claims: ReviewedClaim[],
  issues: ReviewedIssue[],
): ReviewResult["overall"] {
  const count = (v: Verdict) => claims.filter((c) => c.verdict === v).length;
  const contradicted = count("contradicted");
  const unsupported = count("unsupported");
  const uncertain = count("uncertain");
  const definite = issues.filter((i) => i.certainty === "definite").length;
  const possible = issues.length - definite;
  const flagged = claims.filter((c) => c.flags.length > 0).length;

  const reasons: string[] = [];
  if (contradicted) reasons.push(plural(contradicted, "contradicted claim"));
  if (definite) reasons.push(plural(definite, "definite rule issue"));
  if (unsupported) reasons.push(plural(unsupported, "unsupported claim"));
  if (uncertain) reasons.push(plural(uncertain, "uncertain claim"));
  if (possible) reasons.push(plural(possible, "possible rule issue"));
  if (flagged && !uncertain)
    reasons.push(plural(flagged, "claim with evidence warnings"));

  const status =
    contradicted > 0 || unsupported > 0 || definite > 0
      ? "issues-found"
      : reasons.length > 0
        ? "needs-attention"
        : "no-issues-found";
  return { status, reasons };
}
