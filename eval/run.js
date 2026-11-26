#!/usr/bin/env node
// Duck Duck BOOM! evaluator: plays seeded salvo shows with the real game code and prints the scorecard.
//   node eval/run.js                 train seeds (what changes are tuned against)
//   node eval/run.js --set holdout   held-out seeds (never tuned against)
//   node eval/run.js --quick         12 shows, for a fast look
//   node eval/run.js --json out.json also write every number
// Bots: the "prompt host" presses the big button the moment it lights up (sim-only shows, no drawing); the rendered
// pass draws every frame to time it and to read what actually reached the screen. Scripted playthroughs (menus,
// pause, reload, a key-mashing host) are in eval/play.js.
const fs = require('fs');
const path = require('path');
const { openGame, seedSet } = require('./harness');

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const SET = opt('--set') || (opt('--quick') ? 'quick' : 'train');

const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;

function mentions(text, name) { let i = text.indexOf(name); while (i >= 0) { const a = text[i - 1], b = text[i + name.length]; if (!(a && /\w/.test(a)) && !(b && /\w/.test(b))) return true; i = text.indexOf(name, i + 1); } return false; }
// WCAG contrast ratio of two #rrggbb colours
function contrast(a, b) {
  const L = h => { if (h === '#fff' || h === 'white') h = '#ffffff'; const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// ---- per-show measurements ----
function measure(r) {
  const fl = r.bill.filter(b => b.T >= 0 && b.T <= r.dur + 0.5);
  const keys = r.res.map(x => x.k);
  // Bill's lines about one duck: can the audience tell whose duck it is? Strict: the player's name is on screen with
  // the line (in the text, or on the caption bar's name chip). Loose also counts a call-out over that duck at the
  // same moment (it hangs over the duck wearing the player's name tag).
  const about = fl.filter(b => b.keys.length);
  const strict = about.filter(b => b.keys.every(k => mentions(b.text, r.players[k]) || (b.chip || []).includes(k)));
  const loose = about.filter(b => strict.includes(b) || b.keys.every(k => r.tags.some(t => t.key === k && t.T >= b.T - 1.5 && t.T <= b.T + 0.5)));
  // everyone's moment: a duck the show pointed at (a call-out over it, or Bill naming it) during the flight
  const named = new Set(); fl.forEach(b => b.keys.forEach(k => named.add(k)));
  const pointed = new Set([...named, ...r.tags.map(t => t.key)]);
  // the lead story
  const win = r.res[0].k, leads = r.leads.filter(l => l[1]);
  let lock = 0; for (const l of leads) if (l[1] === win) lock = l[0]; else lock = lock;
  const lastWin = leads.map(l => l[1]).lastIndexOf(win);
  const lockT = lastWin >= 0 ? leads[lastWin][0] : r.dur;
  // commentary
  const ts = fl.map(b => b.T).concat([0, r.dur]).sort((a, b) => a - b);
  let gap = 0; for (let i = 1; i < ts.length; i++) gap = Math.max(gap, ts[i] - ts[i - 1]);
  const texts = r.bill.map(b => b.text), rep = texts.length - new Set(texts).size, trunc = r.bill.filter(b => b.trunc).length;
  // results page: a highlight row (and the copied text's highlight) says whose duck each duck it mentions is
  const hlOk = t => { const ds = (r.people || []).filter(p => mentions(t, p.duck)); return ds.every(p => mentions(t, p.name)); };
  const rows = r.hlRows || [];
  return {
    hlNamed: rows.length ? rows.filter(x => hlOk(x.text)).length / rows.length : 1, hlCut: rows.filter(x => x.lines > 2).length,
    hlWrapped: rows.filter(x => x.lines > 1).length, copyNamed: r.copyHl ? (hlOk(r.copyHl) ? 1 : 0) : 1,
    // award cards: one that names another duck says whose; no card cut off
    cardsNamingDuck: (r.awardCards || []).filter(c => (r.people || []).some(p => mentions(c.text, p.duck))).length,
    cardsNamed: (r.awardCards || []).filter(c => (r.people || []).some(p => mentions(c.text, p.duck)) && hlOk(c.text)).length,
    cardsCut: (r.awardCards || []).filter(c => c.cut).length,
    linkedStrict: about.length ? strict.length / about.length : 1, linkedLoose: about.length ? loose.length / about.length : 1, aboutN: about.length,
    pointed: pointed.size / keys.length, unseen: keys.length - pointed.size,
    lockFrac: Math.min(1, lockT / r.dur), leadChanges: Math.max(0, leads.length - 1),
    margin: r.res[0].d - r.res[1].d, closeFinish: (r.res[0].d - r.res[1].d) < 0.1 * Math.max(1, r.res[0].d),
    dur: r.dur, toFire: r.toFire, gap, repeats: rep, trunc,
  };
}

function summarize(ms) {
  const col = k => ms.map(m => +m[k]);
  return {
    shows: ms.length,
    linkedStrict: { mean: r2(mean(col('linkedStrict'))), p10: r2(q(col('linkedStrict'), 0.1)) },
    linkedLoose: { mean: r2(mean(col('linkedLoose'))), p10: r2(q(col('linkedLoose'), 0.1)) },
    pointed: { mean: r2(mean(col('pointed'))), p10: r2(q(col('pointed'), 0.1)), unseenMean: r2(mean(col('unseen'))) },
    lockFrac: { p50: r2(q(col('lockFrac'), 0.5)), p25: r2(q(col('lockFrac'), 0.25)), p75: r2(q(col('lockFrac'), 0.75)) },
    leadChanges: { mean: r2(mean(col('leadChanges'))), p10: q(col('leadChanges'), 0.1) },
    closeFinish: r2(mean(col('closeFinish'))),
    margin: { p50: Math.round(q(col('margin'), 0.5)), p90: Math.round(q(col('margin'), 0.9)) },
    dur: { p10: r1(q(col('dur'), 0.1)), p50: r1(q(col('dur'), 0.5)), p90: r1(q(col('dur'), 0.9)), max: r1(Math.max(...col('dur'))) },
    toFire: { p50: r1(q(col('toFire'), 0.5)), p90: r1(q(col('toFire'), 0.9)) },
    gap: { p50: r1(q(col('gap'), 0.5)), p90: r1(q(col('gap'), 0.9)) },
    repeats: { total: col('repeats').reduce((a, b) => a + b, 0) },
    trunc: { total: col('trunc').reduce((a, b) => a + b, 0) },
    cards: { naming: col('cardsNamingDuck').reduce((a, b) => a + b, 0), named: col('cardsNamed').reduce((a, b) => a + b, 0), cut: col('cardsCut').reduce((a, b) => a + b, 0) },
    hl: { named: r2(mean(col('hlNamed'))), copy: r2(mean(col('copyNamed'))), cut: col('hlCut').reduce((a, b) => a + b, 0), wrapped: col('hlWrapped').reduce((a, b) => a + b, 0), rows: ms.length * 3 },
  };
}

async function runSet(g, set, n, draw) {
  const out = [];
  for (const c of seedSet(set, n)) {
    const r = await g.page.evaluate(c => EVAL.runShow(c), Object.assign({}, c, { draw }));
    if (r.error) throw new Error(r.error + ' ' + JSON.stringify(c));
    r.players = Object.fromEntries(r.res.map(x => [x.k, x.k.replace(/^player/, 'Player')]));
    out.push(r);
  }
  return out;
}

// fairness: does any roster slot or team win more than its share? (sim-only, many races)
async function fairness(g, races) {
  return g.page.evaluate(races => {
    const n = 12, wins = new Array(n).fill(0), team = [0, 0, 0];
    const names = Array.from({ length: n }, (_, i) => 'Player ' + (i + 1));
    let days = 0;
    for (let d = 0; d < races / 25; d++) {
      const day = '2026-' + String(1 + (d % 12)).padStart(2, '0') + '-' + String(1 + ((d * 7) % 27)).padStart(2, '0');
      const cond = dailyConditions(day, {}), course = generateCourse(day, cond); days++;
      for (let s = 0; s < 25; s++) {
        const seed = hash('fair', d, s) >>> 0;
        let best = -1e9, bi = 0;
        names.forEach((nm, i) => { const tl = SIM.simulate(flightSeed(seed, personKey(nm), 0), cond, course, generateDuck(hash(nm, day), {}), { driftSeed: seed }); if (tl.final > best) { best = tl.final; bi = i; } });
        wins[bi]++; team[bi % 3]++;
      }
    }
    const N = wins.reduce((a, b) => a + b, 0), e = N / n;
    const chi = wins.reduce((s, w) => s + (w - e) * (w - e) / e, 0);
    return { races: N, wins, team, chi2: chi, df: n - 1 };
  }, races);
}
// chi-square upper tail via Wilson-Hilferty (good enough for a 1% screen)
function chiP(x, k) { const z = (Math.pow(x / k, 1 / 3) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k)); return 0.5 * erfc(z / Math.SQRT2); }
function erfc(x) { const t = 1 / (1 + 0.5 * Math.abs(x)); const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? y : 2 - y; }

async function main() {
  const t0 = Date.now();
  const g = await openGame();
  const card = { set: SET, at: new Date().toISOString().slice(0, 10) };
  const quick = SET === 'quick';
  const s12 = await runSet(g, SET, 12, false);
  card.n12 = summarize(s12.map(measure));
  card.perShow12 = s12.map(r => Object.assign({ day: r.day, seed: r.seed, winner: r.res[0].k, dist: Math.round(r.res[0].d * 100) / 100 }, measure(r)));
  if (!quick) {
    const small = SET === 'holdout' ? 'quickH' : 'quick';
    const s30 = await runSet(g, small, 30, false);
    card.n30 = summarize(s30.map(measure));
    const s5 = await runSet(g, small, 5, false);
    card.n5 = summarize(s5.map(measure));
    const f = await fairness(g, SET === 'holdout' ? 1000 : 1500);
    card.fair = { races: f.races, chi2: r1(f.chi2), p: r2(chiP(f.chi2, f.df)), maxShare: r2(Math.max(...f.wins) / f.races * 12), team: f.team };
  }
  // rendered pass: draw every frame (headless software rendering: compare within one machine only)
  const rd = [];
  for (const c of seedSet('quick', 40).slice(0, 1)) rd.push(await g.page.evaluate(c => EVAL.runShow(c), Object.assign({}, c, { draw: true })));
  const fms = rd.flatMap(r => r.frameMs);
  // (mean, not percentiles: headless Chromium batches canvas work and flushes it every ~8 frames, so single frames
  // read as 3 ms or 140 ms; the mean per frame is what the drawing really costs)
  card.render40 = { frames: fms.length, mean: r1(mean(fms)) };
  // everyone's moment as it reached the screen: call-outs that were actually drawn (a crowded flock drops some) or
  // Bill naming the duck
  const seen = [], told = { n: 0, k: 0 };
  for (const c of seedSet(SET === 'holdout' ? 'quickH' : 'quick', 12).slice(0, quick ? 2 : 6)) {
    const r = await g.page.evaluate(c => EVAL.runShow(c), Object.assign({}, c, { draw: true }));
    const named = new Set(r.drawnKeys); r.bill.filter(b => b.T >= 0 && b.T <= r.dur + 0.5).forEach(b => b.keys.forEach(k => named.add(k)));
    seen.push(named.size / r.res.length);
    // events told: each distance-changing event whose duck got a drawn call-out or a Bill line within a moment
    for (const e of r.evFired) {
      if (e.kind === 'gag' || !e.kind) continue;
      told.n++;
      if (r.drawnTags.some(x => x.key === e.key && x.T >= e.T - 0.5 && x.T <= e.T + 2.5) || r.bill.some(x => x.keys.includes(e.key) && x.T >= e.T - 0.5 && x.T <= e.T + 3) || (r.bigs || []).some(x => x.keys.includes(e.key) && x.T >= e.T - 0.5 && x.T <= e.T + 3)) told.k++;
    }
  }
  card.drawnPointed = { shows: seen.length, mean: r2(mean(seen)), min: r2(Math.min(...seen)) };
  card.told = { events: told.n, share: Math.round(told.k / told.n * 1000) / 1000 };
  // one-by-one mode: a whole show to the crowning
  card.classic = [];
  for (const c of seedSet('quick', 4).slice(0, quick ? 1 : 2)) card.classic.push(await g.page.evaluate(c => { EVAL.runShow(Object.assign({}, c, { mode: 'classic', toResults: true })); return S.screen === 'results' && RS.crowned && Object.keys(S.race.results).length === c.n; }, c));
  // text on team colours (all eight swatches, three at a time)
  const SW = ['#0072B2', '#E69F00', '#CC79A7', '#009E73', '#56B4E9', '#D55E00', '#F0E442', '#7a5cc2'];
  const ink = [];
  for (const tri of [[0, 1, 2], [3, 4, 5], [6, 7, 0]]) ink.push(...await g.page.evaluate(o => EVAL.inkPairs(o), Object.assign({}, seedSet('quick', 12)[1], { swatches: tri.map(i => SW[i]), frames: quick ? 150 : 400 })));
  const worst = {};
  for (const p of ink) { const c = contrast(p.bg, p.ink); if (!(p.bg in worst) || c < worst[p.bg].c) worst[p.bg] = { c: r2(c), ink: p.ink }; }
  card.ink = { min: r2(Math.min(...Object.values(worst).map(w => w.c))), swatches: Object.keys(worst).length, worst };
  card.errors = g.errors.length;
  card.secs = Math.round((Date.now() - t0) / 1000);
  await g.close();
  printCard(card);
  const j = opt('--json'); if (j) fs.writeFileSync(j === true ? path.join(__dirname, 'last.json') : j, JSON.stringify(card, null, 1));
  return card;
}

function printCard(c) {
  const L = [];
  const s = c.n12;
  L.push('Scorecard (' + c.set + ' seeds, ' + s.shows + ' twelve-duck shows' + (c.n30 ? ', ' + c.n30.shows + ' thirty-duck' : '') + ')');
  L.push('1 readability  Bill names whose duck (strict)  n12 ' + s.linkedStrict.mean + (c.n30 ? '  n30 ' + c.n30.linkedStrict.mean : '') + '   loose n12 ' + s.linkedLoose.mean + (c.n30 ? ' n30 ' + c.n30.linkedLoose.mean : ''));
  L.push('2 everyone     ducks pointed at in flight       n12 mean ' + s.pointed.mean + ' p10 ' + s.pointed.p10 + (c.n30 ? '  n30 mean ' + c.n30.pointed.mean + ' p10 ' + c.n30.pointed.p10 : '') + (c.n5 ? '  n5 ' + c.n5.pointed.mean : '') + (c.drawnPointed ? '  drawn n12 mean ' + c.drawnPointed.mean + ' min ' + c.drawnPointed.min : ''));
  L.push('3 tension      winner takes lead for good at    p25 ' + s.lockFrac.p25 + ' p50 ' + s.lockFrac.p50 + ' p75 ' + s.lockFrac.p75 + ' of flight; lead changes ' + s.leadChanges.mean + '; close finish ' + s.closeFinish + '; margin p50 ' + s.margin.p50 + ' ft');
  L.push('4 pacing       flight s p10/p50/p90/max         ' + [s.dur.p10, s.dur.p50, s.dur.p90, s.dur.max].join(' / ') + (c.n30 ? '  n30 p90 ' + c.n30.dur.p90 : '') + '; reveal->fire p50 ' + s.toFire.p50 + ' s');
  L.push('5 commentary   longest silence p50/p90 ' + s.gap.p50 + '/' + s.gap.p90 + ' s; repeated lines ' + s.repeats.total + (c.n30 ? ' (n30 ' + c.n30.repeats.total + ')' : '') + '; captions cut off ' + s.trunc.total + (c.n30 ? ' (n30 ' + c.n30.trunc.total + ')' : ''));
  if (c.fair) L.push('6 fairness     win share by roster slot: chi2 ' + c.fair.chi2 + ' p=' + c.fair.p + ' (max ' + c.fair.maxShare + 'x fair share) over ' + c.fair.races + ' races; teams ' + c.fair.team.join('/'));
  L.push('7 frame time   40-duck flight: mean draw ms per frame ' + c.render40.mean + ' (' + c.render40.frames + ' frames, headless software rendering)');
  if (c.ink) L.push('9 contrast     worst text on a team colour: ' + c.ink.min + ':1 over ' + c.ink.swatches + ' swatches (' + Object.entries(c.ink.worst).map(([k, w]) => k + ' ' + w.c).join(', ') + ')');
  L.push('11 results    highlights that say whose duck ' + s.hl.named + '; copied highlight ' + s.hl.copy + (c.n30 ? ' (n30 ' + c.n30.hl.named + ')' : '') + '; rows wrapped ' + s.hl.wrapped + ', cut off ' + s.hl.cut + (c.n30 ? ' (n30 cut ' + c.n30.hl.cut + ')' : ''));
  L.push('   award cards naming another duck that say whose ' + s.cards.named + '/' + s.cards.naming + '; cards cut off ' + s.cards.cut + (c.n30 ? ' (n30 ' + c.n30.cards.named + '/' + c.n30.cards.naming + ', cut ' + c.n30.cards.cut + ')' : ''));
  if (c.told) L.push('10 events told distance-changing events the audience is told about (drawn call-out, big caption or Bill) ' + c.told.share + ' of ' + c.told.events);
  L.push('8 errors       ' + c.errors + ' page errors; one-by-one shows reaching the crowning ' + (c.classic || []).filter(Boolean).length + '/' + (c.classic || []).length + '   (' + c.secs + ' s)');
  console.log(L.join('\n'));
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { measure, summarize };
