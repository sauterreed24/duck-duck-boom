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

| # | Check | Kind | Target | Session 1 start | Now (session 2 end) |
|---|---|---|---|---|---|
| 1 | Readability: Bill's lines about a duck that also say whose duck it is (player's name in the line or on the caption bar), n12 / n30 | experience | ≥ 0.90 | 0.01 / 0.01 | **1.00 / 1.00** (1.00) |
| 2 | Everyone's moment: share of ducks pointed at during the flight (call-out or Bill naming it). Fast pass counts call-outs issued; **"drawn" counts only call-outs that reached the screen** (the honest one) | experience | drawn mean ≥ 0.95, worst show ≥ 0.85 | issued 0.87, drawn 0.78 / worst 0.58 (drawn 0.87 / 0.75) | issued 1.00, **drawn 1.00 / 1.00** (0.96 / 0.83) |
| 3 | Tension: winner takes the lead for good at (fraction of flight, p50); lead changes; close finishes (< 10% margin); winning margin p50 | measurement only (balance is a decision for the owner) | no worse | 0.59; 3.3; 0.30; 523 ft | unchanged |
| 4 | Pacing: flight length p10 / p50 / p90, 12 ducks; reveal → fire with a prompt host | experience | p90 ≤ 38 s | 23.6 / 31.2 / 37.2 s; 15 s | unchanged |
| 5 | Commentary: longest silence p90; repeated lines; captions cut off | experience | ≤ 6 s; 0; 0 | 5.5 s; 0; 0 | unchanged |
| 6 | Fairness: win share by roster slot (chi² p), max share | fairness | p > 0.01, ≤ 1.3× | p 0.75, 1.1× | unchanged |
| 7 | Frame time: mean draw ms per frame, 40-duck flight (headless software rendering; compare same machine, one process at a time) | responsiveness | no worse than +5% | 16.6 / 17.0 ms | 16.3 / 17.2 ms (noise ≈ ±3%) |
| 8 | Robustness: page errors; `eval/play.js` (19 checks); `DDB.selfTest()`; one-by-one shows reach the crowning | robustness | 0; all; pass; all | 0; 16/16; pass; 2/2 | 0; 19/19; pass; 2/2 |
| 9 | Contrast: worst text-on-team-colour pair drawn in a flight (WCAG ratio) | accessibility | ≥ 3.0 | 2.25 (white on orange) | **4.36** |
| 10 | Events told: distance-changing events whose duck got a call-out drawn while it was in the picture, a big impact caption naming it, or a Bill line naming it, within ~2 s (6 rendered shows) | readability (guard) | no worse | 0.982 (0.966) | 0.982 (0.966) |
| 11 | Results readability: highlight rows (and the copied results' highlight) that say whose duck each mentioned duck is; rows cut off (2-line limit) | experience | ≥ 0.95; 0 cut | 0.00, 0.00; 0 cut | **1.00, 1.00** (1.00); 0 cut (also with 40-character names) |

"Drawn" counts (checks 2 and 10) count a call-out only while its duck is in the picture that frame (corrected this
session; see Log). Noise: two train runs are identical (timings aside). Between seed sets (train vs holdout): ≈ 0.03 on "everyone",
≈ 0.10 on close finishes, ≈ 3 s on flight p90. Frame time: ≈ ±3% run to run when run alone; under parallel runs it
reads up to 10% high, so only compare frame times measured one process at a time.

Not measurable by bots (checks for a human): how the show looks and sounds, whether commentary is funny, whether a
change feels better on a real screen share.

## Backlog
1. **Award descriptions naming another duck** ("Closest Call: Just 21 ft from Ranger Sprinkles.") don't say whose duck
   that is; the card has room for two lines only, so it needs a layout check first.
2. **Sample ducks for a first look:** an empty roster could offer a practice show with sample names, so someone trying
   the game reaches the cannon without typing names. Onboarding idea; measure inputs from page open to first launch.
3. Bill's "WRONG WAY! WRONG WAY!" and "We've lost the duck" lines name no duck (the big caption and arrows do).
4. Tension (check 3) cannot move without touching the flight sim; see Decisions.

## Alternatives
- **A′, player's name written into Bill's line** ("Whiteboard (Cyrus) bounced right back!"): scored the same as the
  chip (1.00, no caption cut off). Lost on judgment: it rewrites authored lines (and the optional spoken voice reads
  the brackets). Revisit if the chip turns out hard to notice on a real screen share.
- **B, Bill's roll call for quiet ducks:** a fine idea if Bill ever has spare airtime (he doesn't today).

## Strategy
| Kind of change | Tried | Kept | Notes |
|---|---|---|---|
| Readability (who is who on screen) | 4 (A, A′, B3′, H1) | 3 | Cheap, large measured gains; found by reading screenshots of every screen. Session 2's gain was smaller (one screen left) |
| Onboarding (first-time host) | 1 | 1 | Small; found by playing from an empty browser; the review found two gaps in it |
| Measurement fixes | 2 | 2 | Both found by screenshotting a "miss" before treating it as a game problem |
| Accessibility (contrast) | 1 | 1 | Found by measuring every text-on-colour pair drawn |
| Commentary routing (Bill) | 1 | 0 | Bill's channel is saturated; route new information visually instead |
| Tuning / mechanics / balance | 0 | 0 | Balance changes would make old pond records incomparable: owner decision |

## Playbook (confirmed in session 2 unless marked provisional)
- Never edit `index.html` while an evaluator run is going: each run reads it at start. Build candidates in copies and
  evaluate with `DDB_GAME=`.
- Headless Chromium batches canvas work: single-frame draw times are meaningless (3 ms or 140 ms); use the mean.
- The title only offers RESUME for *today's* show: playthroughs fix the browser clock (`openGame({ date })`), or the
  resume check passes vacuously by starting a fresh race with the same seed.
- A metric counted from game state (call-outs issued) can be gamed by things that never reach the screen: keep a
  rendered twin of every experience check ("drawn").
- Before routing anything new through Bill, count his blocked lines: he is already saturated during a salvo.
- Screenshot every new on-screen element at the busiest moment it can appear (a pile-up near the end of a flight).
- Every new hint or control gets both a keyboard and a pointer playthrough check. (provisional)
- Before treating a measured miss as a game problem, screenshot the moment: in session 2 the "untold" trip to space
  was told by a big caption the check didn't count. (provisional)
- A new invariant test must fail on a deliberately broken copy: session 2's first version of the highlight test passed
  a broken one. (provisional)

## Log

### Session 1 (2026-11-25): evaluator built, round 1 (summary)
Built `eval/`; fixed three evaluator bugs before trusting it (bot ran while paused; vacuous resume check; "Player 1"
matched in "Player 12"). Kept: **A** name chip on Bill's bar (readability 0.01 → 1.00), **D** contrast-picked ink
(2.25 → 4.36), **B3′** landing call-out for quiet ducks (drawn "everyone" 0.78 → 1.00). Rejected: **B** Bill's roll
call (0.87 → 0.88; Bill's airtime is saturated). A′ (name in the line) tied with A, lost on judgment (Alternatives).
An independent review found three flaws in B3′ (drawn for off-screen ducks, duplicated the name tag, long names lost
the distance) and an over-counting check; all fixed, the check corrected and re-measured.

### Session 2 (2026-11-25): round 2
Baseline reproduced session 1's end exactly. Played every screen (reveal, awards, podium, first-run roster) and
looked at the biggest moment (a forced trip to space).
- **H1: highlights say whose duck** ("Nibbles Honkington the Brave (Kit) was abducted…"), on the awards page, in the
  copied results text and in saved history (new shows only; old history untouched). Found by playing: the highlights
  were the last place naming ducks only, and the copied text goes to the team chat, where no chip can reach. A chip
  version was not built: it could only fix the screen. Predicted check 11: 0 → ≥ 0.95, 0 cut. Measured 1.00 / 1.00
  train and held-out (n30 too), 3 of 240 rows wrap, 0 cut; with 40-character names 12 of 24 rows wrap, 0 cut. Every
  other check identical. **Kept.** The first invariant test passed a deliberately broken copy (name inserted twice);
  strengthened until it failed it.
- **Backlog top, events told / trip to space:** forced five trips to space. Bill's line names no duck ("We've lost
  the duck"), but the screen tells it: big caption "TO SPACE! Lu" and the edge arrow "▲ Lu · 1,558 ft up". **Not a
  game problem; the check was wrong** (it ignored big captions). Corrected in its own commit; session start and now
  re-measured: identical (0.982 / 0.966, was 0.973 / 0.952 under the old check).
- **O: first-time host on an empty roster** pressing Space was told "Tick at least one person first" with nobody to
  tick. Now: "Nobody on the roster yet: type or paste today's names in Today's list", with the cursor in that box. New
  playthrough check (fails on the old version). **Kept.**
- Considered, not built: sample ducks for a first look (Backlog 2): bigger UI addition, worth a measured round.
- **Round gain:** smaller than round 1 (one more screen made readable, one onboarding fix, two measurement fixes).
  Readability is close to done; next session should change focus (Backlog 2, or a decision below).

Independent review (separate agent, commits only): nothing throws, no data or winner affected; 75 real highlight rows
with tricky names (emoji, Zoë, O'Brien, "Sam"/"Sam (2)", "Dee"/"Deer") all attributed once. Defects found, all fixed
in one commit, each now a check that fails on the previous version:
- a click on the greyed-out REVEAL DUCKS button gave no hint (my claim "or the big button" was false: the disabled
  button returns before the roster code). Now it gives the hint;
- with names typed but not applied, the hint told the host to type names. Now it says "press Tick only these" and
  focuses that button, so the next Space applies them;
- a duck named inside a longer duck's name ("Dumpling" / "Judge Dumpling") lost its player; a player's name already
  in the story ("Golden", "Golden Loaf") suppressed the bracket. Both fixed; idempotent by checking the bracket;
- whole-name matching treated "ë" as a boundary ("Zo" matched in "Zoëy"), in the highlights and in session 1's
  caption-bar chip. Fixed with an accent-aware letter test (no newer regex syntax).
Accepted, not fixed: a photo-finish row can still be cut with two 40-character ALL-CAPS names (none in 105 real
long-name rows); the copied text brackets "player (duck)" for the feather and "duck (player)" for highlights. Also
corrected: saved highlights (`rec.hl`) are not shown anywhere in the game, so "in saved history" has no visible effect.

Process notes (why things failed this round):
- The empty-roster hint was tested from the keyboard only; the mouse path (the likely first-time host's) was missed.
  Next time: every new hint or control gets a keyboard and a pointer check in `eval/play.js`.
- The first highlight invariant passed a broken copy: it checked presence, not exact count and reversibility.
- I edited `index.html` while two evaluator runs were going (Playbook rule). They had already loaded the page, so the
  numbers stood, but the final numbers come from a fresh run of the final commit.

## Decisions for me
1. **Closer finishes?** (tension) The distance spread is long-tailed (p90 ≈ 2,700 ft, p99 ≈ 4,400 ft), so the winner
   of a 12-duck show wins by a median 523 ft and only 30% of finishes are within 10%. Narrowing the tail (for
   example, capping how far one boost can carry a duck) would make more finishes close, but it changes the flight
   sim: old pond records and the Waddle of Fame's top 10 would no longer be comparable. My recommendation: leave it;
   the race already has lead changes (3.3 a show) and the chase. Tell me if close finishes matter more to you.
2. **Any decision for the audience?** The game is deliberately pure luck. Adding a choice (say, each player picks a
   launch angle) would add skill but undo the fairness that makes it work for a team call. Recommendation: no.
