import type { Turn, TurnKind } from "@/types/review";

const TURN_LINE = /^(T\d+)\s+\[(\d{1,2}:\d{2})\]\s+([^:]+):\s?(.*)$/;

function kindFor(speaker: string): TurnKind {
  const s = speaker.trim().toLowerCase();
  if (s === "transcript note") return "note";
  if (s.startsWith("unclear")) return "unclear";
  return "speech";
}

/**
 * Parse a "T01 [00:00] Speaker: text" transcript into turns.
 * Lines that don't match the grammar are appended to the previous turn
 * (wrapped text); leading unparseable lines are dropped.
 */
export function parseTranscript(raw: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = TURN_LINE.exec(trimmed);
    if (m) {
      const [, id, time, speaker, text] = m;
      turns.push({
        id,
        time,
        speaker: speaker.trim(),
        text: text.trim(),
        kind: kindFor(speaker),
        suspectedArtefact: false,
      });
    } else if (turns.length > 0) {
      const last = turns[turns.length - 1];
      last.text = `${last.text} ${trimmed}`.trim();
    }
  }
  return flagArtefacts(turns);
}

const HOLD_START =
  /hold (music )?(begins|starts)|silence (begins|starts)|placed on hold/i;
const HOLD_END =
  /hold (music )?(ends|stops)|silence (ends|stops)|taken off hold/i;

/**
 * Summary rule 8: transcription hallucinations during hold/silence must be ignored.
 * We flag (never delete) turns inside a hold block, and unclear-speaker inserts,
 * so the reviewer can see what the AI was told to disregard.
 */
function flagArtefacts(turns: Turn[]): Turn[] {
  let inHold = false;
  return turns.map((t) => {
    if (t.kind === "note") {
      if (HOLD_START.test(t.text)) inHold = true;
      else if (HOLD_END.test(t.text)) inHold = false;
      return t;
    }
    const suspected = t.kind === "unclear" || inHold;
    return suspected ? { ...t, suspectedArtefact: true } : t;
  });
}

/** True when there is nothing a reviewer could check a summary against. */
export function isTranscriptEmpty(turns: Turn[]): boolean {
  return (
    turns.filter((t) => t.kind === "speech" && t.text.length > 0).length === 0
  );
}

export function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”'"`]/g, "")
    .replace(/[^\p{L}\p{N}£%]+/gu, " ")
    .trim();
}

function parts(quote: string): string[] {
  return quote
    .split(/\.\.\.|…/)
    .map(normaliseForMatch)
    .filter((p) => p.length > 0);
}

/** Whole-word containment: " yes " must not match inside "yesterday". */
function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Is `quote` contained in the text of `turn`, ignoring case and punctuation?
 * Matches whole words only; "..." splits the quote into fragments that must
 * all appear.
 */
export function quoteAppearsInTurn(quote: string, turn: Turn): boolean {
  const ps = parts(quote);
  if (ps.length === 0) return false;
  const haystack = normaliseForMatch(turn.text);
  return ps.every((p) => containsWords(haystack, p));
}

export const MIN_DISTINCTIVE_WORDS = 3;

/**
 * A short quote ("Yes", "That's right") that also appears in other turns
 * proves nothing about which turn the model meant.
 */
export function isAmbiguousQuote(
  quote: string,
  turn: Turn,
  turns: Turn[],
): boolean {
  const words = parts(quote).join(" ").split(" ").filter(Boolean).length;
  if (words >= MIN_DISTINCTIVE_WORDS) return false;
  return turns.some((t) => t.id !== turn.id && quoteAppearsInTurn(quote, t));
}
