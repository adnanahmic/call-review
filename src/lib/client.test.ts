import { describe, expect, it, vi } from "vitest";
import { loadDecisions, saveDecision, STORAGE_KEY } from "./decisions";
import { fetchReview } from "./reviewClient";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("decisions storage", () => {
  const d = {
    callId: "CALL-001",
    decision: "accurate" as const,
    note: "",
    decidedAt: "2026-11-13T00:00:00.000Z",
  };

  it("round-trips a decision", () => {
    const s = memoryStorage();
    const { map, persisted } = saveDecision(s, {}, d);
    expect(persisted).toBe(true);
    expect(loadDecisions(s)).toEqual(map);
  });

  it("ignores corrupt or wrongly shaped storage", () => {
    expect(loadDecisions(memoryStorage({ [STORAGE_KEY]: "{oops" }))).toEqual(
      {},
    );
    expect(
      loadDecisions(
        memoryStorage({
          [STORAGE_KEY]: JSON.stringify({ x: { decision: 1 } }),
        }),
      ),
    ).toEqual({});
    expect(loadDecisions(undefined)).toEqual({});
  });

  it("reports when storage throws (e.g. private mode)", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(saveDecision(s, {}, d).persisted).toBe(false);
  });
});

describe("fetchReview", () => {
  it("returns an error for an unexpected payload", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ hello: "world" }));
    const r = await fetchReview("CALL-001", f);
    expect(r).toMatchObject({
      ok: false,
      error: { code: "invalid_model_output" },
    });
  });

  it("passes through server errors", async () => {
    const body = {
      ok: false,
      error: { code: "not_found", message: "Unknown call" },
    };
    const f = vi.fn().mockResolvedValue(Response.json(body, { status: 404 }));
    expect(await fetchReview("X", f)).toEqual(body);
  });

  it("maps network failures and timeouts", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await fetchReview("X", down)).toMatchObject({
      ok: false,
      error: { code: "upstream_error" },
    });
    const hang = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          ),
        ),
    );
    expect(
      await fetchReview("X", hang as unknown as typeof fetch, 10),
    ).toMatchObject({
      ok: false,
      error: { code: "timeout" },
    });
  });
});
