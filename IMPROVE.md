# IMPROVE.md: the improvement loop's memory

## The game
Duck Duck BOOM! is a daily cannon-launch duck show for team calls. Everyone who booked a meeting gets a seeded duck;
Ol' Thunderbill fires the whole flock at once (the salvo) and the farthest duck wins the Golden Loaf. The host presses
one big red button (Space); the audience watches on a screen share. **Outcomes are pure, fair luck by design**: no
player input changes a distance. So "skill" here is the host's: a calm host and a key-mashing one must get the same
results and both reach the crowning.

Core loop: title → roster (tick today's people) → reveal (cards, rerolls) → salvo (load, fuse, ~30 s flight with
Bill's commentary) → results (awards, highlights, podium) → DONE.

- **Play:** open `index.html` in Chrome or Edge (`?debug` for the debug panel, `?classic` for one-by-one mode).
- **Evaluate:** `node eval/run.js` (train seeds, ~2 min), `node eval/run.js --set holdout`, `node eval/run.js --quick`,
  `node eval/play.js` (scripted playthroughs, ~2 min). `DDB_GAME=path/to/copy.html` evaluates a candidate copy.
  In the browser console, `DDB.selfTest()` and `DDB.balance(10000)` are the game's own tests.
- The evaluator injects `eval/bot.js`, which replaces `requestAnimationFrame` and steps the real game code at 60 Hz on
  a virtual clock (no wall-clock time), with `S.dbg.day` / `S.dbg.seed` seeding every race.

## Constraints (never break)
- Saved data: `localStorage` keys `ddb.v1.*` (roster, settings, history, current show, Waddle of Fame, rosettes).
  Never call `localStorage.clear()`. Old best scores / pond records must stay comparable: **no change to the flight
  sim or distances** without a decision from the owner.
- Fairness: every random number seeded; launch order, looks, team, mashing, skipping, replay never change a distance.
- Controls: Space = big button; R, S, T, M, N, F, P as documented in the README. Esc stays the browser's.
- Platform: one self-contained `index.html`, no dependencies, no network, works offline in Chrome/Edge, older-browser
  syntax (the self test checks this).
- Identity: Bill Featherstone's commentary roasts the duck, never the player; every line passes the content blocklist.

## Scorecard
Measured by `node eval/run.js` (80 twelve-duck salvo shows on train seeds; 12 thirty-duck and 12 five-duck shows;
1,500 sim-only races for fairness; one rendered 40-duck show). Held-out: `--set holdout` (60 shows, 2027 dates).

| # | Check | Kind | Target | Baseline (train) |
|---|---|---|---|---|
| 1 | Readability: Bill's lines about a duck that also say whose duck it is (strict: player name in the line or on the caption bar) | experience | ≥ 0.90 | 0.01 (n30 0.01) |
| 2 | Everyone's moment: share of ducks the show points at during the flight (call-out or Bill naming it), mean / p10 | experience | ≥ 0.93 / ≥ 0.83 | 0.87 / 0.75 (n30 0.85 / 0.67) |
| 3 | Tension: when the winner takes the lead for good (fraction of flight, p50); lead changes; close finishes (<10%) | experience (measurement only) | no worse | 0.59; 3.3; 0.30 |
| 4 | Pacing: flight length p50 / p90 (12 ducks) | experience | p90 ≤ 38 s | 31.2 / 37.2 s |
| 5 | Commentary: longest silence p90; repeated lines; captions cut off | experience | ≤ 6 s; 0; 0 | 5.5 s; 0; 0 |
| 6 | Fairness: win share by roster slot (chi² p), max share | fairness | p > 0.01, ≤ 1.3× | p 0.75, 1.1× |
| 7 | Frame time: mean draw ms per frame, 40-duck flight (headless software rendering; compare same machine only) | responsiveness | no worse than +10% | 19 ms |
| 8 | Robustness: page errors; `eval/play.js` playthroughs; `DDB.selfTest()` | robustness | 0; all pass; pass | 0; 16/16; pass |

Not measurable by bots (checks for a human): how the show looks and sounds, whether commentary is funny, whether a
change feels better on a real screen share.

## Backlog
(see Log for what was tried)

## Alternatives

## Strategy
| Kind of change | Tried | Kept | Notes |
|---|---|---|---|

## Playbook (provisional until confirmed by a second session)
- Never edit `index.html` while an evaluator run is going: each run reads it at start. Build candidates in copies and
  evaluate with `DDB_GAME=`.
- Headless Chromium batches canvas work: single-frame draw times are meaningless (3 ms or 140 ms); use the mean.
- The title only offers RESUME for *today's* show: playthroughs fix the browser clock (`openGame({ date })`), or the
  resume check passes vacuously by starting a fresh race with the same seed.

## Log

### Session 1 (2026-11-25): evaluator built, round 1
Built `eval/` (bot, scorecard, playthroughs). Baseline: train and holdout above; two train runs identical except
timings; seed-set noise (train vs holdout) ≈ 0.03 on "everyone", ≈ 0.10 on close finishes, ≈ 3 s on flight p90.
Evaluator bugs found and fixed before trusting it: the bot ran `update()` while paused (pause check failed falsely);
the resume playthrough passed vacuously (fixed clock); "Player 1" matched inside "Player 12" (whole-name match).

Round 1 (predictions written before building):
- **A: name chip on Bill's caption bar** (the speaker's line names a duck → that player's team-coloured name tag, with
  the duck's portrait, sits on the bar's top edge). Predicted readability 0.01 → ≥ 0.9. Measured 1.00 (n12 and n30),
  every other check identical. 
- **A′: player's name written into the line** ("Whiteboard (Cyrus) bounced right back!"). Also 1.00, no caption cut
  off. Tie on the numbers; A chosen because it keeps the authored lines (and the optional spoken voice) unchanged and
  matches the tag colour in the sky at a glance. A′ goes to Alternatives.
- **B: Bill's spare-time filler alternates with a roll call for ducks nobody has mentioned.** Predicted everyone
  0.87 → ≥ 0.92. Measured 0.88 (n30 unchanged). **Rejected.** Root cause: Bill's airtime is saturated: the filler
  fired 6 times in 12 shows and about half of all event lines were blocked because Bill was already talking.
- **D: ink on team colours picked by contrast** (dark ink on orange, sky blue, pink, green, yellow; white on blue and
  purple). Predicted worst contrast 2.25 → ≥ 3.0. 

## Decisions for me
