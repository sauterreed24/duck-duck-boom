// Loads index.html in headless Chromium with the in-page bot (bot.js) and returns a page you can call EVAL.* on.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

// DDB_GAME=path/to/variant.html evaluates a candidate copy instead of the game itself
const GAME = 'file://' + path.resolve(process.env.DDB_GAME || path.join(__dirname, '..', 'index.html'));
const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');

async function openGame(opts) {
  opts = opts || {};
  const browser = opts.browser || await chromium.launch();
  // (opts.device: a Playwright device, e.g. devices['iPhone 13 landscape'], for a touch-only phone host)
  const ctx = await browser.newContext(opts.device ? Object.assign({}, opts.device, { deviceScaleFactor: 1 }) : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // the wall-clock date is fixed (the title, "today's show" and the day's ducks follow it); timers still run
  if (opts.date) await page.clock.setFixedTime(new Date(opts.date + 'T10:00:00'));
  if (!opts.live) await page.addInitScript(BOT);
  await page.goto(GAME + (opts.query || ''));
  await page.waitForFunction(() => typeof S !== 'undefined');
  return { browser, ctx, page, errors, close: async () => { await ctx.close(); if (!opts.browser) await browser.close(); } };
}

// Seed sets. "train" is what changes are tuned against; "holdout" is never tuned against (a change only counts if it
// also holds there). Days spread through a year so seasons, modifiers and courses all vary.
function days(year, count, offset) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(year, 0, 1 + offset + Math.floor(i * 365 / count), 12);
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  return out;
}
function seedSet(name, n) {
  // two races per day, seeds derived from the set name so sets never overlap
  const h = s => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
  if (name === 'train') return days(2026, 40, 3).flatMap((d, i) => [0, 1].map(j => ({ day: d, seed: h('train' + i + ':' + j), n })));
  if (name === 'train2') return days(2026, 40, 5).flatMap((d, i) => [0, 1].map(j => ({ day: d, seed: h('trainB' + i + ':' + j), n })));
  if (name === 'holdout') return days(2027, 30, 2).flatMap((d, i) => [0, 1].map(j => ({ day: d, seed: h('holdout' + i + ':' + j), n })));
  if (name === 'quickH') return days(2027, 12, 6).map((d, i) => ({ day: d, seed: h('quickH' + i), n }));
  if (name === 'quick') return days(2026, 12, 3).map((d, i) => ({ day: d, seed: h('quick' + i), n }));
  throw new Error('unknown seed set ' + name);
}

module.exports = { openGame, seedSet, GAME };
