# Decisions

## What we built and why

A QA reviewer needs to know if a call summary matches its transcript and follows the summary rules. So the app breaks each summary into claims and checks each one against the transcript. Every finding points to the turn it came from, and the reviewer makes the final call.

## Assumptions

- The 20 supplied calls are the whole dataset. You can't upload your own pairs yet.
- Decisions are saved in the reviewer's browser. CLAUDE.md rules out a database or login, and one reviewer doesn't need either.
- The AI review only runs when the reviewer clicks the button. That way we don't pay for calls nobody opens.
- The API only accepts a call ID. The transcript and summary always come from the server, so nobody can send it their own text.

## What mattered most

**Don't trust the AI's citations.** The model often sounds right even when its quote isn't real. So the code checks every quote against the actual transcript turn and throws out any that don't match. If a "supported" or "contradicted" verdict loses all its evidence this way, it gets downgraded to "uncertain". Any summary sentence the AI skipped shows up as "not assessed", so nothing gets missed silently.

**Some checks don't need AI.** Plain code checks for stated arrears amounts, "N/A", American spellings, the word "further action", sentence count and phone numbers. These always show, even when the AI call fails.

**Hold-music noise is ignored.** Rule 8 says to ignore garbled text recorded during holds. Those turns are greyed out and labelled, and the AI is told not to use them.

## How the UI helps the reviewer

The summary and findings sit on the left, the transcript on the right. Problems come first. Click a turn ID and the transcript jumps to that line and highlights it. "Definite" and "possible" are kept apart, and any warning is spelled out in plain words. Every verdict has an icon and a label, never just a colour. Loading, empty and error states are all handled, and if the AI fails you can still review the call by hand.

## How AI was used, and where it got things wrong

The app makes one server-side call to Claude per review: Sonnet 5.5 by default, via `ANTHROPIC_MODEL`. It asks for JSON and still re-checks that JSON with Zod. A review takes about 7–15 seconds.

It does a good job on the obvious errors. On CALL-003 it caught consent being claimed when the customer refused (T10), the left-out "no money for food" (T08), and the arrears amount. On CALL-019 it spotted that the agent made the call, not the customer (T01).

Where it falls short:

- It reported the CALL-003 consent problem three separate times, which inflated the counts. Fixed: the prompt now asks for each problem once, and the code merges findings with the same rule on the same turn.
- It sometimes cites a nearby turn instead of the best one.
- On vague claims like "checked understanding", its answer changes between runs.

I used Claude Code to build it. It hit a few setup snags: a Next.js 16 type that broke `tsc`, a Vercel project set up for a static site, and a test that was too loose. Each one is fixed in its own commit.

## What we cut

Uploading new calls, "review all" or a dashboard, saving decisions on a server, highlighting claims inside the summary, and dark mode.

## Known limitations

- The review API is public. Reviews are cached across server instances, and there's a per-IP rate limit (10 a minute), so spend is roughly capped at one model call per call per deploy. There's still no login.
- Accuracy is only measured on a small sample. I hand-checked 6 of the 20 calls (`eval/labels.ts`). `pnpm eval` found all 7 known errors and raised no false alarms on the 2 clean calls, in two runs out of two. That's encouraging but far too small to trust on its own; the other 14 calls are unlabelled.
- Quote matching is stricter now (whole words; short quotes that also appear elsewhere are rejected), but it's still text matching, not understanding. A real quote can be cited for the wrong point.
- Sentence splitting and the regex checks are simple rules and can miss things. Names and company names are left to the AI.
- Decisions stay in one browser.

## Future work

- Label the remaining 14 calls and tune the prompt against the full set.
- Let reviewers paste in their own calls.
- Export decisions.
