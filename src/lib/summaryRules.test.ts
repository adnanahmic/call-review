import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUMMARY_RULES } from "./summaryRules";

describe("SUMMARY_RULES", () => {
  it("matches instructions/summary-rules.txt exactly (run `pnpm gen:rules` if not)", () => {
    expect(SUMMARY_RULES).toBe(
      readFileSync("instructions/summary-rules.txt", "utf8"),
    );
  });
});
