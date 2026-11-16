// Code that runs inside the app's page (passed to page.evaluate / addInitScript). Plain functions only: each must
// stand alone, since Playwright sends its source text to the browser.

/**
 * Installed before the app loads. While `window.__wfBlock` is true, nothing can be written: IndexedDB read-write
 * transactions and localStorage writes throw. The door survey clicks every control with writes blocked, so a click
 * can only show where it leads, never sign, buy or tick anything. Also collects page errors for the audit.
 */
export function initScript() {
  // Survey tabs open with ?wfblock in the address, so nothing is written even while the app starts.
  window.__wfBlock = location.search.includes('wfblock');
  window.__wfErrors = [];
  const tx = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
    if (window.__wfBlock && mode === 'readwrite') throw new DOMException('WF-BLOCKED: write blocked during the survey', 'ReadOnlyError');
    return tx.call(this, stores, mode, ...rest);
  };
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (...a) {
    if (window.__wfBlock) return;
    return set.apply(this, a);
  };
  window.open = () => null;
  const push = (kind, msg) => window.__wfErrors.push({ kind, msg: String(msg).slice(0, 400), at: location.hash });
  window.addEventListener('error', (e) => push('error', e.message));
  window.addEventListener('unhandledrejection', (e) => push('rejection', e.reason && (e.reason.message || e.reason)));
  const ce = console.error;
  console.error = (...a) => {
    push('console', a.map((x) => (x && x.message) || x).join(' '));
    return ce.apply(console, a);
  };
}

/** Restores a backup file's text with the app's own `restoreData`. */
export async function restore(text) {
  const m = await import('/src/db/backup.ts');
  await m.restoreData(m.parseBackup(text));
}

/**
 * The stored state's key numbers, read with the app's own modules so the figures are the ones the app would show.
 * `date` is the logging day to read the trend rows and rings for.
 */
export async function snapshot(date) {
  const { db } = await import('/src/db/db.ts');
  const { standings, position } = await import('/src/football/table.ts');
  const { trendRows, momentumOn } = await import('/src/domain/momentum.ts');
  const { totalsFor, ringsFor } = await import('/src/domain/rings.ts');
  const { loadTonight } = await import('/src/football/store/hooks.ts');
  const { hiredStaff } = await import('/src/football/tree/research.ts');
  const { targetsFor } = await import('/src/state/derived.ts');
  const save = await db.fbSave.get('save');
  const settings = await db.settings.get('app');
  const days = await db.days.toArray();
  const entries = await db.entries.toArray();
  const sessions = await db.sessions.toArray();
  const season = save ? await db.fbSeasons.get(save.season) : undefined;
  const matches = (await db.fbMatches.toArray()).map((m) => ({ id: m.id, date: m.date, season: m.season, comp: m.comp, opp: m.opp, home: m.home, score: m.score, result: m.result, watched: m.watched }));
  const news = (await db.fbNews.toArray()).map((n) => ({ date: n.date, kind: n.kind, text: n.text ?? n.title ?? n.line }));
  let table, place, division;
  if (season && save) {
    division = season.tierOf?.bra;
    const ids = Object.entries(season.tierOf).filter(([, t]) => t === division).map(([id]) => id);
    table = standings(season.results?.[division] ?? [], ids, season.deductions ?? {}).map((r) => ({ id: r.id, p: r.p, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts }));
    place = position(table, 'bra');
  }
  let tonight;
  try {
    const t = await loadTonight(date);
    tonight = t ? { date: t.date, opp: t.opp ?? t.oppId ?? t.match?.opp, comp: t.comp, played: !!t.played, keys: Object.keys(t) } : null;
  } catch (e) {
    tonight = { error: String(e && e.message) };
  }
  const day = days.find((d) => d.date === date);
  let rings, trends, momentum;
  try {
    rings = settings && ringsFor(totalsFor(day, entries.filter((e) => e.date === date)), targetsFor(settings, date));
  } catch (e) {
    rings = { error: String(e && e.message) };
  }
  try {
    const input = { settings, days, entries, sessions };
    trends = trendRows(date, input);
    momentum = momentumOn(date, input);
  } catch (e) {
    trends = { error: String(e && e.message) };
  }
  const tu = save?.treeUser ?? {};
  const te = save?.tree ?? {};
  return {
    date,
    football: save && {
      season: save.season, phase: save.phase, day: save.day, lastPlayed: save.lastPlayed, world: save.world, division, place,
      budget: save.budget, staff: hiredStaff((save.treeUser?.researched ?? []).map((r) => r.id)).map((x) => x.id), leave: te.leave ?? [], sponsors: (save.sponsors ?? []).map((s) => ({ name: s.name, slot: s.slot, since: s.since })),
      offers: (save.offers ?? []).length, crest: save.crest, kits: save.kits ?? [], openings: save.openings ?? [], paused: save.paused ? { date: save.paused.date, opp: save.paused.prep?.oppId } : null,
      research: { earned: te.earned, gains: (te.gains ?? []).slice(-5), techs: (tu.researched ?? []).map((r) => r.id) },
      track: te.track, desk: save.desk,
      projects: (await db.fbBundles.toArray()).map((b) => ({ id: b.id, progress: b.progress, done: b.done })),
      squadCount: (await db.fbSquad.count()), playersCount: (await db.fbPlayers.count()),
      trials: save.globe?.trials ?? [], parcel: save.around?.parcel, title: settings?.title,
    },
    table, tonight,
    matches: matches.filter((m) => m.season === save?.season || m.date >= '2026-11-01'),
    news: news.slice(-12),
    day: day && { date: day.date, steps: day.steps, sleep: day.sleep, closed: day.closed ?? day.closedAt ?? day.sealed, morning: !!day.morning, ticks: day.ticks && Object.keys(day.ticks).length },
    rings, trends, momentum,
    sessions: sessions.filter((s) => s.date >= '2026-11-10').map((s) => ({ date: s.date, session: s.session, done: !!s.endedAt || !!s.done })),
    theme: settings?.prefs?.theme ?? settings?.theme,
  };
}

/** Measures what a low-vision owner would trip on, on the page as it is now. */
export function audit() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && !el.closest('[aria-hidden="true"]');
  };
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
  const out = { smallTargets: [], smallText: [], ellipsis: [], covered: [], sideways: 0, empty: false };
  for (const el of document.querySelectorAll('button, a[href], [role=button], [role=switch], [role=radio], [role=tab], input:not([type=hidden]), select')) {
    if (!vis(el) || el.disabled) continue;
    const r = el.getBoundingClientRect();
    // A control inside a larger control is reached through the larger one.
    if (el.parentElement && el.parentElement.closest('button, a[href], [role=button], label')) continue;
    if (el.type === 'range' || el.type === 'checkbox' && el.closest('label')) continue;
    if (r.height < 43.5 || r.width < 43.5) out.smallTargets.push({ name: name(el), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || !vis(el) || el.closest('svg') || el.closest('.sr-only')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 13.5 && !seen.has(t)) {
      seen.add(t);
      out.smallText.push({ text: t.slice(0, 50), px: Math.round(fs * 10) / 10 });
    }
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (!vis(el) || !el.innerText) continue;
    const cs = getComputedStyle(el);
    const clipped = (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (cs.webkitLineClamp !== 'none' && cs.webkitLineClamp && el.scrollHeight > el.clientHeight + 2);
    if (clipped) out.ellipsis.push(el.innerText.replace(/\s+/g, ' ').trim().slice(0, 80));
  }
  out.sideways = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  // Empty: nothing but the tab bar and floating pills (a blank page still shows those).
  const own = [...document.querySelectorAll('.tabbar, .resume')].map((e) => e.innerText || '').join('');
  out.empty = (document.body.innerText || '').replace(/\s+/g, '').length - own.replace(/\s+/g, '').length < 20;
  // Something fixed covering content: scroll to the end, then check the last few controls and lines can be hit.
  window.scrollTo(0, document.documentElement.scrollHeight);
  // An open sheet or dialog covers the page on purpose: only pages without one are checked.
  const modal = [...document.querySelectorAll('.sheet, .scrim, [role=dialog][aria-modal=true]')].some(vis);
  const fixed = modal ? [] : [...document.body.querySelectorAll('*')].filter((el) => ['fixed', 'sticky'].includes(getComputedStyle(el).position) && vis(el));
  const content = [...document.querySelectorAll('.page button, .page a[href], .page p, .page h2, .page h3, .page li')].filter(vis).filter((el) => !fixed.some((f) => f.contains(el)));
  for (const el of content.slice(-6)) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 10);
    if (y < 0 || y > window.innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (hit && !el.contains(hit) && !hit.contains(el) && fixed.some((f) => f.contains(hit))) out.covered.push({ what: name(el), by: name(fixed.find((f) => f.contains(hit))) });
  }
  window.scrollTo(0, 0);
  out.smallTargets = out.smallTargets.slice(0, 25);
  out.smallText = out.smallText.slice(0, 25);
  out.ellipsis = [...new Set(out.ellipsis)].slice(0, 25);
  return out;
}

/** Every control on the page as the survey sees it, in document order, with a stable label. */
export function controls() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  return [...document.querySelectorAll('button, a[href], [role=button], [role=tab], [role=link]')]
    .map((el, i) => ({ i, label: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80), tab: !!el.closest('.tabbar'), disabled: !!el.disabled, vis: vis(el) }));
}

/** The visible overlay (sheet, dialog, popover), if one is open: its text. */
export function overlayText() {
  const el = [...document.querySelectorAll('[role=dialog], dialog[open], .sheet, .k-sheet, .popover, [role=alertdialog]')].filter((e) => e.getBoundingClientRect().height > 20).pop();
  return el ? el.innerText.replace(/\n{3,}/g, '\n\n').trim() : null;
}

/** Short-lived acknowledgements on screen right now: toasts, moments, banners. */
export function acks() {
  return [...document.querySelectorAll('.toasts .toast, .moment, .fb-moment')]
    .map((e) => e.innerText.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 2)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 10);
}
