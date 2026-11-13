// SYNTHETIC test fixtures: invented for tests, not real calls or real model output.
import type { Call, LlmReview } from "@/types/review";

export const syntheticCall: Call = {
  id: "SYN-001",
  call_date: "2026-10-20",
  estimated_duration: "01:00",
  transcript: [
    "T01 [00:00] Agent: Hello, could I speak to Sam Test, please? I'm calling from vehicle finance collections.",
    "T02 [00:05] Customer: Speaking.",
    "T03 [00:08] Agent: Please confirm your full name, date of birth and postcode.",
    "T04 [00:15] Customer: Sam Test, first of May 1990, AB1 2CD.",
    "T05 [00:20] Agent: Thank you, security is complete. There are arrears of two hundred pounds.",
    "T06 [00:30] Customer: My hours were cut. I can pay fifty pounds on Friday the twenty-third.",
    "T07 [00:40] Transcript note: Hold music begins.",
    "T08 [00:42] Unclear speaker: Thank you for watching.",
    "T09 [00:45] Transcript note: Hold music ends.",
    "T10 [00:50] Agent: I've noted the promise of fifty pounds on the twenty-third.",
  ].join("\n"),
  summary:
    "DPA completed. The customer called the company and arrears of £200 were discussed. Reduced hours caused the missed payment. The customer agreed to pay £60 on 23 October.",
};

/** A well-formed model answer containing one deliberate bad citation. */
export const syntheticLlmReview: LlmReview = {
  claims: [
    {
      summaryText: "DPA completed.",
      verdict: "supported",
      explanation: "Security completed.",
      evidence: [{ turnId: "T05", quote: "security is complete" }],
    },
    {
      summaryText: "The customer called the company",
      verdict: "contradicted",
      explanation: "The agent opened the call to a named person: outbound.",
      evidence: [{ turnId: "T01", quote: "could I speak to Sam Test" }],
    },
    {
      summaryText: "arrears of £200 were discussed",
      verdict: "supported",
      explanation: "Arrears were discussed.",
      evidence: [{ turnId: "T05", quote: "arrears of two hundred pounds" }],
    },
    {
      summaryText: "Reduced hours caused the missed payment.",
      verdict: "supported",
      explanation: "Hours cut.",
      // Fabricated quote: must be discarded and the verdict downgraded.
      evidence: [{ turnId: "T06", quote: "my employer went bust" }],
    },
    {
      summaryText: "The customer agreed to pay £60 on 23 October.",
      verdict: "contradicted",
      explanation: "The promise was £50, not £60.",
      evidence: [
        { turnId: "T6", quote: "I can pay fifty pounds on Friday" },
        { turnId: "T99", quote: "sixty pounds" },
      ],
    },
  ],
  omissions: [],
  ruleBreaches: [
    {
      summaryText: "arrears of £200",
      rule: "Arrears/Balances",
      explanation: "Arrears values must not be stated.",
      certainty: "definite",
      evidence: [],
    },
  ],
};

export const malformedOutputs: Record<string, string> = {
  notJson: "Sure! Here is my review: the summary looks fine.",
  truncated: '{"claims": [{"summaryText": "DPA completed.", "verdict": "supp',
  wrongShape: JSON.stringify({ claims: "none", omissions: [] }),
  badVerdict: JSON.stringify({
    claims: [
      {
        summaryText: "x",
        verdict: "probably-true",
        explanation: "",
        evidence: [],
      },
    ],
    omissions: [],
    ruleBreaches: [],
  }),
};
