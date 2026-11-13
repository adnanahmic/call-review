import rawCalls from "@/data/calls.json";
import { CallListSchema, type Call } from "@/types/review";

/**
 * The 20 synthetic calls supplied with the task (instructions/candidate-calls.json).
 * Validated once at module load: bad data fails the build, not the reviewer.
 */
const CALLS: Call[] = CallListSchema.parse(rawCalls).sort((a, b) =>
  a.id.localeCompare(b.id),
);

export function listCalls(): Call[] {
  return CALLS;
}

export function getCall(id: string): Call | undefined {
  return CALLS.find((c) => c.id === id);
}
