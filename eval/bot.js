// In-page bot for the evaluator. Injected into index.html before it loads (see harness.js): it replaces
// requestAnimationFrame with a no-op so nothing runs on the wall clock, and exposes EVAL.* helpers that drive the
// real game code (createRace, update, draw, primary) one 60 Hz frame at a time. Every race is seeded (S.dbg.day,
// S.dbg.seed), so a run is exactly reproducible.
(function () {
  window.requestAnimationFrame = () => 0;
  const EVAL = (window.EVAL = {});
  const DT = 1 / 60;
  // a name mentioned as a whole name ("Player 1" is not in "Player 12")
  EVAL.mentions = (text, name) => { let i = text.indexOf(name); while (i >= 0) { const a = text[i - 1], b = text[i + name.length]; if (!(a && /[\w]/.test(a)) && !(b && /[\w]/.test(b))) return true; i = text.indexOf(name, i + 1); } return false; };

  // one frame of the real main loop, minus the wall clock (and optionally minus drawing, for speed)
  EVAL.step = function (draw) {
    // (as the real frame(): pause freezes the show clock and everything on it)
    if (!S.paused) { S.rt += DT; S.time += DT; update(DT); Particles.update(DT); Shake.update(DT); Caps.update(); Iris.update(DT); }
    S.fdt = S.paused ? 0 : DT;
    if (draw) { const t0 = performance.now(); window.draw(DT); return performance.now() - t0; }
    return 0;
  };

  function freshState(o) {
    S.history = o.history || []; S.settings.practice = true; S.settings.autoAdvance = false; S.settings.salvo = o.mode !== 'classic';
    S.settings.turboDefault = !!o.turbo; S.settings.bonusAmmo = false;
    S.dbg.day = o.day; S.dbg.seed = o.seed >>> 0; S.dbg.ov = {}; S.dbg.force = ''; S.dbg.special = '';
    S.roster = Array.from({ length: o.n }, (_, i) => ({ name: 'Player ' + (i + 1), team: i % 3, checked: true, day: o.day }));
    S.race = null; Caps.reset(); Particles.clear(); S.paused = false;
  }

  // Run one whole salvo show with a host who presses the big button as soon as it does something.
  // Returns what the audience got: timings, the lead story, who was named, which events were called.
  EVAL.runShow = function (o) {
    freshState(o);
    const draw = !!o.draw;
    const rec = { frameMs: [], leads: [], bill: [], tags: [], drawnCalls: 0, drawnKeys: {}, drawnTags: [], bigs: [], issuedCalls: 0, evFired: [], presses: 0 };
    go('roster'); Roster.hide && Roster.hide();
    if (!createRace()) return { error: 'createRace failed' };
    go('reveal');
    const tStart = S.rt;
    let guard = 0, lastLead = null, lastCap = null, tFlight = -1, tFire = -1, prevSim = 0;
    const R = S.race;
    const nameOf = new Map(R.players.map(p => [p.key, [p.duck.name, p.name]]));
    while (guard++ < 60 * 400) {
      const ms = EVAL.step(draw);
      if (draw && S.screen === 'launch' && SV.phase === 'flight') rec.frameMs.push(ms);
      // host: press the big button whenever it is lit (and the screen wipe is done)
      if (Big.enabled && Iris.t < 0 && S.rt - Big.lastPress > 0.4) {
        const before = S.screen + '|' + (L.phase === 'salvo' ? SV.phase : L.phase);
        // (stop at the salvo's result card, or at the podium: never press DONE, which would start over)
        if (!(S.screen === 'launch' && SV.phase === 'idle' && SV.result && !o.toResults) && !(S.screen === 'results' && Big.label === 'DONE')) { primary(); rec.presses++; }
        void before;
      }
      if (S.screen === 'launch' && SV.phase === 'flight' && SV.pb) {
        if (tFire < 0) { tFire = S.rt; tFlight = S.rt - tStart; prevSim = 0; }
        const pb = SV.pb, T = S.rt - tFire;
        const lead = SV.lead ? SV.lead.pl.key : null;
        if (lead !== lastLead) { rec.leads.push([T, lead]); lastLead = lead; }
        // events firing this frame (sim time crossed e.t)
        for (const f of SV.fl) for (const e of f.tl.events) if (e.t > prevSim && e.t <= pb.simT) rec.evFired.push({ T, key: f.pl.key, id: e.id, kind: (C.EVENTS[e.id] || {}).kind });
        prevSim = pb.simT;
        // the big impact captions ("TO SPACE! Lu"): who they name
        for (const b of Caps.bigs) if (!b._seen && S.rt >= b.t0) { b._seen = 1; const keys = []; for (const [k, nm] of nameOf) if (nm.some(x => x && EVAL.mentions(String(b.text).replace(/\n/g, ' '), x))) keys.push(k); rec.bigs.push({ T: b.t0 - tFire, keys, text: b.text }); }
        for (const g of SV.tags) if (!g._seen) { g._seen = 1; rec.tags.push({ T: S.rt - tFire, key: g.f.pl.key, text: g.text }); }
        if (draw && SV.drawnTags) for (const c of SV.drawnTags) if (c.text) {
          rec.drawnCalls++;
          // whose call-out reached the screen (matched back to the call-out by its text)
          // (counted only while its duck is in the picture this frame: a call-out left at a culled duck's old spot
          // tells nobody anything)
          const g = SV.tags.find(t => t.text === (c.src || c.text)); if (g && g.f.sxN === SV.drawN) { rec.drawnKeys[g.f.pl.key] = 1; if (!g._drawn) { g._drawn = 1; rec.drawnTags.push({ T: g.t0 - tFire, key: g.f.pl.key, text: g.text }); } }
        }
      }
      if (Caps.cur && Caps.cur.text !== lastCap) {
        lastCap = Caps.cur.text;
        const keys = [];
        for (const [k, nm] of nameOf) if (nm.some(x => x && EVAL.mentions(lastCap, x))) keys.push(k);
        // the caption bar wraps at 1250 px in two lines at most (a longer line is cut with an ellipsis)
        const mc = EVAL._mc || (EVAL._mc = document.createElement('canvas').getContext('2d')); mc.font = font(34, 800);
        const chip = Caps.cur.who ? Caps.cur.who.map(p => p.key) : [];
        rec.bill.push({ T: tFire >= 0 ? S.rt - tFire : -(S.rt - tStart), text: lastCap, keys, chip, trunc: wrapText(mc, lastCap, 1250, 0).length > 2, screen: S.screen, phase: SV.phase });
      }
      if (S.screen === 'launch' && SV.phase === 'idle' && SV.result && !o.toResults) break;
      if (o.toResults && S.screen === 'results' && Big.label === 'DONE' && RS.crowned && RS.t - (RS.crownAt || 0) > 5) break;
    }
    // the results page's highlights and the copied results text, as they would be for this show
    const aw = computeAwards(R).awards, hl = computeHighlights(R, 3, aw);
    const mc = EVAL._mc || (EVAL._mc = document.createElement('canvas').getContext('2d')); mc.font = font(28, 800);
    const hlRows = hl.map(h => ({ text: h, lines: wrapText(mc, '• ' + h, 1520, 0).length }));
    const copyHl = (resultsText(R).split('\n').find(l => l.indexOf('Highlight: ') === 0) || '').slice(11);
    const people = R.players.map(p => ({ duck: p.duck.name, name: p.name }));
    const res = Object.entries(R.results).map(([k, r]) => ({ k, d: r.dist, ev: r.ev.map(e => e[0]), team: (R.players.find(p => p.key === k) || {}).team }));
    res.sort((a, b) => b.d - a.d);
    return {
      day: o.day, seed: o.seed, n: o.n,
      dur: SV.pb ? SV.pb.dur : null, toFire: tFlight, showT: S.rt - tStart, frames: guard,
      photo: !!(SV.pb && SV.pb.photo), spots: SV.pb ? SV.pb.spots.map(s => ({ key: s.f.pl.key, id: s.id })) : [],
      res, leads: rec.leads, bill: rec.bill, tags: rec.tags, evFired: rec.evFired, presses: rec.presses,
      frameMs: rec.frameMs, drawnCalls: rec.drawnCalls, drawnKeys: Object.keys(rec.drawnKeys), drawnTags: rec.drawnTags, bigs: rec.bigs,
      cond: { mod: S.cond.mod || null, wind: S.cond.wind, sky: S.cond.sky },
      hlRows, copyHl, people,
    };
  };

  // Text on team colours: run part of a rendered flight with the three teams painted in the given swatches, and record
  // every text drawn straight onto a pill of a team colour (name tags, the caption bar's chip, the chase chip, the
  // off-screen arrows). Returns [{ bg, ink, n }].
  EVAL.inkPairs = function (o) {
    const SW = new Set(C.TEAM_SWATCHES.map(c => c.toLowerCase()));
    const pairs = new Map(), ofs = window.fillStroke, otxt = window.txt;
    let lastFill = null;
    window.fillStroke = function (ctx, fill) { lastFill = fill ? String(fill).toLowerCase() : null; return ofs.apply(this, arguments); };
    window.txt = function (ctx, str, x, y, op) {
      if (lastFill && SW.has(lastFill) && op && op.color) { const k = lastFill + '|' + String(op.color).toLowerCase(); pairs.set(k, (pairs.get(k) || 0) + 1); }
      lastFill = null;
      return otxt.apply(this, arguments);
    };
    try {
      const keep = deepClone(S.settings.teams);
      S.settings.teams = o.swatches.map((c, i) => ({ name: 'Team ' + (i + 1), color: c, shape: ['circle', 'square', 'triangle'][i] }));
      freshState(o);
      go('roster'); createRace(); go('reveal');
      let frames = 0, flight = 0;
      while (frames++ < 60 * 120 && flight < (o.frames || 400)) {
        EVAL.step(S.screen === 'launch' && SV.phase === 'flight');
        if (S.screen === 'launch' && SV.phase === 'flight') flight++;
        if (Big.enabled && Iris.t < 0 && S.rt - Big.lastPress > 0.4) primary();
      }
      S.settings.teams = keep;
    } finally { window.fillStroke = ofs; window.txt = otxt; }
    return Array.from(pairs.entries()).map(([k, n]) => ({ bg: k.split('|')[0], ink: k.split('|')[1], n }));
  };
})();
