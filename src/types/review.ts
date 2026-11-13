import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Dataset (input boundary)                                            */
/* ------------------------------------------------------------------ */

export const CallSchema = z.object({
  id: z.string().min(1),
  call_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimated_duration: z.string(),
  transcript: z.string(),
  summary: z.string(),
});
export const CallListSchema = z.array(CallSchema);
export type Call = z.infer<typeof CallSchema>;

export type TurnKind = "speech" | "note" | "unclear";

export interface Turn {
  id: string;
  time: string;
  speaker: string;
  text: string;
  kind: TurnKind;
  /** Deterministic flag: turn sits inside a hold/silence block or is an unclear-speaker insert. */
  suspectedArtefact: boolean;
}

/* ------------------------------------------------------------------ */
/* LLM output (untrusted). Kept free of refinements so it can also be  */
/* sent to the API as a structured-output JSON schema.                 */
/* ------------------------------------------------------------------ */

export const VERDICTS = [
  "supported",
  "contradicted",
  "unsupported",
  "uncertain",
] as const;
export type Verdict = (typeof VERDICTS)[number];

export const CERTAINTIES = ["definite", "possible"] as const;
export type Certainty = (typeof CERTAINTIES)[number];

export const LlmEvidenceSchema = z.object({
  turnId: z.string(),
  quote: z.string(),
});

export const LlmClaimSchema = z.object({
  summaryText: z.string(),
  verdict: z.enum(VERDICTS),
  explanation: z.string(),
  evidence: z.array(LlmEvidenceSchema),
});

export const LlmOmissionSchema = z.object({
  description: z.string(),
  rule: z.string(),
  certainty: z.enum(CERTAINTIES),
  evidence: z.array(LlmEvidenceSchema),
});

export const LlmRuleBreachSchema = z.object({
  summaryText: z.string(),
  rule: z.string(),
  explanation: z.string(),
  certainty: z.enum(CERTAINTIES),
  evidence: z.array(LlmEvidenceSchema),
});

export const LlmReviewSchema = z.object({
  claims: z.array(LlmClaimSchema),
  omissions: z.array(LlmOmissionSchema),
  ruleBreaches: z.array(LlmRuleBreachSchema),
});
export type LlmReview = z.infer<typeof LlmReviewSchema>;

/* ------------------------------------------------------------------ */
/* Validated review (what the UI renders)                              */
/* ------------------------------------------------------------------ */

export interface Evidence {
  turnId: string;
  quote: string;
}

export interface ReviewedClaim {
  id: string;
  summaryText: string;
  /** Verdict after evidence validation. */
  verdict: Verdict;
  /** What the model originally said, if we had to downgrade it. */
  modelVerdict: Verdict;
  explanation: string;
  evidence: Evidence[];
  /** Human-readable reasons this item needs extra scrutiny. */
  flags: string[];
}

export interface ReviewedIssue {
  id: string;
  kind: "omission" | "rule-breach";
  source: "ai" | "automatic";
  rule: string;
  description: string;
  summaryText?: string;
  certainty: Certainty;
  evidence: Evidence[];
  flags: string[];
}

export type OverallStatus =
  "issues-found" | "needs-attention" | "no-issues-found";

export interface ReviewResult {
  callId: string;
  model: string;
  claims: ReviewedClaim[];
  issues: ReviewedIssue[];
  overall: { status: OverallStatus; reasons: string[] };
}

/* ------------------------------------------------------------------ */
/* API boundary                                                        */
/* ------------------------------------------------------------------ */

export const ReviewRequestSchema = z.object({
  callId: z.string().min(1).max(64),
});

const EvidenceSchema = z.object({ turnId: z.string(), quote: z.string() });

export const ReviewResultSchema = z.object({
  callId: z.string(),
  model: z.string(),
  claims: z.array(
    z.object({
      id: z.string(),
      summaryText: z.string(),
      verdict: z.enum(VERDICTS),
      modelVerdict: z.enum(VERDICTS),
      explanation: z.string(),
      evidence: z.array(EvidenceSchema),
      flags: z.array(z.string()),
    }),
  ),
  issues: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["omission", "rule-breach"]),
      source: z.enum(["ai", "automatic"]),
      rule: z.string(),
      description: z.string(),
      summaryText: z.string().optional(),
      certainty: z.enum(CERTAINTIES),
      evidence: z.array(EvidenceSchema),
      flags: z.array(z.string()),
    }),
  ),
  overall: z.object({
    status: z.enum(["issues-found", "needs-attention", "no-issues-found"]),
    reasons: z.array(z.string()),
  }),
}) satisfies z.ZodType<ReviewResult>;

export const ApiErrorCodes = [
  "bad_request",
  "not_found",
  "not_configured",
  "timeout",
  "upstream_error",
  "invalid_model_output",
  "refused",
] as const;
export type ApiErrorCode = (typeof ApiErrorCodes)[number];

export const ReviewResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), review: ReviewResultSchema }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.enum(ApiErrorCodes), message: z.string() }),
  }),
]);
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

/* ------------------------------------------------------------------ */
/* Reviewer decision (stored in the browser only)                      */
/* ------------------------------------------------------------------ */

export const DECISIONS = ["accurate", "needs-correction", "escalate"] as const;
export type DecisionValue = (typeof DECISIONS)[number];

export const ReviewerDecisionSchema = z.object({
  callId: z.string(),
  decision: z.enum(DECISIONS),
  note: z.string().max(2000),
  decidedAt: z.string(),
});
export type ReviewerDecision = z.infer<typeof ReviewerDecisionSchema>;

/* ------------------------------------------------------------------ */
/* What the server page hands to the client workspace                  */
/* ------------------------------------------------------------------ */

export interface CallView {
  id: string;
  callDate: string;
  duration: string;
  summary: string;
  turns: Turn[];
  automaticIssues: ReviewedIssue[];
}
