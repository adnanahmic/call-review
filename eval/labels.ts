import type { ReviewResult } from "@/types/review";

/**
 * Hand-checked labels for 6 of the 20 supplied calls. Each was verified by
 * reading the transcript against the summary rules; turn ids are the evidence.
 * This is a small sample, not a full answer key.
 */
export interface Expected {
  name: string;
  found: (r: ReviewResult) => boolean;
}
export interface Label {
  callId: string;
  /** No contradicted/unsupported claims and no definite issues expected. */
  clean: boolean;
  mustFind: Expected[];
}

const contradictedCiting =
  (turns: string[]) =>
  (r: ReviewResult): boolean =>
    r.claims.some(
      (c) =>
        c.verdict === "contradicted" &&
        c.evidence.some((e) => turns.includes(e.turnId)),
    );

const issueMatching =
  (rule: RegExp, turns?: string[], text?: RegExp) =>
  (r: ReviewResult): boolean =>
    r.issues.some(
      (i) =>
        (rule.test(i.rule) || rule.test(i.description)) &&
        (!turns || i.evidence.some((e) => turns.includes(e.turnId))) &&
        (!text || text.test(`${i.summaryText ?? ""} ${i.description}`)),
    );

export const LABELS: Label[] = [
  {
    callId: "CALL-001",
    clean: true, // every claim checks out (T05, T06, T08, T15, T19, T21)
    mustFind: [],
  },
  {
    callId: "CALL-005",
    clean: true, // outbound, DPA, £800 turbo, declined card, 21 Oct after 1pm
    mustFind: [],
  },
  {
    callId: "CALL-003",
    clean: false,
    mustFind: [
      {
        name: "consent claimed but refused (T10)",
        found: contradictedCiting(["T10", "T11"]),
      },
      {
        name: "omits 'no money for food' hardship (T08)",
        found: issueMatching(/hardship|food/i, ["T08"]),
      },
      {
        name: "states the £460 arrears amount",
        found: issueMatching(/arrears|balance/i),
      },
    ],
  },
  {
    callId: "CALL-012",
    clean: false,
    mustFind: [
      {
        name: "'ongoing' Authority to Act; it was for this call only (T08/T09)",
        found: (r) =>
          contradictedCiting(["T08", "T09", "T23"])(r) ||
          issueMatching(/authority/i, ["T08", "T09", "T23"])(r),
      },
    ],
  },
  {
    callId: "CALL-014",
    clean: false,
    mustFind: [
      {
        name: "names the employer (Cedar Lane Distribution)",
        found: issueMatching(
          /privacy|entity|redact/i,
          undefined,
          /cedar lane/i,
        ),
      },
    ],
  },
  {
    callId: "CALL-019",
    clean: false,
    mustFind: [
      {
        name: "says inbound; the agent made the call (T01)",
        found: contradictedCiting(["T01", "T02"]),
      },
      {
        name: "missing 'Consent gained to record vulnerability' (T09/T10)",
        found: issueMatching(/consent/i, ["T09", "T10", "T11"]),
      },
    ],
  },
];

/** A clean call is a false alarm if the AI reports a definite problem. */
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
