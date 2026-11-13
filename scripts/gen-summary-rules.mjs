// Regenerates src/lib/summaryRules.ts from instructions/summary-rules.txt.
// Run with `pnpm gen:rules`; a unit test fails if the two drift apart.
import { readFileSync, writeFileSync } from "node:fs";

const rules = readFileSync("instructions/summary-rules.txt", "utf8");
const out =
  "// GENERATED from instructions/summary-rules.txt by `pnpm gen:rules`. Do not edit.\n" +
  `export const SUMMARY_RULES = ${JSON.stringify(rules)};\n`;
writeFileSync("src/lib/summaryRules.ts", out);
console.log(`summaryRules.ts updated (${rules.length} chars)`);
