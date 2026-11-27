# IMPROVE.md: the improvement loop's memory

## The game
Duck Duck BOOM! is a daily cannon-launch duck show for team calls. Everyone who booked a meeting gets a seeded duck;
Ol' Thunderbill fires the whole flock at once (the salvo) and the farthest duck wins the Golden Loaf. The host presses
one big red button (Space); the audience watches on a screen share. **Outcomes are pure, fair luck by design**: no
player input changes a distance. So "skill" here is the host's: a calm host and a key-mashing one must get the same
results and both reach the crowning.

Core loop: title → roster (tick today's people) → reveal (cards, rerolls) → salvo (load, fuse, ~30 s flight with
Bill's commentary) → results (awards, highlights, podium) → DONE.

- **Play:** open `index.html` in Chrome or Edge (`?debug` for the debug panel, `?classic` for one-by-one mode,
  `?try=name` for a trial). The owner playtests on a phone (the Play link, https://sauterreed24.github.io/duck-duck-boom/,
  serves `main`), so every round also looks at the phone: touch only, small screen, upright and sideways.
- **Evaluate:** `node eval/run.js` (train seeds, ~2 min), `node eval/run.js --set holdout`, `node eval/run.js --quick`,
  `node eval/play.js` (scripted playthroughs incl. a touch-only phone host, ~5 min). `DDB_GAME=path/to/copy.html` evaluates a candidate copy.
  In the browser console, `DDB.selfTest()` and `DDB.balance(10000)` are the game's own tests.
- The evaluator injects `eval/bot.js`, which replaces `requestAnimationFrame` and steps the real game code at 60 Hz on
  a virtual clock (no wall-clock time), with `S.dbg.day` / `S.dbg.seed` seeding every race.

## Constraints (never break)
- Saved data: `localStorage` keys `ddb.v1.*` (roster, settings, history, current show, Waddle of Fame, rosettes).
  Never call `localStorage.clear()`. Old best scores / pond records must stay comparable: **no change to the flight
  sim or distances** without a decision from the owner.
- Fairness: every random number seeded; launch order, looks, team, mashing, skipping, replay never change a distance.
- Controls: Space = big button; R, S, T, M, N, F, P as documented in the README. Esc stays the browser's. On a touch
  screen, Pause / Skip / Replay / Mute buttons stand in for the keys during a show (a desktop never shows them).
- Platform: one self-contained `index.html`, no dependencies, no network, works offline in Chrome/Edge, older-browser
  syntax (the self test checks this).
- Identity: Bill Featherstone's commentary roasts the duck, never the player; every line passes the content blocklist.

## Scorecard
Session 4 changed nothing a desktop draws: checks 1–12 are identical to session 3's end on train and held-out.
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
| 7 | Frame time: mean draw ms per frame, 40-duck flight (headless software rendering; compare same machine, one process at a time) | responsiveness | no worse than +5% | 16.6 / 17.0 ms | 16.8 / 17.3 ms (noise ≈ ±3%). Session 4's machine is slower: 24.8 ms at start and end |
| 12 | First look: a first-time visitor (empty browser) reaches the cannon firing; presses and characters typed before it | onboarding | possible without typing | needs names typed (≥ 2 names) | **5 presses, 0 typed** (sample ducks) |
| 13 | Phone host (emulated iPhone 13, touch only): show controls a touch host can reach (pause, mute, skip, replay); share of an upright phone's screen the show covers; sound starts on the first tap | experience / platform | 4/4; hint or ≥ 0.9 with the trial; yes on a real phone | 0/4; 33%, no hint; unverifiable here | **4/4**; 33% + "turn sideways" hint (trial `sideways`: **96%**); fix built, **needs the owner's phone** |
| 8 | Robustness: page errors; `eval/play.js` (23 checks since session 4); `DDB.selfTest()`; one-by-one shows reach the crowning | robustness | 0; all; pass; all | 0; 16/16; pass; 2/2 | 0; 23/23; pass; 2/2 |
| 9 | Contrast: worst text-on-team-colour pair drawn in a flight (WCAG ratio) | accessibility | ≥ 3.0 | 2.25 (white on orange) | **4.36** |
| 10 | Events told: distance-changing events whose duck got a call-out drawn while it was in the picture, a big impact caption naming it, or a Bill line naming it, within ~2 s (6 rendered shows) | readability (guard) | no worse | 0.982 (0.966) | 0.982 (0.966) |
| 11 | Results readability: highlight rows (and the copied results' highlight) that say whose duck each mentioned duck is; rows cut off (2-line limit) | experience | ≥ 0.95; 0 cut | 0.00, 0.00; 0 cut | **1.00, 1.00** (1.00); 0 cut (also with 40-character names). Award cards naming another duck that say whose: 0/15 → **15/15** (16/16), 0 cut |

"Drawn" counts (checks 2 and 10) count a call-out only while its duck is in the picture that frame (corrected this
session; see Log). Noise: two train runs are identical (timings aside). Between seed sets (train vs holdout): ≈ 0.03 on "everyone",
≈ 0.10 on close finishes, ≈ 3 s on flight p90. Frame time: ≈ ±3% run to run when run alone; under parallel runs it
reads up to 10% high, so only compare frame times measured one process at a time.

Not measurable by bots (checks for a human): how the show looks and sounds, whether commentary is funny, whether a
change feels better on a real screen share, **whether sound plays on a real phone** (headless Chromium here doesn't
enforce the phone autoplay rule, so the session 4 fix could not be shown failing or passing), and real touch feel.

## Backlog
1. Phone roster: the 1920-wide roster is drawn at about a third of its size on a phone (checkboxes ≈ 11 px, small
   buttons ≈ 10 px tall). The sample show sidesteps it; a real phone roster would need its own layout. Measure tap
   target sizes before building anything.
2. Phone: Copy results / Panorama / Settings buttons are ≈ 28 px tall sideways; fine, but check on the owner's phone.
3. Touch host gaps (review, session 4): no Pause / Mute on the reveal and results screens, no skip of a one-by-one
   intro, no turbo mid-show, no fullscreen button (Android).
4. The sample banner pushes the roster down; the right column scrolls (its Tick all / Untick all row is below the fold
   on an empty roster, where it does nothing). Fine today; revisit if the banner grows.
5. Bill's "WRONG WAY! WRONG WAY!" and "We've lost the duck" lines name no duck (the big caption and arrows do).
6. Tension (check 3) cannot move without touching the flight sim; see Decisions.

## Alternatives
- **A′, player's name written into Bill's line** ("Whiteboard (Cyrus) bounced right back!"): scored the same as the
  chip (1.00, no caption cut off). Lost on judgment: it rewrites authored lines (and the optional spoken voice reads
  the brackets). Revisit if the chip turns out hard to notice on a real screen share.
- **B, Bill's roll call for quiet ducks:** a fine idea if Bill ever has spare airtime (he doesn't today).

## Strategy
| Kind of change | Tried | Kept | Notes |
|---|---|---|---|
| Readability (who is who on screen) | 5 (A, A′, B3′, H1, C1) | 4 | Cheap, large measured gains; found by reading screenshots of every screen. Session 2's gain was smaller (one screen left) |
| Onboarding (first-time host) | 2 | 2 | Found by playing from an empty browser; session 3's sample show was the bolder one |
| Measurement fixes | 4 | 4 | Both found by screenshotting a "miss" before treating it as a game problem |
| Accessibility (contrast) | 1 | 1 | Found by measuring every text-on-colour pair drawn |
| Commentary routing (Bill) | 1 | 0 | Bill's channel is saturated; route new information visually instead |
| Platform: phone (the owner's playtest device) | 4 (sound, touch controls, upright hint, sideways trial) | 3 + 1 trial | Found by playing on an emulated phone, touch only. A whole area no earlier round looked at |
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
- Every new hint or control gets both a keyboard and a pointer playthrough check. (confirmed: the session 3 review
  found no keyboard/pointer gap)
- An evaluator check must measure the outcome itself, not re-run the game's rule (session 3: the copied fit rule
  inherited its bug). (provisional)
- Edge-case tests generate hundreds of cases from the game's own generators (names, margins), not a handful.
  (provisional)
- Before treating a measured miss as a game problem, screenshot the moment: in session 2 the "untold" trip to space
  was told by a big caption the check didn't count. (provisional)
- Play on an emulated phone (touch only, upright and sideways) every session: the owner playtests there. (provisional)
- Each session's evaluator run is slower or faster per machine: re-baseline frame time at the start of every session
  (session 4: 24.8 ms vs 17.3 ms last session, same code). (provisional)
- A new invariant test, or playthrough check, must fail on a deliberately broken copy: session 2's first highlight
  test and session 3's "nothing is kept" check both passed broken copies. (confirmed)

## Log

### Sessions 1–3 (2026-11-25/26): summary
Built `eval/` (fixed three evaluator bugs before trusting it). Kept: **A** name chip on Bill's bar (readability
0.01 → 1.00), **D** contrast-picked ink (2.25 → 4.36), **B3′** landing call-out for quiet ducks (drawn "everyone"
0.78 → 1.00), **H1** highlights say whose duck (0 → 1.00, also in the copied results), **O** empty-roster hint,
**C1** Closest Call says whose duck (0/15 → 15/15, 0 cut), **C2** sample ducks for a first look (a first-time visitor
reaches the cannon in 5 presses, 0 typed). Rejected: **B** Bill's roll call (0.87 → 0.88; Bill is saturated). A′
(name in Bill's line) tied A, lost on judgment. Independent reviews each round found real defects (off-screen
call-outs, long names cutting cards, sample rerolls leaking into real days, checks that could never fail); all fixed,
each now a check proven on a broken copy. Gains shrank over the three rounds (readability done everywhere) and
session 3 said: change area.

### Session 4 (2026-11-27): round 4, the phone
Baseline reproduced session 3 exactly (frame time reads 24.8 ms on this slower machine, same code). New area,
because the owner playtests on a phone and no round had looked at one: played the whole show on an emulated
iPhone 13, touch only, upright and sideways. Found: the show's controls (pause, skip, replay, mute, so also late
players) were keyboard only; the title said "Click"; the sample-show button a phone visitor needs first was ≈ 10 px
tall; an upright phone shows the show as a strip over 33% of the screen; sound unlocked only on pointerdown/keydown,
which phones don't count as a gesture that may start sound.
- **P1 sound on a phone:** unlock also on pointerup / touchend / click; resume an iPhone's "interrupted" audio.
  Predicted: sound on the first tap on a real phone. **Unverified:** headless Chromium here plays sound with no
  gesture at all (tested with the gesture-required policy flag), so neither the bug nor the fix shows. Kept on the
  evidence of how WebKit unlocks audio (touch end, not touch start); on the playtest card.
- **P2 touch host:** on touch screens, the key-reminder corner becomes Pause / Skip / Replay / Mute buttons; Tap
  wording; a finger-sized sample-show button; an empty-roster tap points at the sample show instead of popping the
  keyboard up. Predicted check 13: 0/4 → 4/4. Measured 4/4 (the new playthrough check failed on the old version,
  0/4); a touch host reaches the crowning; a desktop never shows the buttons; checks 1–12 identical. **Kept.**
- **P3 upright phone, conventional:** a "Turn your phone sideways" note in the empty space under the show (and what to
  do if rotation lock stops it turning). **Kept** (playthrough check; desktop never shows it).
- **P4 upright phone, clever: trial `?try=sideways`** turns the stage a quarter on an upright screen: 33% → 96% of
  the screen, taps mapped through the turn (a touch host reaches the results with it on). A look change, so a trial.
- **Round gain:** a new platform made usable: a phone host can now run and control a whole show by touch. Desktop
  numbers unchanged (train and held-out).

Independent review (separate agent, commits only; desktop pixel-identical to before at ~20 checkpoints, distances
identical, rotation mapping exact). Defects found, all fixed in one commit:
- the buttons shifted slots with the phase, so a double tap on Skip landed on Replay (a replay started), and while
  loading on Mute (the show muted, and the mute was saved). Now fixed slots plus a per-button double-tap guard; the
  playthrough check now double-taps Skip (fails on the previous version: 2/4). My first guard was shared across all
  buttons and swallowed a Mute tap right after Resume: the same check caught it (3/4), fixed per button;
- buttons ≈ 47×23 px on a sideways iPhone: now ≈ 61×33 px (still under 44 px; the corner is the limit);
- `?try=100%` (a bad escape) left a blank page; the sideways trial also turned a tall desktop window; the turn note
  said "phone" on tablets; a tablet host using a keyboard lost the empty-roster cursor. All fixed and checked.
Accepted, not fixed (Backlog 3): a touch host still can't pause on the reveal or results screens, skip a one-by-one
intro, use turbo mid-show or go fullscreen.

Process notes (why things failed this round):
- The slot-shifting buttons: I built and tested each button alone, never a second tap at the same spot after the
  phase changed. Next time a control that changes with state gets a double-tap check in the same spot.
- The sound bug could not be reproduced: the only browser here is Chromium, which doesn't enforce the phone rule
  headless. Real-device checks go on the playtest card; no evaluator check claims them.
- One wasted command: a syntax check (`node -e require(...)`) ran the playthroughs instead. Use `node --check`.

## Playtest notes
(None yet. Add what the owner says after trying it, with dates.)

## Trials
| Trial | Switch | Built | What to compare | Verdict |
|---|---|---|---|---|
| sideways | add `?try=sideways` to the link, phone held upright | session 4 | the show turned to fill an upright phone (rotation lock on or off) vs. the strip with the "turn sideways" note | open |

## Decisions for me
1. **Closer finishes?** (tension) The distance spread is long-tailed (p90 ≈ 2,700 ft, p99 ≈ 4,400 ft), so the winner
   of a 12-duck show wins by a median 523 ft and only 30% of finishes are within 10%. Narrowing the tail (for
   example, capping how far one boost can carry a duck) would make more finishes close, but it changes the flight
   sim: old pond records and the Waddle of Fame's top 10 would no longer be comparable. My recommendation: leave it;
   the race already has lead changes (3.3 a show) and the chase. Tell me if close finishes matter more to you.
2. **Any decision for the audience?** The game is deliberately pure luck. Adding a choice (say, each player picks a
   launch angle) would add skill but undo the fairness that makes it work for a team call. Recommendation: no.
