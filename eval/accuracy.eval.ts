import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { getCall } from "@/lib/calls";
import {
  callAnthropic,
  classifyAnthropicError,
  configuredModel,
} from "@/lib/llm";
import { runReview } from "@/lib/runReview";
import { falseAlarms, LABELS } from "./labels";

/**
 * Real-model accuracy check against hand-checked labels. Makes one API call
 * per labelled call (~6). Not part of `pnpm test`; run with `pnpm eval`.
 */
it("accuracy against hand-checked labels", async () => {
  const model = configuredModel();
  const rows = await Promise.all(
    LABELS.map(async (label) => {
      const call = getCall(label.callId);
      if (!call) throw new Error(`missing ${label.callId}`);
      const review = await runReview(call, {
        model,
        callModel: callAnthropic,
        classifyError: classifyAnthropicError,
      });
      return {
        label,
        found: label.mustFind.map((m) => ({
          name: m.name,
          ok: m.found(review),
        })),
        alarms: label.clean ? falseAlarms(review) : [],
        status: review.overall.status,
      };
    }),
  );

  const expected = rows.flatMap((r) => r.found);
  const hit = expected.filter((f) => f.ok).length;
  const clean = rows.filter((r) => r.label.clean);
  const cleanOk = clean.filter((r) => r.alarms.length === 0).length;

  const lines = [
    `# Eval run (${new Date().toISOString()}, model ${model})`,
    "",
    `Known errors found: ${hit}/${expected.length}`,
    `Clean calls with no false alarm: ${cleanOk}/${clean.length}`,
    "",
    ...rows.flatMap((r) => [
      `## ${r.label.callId}: overall "${r.status}"`,
      ...r.found.map((f) => `- [${f.ok ? "x" : " "}] ${f.name}`),
      ...(r.label.clean
        ? r.alarms.length
          ? r.alarms.map((a) => `- FALSE ALARM ${a}`)
          : ["- no false alarms"]
        : []),
      "",
    ]),
  ];
  writeFileSync("eval/last-run.md", lines.join("\n"));
  console.log(lines.join("\n"));
}, 300_000);
