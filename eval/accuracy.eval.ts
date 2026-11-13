import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { getCall } from "@/lib/calls";
import {
  callAnthropic,
  classifyAnthropicError,
  configuredModel,
} from "@/lib/llm";
import { runReview } from "@/lib/runReview";
import { falseAlarms, findMatch, LABELS, type Label } from "./labels";

/**
 * Real-model accuracy check against hand-checked labels for all 20 calls.
 * One API call per call, 5 at a time. Not part of `pnpm test`; run `pnpm eval`.
 */

async function pool<T, R>(
  items: T[],
  size: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function evaluate(label: Label, model: string) {
  const call = getCall(label.callId);
  if (!call) throw new Error(`missing ${label.callId}`);
  const review = await runReview(call, {
    model,
    callModel: callAnthropic,
    classifyError: classifyAnthropicError,
  });
  return {
    label,
    status: review.overall.status,
    found: label.mustFind.map((m) => {
      const match = findMatch(m, review);
      return { name: m.name, ok: match !== null, match };
    }),
    alarms: label.clean ? falseAlarms(review) : [],
  };
}

it("accuracy against hand-checked labels", async () => {
  const model = configuredModel();
  const rows = await pool(LABELS, 5, (l) => evaluate(l, model));

  const expected = rows.flatMap((r) => r.found);
  const hit = expected.filter((f) => f.ok).length;
  const hitByAi = expected.filter(
    (f) => f.match && f.match.via !== "automatic check",
  ).length;
  const clean = rows.filter((r) => r.label.clean);
  const cleanOk = clean.filter((r) => r.alarms.length === 0).length;
  const flaggedErrorCalls = rows.filter(
    (r) => !r.label.clean && r.status !== "no-issues-found",
  ).length;
  const errorCalls = rows.length - clean.length;

  const lines = [
    `# Eval run (${new Date().toISOString()}, model ${model})`,
    "",
    `- Known errors found: **${hit}/${expected.length}** (${hitByAi} by the AI, ${hit - hitByAi} only by the automatic checks)`,
    `- Calls with errors flagged (not "no issues"): ${flaggedErrorCalls}/${errorCalls}`,
    `- Clean calls with no false alarm: **${cleanOk}/${clean.length}**`,
    "",
    ...rows.flatMap((r) => [
      `## ${r.label.callId}: ${r.label.clean ? "clean" : "has errors"}, AI says "${r.status}"`,
      ...r.found.flatMap((f) => [
        `- [${f.ok ? "x" : " "}] ${f.name}`,
        ...(f.match ? [`  - matched ${f.match.via}: ${f.match.text}`] : []),
      ]),
      ...(r.label.notes ? [`- note: ${r.label.notes}`] : []),
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
}, 600_000);
