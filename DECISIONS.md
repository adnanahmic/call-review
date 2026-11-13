# Decisions

## The task as understood

A QA reviewer needs to decide, per call, whether a generated summary accurately reflects its transcript **and** follows the summary-generation rules. The tool should surface contradictions, unsupported claims, required omissions and rule breaches, all tied to transcript turn IDs. It should keep "definitely wrong" separate from "not sure". The reviewer, not the AI, makes the final call.

## Assumptions

- **The dataset is fixed.** The 20 supplied synthetic calls are the input. There is no upload or paste box yet (see Future work).
- **The reviewer decides; the AI suggests.** The overall banner reads "AI assessment: …" and the decision form is separate.
- **Decisions live in the reviewer's browser (localStorage).** CLAUDE.md rules out databases and auth. This is enough for a single reviewer, and it's shown in the UI when storage is unavailable.
- **The AI review is triggered by a click, not on page load.** This avoids billing for calls nobody opens. Results are cached per call in the browser session and per server instance.
- **The transcript and summary always come from server-side data.** The API takes only a `callId`, so a client can't make the server review arbitrary text.
- **No conflicts between the task pack and CLAUDE.md.** The pack says it "does not prescribe implementation choices". Where the pack is more specific (the DPA exception, keeping named advice bodies, using the call date for relative dates), it is built into the prompt.

## What we prioritised

1. **Traceability over volume.** Every AI citation is re-checked in code (`src/lib/review.ts`):
   - The turn ID must exist (`T5`, `T05` and `CALL-x T05` are normalised).
   - The quote must actually appear in that turn (ignoring case and punctuation; ellipses allowed).
   - Fabricated citations are discarded, and the item says so.
   - A "supported" or "contradicted" verdict with no surviving evidence is downgraded to **uncertain**, and the original verdict is kept for transparency.
   - Omissions with no surviving evidence drop to **possible**.
   - Claim or breach text that isn't in the summary is flagged.
2. **Coverage.** Any summary sentence the AI didn't assess is added as an _uncertain, not assessed_ claim. Nothing in the summary is silently unchecked.
3. **Deterministic checks.** These rules are checked by plain code (`src/lib/rules.ts`), always run, and are shown even if the AI fails:
   - arrears or balance amounts
   - payment-taken amounts
   - "N/A" or "not discussed"
   - bare "further action"
   - bullets and the 2–5 sentence count
   - phone numbers
   - American spellings

   When the AI reports the same rule, the two are merged into one item marked "Confirmed by an automatic rule check".

4. **Hold artefacts (rule 8).** Turns inside a "hold music begins/ends" block, and "Unclear speaker" inserts, are flagged by the parser. They are shown greyed with a label and marked `[LIKELY ARTEFACT]` in the prompt. Evidence that cites them gets a warning.
5. **Empty transcript.** No model call is made. The rules require "Incomplete call.", so anything else is a definite breach.

## How the UI supports the reviewer

- **Side-by-side layout.** The summary and findings are on the left; the full transcript, with turn IDs and timestamps, is on the right.
- **Problems first.** Claims are sorted contradicted → unsupported → uncertain → supported.
- **Evidence chips.** Each chip shows the turn ID and the exact quote. Clicking it scrolls to the turn, highlights it and moves focus there. Cited turns are marked in the transcript.
- **Separate uncertainty signals.** These are kept apart:
  - claim verdicts (Supported / Contradicted / Not in transcript / Uncertain)
  - issue certainty (Definite / Possible)
  - ⚠ flags for anything the validator changed or couldn't verify
- **Not colour alone.** Every status has an icon and a text label.
- **Explicit states.** Loading (with an expected duration), empty ("No AI review yet"), and error (with the reason, a retry button, and the automatic checks still shown).
- **Accessibility.** Semantic landmarks and headings, a labelled radio group and textarea, `role=status`/`alert` live regions, and visible focus rings.

## How AI was used, and where it was wrong

**In the product.** One server-side call per review through `@anthropic-ai/sdk`:

- The model comes from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
- It uses structured outputs (JSON schema from Zod) at effort `medium`, which took about 12–15 s per call in testing.
- Server-side refusal fallbacks are on (`fallbacks: "default"`).
- The output is still treated as untrusted: it is re-parsed with Zod and every citation is re-verified.
- Refusal, truncation (`max_tokens`), timeout, auth and rate-limit failures each map to a clear error.

**Observed model behaviour:**

- On CALL-003 it correctly caught three problems:
  - "Consent gained to record vulnerability" contradicts T10, where the customer refused.
  - The "no money for food" hardship (T08) was omitted.
  - The £460 arrears amount was stated.
- **Where it was wrong or noisy:**
  - It reported the consent problem three times (as a contradicted claim, an omission and a rule breach), which inflates the counts. The merge only removes duplicates between automatic and AI items, not between AI items.
  - It sometimes cites a nearby confirming turn rather than the most direct one (e.g. T23 for "checked understanding").
  - Verdicts on subjective items, such as "checked understanding", vary between runs.

**In building it** (Claude Code):

- The create-next-app scaffold (Next 16) used a generated `LayoutProps` type that fails `tsc` before a build, so I replaced it.
- The pre-existing Vercel project was set to a static preset and failed the first deploy with an "empty public directory" error. I pinned `framework: nextjs` in `vercel.json`.
- A first component test failed because two `role=status` regions existed. I fixed the test's queries rather than weakening the test.

## What we cut

- Upload or paste of new transcript–summary pairs.
- Batch "review all 20" and a dashboard.
- Server-side persistence of decisions, multi-reviewer support and audit trail.
- Inline highlighting of claim fragments inside the summary text.
- Dark mode.
- Measuring accuracy against a labelled answer key (none was supplied).

## Known limitations

- **No accuracy measurement.** Accuracy is unmeasured beyond manual spot checks of a few calls. A labelled eval set is the first thing to add.
- **Verdicts vary between runs.** Model verdicts can change between runs, and the in-memory server cache is per instance and short-lived.
- **Quote matching is lenient.** It is substring-based after normalisation, so a short, generic quote ("Yes") can "verify" against the wrong turn.
- **Heuristic splitting.** Sentence splitting and the coverage check are heuristics; an odd summary might be split badly.
- **Regex checks aren't exhaustive.** The automatic checks are deliberately conservative. Names and private entities are left to the AI.
- **Decisions are per browser.** They don't travel between devices or reviewers.

## Future work

- A labelled eval set from these 20 calls, then prompt iteration measured against it.
- Deduplicating AI findings that describe the same underlying problem.
- Paste or upload of new pairs, with the same validation pipeline.
- Export of decisions (CSV/JSON) and server-side storage once auth exists.
- Highlighting each claim's fragment in the summary text and linking it both ways.
- Requiring a minimum quote length, or several quotes, for "supported" verdicts.
