// Where each tech's effect lives (ledger O40, finding D): every tech says what it changed and gives a door to the page
// that shows it ("Tea hut: now in Projects"). Pure. An effect the game does not run yet is marked `waiting`, so the
// tech page says so plainly instead of promising it.
import { PROJECTS } from '../content/projects';
import { STAFF } from '../content/staff';
import type { Effect, RuleKey, SlotKey, TechDef, UnlockKey } from '../content/types';

export interface Place { name: string; to: string; params?: Record<string, string> }
export interface Reach { line: string; place: Place; waiting?: boolean }

const TONIGHT: Place = { name: 'Tonight', to: '/football' };
const SHEET: Place = { name: 'Team sheet', to: '/football/sheet' };
const SQUAD: Place = { name: 'Squad', to: '/football/club', params: { view: 'squad' } };
const TRIALS: Place = { name: 'Trials', to: '/football/trials' };
const ACADEMY: Place = { name: 'Academy', to: '/football/academy' };
const LOANS: Place = { name: 'Loans', to: '/football/loans' };
const DUTY: Place = { name: 'Duty', to: '/football/duty' };
const TREE: Place = { name: 'The tree', to: '/football/club', params: { view: 'tree' } };
const PACKS: Place = { name: 'Packs', to: '/football/packs' };
const MONEY: Place = { name: 'Money', to: '/football/club', params: { view: 'money' } };
const KITS: Place = { name: 'Kits', to: '/football/club', params: { view: 'kits' } };
const PROJECTS_PAGE: Place = { name: 'Projects', to: '/football/projects' };
const STAFF_ROOM: Place = { name: 'Staff room', to: '/football/staff' };
const BLEND: Place = { name: 'How it adds up', to: '/football/blend' };
const GROUND: Place = { name: 'The ground', to: '/football/club', params: { view: 'ground' } };

const RULE: Record<RuleKey, Place> = {
  'trials-extra-day': TRIALS, 'trials-size': TRIALS, 'trials-hold-days': TRIALS, 'trials-rarity': TRIALS, 'trials-abroad': TRIALS, 'trialist-wait': TRIALS,
  'academy-promote-sessions': ACADEMY, 'youth-growth-bedtime': ACADEMY, 'youth-potential': ACADEMY,
  'chemistry-days': SHEET, 'chemistry-changes': SHEET, 'freshness-floor': SHEET, 'freshness-return': SHEET, 'freshness-cost': SHEET,
  'knock-days': SHEET, 'morale-captain-up': SHEET, 'false-nine': SHEET, 'rotation-two-fronts': SHEET,
  'fuel-break-days': SQUAD,
  'loan-days': LOANS, 'loan-slots': LOANS, 'icon-odds': LOANS,
  'lesson-loss': TREE, 'lesson-draw': TREE, 'boon-choices': TREE, 'research-tour': TREE, 'research-duty': DUTY, 'museum-research': TREE,
  'scout-line': TONIGHT, 'scout-weak': TONIGHT, 'expected-points': TONIGHT, 'press-answers': TONIGHT,
  testimonial: PACKS, 'packs-items': PACKS,
};
const UNLOCK: Record<UnlockKey, Place> = {
  'formation-442': SHEET, 'formation-4231': SHEET, 'formation-352': SHEET, 'formation-433-attack': SHEET, 'unit-captains': SHEET, philosophy: SHEET,
  programme: TONIGHT, 'press-office': TONIGHT, tour: TREE,
  'kit-third': KITS, 'kit-classic': KITS, scarf: KITS,
};
const SLOT = (s: SlotKey): Place => (s.startsWith('sponsor-') ? MONEY : s === 'academy' ? ACADEMY : SQUAD);

/**
 * The effects nothing in the game reads yet (audit 16 Nov; wired 16 Nov except the playing philosophy, which would change
 * match odds and waits for the owner). The tech still gives everything else it lists; this is said plainly on its page.
 */
export const NOT_RUN_YET = {
  rule: [] as RuleKey[],
  unlock: ['philosophy'] as UnlockKey[],
};

/** What a rule wired on 16 Nov does, in words, where the plain "A rule changes" would say too little. */
const RULE_WORDS: Partial<Record<RuleKey, (v: number) => string>> = {
  'research-tour': (v) => `Each logged day between seasons: +${v} research`,
  'museum-research': (v) => `Each finished album set: +${v} research every Monday`,
  'expected-points': () => 'Tonight’s expected points, on Tonight and the habit line',
  'press-answers': () => 'After big nights: the line for the papers, at full time',
  testimonial: () => 'A testimonial night and a pack for each new Club legend',
};

const UNLOCK_WORDS: Record<UnlockKey, string> = {
  'formation-442': 'The 4-4-2 shape', 'formation-4231': 'The 4-2-3-1 shape', 'formation-352': 'The 3-5-2 shape', 'formation-433-attack': 'The attacking 4-3-3',
  'unit-captains': 'A captain for each unit', philosophy: 'A playing philosophy', programme: 'The matchday programme', 'press-office': 'The press office',
  tour: 'The pre-season tour', 'kit-third': 'A third kit', 'kit-classic': 'Classic designs in the kit maker', scarf: 'The club scarf',
};

/** One effect, where it shows. Projects and staff name themselves; match effects show in How it adds up. */
export function reachOf(e: Effect): Reach | undefined {
  switch (e.kind) {
    case 'axis': case 'retake': case 'extra-chance': case 'chemistry':
      return { line: 'Its match lift counts every night', place: BLEND };
    case 'rule': return { line: RULE_WORDS[e.rule]?.(e.value) ?? `A rule changes on ${RULE[e.rule].name}`, place: RULE[e.rule], waiting: NOT_RUN_YET.rule.includes(e.rule) };
    case 'unlock': return { line: `${UNLOCK_WORDS[e.what]}: now open`, place: UNLOCK[e.what], waiting: NOT_RUN_YET.unlock.includes(e.what) };
    case 'slot': return { line: e.slot.startsWith('sponsor-') ? 'A sponsor slot opens' : 'One more place', place: SLOT(e.slot) };
    case 'money': return { line: 'More money at the season’s end', place: MONEY };
    case 'project': {
      const p = PROJECTS.find((x) => x.id === e.project);
      return p && { line: `${p.name}: now in Projects`, place: PROJECTS_PAGE };
    }
    case 'staff': {
      const s = STAFF.find((x) => x.id === e.staff);
      return s && { line: `${s.name}: now in the Staff room`, place: STAFF_ROOM };
    }
    case 'cosmetic': return undefined;
  }
}

/** Everything a tech changes, each with its door, with no place listed twice for the same line. */
export function techReach(t: TechDef): Reach[] {
  const out: Reach[] = [];
  const add = (r?: Reach) => { if (r && !out.some((x) => x.line === r.line && x.place.to === r.place.to)) out.push(r); };
  t.effects.forEach((e) => add(reachOf(e)));
  // Projects that name this tech as their gate, without an effect of their own on it.
  PROJECTS.filter((p) => p.tech === t.id).forEach((p) => add({ line: `${p.name}: now in Projects`, place: PROJECTS_PAGE }));
  STAFF.filter((x) => x.tech === t.id).forEach((x) => add({ line: `${x.name}: now in the Staff room`, place: STAFF_ROOM }));
  // A tech whose only effect is a look on the ground still shows there.
  if (!out.length && t.effects.some((e) => e.kind === 'cosmetic')) add({ line: 'A new look at the ground', place: GROUND });
  return out;
}
