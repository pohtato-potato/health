import { ACHIEVEMENTS, type AchDef } from './achievements';

/** What achievements unlock beyond the badge: titles, confetti, gold rings, gym mode. */

const TIER_XP: Record<string, number> = { b: 10, s: 25, g: 60, p: 150 };

export function xpFrom(unlockedIds: string[], counts: { perfect: number; sessions: number; checkins: number }): number {
  const ach = unlockedIds.reduce((n, id) => n + (TIER_XP[ACHIEVEMENTS.find((a) => a.id === id)?.tier ?? ''] ?? 0), 0);
  return ach + counts.perfect * 3 + counts.sessions * 5 + counts.checkins * 20;
}

/** Level 1 at nothing, 2 at 25 XP, 3 at 100, 4 at 225, and so on. */
export function levelOf(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const floor = 25 * (level - 1) ** 2;
  const next = 25 * level ** 2;
  return { level, xp, floor, next, progress: (xp - floor) / (next - floor) };
}

export interface TitleDef {
  id: string;
  name: string;
  how: string;
  unlocked: (u: Set<string>, level: number) => boolean;
}

const LEVEL_TITLES: [number, string][] = [
  [1, 'Rookie'],
  [5, 'Regular'],
  [10, 'Veteran'],
  [15, 'Old hand'],
  [20, 'Legend'],
];

/** "The ‘Wall’ title" → "Wall". */
export const titleFromReward = (reward: string) => /‘([^’]+)’ title/.exec(reward)?.[1];

export const TITLES: TitleDef[] = [
  ...LEVEL_TITLES.map(([lvl, name]) => ({ id: `lvl:${lvl}`, name, how: `Reach level ${lvl}`, unlocked: (_: Set<string>, level: number) => level >= lvl })),
  ...ACHIEVEMENTS.filter((a) => a.reward && titleFromReward(a.reward)).map((a: AchDef) => ({
    id: `ach:${a.id}`,
    name: titleFromReward(a.reward!)!,
    how: a.cat === 'secret' ? 'A secret achievement' : `Unlock ${a.name}`,
    unlocked: (u: Set<string>) => u.has(a.id),
  })),
];

export const CONFETTI: { id: string; name: string; reward?: string; palette: string[] }[] = [
  { id: 'classic', name: 'Classic', palette: [] },
  { id: 'holi', name: 'Holi', reward: 'Holi confetti', palette: ['#ff7aa8', '#ffd35c', '#5fd6a0', '#6fb3ff', '#c08cff'] },
  { id: 'birthday', name: 'Birthday', reward: 'Birthday confetti', palette: ['#f7c96b', '#d6a8ff', '#ff9c8a', '#8fc9b0'] },
  { id: 'tricolour', name: 'Tricolour', reward: 'Tricolour confetti', palette: ['#ff9933', '#ffffff', '#138808', '#1d3fa8'] },
  { id: 'legendary', name: 'Legendary', reward: 'Legendary confetti', palette: ['#e6c47a', '#f0d79e', '#dde8f2', '#b7a6f0', '#ffffff'] },
];

/** The achievement behind a reward line, like "Gold rings". */
export const rewardAch = (reward: string) => ACHIEVEMENTS.find((a) => a.reward === reward || a.reward?.startsWith(reward));

export function hasReward(u: Set<string>, reward: string): boolean {
  const a = rewardAch(reward);
  return !!a && u.has(a.id);
}

/** The confetti palette to use, if a special one is picked and earned. */
export function confettiPalette(pick: string | undefined, u: Set<string>): string[] | undefined {
  const c = CONFETTI.find((x) => x.id === pick);
  if (!c || !c.reward || !hasReward(u, c.reward)) return undefined;
  return c.palette;
}

export interface CharStats {
  /** 0 to 20 each. */
  str: number;
  end: number;
  vit: number;
  nut: number;
  dis: number;
  jnt: number;
}

export const STAT_NAMES: Record<keyof CharStats, { name: string; what: string }> = {
  str: { name: 'Strength', what: 'How far your lifts have climbed since the start' },
  end: { name: 'Endurance', what: 'Steps this week against your target' },
  vit: { name: 'Vitality', what: 'Nights on your sleep target in the last two weeks' },
  nut: { name: 'Nourishment', what: 'Protein days in the last two weeks' },
  dis: { name: 'Discipline', what: 'Days logged in the last month' },
  jnt: { name: 'Joint care', what: 'Days since a joint flag, and flags heeded' },
};

const clamp = (n: number) => Math.max(0, Math.min(20, Math.round(n)));

export function charStats(i: { strengthGain: number; stepsRatio: number; sleepNights14: number; proteinDays14: number; logged30: number; daysSinceFlag?: number }): CharStats {
  return {
    str: clamp(8 + i.strengthGain * 40),
    end: clamp(i.stepsRatio * 16),
    vit: clamp((i.sleepNights14 / 14) * 20),
    nut: clamp((i.proteinDays14 / 14) * 20),
    dis: clamp((i.logged30 / 30) * 20),
    jnt: clamp(i.daysSinceFlag === undefined ? 20 : 6 + i.daysSinceFlag / 3),
  };
}

export interface CharStatsV2 {
  /** 0 to 20 each. */
  str: number;
  sta: number;
  fuel: number;
  rest: number;
  form: number;
  wand: number;
}

export const STAT_NAMES_V2: Record<keyof CharStatsV2, { name: string; what: string }> = {
  str: { name: 'Strength', what: 'records and ladder climbs' },
  sta: { name: 'Stamina', what: 'steps and carries' },
  fuel: { name: 'Fuel', what: 'protein days' },
  rest: { name: 'Rest', what: 'sleep regularity' },
  form: { name: 'Form', what: 'clean reps' },
  wand: { name: 'Wanderlust', what: 'km on the walk' },
};

/** v2: six stats from real data, Form new from clean reps. */
export function charStatsV2(i: { strengthGain: number; ladderClimbs: number; stepsRatio: number; carrySteps14: number; proteinDays14: number; sri?: number; cleanRatio?: number; km: number }): CharStatsV2 {
  return {
    str: clamp(8 + i.strengthGain * 40 + i.ladderClimbs * 0.5),
    sta: clamp(i.stepsRatio * 16 + Math.min(4, i.carrySteps14 / 2000)),
    fuel: clamp((i.proteinDays14 / 14) * 20),
    rest: i.sri === undefined ? 0 : clamp(i.sri / 5),
    form: i.cleanRatio === undefined ? 0 : clamp((i.cleanRatio - 0.5) * 40),
    wand: clamp(Math.sqrt(Math.max(0, i.km)) / 2),
  };
}
