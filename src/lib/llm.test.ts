import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { classifyAnthropicError, configuredModel, DEFAULT_MODEL } from "./llm";
import { ReviewError } from "./runReview";

describe("classifyAnthropicError", () => {
  const h = new Headers();
  it.each([
    [new Anthropic.APIConnectionTimeoutError(), "timeout"],
    [
      new Anthropic.AuthenticationError(401, {}, "bad key", h),
      "not_configured",
    ],
    [new Anthropic.RateLimitError(429, {}, "slow down", h), "upstream_error"],
    [new Anthropic.InternalServerError(500, {}, "oops", h), "upstream_error"],
    [new Anthropic.APIConnectionError({ message: "down" }), "upstream_error"],
    [new Error("weird"), "upstream_error"],
  ])("maps %o to %s", (err, code) => {
    expect(classifyAnthropicError(err).code).toBe(code);
  });

  it("passes ReviewErrors through unchanged", () => {
    const e = new ReviewError("refused", "no");
    expect(classifyAnthropicError(e)).toBe(e);
  });

  it("never leaks the provider's raw message", () => {
    const e = classifyAnthropicError(
      new Anthropic.AuthenticationError(401, {}, "key sk-ant-123 invalid", h),
    );
    expect(e.message).not.toContain("sk-ant");
  });
});

describe("configuredModel", () => {
  const original = process.env.ANTHROPIC_MODEL;
  afterEach(() => {
    process.env.ANTHROPIC_MODEL = original;
  });
  it("defaults to claude-sonnet-5-5 and honours ANTHROPIC_MODEL", () => {
    process.env.ANTHROPIC_MODEL = "";
    expect(configuredModel()).toBe(DEFAULT_MODEL);
    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    process.env.ANTHROPIC_MODEL = "claude-opus-5-5";
    expect(configuredModel()).toBe("claude-opus-5-5");
  });
});
