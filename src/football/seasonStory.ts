// The story of each season: its finish, cup runs, upsets both ways, and Season Wrapped (spec §5.6–5.7).
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
/** The best axis: the highest season average. */
export function bestAxisOf(matches: StoredMatch[]): { axis: Axis; avg: number } {
  const played = matches.filter((m) => !m.rotation);
  const avg = (a: Axis) => (played.length ? played.reduce((t, m) => t + m.values[a], 0) / played.length : 0);
  const axis = AXES.reduce((b, a) => (avg(a) > avg(b) ? a : b), AXES[0]);
  return { axis, avg: Math.round(avg(axis) * 10) / 10 };
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

export interface SeasonSummary { season: number; tier: Tier; pos?: number; move?: 'up' | 'down'; cups: string[]; best: { axis: Axis; avg: number }; record: { W: number; D: number; L: number }; moments: string[]; upsets: Upset[]; verdict: string; next: string }
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
  const verdict = move === 'up' ? 'Up we go. Told you. I always said this squad had it.'
    : move === 'down' ? 'Down. Fine. We regroup, we sulk for a day, we go again.'
      : !s.final ? 'Too early to judge. I’m judging anyway: promising.'
        : pos && pos <= 6 ? 'So close I can taste it. Next year.' : 'Mid-table. The wilderness. We were better than that, mostly.';
  const nextTier = (move === 'up' ? tier - 1 : move === 'down' ? tier + 1 : tier) as Tier;
  const next = s.final ? `Season ${s.id + 1} in ${tierName(nextTier)}.` : `${42 - Math.max(0, ...ms.map((m) => m.day))} days left this season.`;
  return { season: s.id, tier, pos, move, cups, best: bestAxisOf(ms), record, moments, upsets: upsets(ms, all), verdict, next };
}
