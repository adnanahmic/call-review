import type { Call, CallView } from "@/types/review";
import { automaticIssues } from "./review";
import { parseTranscript } from "./transcript";

export function toCallView(call: Call): CallView {
  return {
    id: call.id,
    callDate: call.call_date,
    duration: call.estimated_duration,
    summary: call.summary,
    turns: parseTranscript(call.transcript),
    automaticIssues: automaticIssues(call.summary),
  };
}
