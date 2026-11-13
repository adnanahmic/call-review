import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LlmReviewSchema } from "@/types/review";
import { ReviewError, type ErrorClassifier, type ModelCall } from "./runReview";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
const LLM_TIMEOUT_MS = 100_000;

export function configuredModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * The only place that talks to Anthropic. Server-side only.
 * Uses structured outputs to ask for JSON, but the caller still validates
 * the text with Zod: model output is treated as untrusted.
 */
export const callAnthropic: ModelCall = async ({ system, user, model }) => {
  const client = new Anthropic({ timeout: LLM_TIMEOUT_MS, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(LlmReviewSchema),
    },
  });
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("");
  return {
    text,
    stopReason: response.stop_reason ?? "unknown",
    model: response.model,
  };
};

export function isMissingKey(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

/** Map SDK / network failures to reviewer-facing error codes. Most specific first. */
export const classifyAnthropicError: ErrorClassifier = (err) => {
  if (err instanceof ReviewError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new ReviewError(
      "timeout",
      "The AI review timed out. Try again, or review manually.",
    );
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return new ReviewError(
      "not_configured",
      "The AI service rejected the server's credentials.",
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new ReviewError(
      "upstream_error",
      "The AI service is rate-limiting requests. Wait a moment and retry.",
    );
  }
  if (err instanceof Anthropic.APIError) {
    return new ReviewError(
      "upstream_error",
      `The AI service returned an error (${err.status ?? "network"}).`,
    );
  }
  return new ReviewError(
    "upstream_error",
    "The AI review failed unexpectedly.",
  );
};
