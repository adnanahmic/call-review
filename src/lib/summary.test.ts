import { describe, expect, it } from "vitest";
import { splitSentences, summaryContains, uncoveredSentences } from "./summary";

describe("splitSentences", () => {
  it("splits on sentence ends", () => {
    expect(splitSentences("DPA completed. Arrears were discussed.")).toEqual([
      "DPA completed.",
      "Arrears were discussed.",
    ]);
  });

  it("does not split money, abbreviations or lower-case continuations", () => {
    expect(
      splitSentences(
        "A repair cost £1.50 more, e.g. parts. Mr. Smith was not named. The I&E was agreed.",
      ),
    ).toEqual([
      "A repair cost £1.50 more, e.g. parts.",
      "Mr. Smith was not named.",
      "The I&E was agreed.",
    ]);
  });

  it("handles empty input and collapses whitespace", () => {
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences("Incomplete call.")).toEqual(["Incomplete call."]);
    expect(splitSentences("One.\n\n  Two.")).toEqual(["One.", "Two."]);
  });
});

describe("summaryContains / uncoveredSentences", () => {
  const summary = "DPA completed. The customer’s partner left. Payment made.";
  it("matches fragments ignoring punctuation and curly quotes", () => {
    expect(summaryContains(summary, "the customer's partner left")).toBe(true);
    expect(summaryContains(summary, "")).toBe(false);
  });
  it("lists sentences not covered by any claim", () => {
    expect(
      uncoveredSentences(summary, ["DPA completed", "Payment made."]),
    ).toEqual(["The customer’s partner left."]);
  });
});
