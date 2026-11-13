# Call Summary QA Review

**Try it live:** https://call-review-gold.vercel.app

When a call is summarised, someone has to check that the summary actually matches what was said. This tool helps with that. It reads the summary claim by claim, compares each claim with the transcript, and points to the exact lines it's basing its view on. You look at the evidence and make the call.

All 20 calls are made up for this exercise. You'll find them in `instructions/`.

## Running it on your machine

You'll need Node 22 and pnpm 9 or newer.

```bash
pnpm install
cp .env.example .env.local
```

Open `.env.local` and paste in your Anthropic API key. Then start the app:

```bash
pnpm dev
```

Go to http://localhost:3000 and you're in.

No API key? The app still opens and the basic rule checks still work. You just won't get the AI review, and the app tells you why.

## Checking that it works

The quickest way is to try it yourself:

1. Open **CALL-003** and click **Run AI review**. It takes about 10 seconds.
2. You should see it catch three problems:
   - The summary says consent was given, but the customer refused (turn T10).
   - It leaves out that the customer had no money for food (T08).
   - It states the arrears amount (£460), which the rules don't allow.
3. Click any turn number, like **T10**. The transcript jumps to that line.
4. Pick a decision, save it, and refresh the page. Your decision should still be there.
5. Now open **CALL-005**. That summary is accurate, so nothing serious should be flagged.

If you'd rather run the automated checks:

```bash
pnpm verify     # formatting, linting, type checks, 91 tests and a build
pnpm test:e2e   # clicks through the app in a real browser
pnpm eval       # measures the AI against my own answers for all 20 calls
```

`pnpm eval` uses your API key and makes 20 real calls, so it costs a little.

## What I focused on, and why

**Making the evidence trustworthy.** AI can sound confident while quoting things that were never said. So I don't take its word for it: every quote it gives is checked against the real transcript, and anything that doesn't match is thrown out. If that leaves a verdict with nothing to back it up, the verdict is marked "uncertain".

**Telling "definitely wrong" apart from "not sure".** A reviewer's time is limited. Every finding says whether it's a clear error or something worth a second look, so you know where to spend that time.

**Getting the basics working live first.** The core flow is deployed and works properly: run a review, check the evidence, record a decision. It also behaves sensibly when things are loading, empty or broken. Nice-to-haves like uploads or a dashboard waited.

**Actually measuring how good it is.** Saying "the AI seems accurate" isn't enough. I went through all 20 calls myself, wrote down what a correct review should find, and built a test that compares the AI against that.

## Assumptions I made

- The 20 calls provided are all there is. You can't upload your own yet.
- The AI only makes suggestions. The reviewer always has the final say.
- Decisions are saved in your browser, not on a server. That fits a single reviewer, and the brief ruled out databases and logins.
- The app only accepts a call ID, never raw text, so nobody can use it to run their own text through the AI.
- Where the task pack gives a specific instruction, I followed it over the general rules. For example, the DPA wording, keeping named advice charities, and working out "Friday" from the call date.

## What I checked

- **Tests:** all 91 automated tests pass. They cover awkward cases too, like an empty transcript, broken AI output, made-up quotes, wrong numbers and dates, and timeouts.
- **Accuracy:** I hand-checked all 20 calls. Five summaries are accurate; the other 15 contain 21 real errors between them. The AI caught **all 21**, and didn't wrongly flag any of the five accurate ones. I ran it twice with the same result. The full breakdown is in `eval/last-run.md`.
- **The live site:** the browser test passes against the real URL, the logs show no errors, and repeat reviews come back in under a second.
- **Secrets:** no API keys anywhere in the code or its history. Only the empty `.env.example` template is included.

## What it doesn't do well yet

- **The answer key is mine.** It's one person's reading of the rules, and someone else might disagree on a call or two. I also haven't yet measured whether the AI raises extra, unnecessary points on calls that do have real errors.
- **No login.** Anyone with the link can use it. Costs are kept in check because results are cached and there's a limit of 10 reviews a minute per person.
- **The AI can quote the right line for the wrong reason.** The quote checking confirms the words are really there, but not that they prove the point.
- **The simple checks are simple.** Spotting things like American spellings or stated amounts uses basic pattern matching. Anything subtler, like a company name that should have been hidden, is left to the AI.
- **Decisions stay in one browser.** They don't follow you to another computer or another reviewer.

## What I'd do next

1. Ask a second reviewer to check my answer key, and start tracking unnecessary findings too.
2. Let reviewers paste in their own call and summary.
3. Let decisions be exported, and save them properly once there's a login.
4. Highlight each claim right inside the summary text, so it's easier to see what's being judged.

For the longer story, including where the AI got things wrong along the way, see [`DECISIONS.md`](DECISIONS.md).
