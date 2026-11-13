import { describe, expect, it } from "vitest";
import {
  malformedOutputs,
  syntheticCall,
  syntheticLlmReview,
} from "@/data/fixtures/synthetic";
import type { Call } from "@/types/review";
import {
  buildReview,
  checkEvidence,
  parseLlmReview,
  resolveTurnId,
  reviewEmptyTranscript,
} from "./review";
import { parseTranscript } from "./transcript";

const turns = parseTranscript(syntheticCall.transcript);

describe("parseLlmReview (malformed LLM JSON)", () => {
  it.each(Object.entries(malformedOutputs))("rejects %s", (_name, raw) => {
    const r = parseLlmReview(raw);
    expect(r.ok).toBe(false);
  });

  it("accepts valid JSON, including inside a ```json fence", () => {
    const raw = "```json\n" + JSON.stringify(syntheticLlmReview) + "\n```";
    const r = parseLlmReview(raw);
    expect(r.ok).toBe(true);
  });
});

describe("resolveTurnId / checkEvidence", () => {
  it("normalises T6, T06 and CALL-x T06 to the real turn", () => {
    expect(resolveTurnId("T6", turns)?.id).toBe("T06");
    expect(resolveTurnId("SYN-001 T06", turns)?.id).toBe("T06");
    expect(resolveTurnId("T99", turns)).toBeUndefined();
  });

  it("does not resolve a bare call id or other junk to a turn", () => {
    expect(resolveTurnId("SYN-001", turns)).toBeUndefined();
    expect(resolveTurnId("CALL-003", turns)).toBeUndefined();
    expect(resolveTurnId("T5x", turns)).toBeUndefined();
    expect(resolveTurnId("turn 5", turns)?.id).toBe("T05");
    expect(resolveTurnId("SYN-001:T05", turns)?.id).toBe("T05");
  });

  it("discards short quotes that also appear in other turns as ambiguous", () => {
    const yesTurns = parseTranscript(
      [
        "T01 [00:00] Agent: Can you confirm your name?",
        "T02 [00:05] Customer: Yes, that's right.",
        "T03 [00:10] Agent: And you want the hold?",
        "T04 [00:15] Customer: Yes, that's right, please.",
      ].join("\n"),
    );
    const r = checkEvidence(
      [
        { turnId: "T04", quote: "that's right" },
        { turnId: "T04", quote: "that's right, please" },
      ],
      yesTurns,
    );
    expect(r.ambiguous).toBe(1);
    expect(r.valid).toEqual([{ turnId: "T04", quote: "that's right, please" }]);
  });

  it("discards citations to missing turns or quotes not in the turn", () => {
    const r = checkEvidence(
      [
        { turnId: "T05", quote: "security is complete" },
        { turnId: "T05", quote: "invented words" },
        { turnId: "T42", quote: "anything" },
      ],
      turns,
    );
    expect(r.valid).toEqual([{ turnId: "T05", quote: "security is complete" }]);
    expect(r.rejected).toBe(2);
  });

  it("flags evidence drawn from hold artefacts", () => {
    const r = checkEvidence(
      [{ turnId: "T08", quote: "Thank you for watching" }],
      turns,
    );
    expect(r.citesArtefact).toBe(true);
  });
});

describe("buildReview", () => {
  const review = buildReview(syntheticLlmReview, syntheticCall, "test-model");
  const byText = (t: string) =>
    review.claims.find((c) => c.summaryText.startsWith(t));

  it("keeps contradicted direction claims with their evidence", () => {
    const c = byText("The customer called the company");
    expect(c?.verdict).toBe("contradicted");
    expect(c?.evidence[0].turnId).toBe("T01");
  });

  it("detects a contradicted number (promise £60 vs £50) and drops the fake citation", () => {
    const c = byText("The customer agreed to pay £60");
    expect(c?.verdict).toBe("contradicted");
    expect(c?.evidence.map((e) => e.turnId)).toEqual(["T06"]);
    expect(c?.flags.join(" ")).toMatch(/1 cited quote did not match/);
  });

  it("downgrades a 'supported' verdict with only fabricated evidence to uncertain", () => {
    const c = byText("Reduced hours");
    expect(c?.modelVerdict).toBe("supported");
    expect(c?.verdict).toBe("uncertain");
    expect(c?.evidence).toEqual([]);
  });

  it("merges the AI arrears breach with the automatic check instead of duplicating it", () => {
    const arrears = review.issues.filter((i) => i.rule === "Arrears/Balances");
    expect(arrears).toHaveLength(1);
    expect(arrears[0].flags).toContain("Confirmed by an automatic rule check.");
  });

  it("flags summary sentences the AI never assessed (claims missing from the review)", () => {
    const partial = buildReview(
      {
        claims: [syntheticLlmReview.claims[0]],
        omissions: [],
        ruleBreaches: [],
      },
      syntheticCall,
      "m",
    );
    const unassessed = partial.claims.filter((c) =>
      c.flags.some((f) => f.startsWith("Not assessed")),
    );
    expect(unassessed.length).toBe(3);
    expect(unassessed.every((c) => c.verdict === "uncertain")).toBe(true);
  });

  it("flags claim text that is not actually in the summary", () => {
    const r = buildReview(
      {
        claims: [
          {
            summaryText: "The customer won the lottery.",
            verdict: "unsupported",
            explanation: "",
            evidence: [],
          },
        ],
        omissions: [],
        ruleBreaches: [],
      },
      syntheticCall,
      "m",
    );
    expect(r.claims[0].flags.join(" ")).toMatch(/not found verbatim/);
  });

  it("marks omissions without verifiable transcript evidence as possible only", () => {
    const r = buildReview(
      {
        claims: [],
        omissions: [
          {
            description: "Missing hardship",
            rule: "Severe Hardship Specifics",
            certainty: "definite",
            evidence: [{ turnId: "T06", quote: "no food at home" }],
          },
        ],
        ruleBreaches: [],
      },
      syntheticCall,
      "m",
    );
    const o = r.issues.find((i) => i.kind === "omission");
    expect(o?.certainty).toBe("possible");
  });

  it("reports issues-found overall when a claim is contradicted", () => {
    expect(review.overall.status).toBe("issues-found");
    expect(review.overall.reasons.join(" ")).toMatch(/2 contradicted claims/);
  });

  it("reports no-issues-found for a clean, fully supported review", () => {
    const clean: Call = {
      ...syntheticCall,
      summary: "DPA completed. Arrears were discussed.",
    };
    const r = buildReview(
      {
        claims: [
          {
            summaryText: "DPA completed.",
            verdict: "supported",
            explanation: "",
            evidence: [{ turnId: "T05", quote: "security is complete" }],
          },
          {
            summaryText: "Arrears were discussed.",
            verdict: "supported",
            explanation: "",
            evidence: [{ turnId: "T05", quote: "There are arrears" }],
          },
        ],
        omissions: [],
        ruleBreaches: [],
      },
      clean,
      "m",
    );
    expect(r.overall.status).toBe("no-issues-found");
  });
});

describe("reviewEmptyTranscript", () => {
  it("marks every claim unsupported and requires 'Incomplete call.'", () => {
    const r = reviewEmptyTranscript({ ...syntheticCall, transcript: "" });
    expect(r.claims.every((c) => c.verdict === "unsupported")).toBe(true);
    expect(r.issues[0].rule).toMatch(/Step 1/);
    expect(r.overall.status).toBe("issues-found");
  });

  it("accepts 'Incomplete call.' for an empty transcript", () => {
    const r = reviewEmptyTranscript({
      ...syntheticCall,
      transcript: "",
      summary: "Incomplete call.",
    });
    expect(r.issues).toHaveLength(0);
  });
});
