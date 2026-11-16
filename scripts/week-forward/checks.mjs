// The automatic pass over a week's captures. Pure functions over plain data, so they can be tested with made-up days.
//
// A run is { days: Day[], router: { pages: {path, el}[], sheets: string[] }, doors: Door[] }, where
//   Day   = { date, kind, pages: Page[], morning?: State, evening?: State, steps: PathStep[], opened: boolean }
//   Page  = { key, url, shot, text, audit?, errors?, controls?: string[], overlay?: boolean, redirected?: boolean }
//   State = the snapshot from inpage.snapshot (football, table, matches, day, trends ...)
//   PathStep = { name, ok, note?, acks: string[], moments: string[], shot }
//   Door  = { from: routeKey, label, to: routeKey }
// Each flag is { check, day, route, evidence, shot, severity } with severity 'breaks trust' | 'confusing' | 'cosmetic'.

const flag = (check, day, route, evidence, shot, severity) => ({ check, day, route, evidence, shot, severity });
const lines = (t) => (t ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
const num = (s) => Number(String(s).replace(/,/g, ''));
const page = (d, key) => d.pages.find((p) => p.key === key);
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');

// ---- Words and leftovers on any page ----

const LEFTOVER = [
  [/\bundefined\b/, '“undefined”'],
  [/\bNaN\b/, '“NaN”'],
  [/(^|[^\w’'-])null([^\w’'-]|$)/, '“null”'],
  [/\[object Object\]/, '“[object Object]”'],
  [/\bInvalid Date\b/, '“Invalid Date”'],
  [/\b[a-z]+_[a-z0-9_]+\b/, 'a raw id with an underscore'],
  [/\b[a-z]{2,}(?:[A-Z][a-z0-9]+)+\b/, 'a camelCase code name'],
  [/\b[a-z]+-\d+[a-z0-9-]*\b/, 'a raw id with a number'],
];
const ENGINE = [
  [/[+−-]\.\d+\b/, 'an engine decimal (like “+.05”)'],
  [/\b0\.\d{2,}\b/, 'a raw decimal'],
  [/\b(reach|coef(ficient)?|multiplier|seed|weighting|xG|p\(win\))\b/i, 'engine wording'],
  [/\bseason 0\b/i, '“season 0”'],
];
/** Words that are fine although they look like code. */
const ALLOW = /\b(iPhone|iPad|YouTube|WhatsApp|PayPal|eBay|McDonald|McCain|LinkedIn|FedEx|DeepMind|MacBook|ChatGPT|PlayStation|SoundCloud|TikTok|GitHub|JavaScript|PowerPoint|OnePlus|McKenna|mcg|kWh|mAh)\b/g;

export function leftovers(p) {
  const out = [];
  const text = (p.text ?? '').replace(ALLOW, '');
  for (const [re, what] of [...LEFTOVER, ...ENGINE]) {
    const l = lines(text).find((x) => re.test(x));
    if (l) out.push({ what, line: l.slice(0, 160), engine: ENGINE.some(([r]) => r === re) });
  }
  return out;
}

export function pageFlags(day, p) {
  const out = [];
  for (const e of p.errors ?? []) out.push(flag('page error', day.date, p.key, `${e.kind}: ${e.msg}`, p.shot, 'breaks trust'));
  if (p.audit?.empty) out.push(flag('empty page', day.date, p.key, 'the page has (almost) no text', p.shot, 'breaks trust'));
  if (p.slow) out.push(flag('slow to show', day.date, p.key, 'the page was blank a second after opening, then filled in', p.shot, 'cosmetic'));
  if (p.redirected) out.push(flag('route redirected', day.date, p.key, `opened ${p.url}, landed elsewhere`, p.shot, 'cosmetic'));
  for (const l of leftovers(p)) out.push(flag(l.engine ? 'engine wording' : 'leftover', day.date, p.key, `${l.what}: “${l.line}”`, p.shot, l.engine ? 'confusing' : 'breaks trust'));
  const a = p.audit;
  if (a) {
    if (a.sideways > 0) out.push(flag('sideways scroll', day.date, p.key, `${a.sideways}px wider than the screen`, p.shot, 'confusing'));
    for (const c of a.covered ?? []) out.push(flag('covered by something fixed', day.date, p.key, `“${c.what}” is under “${c.by}” at the end of the page`, p.shot, 'confusing'));
    for (const e of a.ellipsis ?? []) out.push(flag('text cut to an ellipsis', day.date, p.key, `“${e}”`, p.shot, 'confusing'));
    if (a.smallTargets?.length) out.push(flag('target under 44 px', day.date, p.key, a.smallTargets.map((t) => `“${t.name}” ${t.w}×${t.h}`).join('; '), p.shot, 'cosmetic'));
    if (a.smallText?.length) out.push(flag('text under 14 px', day.date, p.key, a.smallText.map((t) => `“${t.text}” ${t.px}px`).join('; '), p.shot, 'confusing'));
  }
  return out;
}

// ---- A word against its numbers ----

const UP = /\b(Rising|Climbing|Improving|Up|Better|Growing|Building)\b/;
const DOWN = /\b(Easing|Falling|Dropping|Slipping|Down|Worse|Fading|Sliding)\b/;
const FIG = /(\d[\d,]*(?:\.\d+)?)/g;

/**
 * A trend word next to two figures, “now” and “was”: “14,800 · was 13,700 · Easing” (on one line or over three).
 * Flags a falling word over rising figures and the reverse (a gap under 2% is left alone).
 */
export function trendWordFlags(day, p) {
  const out = [];
  const L = lines(p.text);
  for (let i = 0; i < L.length; i++) {
    if (!/\bwas\b/i.test(L[i])) continue;
    // The figure, “was” and the word sit within a line or two of each other. “7 h 23” is one figure, in minutes.
    const win = L.slice(Math.max(0, i - 1), i + 3).join(' · ').replace(/(\d+) h (\d{1,2})\b/g, (_, h, m) => String(Number(h) * 60 + Number(m)));
    const after = win.slice(win.search(/\bwas\b/i));
    const word = after.match(UP)?.[1] ?? after.match(DOWN)?.[1];
    const m = win.match(/(\d[\d,]*(?:\.\d+)?)[^\d]{0,40}?\bwas\b[^\d]{0,12}(\d[\d,]*(?:\.\d+)?)/i);
    if (!word || !m) continue;
    const now = num(m[1]), was = num(m[2]);
    if (!was || Math.abs(now - was) / was < 0.02) continue;
    const up = UP.test(word);
    if (up !== now > was) out.push(flag('trend word against its figures', day.date, p.key, `“${word}” beside ${m[1]} now against ${m[2]} before: “${win.slice(0, 140)}”`, p.shot, 'breaks trust'));
  }
  // “built” on a line that also says nothing is: “Built · 0 of 6”.
  for (const l of L) if (/\bbuilt\b/i.test(l) && /\b0 of \d+\b/.test(l)) out.push(flag('“built” against 0 of N', day.date, p.key, `“${l}”`, p.shot, 'breaks trust'));
  return dedupe(out);
}

// ---- One number, two places ----

/** Figures each page states for the same thing, read from its lines. */
export function figures(text) {
  const L = lines(text);
  const f = {};
  const put = (k, v, l) => ((f[k] ??= []).push({ v, line: l }));
  for (const l of L) {
    const money = l.match(/€\s?(\d[\d,]*(?:\.\d+)?)\s?(m|k)?\b/);
    if (money && /\b(budget|in the bank|the club’s money|club's money|balance|money now|to spend)\b/i.test(l) && !/\b(costs?|covers?|wages?|a season|offer|fee)\b/i.test(l)) put('budget', `€${money[1]}${money[2] ?? ''}`, l);
    const md = l.match(/\bmatchday (\d+)\b/i);
    if (md) put('matchday', md[1], l);
    const sd = l.match(/\bseason (\d+)[,·\s]+day (\d+)\b/i);
    if (sd) put('season day', `${sd[1]}/${sd[2]}`, l);
    const rec = l.match(/\b(\d+)\s*W\s*·?\s*(\d+)\s*D\s*·?\s*(\d+)\s*L\b/) ?? l.match(/\bwon (\d+), drawn (\d+), lost (\d+)\b/i);
    if (rec) put('record', `${rec[1]}-${rec[2]}-${rec[3]}`, l);
    const pl = l.match(/\b(\d{1,2})(st|nd|rd|th)\b.*\b(Division|League|in the table|place)\b/i) ?? l.match(/\b(Division [A-Za-z]+|Crown League)\s*·\s*(\d{1,2})(st|nd|rd|th)\b/);
    if (pl) put('league place', pl[1].startsWith('Division') || pl[1].startsWith('Crown') ? pl[2] : pl[1], l);
    const rt = l.match(/\b(\d{2,3})\s+rating\b/i);
    if (rt && !/\b(their|opponent|average|club rated)\b/i.test(l)) put('rating', rt[1], l);
  }
  return f;
}

/** The same figure stated differently on two pages of one day (only pages that state it are compared). */
/** Pages about another club: their place, record and rating are theirs, not Brabo's. */
export const OTHER_CLUB = /^\/football\/(club-page|rival)\b/;

export function disagreementFlags(day, keys = ['budget', 'matchday', 'season day', 'record', 'league place', 'rating']) {
  const out = [];
  const seen = {};
  for (const p of day.pages) {
    if (p.overlay || OTHER_CLUB.test(p.key)) continue;
    const f = figures(p.text);
    for (const k of keys) for (const x of f[k] ?? []) ((seen[k] ??= new Map()).has(x.v) ? seen[k].get(x.v) : seen[k].set(x.v, []).get(x.v)).push({ key: p.key, line: x.line, shot: p.shot });
  }
  for (const k of keys) {
    const m = seen[k];
    if (!m || m.size < 2) continue;
    const parts = [...m].map(([v, where]) => `${v} on ${[...new Set(where.map((w) => w.key))].slice(0, 4).join(', ')} (“${where[0].line.slice(0, 70)}”)`);
    out.push(flag(`${k} disagrees between pages`, day.date, [...m.values()].map((w) => w[0].key).join(' vs '), parts.join(' | '), [...m.values()][0][0].shot, 'breaks trust'));
  }
  return out;
}

/** What the pages say against what is stored: budget, place, record, the day's steps. */
export function stateFlags(day) {
  const out = [];
  const s = day.evening ?? day.morning;
  if (!s) return out;
  const fb = s.football;
  const bra = s.table?.find((r) => r.id === 'bra');
  for (const p of day.pages) {
    if (p.overlay || OTHER_CLUB.test(p.key)) continue;
    const f = figures(p.text);
    if (bra) for (const x of f.record ?? []) if (x.v !== `${bra.w}-${bra.d}-${bra.l}` && /league|table|division/i.test(p.key + x.line)) out.push(flag('record against the table', day.date, p.key, `page says ${x.v}, the stored table ${bra.w}-${bra.d}-${bra.l}: “${x.line}”`, p.shot, 'breaks trust'));
    if (fb?.place && bra?.p) for (const x of f['league place'] ?? []) if (Number(x.v) !== fb.place && /club|league|football$/.test(p.key)) out.push(flag('league place against the table', day.date, p.key, `page says ${x.v}, the stored table ${fb.place}: “${x.line}”`, p.shot, 'breaks trust'));
  }
  const steps = s.day?.steps;
  if (steps) {
    for (const key of ['/today', '/walk']) {
      const p = page(day, key);
      if (p && !p.text.includes(fmtInt(steps)) && !p.text.includes(String(steps))) out.push(flag('steps not shown as logged', day.date, key, `${fmtInt(steps)} steps were logged; the page does not show that figure`, p.shot, 'breaks trust'));
    }
  }
  return out;
}

// ---- Fixtures and matches ----

/** The opponent a page names for tonight (“against Juventus”), if any. */
export function tonightOpponent(text) {
  const L = lines(text);
  const i = L.findIndex((l) => /^against$/i.test(l) || /^against\s+\S/i.test(l));
  if (i < 0) return undefined;
  const rest = L[i].replace(/^against\s*/i, '');
  return (rest || [L[i + 1], L[i + 2]].filter((x) => x && !/^(Pace|Power|Fuel|Rest|Routine|Shape)\b/.test(x)).join(' ')).trim() || undefined;
}

/**
 * A fixture shown for a day with no match stored for it the next morning, and a match stored for a day whose pages
 * showed no fixture. `next` is the following day (its morning state holds the night's result).
 */
export function fixtureFlags(day, next) {
  const out = [];
  if (!day.opened) return out;
  const shown = ['/today', '/football'].map((k) => [k, page(day, k)]).filter(([, p]) => p).map(([k, p]) => [k, tonightOpponent(p.text), p.shot]).filter(([, o]) => o);
  const after = next?.morning ?? next?.evening;
  if (!after) return out;
  const played = (after.matches ?? []).filter((m) => m.date === day.date && m.comp !== 'friendly');
  const paused = after.football?.paused?.date === day.date;
  if (shown.length && !played.length && !paused) out.push(flag('fixture shown, no match played', day.date, shown.map((s) => s[0]).join(', '), `“against ${shown[0][1]}” was shown; no match is stored for ${day.date} the next morning`, shown[0][2], 'breaks trust'));
  if (!shown.length && (played.length || paused)) out.push(flag('match played, not shown', day.date, '/today, /football', `a match for ${day.date} was played (${played.map((m) => m.opp).join(', ') || 'waiting'}) but neither page named tonight’s opponent`, page(day, '/football')?.shot, 'breaks trust'));
  return out;
}

// ---- Counters that should move ----

export function counterFlags(day, prev) {
  const out = [];
  const a = prev?.evening ?? prev?.morning, b = day.evening ?? day.morning;
  if (!a?.football || !b?.football) return out;
  const playedOvernight = (b.matches ?? []).some((m) => m.date === prev.date) && !(a.matches ?? []).some((m) => m.date === prev.date);
  if (playedOvernight && a.football.day === b.football.day && a.football.season === b.football.season) out.push(flag('season day did not move', day.date, '(state)', `a match was played for ${prev.date} but the season day stayed ${b.football.day}`, undefined, 'breaks trust'));
  if (playedOvernight && a.football.research?.earned === b.football.research?.earned) out.push(flag('research did not move after a match', day.date, '(state)', `research stayed at ${b.football.research?.earned} across the night of ${prev.date}`, undefined, 'confusing'));
  const logged = !['rest', 'missed', 'sleepOnly'].includes(prev.kind);
  const ta = a.football.track?.steps?.length, tb = b.football.track?.steps?.length;
  if (logged && ta !== undefined && ta === tb) out.push(flag('season track did not move', day.date, '(state)', `${prev.date} was logged, the season track stayed at ${tb} days`, undefined, 'confusing'));
  if (logged && a.football.projects && JSON.stringify(a.football.projects) === JSON.stringify(b.football.projects) && a.football.projects.some((x) => !x.done)) out.push(flag('buildings did not move', day.date, '(state)', `${prev.date} was logged; no building’s progress changed`, undefined, 'confusing'));
  return out;
}

// ---- Things that changed with nothing said ----

/** Events between two states, each with words that would show it was acknowledged. */
export function events(a, b) {
  const ev = [];
  if (!a?.football || !b?.football) return ev;
  const A = a.football, B = b.football;
  if (A.budget !== B.budget) ev.push({ what: `money ${A.budget} → ${B.budget}`, words: [/€/, /money|budget|paid|income|fee|wage/i] });
  const hired = (B.staff ?? []).filter((s) => !(A.staff ?? []).includes(s)), gone = (A.staff ?? []).filter((s) => !(B.staff ?? []).includes(s));
  if (hired.length || gone.length) ev.push({ what: `staff ${hired.length ? `joined: ${hired.join(', ')}` : ''}${gone.length ? ` left: ${gone.join(', ')}` : ''}`, words: [/staff|joins|joined|hired|arrives|leaves|left the club|on leave/i] });
  const signed = (B.sponsors ?? []).filter((s) => !(A.sponsors ?? []).some((x) => x.name === s.name));
  for (const s of signed) ev.push({ what: `sponsor signed: ${s.name}`, words: [new RegExp(esc(s.name), 'i')] });
  if ((B.leave ?? []).length > (A.leave ?? []).length) ev.push({ what: 'staff sent on leave', words: [/leave/i] });
  if (A.division !== B.division && A.division && B.division) ev.push({ what: `division ${A.division} → ${B.division}`, words: [/promot|relegat|division|go(es)? up|go(es)? down/i] });
  if (A.title !== B.title && B.title) ev.push({ what: `title now ${B.title}`, words: [new RegExp(esc(String(B.title)), 'i')] });
  const opened = (B.openings ?? []).filter((o) => !(A.openings ?? []).includes(o));
  for (const o of opened) ev.push({ what: `building finished: ${o}`, words: [/is built|is done|opens|opened|finished|New at the club/i] });
  // O42: a project or ground stage finished (its `done` set), named in the news by its name, not its id.
  const doneA = new Set((A.projects ?? []).filter((x) => x.done).map((x) => x.id));
  for (const x of (B.projects ?? []).filter((x) => x.done && !doneA.has(x.id))) if (!opened.includes(x.id)) ev.push({ what: `project finished: ${x.id}`, words: [/is built|is done|New at the club/i] });
  const trialsA = (A.trials ?? []).length, trialsB = (B.trials ?? []).length;
  if (trialsB > trialsA) ev.push({ what: `trial day held (${(B.trials.at(-1)?.came ?? []).length} came)`, words: [/trial/i] });
  if ((B.squadCount ?? 0) > (A.squadCount ?? 0)) ev.push({ what: `squad grew ${A.squadCount} → ${B.squadCount}`, words: [/joins|joined|youngster|academy|trial|signed/i] });
  return ev;
}

/** Steps over the best before: a record. */
export function recordEvent(prevBest, steps) {
  return steps && prevBest && steps > prevBest ? { what: `step record: ${fmtInt(steps)} over ${fmtInt(prevBest)}`, words: [/new (step )?record|record day|best day (yet|ever)|most steps|personal best|new best/i] } : undefined;
}

const NEWS_PAGES = ['/today', '/football', '/football/story', '/football/club', '/walk', '/you'];

/** Flags each event whose words appear nowhere the owner looks that day (toasts, moments, the main pages). */
export function ackFlags(day, evs) {
  const out = [];
  if (!evs.length) return out;
  const said = [
    ...day.steps.flatMap((s) => [...(s.acks ?? []), ...(s.moments ?? [])]),
    ...(day.pathTexts ?? []),
    ...NEWS_PAGES.map((k) => page(day, k)?.text ?? ''),
  ].join('\n');
  for (const e of evs) {
    if (e.words.every((w) => w.test(said))) continue;
    out.push(flag('changed with nothing said', day.date, NEWS_PAGES.join(', '), `${e.what}; no toast, moment or line on the day's main pages said so`, page(day, '/football')?.shot, 'confusing'));
  }
  return out;
}

// ---- Doors ----

/** A door whose own figure is not on the page it opens, the same day (a stale or wrong door value). */
export function doorFlags(day, doors) {
  const out = [];
  for (const d of doors) {
    const from = page(day, d.from), to = page(day, d.to);
    if (!from || !to) continue;
    const label = (from.controls ?? []).find((c) => c.replace(/\d[\d,.]*/g, '#') === d.shape);
    if (!label) continue;
    const figs = [...label.matchAll(FIG)].map((m) => m[1]).filter((v) => v.replace(/,/g, '').length >= 2);
    const missing = figs.filter((v) => !to.text.includes(v) && !to.text.includes(v.replace(/,/g, '')));
    if (figs.length && missing.length === figs.length) out.push(flag('door figure not on its page', day.date, `${d.from} → ${d.to}`, `the door says “${label}”; ${d.to} does not show ${missing.join(', ')}`, from.shot, 'confusing'));
  }
  return out;
}

/** Router pages the survey never reached by a door (redirects and design prototypes left out). */
export function unreachedRoutes(router, reachedKeys) {
  const reached = new Set([...reachedKeys].map((k) => k.split('?')[0]));
  const sheetsReached = new Set([...reachedKeys].map((k) => k.match(/sheet=([a-z-]+)/)?.[1]).filter(Boolean));
  const pages = router.pages.filter((p) => p.el !== 'Moved' && !p.path.startsWith('/proto/') && !reached.has(p.path)).map((p) => p.path);
  const sheets = router.sheets.filter((s) => !sheetsReached.has(s));
  return { pages, sheets };
}

// ---- The whole pass ----

/** O41 1 (O42): a night already used with no match in it must not draw a fixture as tonight's. */
export function usedNightFlags(day) {
  const out = [];
  for (const s of [day.morning, day.evening]) {
    const t = s?.tonight;
    if (!t || t.error) continue;
    if (t.fixtures > 0 && !t.played && t.lastPlayed && t.lastPlayed >= day.date) out.push(flag('fixture drawn on a night with no match', day.date, '/football', `the night of ${day.date} is already played (last played ${t.lastPlayed}) with no match, yet a fixture is drawn as tonight's`, page(day, '/football')?.shot, 'breaks trust'));
  }
  return out.slice(0, 1);
}

export function runChecks(run) {
  const flags = [];
  const days = run.days;
  for (let i = 0; i < days.length; i++) {
    const d = days[i], prev = days[i - 1], next = days[i + 1];
    for (const p of d.pages) flags.push(...pageFlags(d, p), ...trendWordFlags(d, p));
    flags.push(...disagreementFlags(d), ...stateFlags(d), ...fixtureFlags(d, next), ...counterFlags(d, prev), ...doorFlags(d, run.doors ?? []), ...usedNightFlags(d));
    const before = prev?.evening ?? prev?.morning ?? d.start, after = d.evening ?? d.morning;
    const evs = events(before, after);
    const rec = recordEvent(d.bestBefore, after?.day?.steps);
    if (rec) evs.push(rec);
    if (d.opened) flags.push(...ackFlags(d, evs));
    for (const s of d.steps) if (!s.ok) flags.push(flag('owner step could not be done', d.date, s.name, s.note ?? 'failed', s.shot, 'confusing'));
  }
  return { flags: collapse(flags), unreached: unreachedRoutes(run.router, run.reached ?? days.flatMap((d) => d.pages.map((p) => p.key))) };
}

/** The same flag on the same page every day is one flag with its days listed. */
export function collapse(flags) {
  const m = new Map();
  for (const f of flags) {
    const k = `${f.check}|${f.route}|${f.evidence.replace(/\d[\d,.]*/g, '#')}`;
    if (!m.has(k)) m.set(k, { ...f, days: [f.day] });
    else if (!m.get(k).days.includes(f.day)) m.get(k).days.push(f.day);
  }
  return [...m.values()];
}

function dedupe(fs) {
  const s = new Set();
  return fs.filter((f) => (s.has(f.evidence) ? false : s.add(f.evidence)));
}
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
