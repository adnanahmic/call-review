import { describe, expect, it } from "vitest";
import { checkSummaryRules } from "./rules";

const rulesHit = (s: string) => checkSummaryRules(s).map((f) => f.rule);

const CLEAN =
  "DPA completed. The company called and reached the customer, and arrears were discussed. The next steps are to call on 23 October.";

describe("checkSummaryRules", () => {
  it("passes a compliant summary", () => {
    expect(checkSummaryRules(CLEAN)).toEqual([]);
  });

  it("flags specific arrears / balance values", () => {
    expect(
      rulesHit(
        "DPA completed. The customer called and arrears of £460 were discussed.",
      ),
    ).toContain("Arrears/Balances");
    expect(
      rulesHit("DPA completed. The balance stands at £3,200 after the call."),
    ).toContain("Arrears/Balances");
  });

  it("does not flag future promise amounts or situational costs", () => {
    expect(
      rulesHit(
        "DPA completed. A turbo failure cost £800. The customer agreed to pay £100 on Friday.",
      ),
    ).toEqual([]);
  });

  it("flags amounts for payments taken during the call", () => {
    expect(
      rulesHit("DPA completed. £50 payment was made during the call."),
    ).toContain("Immediate Payments");
  });

  it("flags placeholders that break the omission rule", () => {
    expect(rulesHit("DPA completed. I&E not discussed.")).toContain(
      "Critical Omission Rule",
    );
  });

  it("flags 'further action' used outside 'risk of further action'", () => {
    expect(
      rulesHit("DPA completed. Further action will follow next week."),
    ).toContain("Terminology");
    expect(
      rulesHit(
        "DPA completed. The customer was warned the account is at risk of further action.",
      ),
    ).toEqual([]);
  });

  it("flags American spellings", () => {
    const f = checkSummaryRules(
      "DPA completed. The customer authorized a payment programme.",
    );
    expect(f.map((x) => x.rule)).toContain("Language");
    expect(f[0].description).toMatch(/authorise/);
  });

  it("matches American spellings only as whole words", () => {
    const lang = (s: string) =>
      checkSummaryRules(s).filter((f) => f.rule === "Language").length;
    expect(lang("DPA completed. The Direct Debit was canceled.")).toBe(1);
    expect(lang("DPA completed. The customer is seeing counselors.")).toBe(1);
    // UK spellings and longer words must not trigger (old alternation bug).
    expect(lang("DPA completed. The Direct Debit was cancelled.")).toBe(0);
    expect(lang("DPA completed. Precanceling the plan was discussed.")).toBe(0);
    expect(lang("DPA completed. Counselingly worded advice was given.")).toBe(
      0,
    );
  });

  it("flags bullet points and sentence count", () => {
    expect(rulesHit("- DPA completed.\n- Arrears discussed.")).toContain(
      "Tone & Format",
    );
    expect(rulesHit("DPA completed and arrears discussed")).toContain(
      "Tone & Format",
    );
  });

  it("allows Step 1 short-form outputs", () => {
    expect(checkSummaryRules("Incomplete call.")).toEqual([]);
    expect(checkSummaryRules("Voicemail reached - no message left.")).toEqual(
      [],
    );
  });

  it("flags telephone numbers", () => {
    expect(
      rulesHit("DPA completed. The customer asked for a call on 07700 900123."),
    ).toContain("Anonymity");
  });

  it("reports an empty summary", () => {
    expect(rulesHit("   ")).toEqual(["Step 1 / Output"]);
  });
});
