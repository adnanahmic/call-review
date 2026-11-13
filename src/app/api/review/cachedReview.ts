import "server-only";
import { cacheLife } from "next/cache";
import { getCall } from "@/lib/calls";
import { callAnthropic, classifyAnthropicError } from "@/lib/llm";
import { ReviewError, runReview } from "@/lib/runReview";
import type { ApiErrorCode, ReviewResult } from "@/types/review";

export type ReviewOutcome =
  | { ok: true; review: ReviewResult }
  | { ok: false; code: ApiErrorCode; message: string };

/**
 * Shared across all server instances (platform remote cache), keyed by
 * call id + model. The dataset is fixed, so spend is capped at roughly one
 * model call per call per deploy.
 *
 * Failures are returned as plain values (thrown errors lose their class when
 * crossing the cache boundary) and get a ~2s lifetime so they are retried.
 */
export async function cachedReview(
  callId: string,
  model: string,
): Promise<ReviewOutcome> {
  "use cache: remote";

  const call = getCall(callId);
  try {
    if (!call) throw new ReviewError("not_found", `Unknown call ${callId}.`);
    const review = await runReview(call, {
      model,
      callModel: callAnthropic,
      classifyError: classifyAnthropicError,
    });
    cacheLife("max");
    return { ok: true, review };
  } catch (err) {
    const e = classifyAnthropicError(err);
    cacheLife({ stale: 0, revalidate: 1, expire: 2 });
    return { ok: false, code: e.code, message: e.message };
  }
}
