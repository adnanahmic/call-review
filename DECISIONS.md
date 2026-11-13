# Decisions

## The idea

A reviewer needs to know whether a summary matches its call. The app splits the summary into claims, checks each against the transcript, and links every finding to the line it's based on. The reviewer makes the final call.

## Assumptions

- The 20 supplied calls are the whole dataset.
- Decisions are saved in the browser, because the brief ruled out a database and logins.
- The AI only runs when you click, so you don't pay for calls nobody opens.
- The API takes only a call ID, so nobody can send it their own text.

## Key decisions

- **Don't trust AI quotes.** Every quote is checked against the real transcript, and fake ones are dropped. A verdict left with no proof becomes "uncertain". Any sentence the AI skipped is shown as "not assessed".
- **Some checks don't need AI.** Plain code catches stated amounts, banned phrases, US spellings and phone numbers. These checks still work when the AI fails.
- **Ignore hold-music noise.** Rule 8 says to ignore garbled text recorded during holds. Those lines are greyed out, and the AI is told to skip them.
- **Cap the cost.** Results are cached for everyone, and there's a limit of 10 reviews a minute per person.
- **README over CLAUDE.md.** The task asked for more in the README than CLAUDE.md did, so I followed the task.

## How the UI helps

- The summary and findings are on the left, the transcript on the right, with problems listed first.
- Click a turn number to jump to that line.
- Every verdict has an icon and a word, never just a colour.
- "Definite" and "possible" are kept apart.
- If the AI fails, you can still review the call by hand.

## How AI was used

- **In the app:** one Claude call per review (Sonnet 5.5 by default). It returns JSON, which the code re-checks. A review takes 7–15 seconds.
- **To check the app:** I wrote my own answer key for all 20 calls. The AI found all 21 known errors and flagged nothing wrong on the 5 accurate summaries, in two runs out of two.
- **To build it:** Claude Code wrote the app. It hit a few snags, such as a broken Next.js type and a wrong Vercel setting, and each is fixed in its own commit.

## Where the AI got things wrong

- It reported the same problem up to three times. Fixed by asking for each problem once and merging duplicates in code.
- It sometimes cites a nearby line rather than the best one.
- On vague claims like "checked understanding", its answer can change between runs.

## What we cut

Uploading calls, a dashboard, server-side storage, highlighting inside the summary, and dark mode.

## Limitations

- The answer key is my own reading of the rules. I'd also already seen the AI's output for 4 of the calls before labelling them.
- Extra, unnecessary findings on calls with errors aren't measured yet.
- A quote can be real but used for the wrong point.
- There's no login, and decisions stay in one browser.
