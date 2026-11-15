// Door colours by kind of place (ledger O40, letter 4a): a door's colour says what kind of place it opens, the same
// everywhere in Football. Never the only sign: each family has its own drawn icon and heading, and sits together in a
// fixed order so positions stay steady for the magnifier. The kit's own palette; orange stays for the one action.
import type { IconName } from '../Icon';

export type Family = 'people' | 'place' | 'money' | 'plans' | 'world' | 'record';
export const FAMILY_ORDER: Family[] = ['people', 'place', 'money', 'plans', 'world', 'record'];
export const FAMILIES: Record<Family, { name: string; ink: string; icon: IconName }> = {
  people: { name: 'People', ink: '#f4aedb', icon: 'people' },
  place: { name: 'The place', ink: '#ff9a76', icon: 'ground' },
  money: { name: 'Money and deals', ink: '#f2c46d', icon: 'money' },
  plans: { name: 'Plans and study', ink: '#c2b2ff', icon: 'tree' },
  world: { name: 'The world', ink: '#93c3dc', icon: 'map' },
  record: { name: 'The record', ink: '#8fdcb6', icon: 'book' },
};
