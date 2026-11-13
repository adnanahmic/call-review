import { getCall } from "@/lib/calls";
import { configuredModel, isMissingKey } from "@/lib/llm";
import { createRateLimiter } from "@/lib/rateLimit";
import { handleReviewRequest } from "@/lib/reviewHandler";
import { ReviewError } from "@/lib/runReview";
import { cachedReview } from "./cachedReview";

export const maxDuration = 120;

// Defence in depth on top of the shared cache: 10 requests / minute / IP.
const rateLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export function POST(request: Request): Promise<Response> {
  return handleReviewRequest(request, {
    getCall,
    review: async (call) => {
      const outcome = await cachedReview(call.id, configuredModel());
      if (!outcome.ok) throw new ReviewError(outcome.code, outcome.message);
      return outcome.review;
    },
    isConfigured: () => !isMissingKey(),
    rateLimiter,
  });
}
