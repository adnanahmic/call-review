import { getCall } from "@/lib/calls";
import {
  callAnthropic,
  classifyAnthropicError,
  configuredModel,
  isMissingKey,
} from "@/lib/llm";
import { ReviewError, runReview } from "@/lib/runReview";
import {
  ReviewRequestSchema,
  type ApiErrorCode,
  type ReviewResponse,
  type ReviewResult,
} from "@/types/review";

export const maxDuration = 120;

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  not_configured: 503,
  timeout: 504,
  upstream_error: 502,
  invalid_model_output: 502,
  refused: 422,
};

// Best-effort, per-instance cache so repeat views of a call don't re-bill.
const cache = new Map<string, ReviewResult>();

function fail(code: ApiErrorCode, message: string): Response {
  const body: ReviewResponse = { ok: false, error: { code, message } };
  return Response.json(body, { status: STATUS[code] });
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("bad_request", "Request body must be JSON.");
  }
  const parsed = ReviewRequestSchema.safeParse(json);
  if (!parsed.success) return fail("bad_request", "Expected { callId }.");

  // The transcript and summary always come from server-side data,
  // never from the client.
  const call = getCall(parsed.data.callId);
  if (!call) return fail("not_found", `Unknown call ${parsed.data.callId}.`);

  const model = configuredModel();
  const key = `${call.id}:${model}`;
  const cached = cache.get(key);
  if (cached) return Response.json({ ok: true, review: cached });

  if (isMissingKey()) {
    return fail(
      "not_configured",
      "AI review is not configured on this server (missing API key). Automatic rule checks still apply.",
    );
  }

  const started = Date.now();
  try {
    const review = await runReview(call, {
      model,
      callModel: callAnthropic,
      classifyError: classifyAnthropicError,
    });
    cache.set(key, review);
    console.info(
      `[review] ${call.id} ok model=${review.model} claims=${review.claims.length} issues=${review.issues.length} ms=${Date.now() - started}`,
    );
    const body: ReviewResponse = { ok: true, review };
    return Response.json(body);
  } catch (err) {
    const e = err instanceof ReviewError ? err : classifyAnthropicError(err);
    console.error(
      `[review] ${call.id} failed code=${e.code} ms=${Date.now() - started}: ${e.message}`,
    );
    return fail(e.code, e.message);
  }
}
