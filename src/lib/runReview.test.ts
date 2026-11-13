import { describe, expect, it, vi } from "vitest";
import {
  malformedOutputs,
  syntheticCall,
  syntheticLlmReview,
} from "@/data/fixtures/synthetic";
import { ReviewError, runReview, type ModelCall } from "./runReview";
import { listCalls, getCall } from "./calls";
import { weekdayOf } from "./prompt";

const classifyError = (err: unknown) =>
  err instanceof ReviewError ? err : new ReviewError("upstream_error", "boom");

function deps(callModel: ModelCall) {
  return { model: "test-model", callModel, classifyError };
}

describe("runReview (LLM mocked; no network)", () => {
  it("sends the transcript with turn ids and returns a validated review", async () => {
    const callModel = vi.fn<ModelCall>().mockResolvedValue({
      text: JSON.stringify(syntheticLlmReview),
      stopReason: "end_turn",
      model: "test-model",
    });
    const r = await runReview(syntheticCall, deps(callModel));
    expect(callModel).toHaveBeenCalledOnce();
    const { user } = callModel.mock.calls[0][0];
    expect(user).toContain("T08 [00:42] Unclear speaker");
    expect(user).toContain("[LIKELY ARTEFACT]");
    expect(user).toContain('weekday="Tuesday"');
    expect(r.claims.length).toBeGreaterThan(0);
  });

  it("does not call the model for an empty transcript", async () => {
    const callModel = vi.fn<ModelCall>();
    const r = await runReview(
      { ...syntheticCall, transcript: "" },
      deps(callModel),
    );
    expect(callModel).not.toHaveBeenCalled();
    expect(r.overall.status).toBe("issues-found");
  });

  it("raises invalid_model_output for malformed JSON", async () => {
    const callModel = vi.fn<ModelCall>().mockResolvedValue({
      text: malformedOutputs.notJson,
      stopReason: "end_turn",
      model: "m",
    });
    await expect(
      runReview(syntheticCall, deps(callModel)),
    ).rejects.toMatchObject({ code: "invalid_model_output" });
  });

  it("raises refused / invalid_model_output for refusal and truncation", async () => {
    const refusal = vi
      .fn<ModelCall>()
      .mockResolvedValue({ text: "", stopReason: "refusal", model: "m" });
    await expect(runReview(syntheticCall, deps(refusal))).rejects.toMatchObject(
      { code: "refused" },
    );

    const cut = vi
      .fn<ModelCall>()
      .mockResolvedValue({ text: "{", stopReason: "max_tokens", model: "m" });
    await expect(runReview(syntheticCall, deps(cut))).rejects.toMatchObject({
      code: "invalid_model_output",
    });
  });

  it("classifies thrown transport errors", async () => {
    const callModel = vi
      .fn<ModelCall>()
      .mockRejectedValue(new Error("socket hang up"));
    await expect(
      runReview(syntheticCall, deps(callModel)),
    ).rejects.toMatchObject({ code: "upstream_error" });
  });
});

describe("dataset", () => {
  it("loads and validates all 20 supplied calls", () => {
    expect(listCalls()).toHaveLength(20);
    expect(getCall("CALL-001")?.transcript).toMatch(/^T01/);
    expect(getCall("nope")).toBeUndefined();
  });

  it("knows the call date's weekday for relative dates", () => {
    expect(weekdayOf("2026-10-20")).toBe("Tuesday");
    expect(weekdayOf("not-a-date")).toBe("unknown");
  });
});
