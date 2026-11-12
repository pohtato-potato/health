// The world in fog (desk-and-world spec §4, w-fog B, decision 12.8 a). Pure: no React, no Dexie.
//
// Tables and the pyramid are always open. What a club is like is not: each club has eight facts (its kit and crest,
// rating, style, weak side, known ability, hidden ability, manager and history), each fogged until something lifts
// it. Known % is what the table tells you (20%) plus the weight of each fact known.
//
// Nothing here is stored as a running total. What you know of a club is worked out from what already exists:
// - the clubs Brabo has met (`save.met`): the basics, or, for clubs met before the fog came (12.8 a), all they had;
// - scouting leads from the pick of three (`save.scouted`): enough to read them on the tactics board;
// - watching tonight's opponent at the desk: style, and the weak side on a 3 or more;
// - scout reports (the desk's `scout` effects), from the morning after the trip ends.
import type { DayKey } from '../../domain/dates';
import type { DeskState, Effect } from '../desk/types';

export type Fact = 'kit' | 'rating' | 'style' | 'weak' | 'known' | 'hidden' | 'manager' | 'history';
/** In the order a scout uncovers them. */
export const FACTS: Fact[] = ['kit', 'rating', 'style', 'weak', 'known', 'hidden', 'manager', 'history'];
/** Each fact's share of a club, in %. With the table's 20 they make 100. */
export const FACT_WEIGHT: Record<Fact, number> = { kit: 5, rating: 10, style: 15, weak: 15, known: 10, hidden: 15, manager: 5, history: 5 };
/** What the table tells you of any club: its name, place, points, founding year and ground. */
export const TABLE_PCT = 20;
export const FACT_NAME: Record<Fact, string> = {
  kit: 'Kit and crest', rating: 'Rating', style: 'How they play', weak: 'Weak side', known: 'Known ability',
  hidden: 'Hidden ability', manager: 'Their manager', history: 'History',
};

/** Meeting a club in the league or a cup: what you see from the dugout. */
export const BASICS: Fact[] = ['kit', 'rating', 'style', 'known'];
/** A club met before the fog came (12.8 a): everything the club page and the tactics board showed then. */
export const MET_BEFORE: Fact[] = ['kit', 'rating', 'style', 'weak', 'known', 'hidden'];
/** A scouting lead from the pick of three: enough to read them on the tactics board. */
export const LEAD_FACTS: Fact[] = ['kit', 'rating', 'style', 'weak'];
/** A scout over a whole division or abroad: every club's surface, never its secrets. */
export const SURFACE: Fact[] = ['kit', 'rating', 'style'];
/** How many facts one club scout brings back. */
export const CLUB_FINDS = 4;

/** Clock sizes (spec §3): a club takes 2 segments, a division or the clubs abroad 4. */
export const CLUB_CLOCK = 2;
export const WIDE_CLOCK = 4;
/** Shown chances (honest dice: the odds shown are the odds used, drawn from the spend's seed). */
export const LEAD_PCT = 25;
export const THIN_PCT = 33;

/** Stamped once on a save: the clubs met before the fog came keep what they had (12.8 a). */
export interface FogState { since: DayKey; old: string[] }
/** What the fog is worked out from: pieces of the save. */
export interface FogSource { met: string[]; scouted?: string[]; fog?: FogState; desk?: DeskState }

/** Brabo and the World Cup's nations are never in fog. */
export const fogged = (id: string) => id !== 'bra' && !id.startsWith('nat:');

export type ScoutEffect = Extract<Effect, { kind: 'scout' }>;
/** Every scout report in the desk's log, with the day its trip ended. */
export function scoutReports(desk: DeskState | undefined): { day: DayKey; e: ScoutEffect }[] {
  return (desk?.spends ?? []).flatMap((s) => s.effects.flatMap((e) => (e.kind === 'scout' ? [{ day: s.day, e }] : [])));
}

/**
 * What is known of one club. `today`: scout reports count from the morning after the trip ended (they arrive in the
 * parcel); leave it out to count every report, even one still on its way (the desk plans with that).
 */
export function factsOf(src: FogSource, id: string, today?: DayKey): Set<Fact> {
  if (!fogged(id)) return new Set(FACTS);
  const out = new Set<Fact>();
  const add = (fs: readonly Fact[]) => { for (const f of fs) out.add(f); };
  if (src.met.includes(id)) add(!src.fog || src.fog.old.includes(id) ? MET_BEFORE : BASICS);
  if (src.scouted?.includes(id)) add(LEAD_FACTS);
  for (const s of src.desk?.spends ?? []) {
    for (const e of s.effects) {
      if (e.kind === 'watch' && e.club === id) add(e.level === 'full' ? ['style', 'weak'] : ['style']);
      if (e.kind === 'scout' && (today === undefined || s.day < today)) add(e.reveal[id] ?? []);
    }
  }
  return out;
}

export const pctOf = (facts: Iterable<Fact>) => {
  let n = TABLE_PCT;
  for (const f of new Set(facts)) n += FACT_WEIGHT[f];
  return Math.min(100, n);
};
export const knownPct = (src: FogSource, id: string, today?: DayKey) => pctOf(factsOf(src, id, today));

/** Scouted for the tactics board and cup-run intentions (spec §4): style and weak side known. */
export function scoutLevelOf(facts: Set<Fact>): 'none' | 'style' | 'full' {
  return facts.has('style') && facts.has('weak') ? 'full' : facts.has('style') ? 'style' : 'none';
}
export const isScoutedBy = (src: FogSource, id: string, today?: DayKey) => scoutLevelOf(factsOf(src, id, today)) === 'full';

/** The next facts a scout would find, in order. */
export const nextFacts = (have: Set<Fact>, n: number): Fact[] => FACTS.filter((f) => !have.has(f)).slice(0, n);

/** How much of the world is seen: the mean known % over the clubs given. */
export function worldSeen(src: FogSource, ids: string[], today?: DayKey): number {
  const fog = ids.filter(fogged);
  if (!fog.length) return 100;
  return Math.round(fog.reduce((t, id) => t + knownPct(src, id, today), 0) / fog.length);
}

/** A scout target: a club, a division (`div:5`) or the clubs abroad (`abroad`). */
export type ScoutScope = { kind: 'club'; id: string } | { kind: 'div'; tier: number } | { kind: 'abroad' };
export function scopeOf(target: string): ScoutScope {
  if (target === 'abroad') return { kind: 'abroad' };
  const m = /^div:([1-6])$/.exec(target);
  return m ? { kind: 'div', tier: Number(m[1]) } : { kind: 'club', id: target };
}
export const clockSize = (target: string) => (scopeOf(target).kind === 'club' ? CLUB_CLOCK : WIDE_CLOCK);

/**
 * What a finished trip brings back. A club: the next four facts in order (a thin trip, one fewer). A division or the
 * clubs abroad: each club's surface (kit, rating, style); a thin trip leaves the style out.
 */
export function revealFor(target: string, clubs: { id: string; facts: Set<Fact> }[], thin = false): Record<string, Fact[]> {
  const sc = scopeOf(target);
  if (sc.kind === 'club') {
    const c = clubs.find((x) => x.id === sc.id);
    const f = nextFacts(c?.facts ?? new Set(), CLUB_FINDS);
    return { [sc.id]: thin ? f.slice(0, Math.max(1, f.length - 1)) : f };
  }
  const out: Record<string, Fact[]> = {};
  const want = thin ? SURFACE.filter((f) => f !== 'style') : SURFACE;
  for (const c of clubs) {
    const f = want.filter((x) => !c.facts.has(x));
    if (f.length) out[c.id] = f;
  }
  return out;
}

/** Known % before and after a reveal: the club's own, or the mean over a division's clubs. */
export function beforeAfter(clubs: { id: string; facts: Set<Fact> }[], reveal: Record<string, Fact[]>): [number, number] {
  if (!clubs.length) return [100, 100];
  const before = clubs.reduce((t, c) => t + pctOf(c.facts), 0) / clubs.length;
  const after = clubs.reduce((t, c) => t + pctOf([...c.facts, ...(reveal[c.id] ?? [])]), 0) / clubs.length;
  return [Math.round(before), Math.round(after)];
}

/** "style and weak side": facts in plain words, in order. */
export function factList(fs: Fact[]): string {
  const w = FACTS.filter((f) => fs.includes(f)).map((f) => FACT_NAME[f].toLowerCase().replace(/^how they play$/, 'style'));
  return w.length <= 1 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

/** Loan targets the scouts turned up (a 6 can find one), for the loan market (Fork 3). Oldest first. */
export function loanLeads(desk: DeskState | undefined): { day: DayKey; club: string; loan: string }[] {
  return (desk?.spends ?? []).flatMap((s) => s.effects.flatMap((e) => (e.kind === 'lead' ? [{ day: s.day, club: e.club, loan: e.loan }] : [])));
}
