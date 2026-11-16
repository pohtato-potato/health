// Door colours by kind of place (ledger O40, letter 4a): a door's colour says what kind of place it opens. Never the
// only sign: each family has its own drawn icon and heading, and sits together in a fixed order so positions stay
// steady for the magnifier. The kit's own palette, no new hue; orange stays for the one action.
//
// Football's six come first. The rest of the app (Today, Train, Walk, You) has its own: a door to a metric's page wears
// that metric's colour (Food apricot, Training coral, the walk's steps green, Body pearl), and three families for kinds
// of place (Looking back pink, Earned gold, Settings and upkeep a quiet slate). A hue may mean one thing in Football and
// another outside it (pink is People there, Looking back here); never both on one page.
import type { IconName } from '../Icon';

export type FootballFamily = 'people' | 'place' | 'money' | 'plans' | 'world' | 'record';
export type AppFamily = 'food' | 'training' | 'walk' | 'back' | 'earned' | 'body' | 'upkeep';
export type Family = FootballFamily | AppFamily;

export const FAMILY_ORDER: FootballFamily[] = ['people', 'place', 'money', 'plans', 'world', 'record'];
/** Outside Football: the metric pages first, then looking back, earned things, the body, settings and upkeep last. */
export const APP_FAMILY_ORDER: AppFamily[] = ['food', 'training', 'walk', 'back', 'earned', 'body', 'upkeep'];

export const FAMILIES: Record<Family, { name: string; ink: string; icon: IconName }> = {
  people: { name: 'People', ink: '#f4aedb', icon: 'people' },
  place: { name: 'The place', ink: '#ff9a76', icon: 'ground' },
  money: { name: 'Money and deals', ink: '#f2c46d', icon: 'money' },
  plans: { name: 'Plans and study', ink: '#c2b2ff', icon: 'tree' },
  world: { name: 'The world', ink: '#93c3dc', icon: 'map' },
  record: { name: 'The record', ink: '#8fdcb6', icon: 'book' },
  food: { name: 'Food', ink: '#e98a5b', icon: 'food' },
  training: { name: 'Training', ink: '#ff9a76', icon: 'gym' },
  walk: { name: 'The walk', ink: '#8fdcb6', icon: 'route' },
  back: { name: 'Looking back', ink: '#f4aedb', icon: 'clock' },
  earned: { name: 'Earned', ink: '#f2c46d', icon: 'win' },
  body: { name: 'Body', ink: '#d9e8f3', icon: 'body' },
  upkeep: { name: 'Settings and upkeep', ink: '#c4c1cf', icon: 'edit' },
};
