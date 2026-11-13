import type { ApiErrorCode, Call, ReviewResult } from "@/types/review";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { buildReview, parseLlmReview, reviewEmptyTranscript } from "./review";
import { isTranscriptEmpty, parseTranscript } from "./transcript";

export interface ModelCallInput {
  system: string;
  user: string;
  model: string;
}
export interface ModelCallOutput {
  text: string;
  stopReason: string;
  model: string;
}
/** Injected so tests never touch the network. */
export type ModelCall = (input: ModelCallInput) => Promise<ModelCallOutput>;

export class ReviewError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/** Classifies unknown thrown errors (SDK, network, timeout) without importing the SDK. */
export type ErrorClassifier = (err: unknown) => ReviewError;

export async function runReview(
  call: Call,
  deps: { model: string; callModel: ModelCall; classifyError: ErrorClassifier },
): Promise<ReviewResult> {
  const turns = parseTranscript(call.transcript);
  if (isTranscriptEmpty(turns)) {
    // Nothing to check against: don't spend a model call.
    return reviewEmptyTranscript(call);
  }

  let out: ModelCallOutput;
  try {
    out = await deps.callModel({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(call, turns),
      model: deps.model,
    });
  } catch (err) {
    throw deps.classifyError(err);
  }

  if (out.stopReason === "refusal") {
    throw new ReviewError(
      "refused",
      "The model declined to review this call. Review it manually.",
    );
  }
  if (out.stopReason === "max_tokens") {
    throw new ReviewError(
      "invalid_model_output",
      "The model's answer was cut off before it finished. Try again.",
    );
  }

  const parsed = parseLlmReview(out.text);
  if (!parsed.ok) throw new ReviewError("invalid_model_output", parsed.error);
  return buildReview(parsed.data, call, out.model || deps.model);
}
