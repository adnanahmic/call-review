import { ReviewResponseSchema, type ReviewResponse } from "@/types/review";

const CLIENT_TIMEOUT_MS = 120_000;

/**
 * Call the review API and validate the response shape. Never throws:
 * network failures, timeouts and bad payloads become error responses.
 */
export async function fetchReview(
  callId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<ReviewResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl("/api/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId }),
      signal: controller.signal,
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return err(
        "upstream_error",
        `Server returned ${res.status} without a readable body.`,
      );
    }
    const parsed = ReviewResponseSchema.safeParse(json);
    if (!parsed.success) {
      return err(
        "invalid_model_output",
        "Server returned an unexpected response.",
      );
    }
    return parsed.data;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return err(
        "timeout",
        "The review took too long and was cancelled. Try again.",
      );
    }
    return err(
      "upstream_error",
      "Could not reach the server. Check your connection and retry.",
    );
  } finally {
    clearTimeout(timer);
  }
}

function err(
  code: Extract<ReviewResponse, { ok: false }>["error"]["code"],
  message: string,
): ReviewResponse {
  return { ok: false, error: { code, message } };
}
