// The door survey and the daily page capture.
// Doors in this app are buttons that call go() or openSheet(), so routes are found by clicking every control once,
// with writes blocked (see inpage.initScript), and noting where each click lands.
import fs from 'node:fs';
import path from 'node:path';
import { audit, controls, overlayText } from './inpage.mjs';

/** Overlays that explain: the "?" buttons and their kin. */
export const QUESTION = /How this works|^\?$|\?$|^Why\b|^What\b|^How\b/i;
export const ROOTS = ['/today', '/train', '/football', '/walk', '/you'];
/** Params whose value names a different page rather than a different record (kept in the route key). */
const PAGE_PARAMS = new Set(['sheet', 'view', 'tab', 'kind', 'section', 'mode', 'live', 'step', 'page', 'show', 'part']);
/** Never clicked in the survey: these leave the app or wipe it even with writes blocked. */
const SKIP = /^(Export|Download|Share|Restore|Choose file|Import|Delete everything|Reset|Install)/i;

export const routeKey = (url) => {
  const [p, q = ''] = url.replace(/^#/, '').split('?');
  const params = new URLSearchParams(q);
  // Record params (a day, an id, a meal) open the same page for another record: left out of the key.
  const keep = [...params.keys()].filter((k) => PAGE_PARAMS.has(k)).sort().map((k) => `${k}=${params.get(k)}`);
  return keep.length ? `${p}?${keep.join('&')}` : p;
};
export const slug = (key) => key.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';

const hashOf = (page) => page.evaluate(() => location.hash.replace(/^#/, ''));

/** Opens a URL inside the running app (no reload), and waits for it to settle. */
export async function open(page, url, settle = 700) {
  await page.evaluate((u) => {
    // Through a blank page first, so the same route remounts fresh.
    history.replaceState(null, '', '#/__wf_blank');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    history.replaceState(null, '', '#' + u);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, url);
  await page.waitForTimeout(settle);
  await page.keyboard.press('Escape').catch(() => undefined);
}

/**
 * Finds every route reachable from the tab roots, clicking each control once (one of each kind of row) with writes
 * blocked. Runs `workers` tabs side by side. Returns { routes: Map<key, {url, from, label}>, overlays, unvisited }.
 */
export async function discover(context, base, { log, maxPages = 400, perPageClicks = 90, workers = 6 } = {}) {
  const routes = new Map();
  const overlays = [];
  const queue = [];
  const add = (url, from, label) => {
    const key = routeKey(url);
    if (key.startsWith('/__wf')) return;
    if (!routes.has(key)) {
      routes.set(key, { url, from, label, variants: 1 });
      queue.push(url);
    } else routes.get(key).variants++;
  };
  for (const r of ROOTS) add(r, 'tab bar', r);
  let visited = 0, busy = 0;
  const work = async (page) => {
    await page.goto(base + '?wfblock=1#/today');
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window.__wfBlock = true));
    for (;;) {
      const url = queue.shift();
      if (!url) {
        if (busy === 0) return;
        await page.waitForTimeout(300);
        continue;
      }
      if (visited >= maxPages) return;
      visited++;
      busy++;
      try {
        await surveyPage(page, url, add, overlays, perPageClicks);
      } catch (e) {
        log?.(`  survey failed on ${url}: ${e.message.split('\n')[0]}`);
      }
      busy--;
      if (visited % 10 === 0) log?.(`  survey: ${visited} pages, ${routes.size} routes found, ${queue.length} waiting`);
    }
  };
  const pages = await Promise.all(Array.from({ length: workers }, () => context.newPage()));
  await Promise.all(pages.map(work));
  await Promise.all(pages.map((p) => p.close()));
  const uniq = new Map();
  for (const o of overlays) uniq.set(`${routeKey(o.page)}|${o.label}`, o);
  return { routes, overlays: [...uniq.values()], unvisited: queue };
}

const SELECTOR = 'button, a[href], [role=button], [role=tab], [role=link]';

async function surveyPage(page, url, add, overlays, perPageClicks) {
  await open(page, url, 600);
  const list = (await page.evaluate(controls)).filter((c) => c.vis && !c.disabled && !c.tab && !SKIP.test(c.label) && !/^Back\b/i.test(c.label));
  const shapes = new Set();
  let dirty = false;
  for (const c of list.slice(0, perPageClicks)) {
    // Rows of the same kind (every player, every set) lead to the same kind of page: one of each is enough.
    const shape = c.label.replace(/\d[\d,.:]*/g, '#').slice(0, 40);
    if (shapes.has(shape)) continue;
    shapes.add(shape);
    if (dirty) {
      await open(page, url, 350);
      dirty = false;
    }
    const before = await hashOf(page);
    const overlayBefore = await page.evaluate(overlayText).catch(() => null);
    const ok = await page.evaluate(({ i, label, sel }) => {
      const els = [...document.querySelectorAll(sel)];
      const name = (e) => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const el = els[i] && name(els[i]) === label ? els[i] : els.find((e) => name(e) === label);
      if (!el) return false;
      el.click();
      return true;
    }, { i: c.i, label: c.label, sel: SELECTOR }).catch(() => false);
    if (!ok) continue;
    await page.waitForTimeout(150);
    const after = await hashOf(page);
    if (after !== before) {
      dirty = true;
      if (!after.startsWith('/__wf')) add(after, url, c.label);
      continue;
    }
    const text = await page.evaluate(overlayText).catch(() => null);
    if (text && text.length > 10 && text !== overlayBefore) {
      overlays.push({ page: url, label: c.label, index: c.i, text: text.slice(0, 2000) });
      dirty = true;
    }
  }
}

/** Reads the router's page paths from src/App.tsx, so the list of routes is the app's own. */
export function routerPaths(appSource) {
  const block = appSource.slice(appSource.indexOf('const PAGES'), appSource.indexOf('export function App'));
  const pages = [...block.matchAll(/^\s*'([^']+)':\s*\{\s*el:\s*\(\)\s*=>\s*(<\w+)/gm)].map((m) => ({ path: m[1], el: m[2].slice(1) }));
  const sheetsBlock = appSource.slice(appSource.indexOf('const SHEETS'), appSource.indexOf('const PAGES'));
  const sheets = [...sheetsBlock.matchAll(/^\s*'?([a-z-]+)'?:\s*\(\)/gm)].map((m) => m[1]);
  return { pages, sheets };
}

/**
 * Captures every route: picture, text, its controls and the audit. Writes are blocked, so looking changes nothing.
 * Runs `workers` tabs side by side; the result is in the routes' own order.
 */
export async function capture(context, base, routes, overlays, dir, { log, workers = 4 } = {}) {
  fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
  const jobs = [
    ...[...routes].map(([key, r]) => ({ key, url: r.url })),
    // Daily, the "?" sheets and other explainers are opened again; every other overlay is listed in the route map.
    ...overlays.filter((x) => QUESTION.test(x.label)).map((o) => ({ key: `${routeKey(o.page)} » ${o.label.slice(0, 40)}`, url: o.page, overlay: o })),
  ];
  const out = new Array(jobs.length);
  let next = 0;
  const work = async (page) => {
    await page.goto(base + '?wfblock=1#/today');
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window.__wfBlock = true));
    for (let j = next++; j < jobs.length; j = next++) {
      try {
        out[j] = await (jobs[j].overlay ? captureOverlay(page, jobs[j], dir) : capturePage(page, jobs[j], dir));
      } catch (e) {
        out[j] = { key: jobs[j].key, url: jobs[j].url, text: '', errors: [{ kind: 'capture', msg: e.message.split('\n')[0] }] };
      }
    }
  };
  const pages = await Promise.all(Array.from({ length: workers }, () => context.newPage()));
  await Promise.all(pages.map(work));
  await Promise.all(pages.map((p) => p.close()));
  log?.(`  captured ${out.filter(Boolean).length} pages and explainers`);
  return out.filter(Boolean);
}

async function capturePage(page, { key, url }, dir) {
  await page.evaluate(() => (window.__wfErrors = []));
  await open(page, url, 900);
  // A page still blank after the settle is given a second look, so a slow load is told apart from an empty page.
  let a = await page.evaluate(audit);
  let slow = false;
  if (a.empty) {
    await page.waitForTimeout(2500);
    a = await page.evaluate(audit);
    slow = !a.empty;
  }
  const landed = await hashOf(page);
  const text = await page.evaluate(() => document.body.innerText);
  const controlsNow = (await page.evaluate(controls)).filter((c) => c.vis).map((c) => c.label);
  const all = await page.evaluate(() => window.__wfErrors);
  const errors = all.filter((e) => !/WF-BLOCKED|ReadOnlyError/.test(e.msg));
  const s = slug(key);
  const shot = path.join(dir, 'pages', `${s}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  fs.writeFileSync(path.join(dir, 'pages', `${s}.txt`), text);
  return { key, url, landed, shot, text, controls: controlsNow, audit: a, slow, errors, blockedWrites: all.length - errors.length, redirected: routeKey(landed) !== key };
}

async function captureOverlay(page, { key, url, overlay: o }, dir) {
  await open(page, url, 600);
  const clicked = await page.evaluate(({ i, label, sel }) => {
    const els = [...document.querySelectorAll(sel)];
    const name = (e) => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const el = els.find((e) => name(e) === label) ?? els[i];
    if (!el) return false;
    el.click();
    return true;
  }, { i: o.index, label: o.label, sel: SELECTOR });
  if (!clicked) return { key, url, overlay: true, text: '', missing: true, errors: [] };
  await page.waitForTimeout(500);
  const text = (await page.evaluate(overlayText)) ?? '';
  const s = 'overlay_' + slug(key).slice(0, 90);
  const shot = path.join(dir, 'pages', `${s}.png`);
  await page.screenshot({ path: shot });
  fs.writeFileSync(path.join(dir, 'pages', `${s}.txt`), text);
  return { key, url, overlay: true, shot, text, audit: await page.evaluate(audit), errors: [] };
}
