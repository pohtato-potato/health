// Ability catalogue (spec §8.1). Earned the first time a moment happens, named after it.
import type { Axis, BraboAbility } from '../types';

export type FbMoment =
  | 'screamer' | 'wonder-save' | 'heartbreak' | 'comeback' | 'clean-sheet' | 'hat-trick'
  | 'late-winner' | 'derby-win' | 'giant-kill' | 'away-win' | 'first-half-blitz' | 'unbeaten-5'
  | 'cup-win' | 'night-shift';

export interface AbilityEntry {
  id: string;
  name: string;
  /** The moment that earns it; built-ins have none. */
  from?: FbMoment;
  text: string;
  effect?: { axis: Axis; d: number; when: NonNullable<BraboAbility['when']> };
}

export const BUILT_INS: AbilityEntry[] = [
  { id: 'armband', name: "Captain's armband", text: '+2 to the captain axis on its side.' },
  { id: 'second-wind', name: 'Second wind', text: 'Once a match, a missed attacking chance of 30% or more is retaken.' },
  { id: 'youth-sub', name: 'Youth sub', text: 'From 60 minutes, +2 or +3 to a weak axis on its side.' },
  { id: 'stack', name: 'The weekly stack', text: 'Abilities earned this week lift every attacking axis a little. Resets on Monday.' },
];

export const ABILITIES: AbilityEntry[] = [
  { id: 'smash-and-grab', name: 'Smash and Grab', from: 'screamer', text: 'Long shots get +2 Power.', effect: { axis: 'Power', d: 2, when: 'long' } },
  { id: 'safe-hands', name: 'Safe Hands', from: 'wonder-save', text: '+1 Rest on defence, all match.', effect: { axis: 'Rest', d: 1, when: 'always' } },
  { id: 'never-again', name: 'Never Again', from: 'heartbreak', text: '+2 Shape on defence while the score is level.', effect: { axis: 'Shape', d: 2, when: 'level' } },
  { id: 'from-behind', name: 'From Behind', from: 'comeback', text: '+2 Fuel once the other side scores.', effect: { axis: 'Fuel', d: 2, when: 'after-concede' } },
  { id: 'brick-wall', name: 'Brick Wall', from: 'clean-sheet', text: '+1 Routine on defence, all match.', effect: { axis: 'Routine', d: 1, when: 'always' } },
  { id: 'hat-stand', name: 'Hat Stand', from: 'hat-trick', text: '+1 Pace on counter-attacks.', effect: { axis: 'Pace', d: 1, when: 'own-type' } },
  { id: 'stoppage', name: 'Stoppage Time', from: 'late-winner', text: '+2 Pace from 75 minutes.', effect: { axis: 'Pace', d: 2, when: 'late' } },
  { id: 'our-streets', name: 'Our Streets', from: 'derby-win', text: '+2 Shape on defence at home.', effect: { axis: 'Shape', d: 2, when: 'home' } },
  { id: 'slingshot', name: 'Slingshot', from: 'giant-kill', text: '+2 Power once the other side scores.', effect: { axis: 'Power', d: 2, when: 'after-concede' } },
  { id: 'road-trip', name: 'Road Trip', from: 'away-win', text: '+2 Routine on defence away from home.', effect: { axis: 'Routine', d: 2, when: 'away' } },
  { id: 'fast-start', name: 'Fast Start', from: 'first-half-blitz', text: '+2 Pace in the first half.', effect: { axis: 'Pace', d: 2, when: 'first-half' } },
  { id: 'long-haul', name: 'Long Haul', from: 'unbeaten-5', text: '+1 Fuel from 75 minutes.', effect: { axis: 'Fuel', d: 1, when: 'late' } },
  { id: 'silverware', name: 'Silverware', from: 'cup-win', text: '+1 Shape on defence, all match.', effect: { axis: 'Shape', d: 1, when: 'always' } },
  { id: 'night-owl', name: 'Night Owl', from: 'night-shift', text: '+2 Rest on defence from 75 minutes.', effect: { axis: 'Rest', d: 2, when: 'late' } },
];

const BY_ID = new Map([...BUILT_INS, ...ABILITIES].map((a) => [a.id, a]));
export const abilityById = (id: string) => BY_ID.get(id);
export const abilityFor = (m: FbMoment) => ABILITIES.find((a) => a.from === m);

/** Equipped slot ids -> what the engine needs. Built-ins the engine reads by id. */
export function braboAbilities(slots: string[]): BraboAbility[] {
  const out: BraboAbility[] = [];
  for (const id of slots) {
    const a = BY_ID.get(id);
    if (!a || id === 'armband' || id === 'stack') continue;
    out.push(a.effect ? { id, name: a.name, axis: a.effect.axis, d: a.effect.d, when: a.effect.when } : { id, name: a.name });
  }
  return out;
}
