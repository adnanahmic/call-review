import { normaliseForMatch } from "./transcript";

/**
 * Split a summary into sentences. Handles "£1.50", "Mr.", "e.g." well enough
 * for 2–5 sentence summaries; this is a heuristic, not an NLP tokeniser.
 */
export function splitSentences(summary: string): string[] {
  const text = summary.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const protectedText = text
    .replace(/\b(e\.g|i\.e|etc|Mr|Mrs|Ms|Dr|approx)\./gi, (m) =>
      m.replace(/\./g, "\u0000"),
    )
    .replace(/(\d)\.(\d)/g, "$1\u0000$2");
  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z"'‘“(])/)
    .map((s) => s.replace(/\u0000/g, ".").trim())
    .filter((s) => s.length > 0);
}

/** Does the summary contain this fragment (loosely, ignoring punctuation/case)? */
export function summaryContains(summary: string, fragment: string): boolean {
  const f = normaliseForMatch(fragment);
  return f.length > 0 && normaliseForMatch(summary).includes(f);
}

/**
 * Which sentences are not covered by any of the claim fragments?
 * A sentence counts as covered when at least one claim fragment overlaps it.
 */
export function uncoveredSentences(
  summary: string,
  claimFragments: string[],
): string[] {
  const frags = claimFragments.map(normaliseForMatch).filter(Boolean);
  return splitSentences(summary).filter((sentence) => {
    const s = normaliseForMatch(sentence);
    return !frags.some((f) => s.includes(f) || f.includes(s));
  });
}
