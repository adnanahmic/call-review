# Call Summary QA Review

**Live:** https://call-review-gold.vercel.app

A small tool that helps a QA reviewer decide whether a collections-call summary accurately reflects its transcript.
The AI splits each summary into claims and marks each one supported, contradicted, unsupported or uncertain, citing transcript turn IDs that are checked against the real transcript. It also flags required omissions and breaches of the summary rules.
The reviewer then follows the evidence links and records a decision (accurate / needs correction / escalate).

All 20 calls are synthetic (supplied in `instructions/`). See [`DECISIONS.md`](DECISIONS.md) for the reasoning, trade-offs and known limitations.

## Setup

Requires Node 22 and pnpm 9+.

```bash
pnpm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
```

| Variable            | Required | Default             |
| ------------------- | -------- | ------------------- |
| `ANTHROPIC_API_KEY` | yes (AI) | none                |
| `ANTHROPIC_MODEL`   | no       | `claude-sonnet-5-5` |

Without a key, the app still runs: automatic rule checks work and the AI panel shows a clear "not configured" error.

## Run

```bash
pnpm dev        # http://localhost:3000
pnpm build && pnpm start
```

## Test

```bash
pnpm test       # unit + component tests (Vitest; every LLM call is mocked)
pnpm test:e2e   # Playwright happy path (starts `pnpm dev`; makes ONE real AI call)
E2E_BASE_URL=https://call-review-gold.vercel.app pnpm test:e2e   # against prod
pnpm verify     # format:check, lint, typecheck, test, build (run before every push)
```

## Deploy

```bash
vercel link --yes
vercel env add ANTHROPIC_API_KEY production
vercel --prod
vercel logs <deployment-url>   # look for "[review]" lines
```

## Layout

```
src/app/            page (server) + /api/review route (server-only LLM call)
src/components/     thin client components (workspace, transcript, findings, decision form)
src/lib/            pure, tested logic: transcript parsing, rule checks, evidence validation, prompt
src/types/          shared types + Zod schemas for every boundary
src/data/           supplied synthetic dataset; fixtures/ holds synthetic test data
```
