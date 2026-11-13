# Call Summary QA Review

**Live:** https://call-review-gold.vercel.app

Helps a QA reviewer check whether a call summary matches its transcript.
The AI checks each claim in the summary and points to the transcript lines behind its answer.
The reviewer looks at the evidence and records a decision.

All 20 calls are synthetic. The reasoning and trade-offs are in [`DECISIONS.md`](DECISIONS.md).

## Setup

Requires Node 22 and pnpm 9+.

```bash
pnpm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
```

`ANTHROPIC_MODEL` is optional and defaults to `claude-sonnet-5-5`. Without a key the app still runs, but only the automatic rule checks work.

## Run, test, deploy

```bash
pnpm dev          # http://localhost:3000
pnpm test         # unit + component tests (AI mocked)
pnpm test:e2e     # one end-to-end run with a real AI call
pnpm verify       # everything; run before every push

vercel env add ANTHROPIC_API_KEY production
vercel --prod
```
