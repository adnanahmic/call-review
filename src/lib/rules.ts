import type { Certainty } from "@/types/review";
import { splitSentences } from "./summary";

/**
 * Deterministic checks for summary-rule breaches that don't need the
 * transcript or a model. They are cheap, explainable and always run, so the
 * reviewer still gets value when the AI review fails.
 */
export interface AutomaticFinding {
  rule: string;
  description: string;
  summaryText: string;
  certainty: Certainty;
}

/** Step 1 outputs are allowed to be a single short sentence. */
const SHORT_FORM_OUTPUTS =
  /^(incomplete call\.|voicemail reached - no message left\.|voicemail left\b)/i;

const US_SPELLINGS: Array<[RegExp, string]> = [
  [/\bauthoriz(e|ed|es|ing|ation)\b/i, "authorise"],
  [/\borganiz(e|ed|es|ing|ation)\b/i, "organise"],
  [/\brecogniz(e|ed|es|ing)\b/i, "recognise"],
  [/\bapologiz(e|ed|es|ing)\b/i, "apologise"],
  [/\brealiz(e|ed|es|ing)\b/i, "realise"],
  [/\bprioritiz(e|ed|es|ing)\b/i, "prioritise"],
  [/\bcenters?\b/i, "centre"],
  [/\bprograms?\b/i, "programme"],
  [/\bbehaviors?\b/i, "behaviour"],
  [/\bfavor(s|ed|able)?\b/i, "favour"],
  [/\b(canceled|canceling)\b/i, "cancelled / cancelling"],
  [/\b(counseling|counselors?)\b/i, "counselling / counsellor"],
  [/\bdefense\b/i, "defence"],
];

function findSentence(sentences: string[], re: RegExp): string {
  return sentences.find((s) => re.test(s)) ?? "";
}

export function checkSummaryRules(summary: string): AutomaticFinding[] {
  const findings: AutomaticFinding[] = [];
  const text = summary.trim();
  if (!text) {
    findings.push({
      rule: "Step 1 / Output",
      description: "The summary is empty.",
      summaryText: "",
      certainty: "definite",
    });
    return findings;
  }
  const sentences = splitSentences(text);

  const arrearsAmount =
    /\b(arrears|balance|outstanding)\b[^.;]{0,40}£\s?\d|£\s?\d[\d,.]*[^.;]{0,25}\b(arrears|balance)\b/i;
  if (arrearsAmount.test(text)) {
    findings.push({
      rule: "Arrears/Balances",
      description:
        'States a specific arrears or balance amount. The rules require only "arrears were discussed" or "customer informed of balance".',
      summaryText: findSentence(sentences, arrearsAmount),
      certainty: "definite",
    });
  }

  const paymentAmount =
    /£\s?\d[\d,.]*\s+(payment\s+)?(was\s+)?(made|taken|paid)\b(?![^.]*\b(on|by|next|from)\b)|payment of £\s?\d[\d,.]*\s+(was\s+)?(made|taken)/i;
  if (paymentAmount.test(text)) {
    findings.push({
      rule: "Immediate Payments",
      description:
        'Appears to state the amount of a payment taken during the call; the rules require only "Payment made".',
      summaryText: findSentence(sentences, paymentAmount),
      certainty: "possible",
    });
  }

  const placeholder = /\b(not discussed|n\/a|not completed|not applicable)\b/i;
  if (placeholder.test(text)) {
    findings.push({
      rule: "Critical Omission Rule",
      description:
        'Uses a placeholder such as "not discussed" or "N/A"; undiscussed categories must be omitted entirely.',
      summaryText: findSentence(sentences, placeholder),
      certainty: "definite",
    });
  }

  const furtherAction = /further action/gi;
  const riskOf = /risk of further action/gi;
  const bareFurtherAction =
    (text.match(furtherAction)?.length ?? 0) >
    (text.match(riskOf)?.length ?? 0);
  if (bareFurtherAction) {
    findings.push({
      rule: "Terminology",
      description:
        'Uses "further action" outside the required phrase "risk of further action" (next steps must not be described as further action).',
      summaryText: findSentence(sentences, /further action/i),
      certainty: "definite",
    });
  }

  if (/^\s*([-*•]|\d+[.)])\s+/m.test(summary)) {
    findings.push({
      rule: "Tone & Format",
      description:
        "Uses bullet points or a list; complete sentences are required.",
      summaryText: "",
      certainty: "definite",
    });
  }

  if (
    !SHORT_FORM_OUTPUTS.test(text) &&
    (sentences.length < 2 || sentences.length > 5)
  ) {
    findings.push({
      rule: "Tone & Format",
      description: `Summary has ${sentences.length} sentence${sentences.length === 1 ? "" : "s"}; the rules ask for 2–5.`,
      summaryText: "",
      certainty: "possible",
    });
  }

  const phone = /(\+44\s?\d|\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b)/;
  if (phone.test(text)) {
    findings.push({
      rule: "Anonymity",
      description: "Appears to contain a telephone number.",
      summaryText: findSentence(sentences, phone),
      certainty: "possible",
    });
  }

  for (const [re, uk] of US_SPELLINGS) {
    const m = re.exec(text);
    if (m) {
      findings.push({
        rule: "Language",
        description: `American spelling "${m[0]}"; British English requires "${uk}".`,
        summaryText: findSentence(sentences, re),
        certainty: "definite",
      });
    }
  }

  return findings;
}
