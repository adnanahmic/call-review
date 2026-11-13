import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then reports retry-after", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    t = 15_000;
    expect(rl.check("a")).toEqual({ allowed: false, retryAfterSeconds: 45 });
    expect(rl.check("b").allowed).toBe(true); // keys are independent
    t = 60_000;
    expect(rl.check("a").allowed).toBe(true); // new window
  });

  it("bounds memory by resetting when the key table is full", () => {
    const rl = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 0,
      maxKeys: 2,
    });
    rl.check("a");
    rl.check("b");
    rl.check("c"); // clears table
    expect(rl.check("a").allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for address", () => {
    expect(
      clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    ).toBe("1.2.3.4");
    expect(clientKey(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
