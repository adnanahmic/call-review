# Call Summary QA Review

**Live:** https://call-review-gold.vercel.app

Helps a QA reviewer decide whether a collections-call summary matches its transcript and follows the summary rules.
The AI checks each claim in the summary, flags omissions and rule breaches, and cites the transcript turns behind every finding.
The reviewer follows the evidence and records a decision. All 20 calls are synthetic (`instructions/`).

## Run it

Requires Node 22 and pnpm 9+.

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (ANTHROPIC_MODEL optional, default claude-sonnet-5-5)
pnpm dev                     # http://localhost:3000
```

Without a key, the app still runs: the automatic rule checks work and the AI panel shows a clear error.

## Check it

```bash
pnpm verify      # format, lint, typecheck, 91 unit/component tests (AI mocked), build
pnpm test:e2e    # Playwright happy path; add E2E_BASE_URL=<url> to run against prod
pnpm eval        # accuracy against my labels for all 20 calls (20 real AI calls)
```

To check it by hand, open **CALL-003** and click **Run AI review**. You should see the consent claim marked Contradicted (citing T10), the "no money for food" omission (T08), and the £460 arrears breach. Click a turn chip to jump to it, then save a decision and reload to see it persist. **CALL-005** is an accurate summary and should get no definite findings.

## What I prioritised and why

1. **Evidence the reviewer can trust.** Every AI citation is re-checked against the real transcript turn. Fabricated or ambiguous quotes are thrown out, and verdicts left without evidence are downgraded to "uncertain". A reviewer can only rely on findings they can verify.
2. **Separating "definitely wrong" from "not sure".** Claims are marked supported, contradicted, not in transcript, or uncertain, and issues are definite or possible. The task asked for this, and it decides where the reviewer spends time.
3. **A deployed core flow before extras.** Review, evidence, decision, and loading/empty/error states all work in production. There's no upload, dashboard or login.
4. **Measuring accuracy rather than assuming it.** I wrote my own answer key for all 20 calls and built an eval against it.

## Material assumptions

- The 20 supplied calls are the whole dataset; there's no upload of new pairs.
- The AI suggests and the reviewer decides. Decisions are saved in the reviewer's browser, since there's no database or login.
- The API accepts only a call ID; the transcript and summary always come from the server.
- Where the task pack is specific, it overrides the general rules: the DPA "no DPA stated with agent" exception, keeping named advice bodies, and using the call date for relative dates.

## What I checked

- **Automated tests:** `pnpm verify` passes, including tests for an empty transcript, malformed AI output, made-up quotes, contradicted numbers and dates, timeouts and the decision flow.
- **Accuracy:** I labelled all 20 calls by hand: 5 accurate summaries and 21 known errors across the other 15. On two runs, `pnpm eval` found **21/21** errors and raised **no false alarms** on the 5 accurate calls. The report in `eval/last-run.md` shows which finding matched each label.
- **Production:** the Playwright test passes against the live URL. Repeat reviews are served from the cache in under 1 s, the API returns the right error codes, and `vercel logs` shows no errors.
- **Secrets:** no credentials in the repo or its history; only `.env.example` is committed.

## Known limitations

- **The labels are mine.** They're one reviewer's reading of the rules. The eval doesn't yet score wrong _extra_ findings on calls that do have errors.
- **The API is public.** A shared cache and a per-IP rate limit (10 a minute) cap spend at about one model call per call per deploy, but there's no login.
- **Quote checking is still text matching.** A real quote can be cited for the wrong point.
- **Simple rule checks.** The plain-code checks are regexes and sentence splitting is a heuristic. Names and company names are left to the AI.
- **One browser only.** Decisions don't move between browsers or reviewers.

## What I'd tackle next

1. List the AI's extra findings on calls with errors, and have a second reviewer check my labels.
2. Let reviewers paste in a new transcript–summary pair, run through the same checks.
3. Export decisions, and store them on a server once there's a login.
4. Highlight each claim inside the summary text, linked both ways to its findings.

More detail on the reasoning, and on where the AI got things wrong, is in [`DECISIONS.md`](DECISIONS.md).
