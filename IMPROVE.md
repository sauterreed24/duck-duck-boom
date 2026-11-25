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
6 rendered twelve-duck shows; 1,500 sim-only races for fairness; one rendered 40-duck show; text contrast from
rendered frames with all 8 team swatches). Held-out: `--set holdout` (60 shows, 2027 dates). All numbers below are
measured, train seeds (held-out in brackets where it was run).

| # | Check | Kind | Target | Session 1 start | Now |
|---|---|---|---|---|---|
| 1 | Readability: Bill's lines about a duck that also say whose duck it is (player's name in the line or on the caption bar), n12 / n30 | experience | ≥ 0.90 | 0.01 / 0.01 | **1.00 / 1.00** (1.00) |
| 2 | Everyone's moment: share of ducks pointed at during the flight (call-out or Bill naming it). Fast pass counts call-outs issued; **"drawn" counts only call-outs that reached the screen** (the honest one) | experience | drawn mean ≥ 0.95, worst show ≥ 0.85 | issued 0.87, drawn 0.78 / worst 0.58 (drawn 0.89 / 0.75) | issued 1.00, **drawn 1.00 / 1.00** (0.99 / 0.92) |
| 3 | Tension: winner takes the lead for good at (fraction of flight, p50); lead changes; close finishes (< 10% margin); winning margin p50 | measurement only (balance is a decision for the owner) | no worse | 0.59; 3.3; 0.30; 523 ft | unchanged |
| 4 | Pacing: flight length p10 / p50 / p90, 12 ducks; reveal → fire with a prompt host | experience | p90 ≤ 38 s | 23.6 / 31.2 / 37.2 s; 15 s | unchanged |
| 5 | Commentary: longest silence p90; repeated lines; captions cut off | experience | ≤ 6 s; 0; 0 | 5.5 s; 0; 0 | unchanged |
| 6 | Fairness: win share by roster slot (chi² p), max share | fairness | p > 0.01, ≤ 1.3× | p 0.75, 1.1× | unchanged |
| 7 | Frame time: mean draw ms per frame, 40-duck flight (headless software rendering; compare same machine, one process at a time) | responsiveness | no worse than +5% | 17.8 / 17.7 ms | 18.2 / 17.5 ms |
| 8 | Robustness: page errors; `eval/play.js` (16 checks); `DDB.selfTest()` | robustness | 0; all; pass | 0; 16/16; pass | 0; 16/16; pass |
| 9 | Contrast: worst text-on-team-colour pair drawn in a flight (WCAG ratio) | accessibility | ≥ 3.0 | 2.25 (white on orange) | **4.36** |

Noise: two train runs are identical (timings aside). Between seed sets (train vs holdout): ≈ 0.03 on "everyone",
≈ 0.10 on close finishes, ≈ 3 s on flight p90. Frame time: ≈ ±3% run to run when run alone; under parallel runs it
reads up to 10% high, so only compare frame times measured one process at a time.

Not measurable by bots (checks for a human): how the show looks and sounds, whether commentary is funny, whether a
change feels better on a real screen share.

## Backlog
1. **Harder readability check:** share of distance-changing events the audience is told about (call-out drawn or
   Bill line within ~2 s). Bill blocks about half of event lines because he is already talking, so this is where the
   next readability gain is. Prove it on a broken version first.
2. **Results screen:** check the awards/highlights also say whose duck (they mostly name players; not measured).
3. One-by-one mode (`?classic`) has no evaluator coverage yet: add a bot run.
4. Tension (check 3) cannot move without touching the flight sim; see Decisions.

## Alternatives
- **A′, player's name written into Bill's line** ("Whiteboard (Cyrus) bounced right back!"): scored the same as the
  chip (1.00, no caption cut off). Lost on judgment: it rewrites authored lines (and the optional spoken voice reads
  the brackets). Revisit if the chip turns out hard to notice on a real screen share.
- **B, Bill's roll call for quiet ducks:** a fine idea if Bill ever has spare airtime (he doesn't today).

## Strategy
| Kind of change | Tried | Kept | Notes |
|---|---|---|---|
| Readability (who is who on screen) | 3 (A, A′, B3′) | 2 | Cheap, large measured gains; found by reading what the bot saw on screen |
| Accessibility (contrast) | 1 | 1 | Found by measuring every text-on-colour pair drawn |
| Commentary routing (Bill) | 1 | 0 | Bill's channel is saturated; route new information visually instead |
| Tuning / mechanics / balance | 0 | 0 | Balance changes would make old pond records incomparable: owner decision |

## Playbook (provisional until confirmed by a second session)
- Never edit `index.html` while an evaluator run is going: each run reads it at start. Build candidates in copies and
  evaluate with `DDB_GAME=`.
- Headless Chromium batches canvas work: single-frame draw times are meaningless (3 ms or 140 ms); use the mean.
- The title only offers RESUME for *today's* show: playthroughs fix the browser clock (`openGame({ date })`), or the
  resume check passes vacuously by starting a fresh race with the same seed.
- A metric counted from game state (call-outs issued) can be gamed by things that never reach the screen: keep a
  rendered twin of every experience check ("drawn").
- Before routing anything new through Bill, count his blocked lines: he is already saturated during a salvo.
- Screenshot every new on-screen element at the busiest moment it can appear (a pile-up near the end of a flight).

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
  purple). Predicted worst contrast 2.25 → ≥ 3.0. Measured 4.36 (rendered frames, all 8 swatches). **Kept.**
- **B3: a quiet duck's distance pops up as it lands** (only ducks nobody pointed at). Predicted drawn "everyone"
  0.78 → ≥ 0.95. Measured 1.00 (holdout 0.99). A screenshot showed a flaw the numbers didn't: a bare "1,254 ft!"
  floated between two other players' tags because that duck's own tag was crowded out. **B3′** adds the name
  ("Kit · 1,254 ft"): same numbers, unambiguous. In three 30-duck shows the same 189 event call-outs were drawn with
  and without it (no crowd-out). **Kept (B3′).**
- Kept A, D, B3′ (one commit each). Frame time unchanged (17.8/17.7 → 18.2/17.5 ms, run alone). Playthroughs 16/16,
  self test passes (two new checks, each shown to fail on a deliberately broken copy).
- **Round gain:** readability 0.01 → 1.00; everyone (drawn) 0.78 → 1.00; contrast 2.25 → 4.36. Large gains, all from
  readability: the cheapest wins were information the game had but didn't put on screen.

Process notes (why things failed this round):
- B was a misdiagnosis of where airtime was: I assumed Bill had idle moments. Next round, the `salvoSay` call counter
  in this log's method (wrap `salvoSay`, count blocked vs spoken per pool) should catch this before building.
- Three evaluator bugs (pause, vacuous resume, substring names) would have produced false results; each was caught by
  a check that failed or passed suspiciously. Lesson kept in the Playbook.
- The bare-number pop passed every bot check but was misleading on screen: a screenshot of the new thing at its
  busiest moment caught it.

## Decisions for me
1. **Closer finishes?** (tension) The distance spread is long-tailed (p90 ≈ 2,700 ft, p99 ≈ 4,400 ft), so the winner
   of a 12-duck show wins by a median 523 ft and only 30% of finishes are within 10%. Narrowing the tail (for
   example, capping how far one boost can carry a duck) would make more finishes close, but it changes the flight
   sim: old pond records and the Waddle of Fame's top 10 would no longer be comparable. My recommendation: leave it;
   the race already has lead changes (3.3 a show) and the chase. Tell me if close finishes matter more to you.
2. **Any decision for the audience?** The game is deliberately pure luck. Adding a choice (say, each player picks a
   launch angle) would add skill but undo the fairness that makes it work for a team call. Recommendation: no.
