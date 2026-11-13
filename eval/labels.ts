import type { ReviewResult } from "@/types/review";

/**
 * Hand-checked labels for all 20 supplied calls. Each was made by reading the
 * transcript against the summary rules before looking at any AI output for
 * that call. Turn ids are the evidence. These are one reviewer's judgement,
 * not an official answer key.
 *
 * A known error counts as found if the AI reports it in any reasonable form:
 * as a contradicted/unsupported claim on the right summary text, or as an
 * omission/rule breach that names it (omissions must cite one of the turns).
 */
export interface Expected {
  name: string;
  /** Summary-text pattern for a contradicted/unsupported claim. */
  claimText?: RegExp;
  /** Pattern matched against an issue's rule, description and summary text. */
  issue?: RegExp;
  /** Transcript turns that prove it. */
  turns?: string[];
}

export interface Label {
  callId: string;
  /** No known errors: any definite finding counts as a false alarm. */
  clean: boolean;
  mustFind: Expected[];
  /** Judgement calls deliberately not scored. */
  notes?: string;
}

export interface Match {
  via: "claim" | "ai issue" | "automatic check";
  text: string;
}

/** The finding that satisfies this expectation, or null if none does. */
export function findMatch(e: Expected, r: ReviewResult): Match | null {
  const overlaps = (evidence: { turnId: string }[]) =>
    !e.turns || evidence.some((x) => e.turns!.includes(x.turnId));

  if (e.claimText) {
    const c = r.claims.find(
      (c) =>
        (c.verdict === "contradicted" || c.verdict === "unsupported") &&
        e.claimText!.test(c.summaryText) &&
        (c.verdict === "unsupported" || overlaps(c.evidence)),
    );
    if (c) {
      const cites = c.evidence.map((x) => x.turnId).join(",") || "none";
      return {
        via: "claim",
        text: `${c.verdict}: "${c.summaryText}" (cites ${cites})`,
      };
    }
  }

  if (e.issue) {
    // Prefer an AI finding; fall back to the deterministic checks.
    const candidates = [...r.issues].sort(
      (a, b) =>
        Number(a.source === "automatic") - Number(b.source === "automatic"),
    );
    const i = candidates.find(
      (i) =>
        e.issue!.test(`${i.rule} ${i.description} ${i.summaryText ?? ""}`) &&
        (i.kind === "rule-breach" || overlaps(i.evidence)),
    );
    if (i) {
      const cites = i.evidence.map((x) => x.turnId).join(",") || "none";
      return {
        via: i.source === "automatic" ? "automatic check" : "ai issue",
        text: `${i.kind} (${i.rule}): ${i.description} (cites ${cites})`,
      };
    }
  }
  return null;
}

/** On a clean call, any contradicted/unsupported claim or definite issue. */
export function falseAlarms(r: ReviewResult): string[] {
  return [
    ...r.claims
      .filter(
        (c) => c.verdict === "contradicted" || c.verdict === "unsupported",
      )
      .map((c) => `${c.verdict}: "${c.summaryText}"`),
    ...r.issues
      .filter((i) => i.certainty === "definite")
      .map((i) => `definite ${i.kind} (${i.rule}): ${i.description}`),
  ];
}

export const LABELS: Label[] = [
  // ---------------------------------------------------------------- clean
  { callId: "CALL-001", clean: true, mustFind: [] },
  { callId: "CALL-004", clean: true, mustFind: [] },
  { callId: "CALL-005", clean: true, mustFind: [] },
  { callId: "CALL-006", clean: true, mustFind: [] },
  { callId: "CALL-007", clean: true, mustFind: [] },

  // ---------------------------------------------------------- with errors
  {
    callId: "CALL-002",
    clean: false,
    mustFind: [
      {
        name: "promise was £100, not £150",
        claimText: /£150/,
        issue: /£150/,
        turns: ["T14", "T15", "T16"],
      },
    ],
  },
  {
    callId: "CALL-003",
    clean: false,
    mustFind: [
      {
        name: "consent claimed but the customer refused",
        claimText: /consent/i,
        issue: /consent/i,
        turns: ["T10", "T11"],
      },
      {
        name: "omits 'no money for food' hardship",
        issue: /food|hardship/i,
        turns: ["T08"],
      },
      { name: "states the £460 arrears amount", issue: /£460|arrears\/bal/i },
    ],
  },
  {
    callId: "CALL-008",
    clean: false,
    mustFind: [
      {
        name: "default notice never mentioned in the call",
        claimText: /default notice/i,
        issue: /default notice/i,
      },
    ],
  },
  {
    callId: "CALL-009",
    clean: false,
    mustFind: [
      {
        name: "I&E was postponed and booked, not refused",
        claimText: /refused/i,
        issue: /refus/i,
        turns: ["T12", "T13", "T14", "T15"],
      },
    ],
  },
  {
    callId: "CALL-010",
    clean: false,
    mustFind: [
      {
        name: "omits the cause: husband cancelled the DD in a divorce mix-up",
        issue: /divorce|husband|cancel/i,
        turns: ["T08", "T10"],
      },
    ],
  },
  {
    callId: "CALL-011",
    clean: false,
    mustFind: [
      {
        name: "missing 'customer signposted' (website support page)",
        issue: /signpost/i,
        turns: ["T15", "T16", "T22"],
      },
    ],
  },
  {
    callId: "CALL-012",
    clean: false,
    mustFind: [
      {
        name: "'ongoing' Authority to Act; it was for this call only",
        claimText: /ongoing|authority/i,
        issue: /authority|ongoing/i,
        turns: ["T08", "T09", "T23"],
      },
    ],
  },
  {
    callId: "CALL-013",
    clean: false,
    mustFind: [
      {
        name: "'Payment made' but no payment was taken",
        claimText: /payment made/i,
        issue: /payment made/i,
        turns: ["T11", "T12", "T22", "T23"],
      },
    ],
    notes:
      "Not scored: the agent asked for a payment (T11) and the customer said no (T12), which arguably should be recorded as a declined attempt.",
  },
  {
    callId: "CALL-014",
    clean: false,
    mustFind: [
      {
        name: "names the employer (Cedar Lane Distribution)",
        issue: /cedar lane/i,
      },
    ],
  },
  {
    callId: "CALL-015",
    clean: false,
    mustFind: [
      {
        name: "missing 'risk of further action' warning",
        issue: /further action/i,
        turns: ["T13", "T15"],
      },
    ],
  },
  {
    callId: "CALL-016",
    clean: false,
    mustFind: [
      { name: "states the £230 amount of the payment taken", issue: /£230/ },
    ],
  },
  {
    callId: "CALL-017",
    clean: false,
    mustFind: [
      {
        name: "hold was fourteen days, not thirty",
        claimText: /thirty|30/i,
        issue: /thirty|fourteen|30-day|14-day/i,
        turns: ["T13", "T19"],
      },
      {
        name: "omits bereavement and frozen joint account",
        issue: /bereave|died|death|frozen/i,
        turns: ["T06", "T08"],
      },
    ],
  },
  {
    callId: "CALL-018",
    clean: false,
    mustFind: [
      {
        name: "Authority to Act was refused, not verified",
        claimText: /authority/i,
        issue: /authority/i,
        turns: ["T08", "T10", "T22"],
      },
      {
        name: "omits that the customer declined I&E",
        issue: /\bI&E\b|income and expenditure/i,
        turns: ["T14", "T15", "T16"],
      },
    ],
  },
  {
    callId: "CALL-019",
    clean: false,
    mustFind: [
      {
        name: "says inbound; the agent made the call",
        claimText: /customer called/i,
        issue: /direction|outbound|inbound/i,
        turns: ["T01", "T02"],
      },
      {
        name: "missing 'Consent gained to record vulnerability'",
        issue: /consent/i,
        turns: ["T09", "T10", "T11"],
      },
    ],
  },
  {
    callId: "CALL-020",
    clean: false,
    mustFind: [
      {
        name: "£80 was explicitly not a promise",
        claimText: /£80/,
        issue: /£80/,
        turns: ["T16", "T17", "T22"],
      },
      {
        name: "missing 'risk of further action' warning",
        issue: /further action/i,
        turns: ["T19"],
      },
    ],
    notes:
      "Not scored: the £210 emergency-childcare cost (T10) arguably belongs in the summary under Situational Costs.",
  },
];
