# Call Summary QA Review

We're building a tool that helps a QA reviewer decide whether a call summary
accurately reflects its transcript. We have **90 minutes, deploy included**. A
small app that works in production beats a big one that doesn't. The work is
judged on judgement, priorities and how we use AI, so record decisions in
`DECISIONS.md` as we go.

If the task description conflicts with this file, the task wins. Point the
conflict out when it happens.

## Before you start

Check these and stop if any of them fails. Don't work around a failure.

- `node -v` → v22.x · `pnpm -v` → 9+
- `gh auth status` → account `adnanahmic`
- `vercel whoami` → `adnanahmic203-3694`
- `git config user.email` → my personal address, set repo-local. It must never
  be the global work identity. Ask me if it's unset.
- Push over HTTPS via `gh`. My default SSH key belongs to a different GitHub
  account.

## How we work

- Read the whole task first. Restate it in 2–3 lines, list your assumptions,
  and only ask questions that actually block you. For anything else, pick a
  sensible default and write it down.
- Build in thin vertical slices: core review flow → evidence → polish. Commit
  after each one that works.
- Rough time budget: 0–10 min scaffold and **deploy the empty app**, 10–60
  features and tests, 60–75 edge cases and docs, 75–90 final deploy and smoke
  test.
- Never say something works unless you ran it. Report failures honestly.
- No scope creep: no auth, databases or extra pages. List ideas under "Future
  work".
- Don't invent data. Any fixtures you add go in `src/data/fixtures/`, labelled
  synthetic.

## Stack

Next.js (App Router) + strict TypeScript + Tailwind, Vitest + Testing Library,
Zod at every boundary, and optionally Playwright. If we use an LLM, call it
from server code only through `@anthropic-ai/sdk`, with the model set by
`ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). If you change the stack, say
why in `DECISIONS.md`.

`create-next-app` won't scaffold into a folder with existing files, so
scaffold into a temp folder and move the files in.

## Code

- Logic lives in `src/lib/` as pure, typed functions. Components stay thin.
  Shared types go in `src/types/`.
- No `any` and no `@ts-ignore`.
- **Treat LLM output as untrusted.** Ask for JSON, validate it with Zod, and
  show a clear error state on failure or timeout. Every verdict must point to
  transcript evidence the UI can show, or be flagged as unsupported.
- Every async view needs loading, empty and error states.
- Accessibility: use semantic HTML and labelled controls, keep focus visible,
  and never use colour as the only signal for a verdict.
- Secrets go in `.env.local` and Vercel only. Commit an `.env.example`.

## Tests

Write them alongside the code.

- **Unit:** everything in `src/lib/`, including an empty transcript, claims
  missing from the transcript, contradicted numbers/names/dates/outcomes, and
  malformed LLM JSON.
- **Component:** the review view renders a pair, shows verdicts, and records
  the reviewer's decision.
- Mock every LLM call so tests never touch the network.
- **E2E:** one Playwright happy path if time allows.

`package.json` must have `dev`, `build`, `start`, `lint` (`eslint .`),
`typecheck` (`tsc --noEmit`), `format`, `format:check`, `test` (`vitest run`),
`test:e2e`, and:

```
"verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
```

## Ship

Before every push, `pnpm verify` must pass. Never skip or disable a test to
get it green. Use small Conventional Commits (`feat:`, `fix:`, `test:`…).

First deploy:

```bash
gh repo create adnanahmic/call-review --public --source=. --push
vercel link --yes
vercel env add ANTHROPIC_API_KEY production   # only if we use an LLM
vercel --prod
```

After each deploy, click through the review flow on the prod URL, check
`vercel logs`, and keep the URL at the top of the README.

## Docs

- **README:** live URL, a 3-line description, and setup/run/test/deploy steps.
- **DECISIONS.md:** assumptions, what we prioritised and what we cut, how the
  UI supports the reviewer (evidence, confidence, uncertainty), how AI was
  used and where it was wrong, and known limitations.

## Done when

The core flow works in production, `pnpm verify` passes, every claim is traced
to evidence or flagged, the repo holds no secrets, the docs are complete, and
everything is pushed to `github.com/adnanahmic/call-review`.
