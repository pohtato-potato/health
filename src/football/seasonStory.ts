// The story of each season: its finish, cup runs, upsets both ways, and Season Wrapped (spec §5.6–5.7).
import { seasonLength } from './calendar';
import { worldOf } from './pyramid/shape';
import { tierName } from './data/load';
import type { Bracket } from './cups';
import { CONT_NAME } from './continental';
import { AXES, type Axis, type Tier } from './types';
import type { FbSeason, StoredMatch } from './store/tables';

const OWN = 'bra';
export interface Upset { id: string; date: string; season: number; dir: 'for' | 'against'; gap: number; text: string }
/** Upsets: a win over a club in a higher tier, or a loss to one in a lower tier. */
export function upsets(matches: StoredMatch[], seasons: FbSeason[]): Upset[] {
  const by = new Map(seasons.map((s) => [s.id, s]));
  const out: Upset[] = [];
  for (const m of matches) {
    const s = by.get(m.season);
    const mine = s?.tierOf[OWN], theirs = s?.tierOf[m.opp];
    if (!mine || !theirs || m.result === 'D') continue;
    const gap = mine - theirs; // positive: they're higher up
    if (m.result === 'W' && gap > 0) out.push({ id: m.id, date: m.date, season: m.season, dir: 'for', gap, text: `Beat a side ${gap} ${gap === 1 ? 'tier' : 'tiers'} up` });
    if (m.result === 'L' && gap < 0) out.push({ id: m.id, date: m.date, season: m.season, dir: 'against', gap: -gap, text: `Lost to a side ${-gap} ${gap === -1 ? 'tier' : 'tiers'} down` });
  }
  return out;
}
/** One card in the scrapbook (board 19, s19-book): a screamer, a wonder save, a giant beaten or a run of wins. */
export type PageKind = 'scr' | 'sav' | 'giant' | 'run';
export interface ScrapPage { id: string; kind: PageKind; date: string; season: number; title: string; line: string; sub: string; m?: StoredMatch; gap?: number }
const RUN_FROM = 5;
const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
/** The score as text, home side first. Score is stored Brabo first. */
export function scoreLine(m: StoredMatch, name: (id: string) => string): string {
  const us = name(OWN), them = name(m.opp);
  const [a, b] = m.score;
  return m.braboHome ? `${us} ${a}–${b} ${them}` : `${them} ${b}–${a} ${us}`;
}
const where = (m: StoredMatch) => m.round ?? (m.comp === 'league' ? 'League' : 'Cup');
/** Every scrapbook card, newest first: one per match with a screamer or a wonder save, each giant beaten, each run of 5+ wins. */
export function scrapbook(matches: StoredMatch[], seasons: FbSeason[], name: (id: string) => string): ScrapPage[] {
  const out: ScrapPage[] = [];
  const nm = (id: string) => { try { return name(id); } catch { return 'them'; } };
  for (const m of matches) {
    const cs = m.events?.chances ?? [];
    const scr = cs.filter((c) => c.tag === 'SCREAMER');
    if (scr.length) out.push({ id: `${m.id}-scr`, kind: 'scr', date: m.date, season: m.season, m,
      title: scr.length === 1 ? `Screamer ${scr[0].pct}%` : `${scr.length === 2 ? 'Two' : scr.length} screamers`, line: scoreLine(m, nm),
      sub: scr.length === 1 ? `${scr[0].minute}′ · ${shortDay(m.date)}` : scr.map((c) => `${c.pct}% at ${c.minute}′`).join(' · ') });
    for (const c of cs.filter((x) => x.tag === 'WONDER SAVE'))
      out.push({ id: `${m.id}-sav-${c.minute}`, kind: 'sav', date: m.date, season: m.season, m, title: `Wonder save ${c.pct}%`, line: scoreLine(m, nm), sub: `${c.minute}′ · ${shortDay(m.date)}` });
  }
  for (const u of upsets(matches, seasons).filter((x) => x.dir === 'for')) {
    const m = matches.find((x) => x.id === u.id)!;
    out.push({ id: `${m.id}-giant`, kind: 'giant', date: m.date, season: m.season, m, gap: u.gap, title: 'Giant beaten', line: scoreLine(m, nm),
      sub: `${where(m)} · ${shortDay(m.date)} · ${u.gap} ${u.gap === 1 ? 'tier' : 'tiers'} above you` });
  }
  let run: StoredMatch[] = [];
  const close = () => {
    if (run.length >= RUN_FROM) {
      const a = run[0], z = run[run.length - 1];
      out.push({ id: `${a.id}-run`, kind: 'run', date: z.date, season: z.season, title: `${run.length} wins in a row`, line: `${shortDay(a.date)} to ${shortDay(z.date)}`, sub: `Scored ${run.reduce((s, x) => s + x.score[0], 0)}, let in ${run.reduce((s, x) => s + x.score[1], 0)}` });
    }
    run = [];
  };
  for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date))) { if (m.result === 'W') run.push(m); else close(); }
  close();
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
/** The best axis: the highest season average. */
/** Each axis's average over the season's played matches, to one decimal. */
export function axisAverages(matches: StoredMatch[]): Record<Axis, number> {
  const played = matches.filter((m) => !m.rotation);
  return Object.fromEntries(AXES.map((a) => [a, played.length ? Math.round((played.reduce((t, m) => t + m.values[a], 0) / played.length) * 10) / 10 : 0])) as Record<Axis, number>;
}
export function bestAxisOf(matches: StoredMatch[]): { axis: Axis; avg: number } {
  const avgs = axisAverages(matches);
  const axis = AXES.reduce((b, a) => (avgs[a] > avgs[b] ? a : b), AXES[0]);
  return { axis, avg: avgs[axis] };
}
/** How far Brabo went in a bracket: winners, the round they went out in, or not entered. */
export function cupRun(b: Bracket | undefined): string | undefined {
  if (!b) return undefined;
  if (b.winner === OWN) return `${b.name}: winners`;
  for (let i = b.rounds.length - 1; i >= 0; i--) {
    const t = b.rounds[i].ties.find((x) => x.home === OWN || x.away === OWN);
    if (!t) continue;
    const r = b.rounds[i].name.toLowerCase();
    return t.winner && t.winner !== OWN ? `${b.name}: out in the ${r}` : t.winner === OWN ? `${b.name}: through the ${r}` : `${b.name}: still in, ${r}`;
  }
  return undefined;
}

export interface SeasonSummary { season: number; tier: Tier; pos?: number; move?: 'up' | 'down'; cups: string[]; best: { axis: Axis; avg: number }; avgs: Record<Axis, number>; record: { W: number; D: number; L: number }; moments: string[]; upsets: Upset[]; verdict: string; next: string }
export function summarise(s: FbSeason, matches: StoredMatch[], all: FbSeason[]): SeasonSummary {
  const tier = s.tierOf[OWN];
  const ms = matches.filter((m) => m.season === s.id);
  const pos = s.final ? s.final.tables[tier].findIndex((r) => r.id === OWN) + 1 : undefined;
  const move = s.final?.up[tier]?.includes(OWN) ? 'up' : s.final?.down[tier]?.includes(OWN) ? 'down' : undefined;
  const record = { W: 0, D: 0, L: 0 };
  for (const m of ms) if (m.comp !== 'friendly') record[m.result]++;
  const count = new Map<string, number>();
  for (const m of ms) for (const x of m.events.moments) count.set(x, (count.get(x) ?? 0) + 1);
  const moments = [...count].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([x, n]) => (n > 1 ? `${x} ×${n}` : x));
  const ct = s.continental;
  const contLine = ct?.ko ? cupRun(ct.ko) : ct?.field.includes(OWN) && ct.results.length === 8 ? `${CONT_NAME}: out in the league phase` : ct?.field.includes(OWN) && ct.results.length ? `${CONT_NAME}: league phase, ${ct.results.length} of 8 played` : undefined;
  const cups = [contLine, cupRun(s.clubworld), cupRun(s.bigcup), ...Object.values(s.tiercups).map(cupRun)].filter(Boolean) as string[];
  const verdict = s.final?.double?.id === OWN || (s.final?.level?.id === OWN && s.final.level.dir === 'up') ? 'Two divisions in one go. Nobody down there could live with us.'
    : move === 'up' ? 'Up we go. Told you. I always said this squad had it.'
    : move === 'down' ? 'Down. Fine. We regroup, we sulk for a day, we go again.'
      : !s.final ? 'Too early to judge. I’m judging anyway: promising.'
        : pos && pos <= 6 ? 'So close I can taste it. Next year.' : 'Mid-table. The wilderness. We were better than that, mostly.';
  const nextTier = (s.final?.level?.id === OWN ? s.final.level.to : s.final?.double?.id === OWN ? tier - 2 : move === 'up' ? tier - 1 : move === 'down' ? tier + 1 : tier) as Tier;
  const next = s.final ? `Season ${s.id + 1} in ${tierName(nextTier)}.` : `${seasonLength(worldOf(s)) - Math.max(0, ...ms.map((m) => m.day))} days left this season.`;
  return { season: s.id, tier, pos, move, cups, best: bestAxisOf(ms), avgs: axisAverages(ms), record, moments, upsets: upsets(ms, all), verdict, next };
}
