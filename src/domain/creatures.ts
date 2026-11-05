import { addDays, daysBetween, type DayKey } from './dates';
import type { RegionId } from '../ui/light';

/**
 * The morning reveal's rules. Everything here is a pure function of the day's data and the stored sightings, seeded
 * by the date: a reload never changes who came, and a creature's stage, visits and notes are always derived.
 */
export type Tier = 'everyday' | 'medium' | 'rare';
export type Temperament = 'slow' | 'watchful' | 'restless' | 'bold';
export type Why = 'night' | 'perfect' | 'records' | 'goodNight' | 'pity';

export interface CreatureRules {
  id: string;
  tier: Tier;
  region?: RegionId;
  temperament: Temperament;
  hours?: 'dawn' | 'night';
}

export interface Sighting {
  /** `date:creatureId` */
  id: string;
  date: DayKey;
  creatureId: string;
  tier: Tier;
  stageAfter: number;
  grew: boolean;
  why: Why;
  at: number;
}

/** A small seeded generator: the same date and salt always give the same run. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** 3 visitors after 7 h or more of sleep, 2 after 6–7 h, 1 under 6 h. */
export function visitorCount(sleepMin: number): number {
  return sleepMin >= 420 ? 3 : sleepMin >= 360 ? 2 : 1;
}

export interface NightState {
  perfect: boolean;
  records: number;
  sleepMin: number;
}

export const goodNight = (sleepMin: number) => sleepMin >= 450;

/** Today's chances, as fractions. */
export function oddsFor(n: NightState): { medium: number; rare: number } {
  const manyRecords = n.records >= 2;
  const good = goodNight(n.sleepMin);
  return {
    medium: 0.04 + (n.perfect ? 0.06 : 0) + (manyRecords ? 0.05 : 0) + (good ? 0.03 : 0),
    rare: 0.01 + (n.perfect ? 0.04 : 0) + (manyRecords ? 0.04 : 0) + (good ? 0.01 : 0),
  };
}

/** How much a creature likes this night: a matching temperament counts double, and so does a matching bedtime. */
export function nightWeight(c: Pick<CreatureRules, 'temperament' | 'hours'>, sleepMin: number, asleep: number): number {
  let w = 1;
  if (sleepMin >= 480 && (c.temperament === 'slow' || c.temperament === 'watchful')) w *= 2;
  if (sleepMin < 360 && c.temperament === 'restless') w *= 2;
  // Asleep is minutes after midnight, and may be the evening before.
  const early = asleep >= 720 && asleep < 23 * 60;
  const late = asleep >= 60 && asleep < 720;
  if (early && c.hours === 'dawn') w *= 2;
  if (late && c.hours === 'night') w *= 2;
  return w;
}

export const maxStage = (tier: Tier) => (tier === 'everyday' ? 3 : tier === 'medium' ? 4 : 3);

/** Everyday: stage 2 at 4 visits, grown at 10. Medium: tracks, glimpse, sighting, then the legend at the 5th. Rare: a new form each visit, 3 in all. */
export function stageFor(tier: Tier, visits: number): number {
  if (visits <= 0) return 0;
  if (tier === 'everyday') return visits >= 10 ? 3 : visits >= 4 ? 2 : 1;
  if (tier === 'medium') return visits >= 5 ? 4 : Math.min(visits, 3);
  return Math.min(visits, 3);
}

export const isComplete = (tier: Tier, visits: number) => stageFor(tier, visits) === maxStage(tier);
/** A medium-rare creature's name only appears once it's fully seen. */
export const nameKnown = (tier: Tier, stage: number) => tier !== 'medium' || stage >= 3;

export function visitsOf(sightings: Pick<Sighting, 'creatureId'>[], id: string): number {
  let n = 0;
  for (const s of sightings) if (s.creatureId === id) n++;
  return n;
}

export interface DrawInput extends NightState {
  date: DayKey;
  asleep: number;
  region: RegionId;
  sightings: Sighting[];
  roster: CreatureRules[];
  at: number;
}

/** No rare guest in 45 days (or since the first sighting): the next perfect day brings one. */
export function pityDue(i: { date: DayKey; perfect: boolean; sightings: Pick<Sighting, 'date' | 'tier'>[] }): boolean {
  if (!i.perfect || !i.sightings.length) return false;
  const since = i.sightings.filter((s) => s.tier === 'rare').map((s) => s.date).sort().pop() ?? i.sightings.map((s) => s.date).sort()[0];
  return daysBetween(since, i.date) >= 45;
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, r: number): T | undefined {
  const total = items.reduce((n, t) => n + weight(t), 0);
  let at = r * total;
  for (const t of items) {
    at -= weight(t);
    if (at < 0) return t;
  }
  return items[items.length - 1];
}

function why(n: NightState, pity = false): Why {
  if (pity) return 'pity';
  if (n.perfect) return 'perfect';
  if (n.records >= 2) return 'records';
  if (goodNight(n.sleepMin)) return 'goodNight';
  return 'night';
}

/** Who came: everyday visitors first, a medium-rare in place of one of them, a rare guest last. */
export function drawVisitors(i: DrawInput): Sighting[] {
  const rng = seeded(`${i.date}:visitors`);
  const pools = (tier: Tier) => {
    const all = i.roster.filter((c) => c.tier === tier);
    const here = all.filter((c) => c.region === i.region);
    return here.length ? here : all;
  };
  const count = visitorCount(i.sleepMin);
  const everyday = [...pools('everyday')];
  const chosen: { c: CreatureRules; w: Why }[] = [];
  for (let k = 0; k < count && everyday.length; k++) {
    const c = pickWeighted(everyday, (x) => nightWeight(x, i.sleepMin, i.asleep), rng())!;
    everyday.splice(everyday.indexOf(c), 1);
    chosen.push({ c, w: 'night' });
  }
  const odds = oddsFor(i);
  const unfinished = (c: CreatureRules) => !isComplete(c.tier, visitsOf(i.sightings, c.id));
  const preferring = (pool: CreatureRules[]) => (pool.some(unfinished) ? pool.filter(unfinished) : pool);

  const pity = pityDue(i);
  const rareRoll = rng();
  const rare = pity || rareRoll < odds.rare ? pickWeighted(preferring(pools('rare')), () => 1, rng()) : undefined;
  const mediumRoll = rng();
  const medium = mediumRoll < odds.medium ? pickWeighted(preferring(pools('medium')), () => 1, rng()) : undefined;
  const slots = chosen.length;
  if (medium && (slots > 1 || !rare) && slots) chosen[rare ? Math.max(0, slots - 2) : slots - 1] = { c: medium, w: why(i) };
  if (rare && slots) chosen[slots - 1] = { c: rare, w: why(i, pity) };

  return chosen.map(({ c, w }, n) => {
    const before = visitsOf(i.sightings, c.id);
    const stageAfter = stageFor(c.tier, before + 1);
    return { id: `${i.date}:${c.id}`, date: i.date, creatureId: c.id, tier: c.tier, stageAfter, grew: before > 0 && stageAfter > stageFor(c.tier, before), why: w, at: i.at + n };
  });
}

/** The reveal waits for sleep, plays once a day, and holds back while yesterday's log is being finished after midnight. */
export function revealDue(i: { day?: { morning?: unknown; sleep?: unknown; revealedAt?: number }; logDay: DayKey; calendarDay: DayKey; momentsOn: boolean }): boolean {
  if (!i.momentsOn || !i.day?.morning || !i.day.sleep || i.day.revealedAt) return false;
  return i.logDay === i.calendarDay;
}

/** One new field note per visit until the notes run out. */
export function notesSoFar(notes: string[], visits: number): string[] {
  return notes.slice(0, Math.max(0, Math.min(visits, notes.length)));
}

export interface DexRow {
  id: string;
  tier: Tier;
  visits: number;
  stage: number;
  first: DayKey;
  last: DayKey;
}

/** Every creature found so far. Those not yet found don't appear at all. */
export function dexRows(sightings: Sighting[], roster: Pick<CreatureRules, 'id' | 'tier'>[]): DexRow[] {
  return roster.flatMap((c) => {
    const mine = sightings.filter((s) => s.creatureId === c.id).map((s) => s.date).sort();
    if (!mine.length) return [];
    return [{ id: c.id, tier: c.tier, visits: mine.length, stage: stageFor(c.tier, mine.length), first: mine[0], last: mine[mine.length - 1] }];
  });
}

/** The day each everyday creature grew up, which earns its theme day. */
export function grownOn(sightings: Sighting[]): { id: string; date: DayKey }[] {
  return sightings
    .filter((s) => s.tier === 'everyday' && s.grew && s.stageAfter === 3)
    .sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at)
    .map((s) => ({ id: s.creatureId, date: s.date }));
}

/** Each grown creature's theme arrives once, on the next day with no other theme. Later ones wait their turn. */
export function themeArrivals(sightings: Sighting[], hasOtherTheme: (d: DayKey) => boolean): Map<DayKey, string> {
  const out = new Map<DayKey, string>();
  for (const g of grownOn(sightings)) {
    let d = addDays(g.date, 1);
    while (hasOtherTheme(d) || out.has(d)) d = addDays(d, 1);
    out.set(d, g.id);
  }
  return out;
}

/** The creature whose theme today wears, if any: one worn by hand, or one arriving of its own. */
export function creatureThemeOn(i: { date: DayKey; worn?: string; sightings: Sighting[]; hasOtherTheme: (d: DayKey) => boolean }): string | undefined {
  if (i.worn) return i.worn;
  return i.hasOtherTheme(i.date) ? undefined : themeArrivals(i.sightings, i.hasOtherTheme).get(i.date);
}

/** The creatures whose ring style is earned: medium-rare legends and completed rare guests. */
export function earnedRingStyles(sightings: Sighting[]): string[] {
  const ids = new Set<string>();
  for (const s of sightings) if ((s.tier === 'medium' && s.stageAfter === 4) || (s.tier === 'rare' && s.stageAfter === 3)) ids.add(s.creatureId);
  return [...ids];
}

/** A rare guest arriving the morning after a record night frames that record: record date → guest. */
export function recordFrames(sightings: Sighting[], recordDates: Set<DayKey>): Map<DayKey, string> {
  const out = new Map<DayKey, string>();
  for (const s of sightings) {
    const night = addDays(s.date, -1);
    if (s.tier === 'rare' && recordDates.has(night)) out.set(night, s.creatureId);
  }
  return out;
}

/** The night's first visitor, who rests in the closed-day sky. */
export function firstVisitor(sightings: Sighting[], date: DayKey): Sighting | undefined {
  return sightings.filter((s) => s.date === date).sort((a, b) => a.at - b.at)[0];
}

/** Each creature met between two dates, once. */
export function metBetween(sightings: Sighting[], from: DayKey, to: DayKey): string[] {
  return [...new Set(sightings.filter((s) => s.date >= from && s.date <= to).sort((a, b) => a.at - b.at).map((s) => s.creatureId))];
}

/** A found slow creature for a sick day: comfort, never a reward. The same one all day. */
export function companionFor(sightings: Sighting[], roster: CreatureRules[], date: DayKey): string | undefined {
  const found = roster.filter((c) => c.temperament === 'slow' && c.tier === 'everyday' && visitsOf(sightings, c.id) > 0);
  return found.length ? found[Math.floor(seeded(`${date}:companion`)() * found.length)].id : undefined;
}

/** A found everyday creature to carry the evening's steps hint: from this region if one's been met here. */
export function stepsCreature(sightings: Sighting[], roster: CreatureRules[], region: RegionId, date: DayKey): string | undefined {
  const found = roster.filter((c) => c.tier === 'everyday' && visitsOf(sightings, c.id) > 0);
  const here = found.filter((c) => c.region === region);
  const pool = here.length ? here : found;
  return pool.length ? pool[Math.floor(seeded(`${date}:steps`)() * pool.length)].id : undefined;
}
