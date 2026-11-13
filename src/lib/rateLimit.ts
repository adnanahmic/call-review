/**
 * Fixed-window, in-memory rate limiter. Per server instance only, so it is
 * defence in depth: the real spend cap is the shared review cache.
 */
export interface RateLimiter {
  check(
    key: string,
  ): { allowed: true } | { allowed: false; retryAfterSeconds: number };
}

export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxKeys?: number;
}): RateLimiter {
  const now = opts.now ?? Date.now;
  const maxKeys = opts.maxKeys ?? 10_000;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key) {
      const t = now();
      const w = windows.get(key);
      if (!w || t - w.start >= opts.windowMs) {
        // Bound memory: forget everyone if the table gets large.
        if (windows.size >= maxKeys) windows.clear();
        windows.set(key, { start: t, count: 1 });
        return { allowed: true };
      }
      if (w.count < opts.limit) {
        w.count++;
        return { allowed: true };
      }
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((w.start + opts.windowMs - t) / 1000),
      };
    },
  };
}

/** First address in x-forwarded-for (set by Vercel), else a shared bucket. */
export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}
