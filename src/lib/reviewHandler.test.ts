import { describe, expect, it, vi } from "vitest";
import { syntheticCall, syntheticLlmReview } from "@/data/fixtures/synthetic";
import { createRateLimiter } from "./rateLimit";
import { buildReview } from "./review";
import { handleReviewRequest, type ReviewHandlerDeps } from "./reviewHandler";
import { ReviewError } from "./runReview";

const review = buildReview(syntheticLlmReview, syntheticCall, "test-model");
const silent = { info: () => {}, error: () => {} };

function deps(over: Partial<ReviewHandlerDeps> = {}): ReviewHandlerDeps {
  return {
    getCall: (id) => (id === syntheticCall.id ? syntheticCall : undefined),
    review: vi.fn().mockResolvedValue(review),
    isConfigured: () => true,
    rateLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    log: silent,
    ...over,
  };
}

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("http://test/api/review", {
    method: "POST",
    body,
    headers,
  });
}

describe("handleReviewRequest", () => {
  it("returns 200 with the review for a known call", async () => {
    const d = deps();
    const res = await handleReviewRequest(
      post(JSON.stringify({ callId: "SYN-001" })),
      d,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.review.callId).toBe("SYN-001");
    expect(d.review).toHaveBeenCalledWith(syntheticCall);
  });

  it.each([
    ["not json", "nope", 400, "bad_request"],
    ["wrong shape", JSON.stringify({ id: 1 }), 400, "bad_request"],
    ["unknown call", JSON.stringify({ callId: "CALL-999" }), 404, "not_found"],
  ])("rejects %s", async (_n, body, status, code) => {
    const d = deps();
    const res = await handleReviewRequest(post(body), d);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
    expect(d.review).not.toHaveBeenCalled();
  });

  it("returns 503 without calling the model when no API key is configured", async () => {
    const d = deps({ isConfigured: () => false });
    const res = await handleReviewRequest(
      post(JSON.stringify({ callId: "SYN-001" })),
      d,
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(d.review).not.toHaveBeenCalled();
  });

  it("maps ReviewError codes to HTTP statuses", async () => {
    for (const [code, status] of [
      ["timeout", 504],
      ["refused", 422],
      ["invalid_model_output", 502],
    ] as const) {
      const d = deps({
        review: vi.fn().mockRejectedValue(new ReviewError(code, "x")),
      });
      const res = await handleReviewRequest(
        post(JSON.stringify({ callId: "SYN-001" })),
        d,
      );
      expect(res.status).toBe(status);
      expect((await res.json()).error).toEqual({ code, message: "x" });
    }
  });

  it("hides unexpected error details behind a generic upstream error", async () => {
    const d = deps({
      review: vi.fn().mockRejectedValue(new Error("secret stack")),
    });
    const res = await handleReviewRequest(
      post(JSON.stringify({ callId: "SYN-001" })),
      d,
    );
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("rate-limits per client with 429 and retry-after", async () => {
    const d = deps({
      rateLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    const h = { "x-forwarded-for": "9.9.9.9" };
    const body = JSON.stringify({ callId: "SYN-001" });
    expect((await handleReviewRequest(post(body, h), d)).status).toBe(200);
    const res = await handleReviewRequest(post(body, h), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(d.review).toHaveBeenCalledOnce();
  });
});
