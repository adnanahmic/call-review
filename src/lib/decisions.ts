import { z } from "zod";
import { ReviewerDecisionSchema, type ReviewerDecision } from "@/types/review";

export const STORAGE_KEY = "call-review:decisions:v1";

const StoredSchema = z.record(z.string(), ReviewerDecisionSchema);
export type DecisionMap = Record<string, ReviewerDecision>;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/** Read decisions from storage; corrupt or missing data yields an empty map. */
export function loadDecisions(storage: Storage | undefined): DecisionMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Returns the new map; storage failures (private mode, quota) are reported, not thrown. */
export function saveDecision(
  storage: Storage | undefined,
  current: DecisionMap,
  decision: ReviewerDecision,
): { map: DecisionMap; persisted: boolean } {
  const valid = ReviewerDecisionSchema.parse(decision);
  const map = { ...current, [valid.callId]: valid };
  if (!storage) return { map, persisted: false };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map));
    return { map, persisted: true };
  } catch {
    return { map, persisted: false };
  }
}

export const DECISION_LABELS: Record<ReviewerDecision["decision"], string> = {
  accurate: "Summary accurate",
  "needs-correction": "Needs correction",
  escalate: "Unsure: escalate",
};
