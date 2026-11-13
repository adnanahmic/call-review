# Call Summary QA Review

**Live:** https://call-review-gold.vercel.app

This tool checks whether a call summary matches what was actually said. The AI goes through the summary claim by claim and points to the transcript lines behind each finding. You check the evidence and make the decision. All 20 calls are made up for this exercise.

## Run it

You'll need Node 22 and pnpm 9+.

```bash
pnpm install
cp .env.example .env.local   # then add your Anthropic API key
pnpm dev                     # open http://localhost:3000
```

Without a key the app still runs, but only the basic rule checks work.

## Check it

Open **CALL-003** and click **Run AI review**. It should flag three problems:

- consent is claimed, but the customer refused it (T10)
- the "no money for food" hardship is left out (T08)
- the arrears amount is stated, which the rules don't allow

Click a turn number to jump to that line. Save a decision and refresh; it should still be there. **CALL-005** is an accurate summary, so nothing serious should be flagged there.

Automated checks:

```bash
pnpm verify     # lint, types, 91 tests, build
pnpm test:e2e   # clicks through the app in a browser
pnpm eval       # scores the AI against my answers (20 real API calls)
```

## What I focused on

- **Evidence you can trust.** Every quote the AI gives is checked against the transcript. Fake quotes are thrown out, and verdicts left with no proof are marked "uncertain".
- **Clear vs unsure.** Each finding says whether it's a definite error or just worth a look, so you know where to spend your time.
- **A working live app first.** The core flow is deployed and handles loading, empty and error states. Extras came second.
- **Measuring accuracy.** I wrote my own answer key for all 20 calls and test the AI against it.

## Assumptions

- The 20 calls provided are the whole dataset.
- The AI suggests; the reviewer decides.
- Decisions are saved in your browser, since the brief ruled out a database and logins.
- Where the task pack gives a specific rule, such as the DPA wording, it wins over the general rules.

## What I checked

- All 91 automated tests pass, including tricky cases like empty transcripts and broken AI output.
- The AI caught **all 21 known errors** across 15 calls, and flagged nothing wrong on the 5 accurate summaries. It did this on two separate runs; details are in `eval/last-run.md`.
- The live site works end to end and its logs show no errors.
- No API keys are in the repo or its history.

## Limitations

- The answer key is my own reading of the rules.
- There's no login, but caching and a limit of 10 reviews a minute keep costs down.
- The AI can quote a real line for the wrong reason.
- Decisions don't move between browsers or reviewers.

## Next steps

1. Get a second reviewer to check the answer key.
2. Let reviewers paste in their own calls.
3. Export decisions and store them on a server.

More detail is in [`DECISIONS.md`](DECISIONS.md).
