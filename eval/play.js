#!/usr/bin/env node
// Scripted playthroughs with drawing on (virtual 60 Hz clock, real keyboard and DOM input):
//   1. first-time host: title -> roster (paste names, Tick only these) -> reveal -> salvo -> results -> podium -> DONE
//   2. pause mid-flight freezes the show; P resumes
//   3. reload mid-flight resumes the same race with the same distances
//   4. novice host mashing keys (Space, S, R, T, P, M, N) and resizing the window still reaches the podium, with
//      the same distances as a calm host
// Prints PASS/FAIL per check; exit code 1 on any failure.
//   node eval/play.js
const { openGame } = require('./harness');

const NAMES = ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit', 'Lu'];
const DAY = '2026-06-17', SEED = 0x5EED1234;
const checks = [];
const check = (name, ok, info) => { checks.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };

const steps = (page, n) => page.evaluate(n => { for (let i = 0; i < n; i++) EVAL.step(true); }, n);
const state = page => page.evaluate(() => ({ screen: S.screen, phase: L.phase === 'salvo' ? SV.phase : L.phase, big: Big.label, enabled: Big.enabled, iris: Iris.t, rt: S.rt, paused: S.paused, simT: SV.pb ? SV.pb.simT : null, crowned: typeof RS !== 'undefined' && !!RS.crowned, page: typeof RS !== 'undefined' ? RS.page : null }));
const dists = page => page.evaluate(() => S.race ? Object.fromEntries(Object.entries(S.race.results).map(([k, r]) => [k, Math.round(r.dist * 100) / 100])) : null);

async function setup(page) {
  await page.evaluate(s => { S.dbg.seed = s; S.settings.autoAdvance = false; S.settings.practice = false; }, SEED);
}
// press Space when the big button is lit, until `until(state)` holds
async function hostUntil(page, until, maxFrames) {
  for (let f = 0; f < maxFrames; f += 10) {
    const st = await state(page);
    if (until(st)) return st;
    if (st.enabled && st.iris < 0 && !(st.screen === 'results' && st.big === 'DONE')) await page.keyboard.press('Space');
    await steps(page, 10);
  }
  return state(page);
}
async function toRoster(page) {
  await page.keyboard.press('Space'); await steps(page, 30);
  const st = await state(page);
  if (st.screen !== 'roster') return false;
  await page.fill('#paste', NAMES.join('\n'));
  await page.click('#onlybtn');
  await steps(page, 10);
  await page.mouse.click(5, 5);   // a click back on the stage, so Space is the big button again
  return true;
}

async function main() {
  // ---- 1. first-time host, the whole show ----
  let g = await openGame({ date: DAY });
  await setup(g.page);
  check('title screen comes up with START', (await state(g.page)).big === 'START');
  // a first-time host: Space on an empty roster says where today's names go, and the cursor is there
  await g.page.keyboard.press('Space'); await steps(g.page, 30);
  await g.page.keyboard.press('Space'); await steps(g.page, 10);
  const hint = await g.page.evaluate(() => ({ toast: document.getElementById('toast').textContent, focus: document.activeElement && document.activeElement.id }));
  check('Space on an empty roster points a first-time host at Today\'s list', /Today's list/.test(hint.toast) && hint.focus === 'paste', hint.toast + ' / focus ' + hint.focus);
  // ...a click on the greyed-out big button says the same (a mouse or touch host)
  await g.page.evaluate(() => { document.getElementById('toast').textContent = ''; document.activeElement.blur(); });
  await steps(g.page, 30);
  const bp = await g.page.evaluate(() => ({ x: Big.x * VIEW.scale + VIEW.ox, y: Big.y * VIEW.scale + VIEW.oy }));
  await g.page.mouse.click(bp.x, bp.y); await steps(g.page, 5);
  check('a click on the greyed-out button on an empty roster gives the same hint', /Today's list/.test(await g.page.evaluate(() => document.getElementById('toast').textContent)));
  // ...names typed but not applied yet: the hint names the button, and the next Space presses it
  await g.page.fill('#paste', 'Zed\nYara'); await g.page.mouse.click(5, 5); await steps(g.page, 30);
  await g.page.keyboard.press('Space'); await steps(g.page, 5);
  const h2 = await g.page.evaluate(() => ({ toast: document.getElementById('toast').textContent, focus: document.activeElement && document.activeElement.id }));
  await g.page.keyboard.press('Space'); await steps(g.page, 10);
  check('typed but unapplied names: the hint names Tick only these, and Space presses it', /Tick only these/.test(h2.toast) && h2.focus === 'onlybtn' && await g.page.evaluate(() => S.roster.filter(p => p.checked).length === 2), h2.toast + ' / focus ' + h2.focus);
  await g.page.evaluate(() => { S.roster = []; Roster.render(); });   // (back to the empty roster the rest expects)
  await g.page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); go('title'); });
  await steps(g.page, 40);   // (past the big button's double-press guard)
  check('Space opens the roster; pasted names are ticked', await toRoster(g.page) && await g.page.evaluate(n => S.roster.filter(p => p.checked).length === n, NAMES.length));
  await g.page.keyboard.press('Space'); await steps(g.page, 20);
  check('Space on the roster starts the reveal', (await state(g.page)).screen === 'reveal');
  let st = await hostUntil(g.page, s => s.screen === 'launch' && s.phase === 'flight', 60 * 60);
  check('host reaches the salvo flight', st.phase === 'flight', st.screen + '/' + st.phase);
  st = await hostUntil(g.page, s => s.screen === 'results', 60 * 90);
  check('host reaches the results', st.screen === 'results');
  const calm = await dists(g.page);
  st = await hostUntil(g.page, s => s.crowned, 60 * 90);
  check('host reaches the crowning', st.crowned);
  await steps(g.page, 60 * 6);
  await g.page.keyboard.press('Space'); await steps(g.page, 40);
  st = await state(g.page);
  check('DONE returns to the title, with Last results kept', st.screen === 'title' && await g.page.evaluate(() => !!finishedShow()), st.screen);
  check('the finished show is in the history', await g.page.evaluate(() => S.history.length === 1));

  // ---- 2. pause freezes the show ----
  await g.page.evaluate(() => { S.dbg.seed = 0x5EED1234; S.settings.practice = true; });
  await g.page.keyboard.press('Space'); await steps(g.page, 30);
  await g.page.keyboard.press('Space'); await steps(g.page, 20);   // roster still has the names ticked
  st = await hostUntil(g.page, s => s.phase === 'flight' && s.simT > 4, 60 * 60);
  await g.page.keyboard.press('p'); await steps(g.page, 5);
  const a = await state(g.page); await steps(g.page, 120); const b = await state(g.page);
  check('P pauses: the show clock and the flight stand still', a.paused && b.paused && a.rt === b.rt && a.simT === b.simT);
  await g.page.keyboard.press('p'); await steps(g.page, 30);
  const c = await state(g.page);
  check('P again resumes the flight', !c.paused && c.simT > b.simT);
  await g.close();

  // ---- 3. reload mid-flight resumes the same race ----
  g = await openGame({ date: DAY });
  await setup(g.page);
  await toRoster(g.page);
  await g.page.keyboard.press('Space'); await steps(g.page, 20);
  st = await hostUntil(g.page, s => s.phase === 'flight' && s.simT > 6, 60 * 60);
  const raceId = await g.page.evaluate(() => S.race.id);
  await g.page.reload(); await g.page.waitForFunction(() => typeof S !== 'undefined');
  await setup(g.page);
  st = await state(g.page);
  check('after a reload the title offers RESUME SHOW', st.big === 'RESUME SHOW', st.big);
  await g.page.keyboard.press('Space'); await steps(g.page, 30);
  st = await state(g.page);
  check('RESUME SHOW goes straight back to the cannon with the same race', st.screen === 'launch' && await g.page.evaluate(id => S.race && S.race.id === id, raceId), st.screen);
  st = await hostUntil(g.page, s => s.screen === 'results', 60 * 120);
  const resumed = await dists(g.page);
  check('the resumed show lands every duck exactly where the uninterrupted one did', JSON.stringify(resumed) === JSON.stringify(calm));
  await g.close();

  // ---- 4. novice host: mashing keys and resizing ----
  g = await openGame({ date: DAY });
  await setup(g.page);
  await toRoster(g.page);
  await g.page.keyboard.press('Space'); await steps(g.page, 20);
  const keys = ['Space', 'Space', 'Space', 's', 'r', 't', 'p', 'm', 'n', 'Space'];
  let x = 12345, done = false;
  const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  for (let i = 0; i < 1500 && !done; i++) {
    const k = keys[Math.floor(rnd() * keys.length)];
    await g.page.keyboard.press(k);
    if (rnd() < 0.05) await g.page.setViewportSize({ width: 600 + Math.floor(rnd() * 1300), height: 400 + Math.floor(rnd() * 700) });
    if (await g.page.evaluate(() => S.paused)) await g.page.keyboard.press('p');   // the masher always un-pauses
    if (await g.page.evaluate(() => typeof Modal !== 'undefined' && Modal.isOpen)) await g.page.keyboard.press('Escape');
    await steps(g.page, 4 + Math.floor(rnd() * 20));
    st = await state(g.page);
    done = st.screen === 'results' && st.crowned;
  }
  check('a key-mashing host still reaches the crowning', done, st.screen + '/' + st.phase);
  check('mashing (skips, replays, turbo) never changes a distance', JSON.stringify(await dists(g.page)) === JSON.stringify(calm));
  const errs = g.errors.length;
  await g.close();
  check('no page errors in any playthrough', errs === 0, errs + ' errors');
  const fails = checks.filter(c => !c.ok).length;
  console.log(fails ? fails + ' FAILED' : 'ALL ' + checks.length + ' PASSED');
  process.exitCode = fails ? 1 : 0;
}
main().catch(e => { console.error(e); process.exit(1); });
