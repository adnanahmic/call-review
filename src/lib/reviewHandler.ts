import {
  ReviewRequestSchema,
  type ApiErrorCode,
  type Call,
  type ReviewResponse,
  type ReviewResult,
} from "@/types/review";
import { clientKey, type RateLimiter } from "./rateLimit";
import { ReviewError } from "./runReview";

export const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  refused: 422,
  rate_limited: 429,
  invalid_model_output: 502,
  upstream_error: 502,
  not_configured: 503,
  timeout: 504,
};

export interface ReviewHandlerDeps {
  getCall: (id: string) => Call | undefined;
  /** Runs (or returns a cached) review. Throws ReviewError on failure. */
  review: (call: Call) => Promise<ReviewResult>;
  isConfigured: () => boolean;
  rateLimiter: RateLimiter;
  log?: Pick<Console, "info" | "error">;
}

function fail(
  code: ApiErrorCode,
  message: string,
  headers?: HeadersInit,
): Response {
  const body: ReviewResponse = { ok: false, error: { code, message } };
  return Response.json(body, { status: STATUS[code], headers });
}

/** Framework-free POST /api/review logic, so it can be unit tested. */
export async function handleReviewRequest(
  request: Request,
  deps: ReviewHandlerDeps,
): Promise<Response> {
  const log = deps.log ?? console;

  const limited = deps.rateLimiter.check(clientKey(request.headers));
  if (!limited.allowed) {
    return fail(
      "rate_limited",
      `Too many review requests. Try again in ${limited.retryAfterSeconds}s.`,
      { "retry-after": String(limited.retryAfterSeconds) },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("bad_request", "Request body must be JSON.");
  }
  const parsed = ReviewRequestSchema.safeParse(json);
  if (!parsed.success) return fail("bad_request", "Expected { callId }.");

  // Transcript and summary always come from server-side data, never the client.
  const call = deps.getCall(parsed.data.callId);
  if (!call) return fail("not_found", `Unknown call ${parsed.data.callId}.`);

  if (!deps.isConfigured()) {
    return fail(
      "not_configured",
      "AI review is not configured on this server (missing API key). Automatic rule checks still apply.",
    );
  }

  const started = Date.now();
  try {
    const review = await deps.review(call);
    log.info(
      `[review] ${call.id} ok model=${review.model} claims=${review.claims.length} issues=${review.issues.length} ms=${Date.now() - started}`,
    );
    const body: ReviewResponse = { ok: true, review };
    return Response.json(body);
  } catch (err) {
    const e =
      err instanceof ReviewError
        ? err
        : new ReviewError(
            "upstream_error",
            "The AI review failed unexpectedly.",
          );
    log.error(
      `[review] ${call.id} failed code=${e.code} ms=${Date.now() - started}: ${e.message}`,
    );
    return fail(e.code, e.message);
  }
}
