// The starting cards (spec §4.5) and the pool (pool.ts): what each does at basic, good and great, and the words on screen.
import type { Axis } from '../types';
import { fxOf, isPool, poolDef, type Fx, type Role } from './pool';
import type { AnyKind, Card, CardKind, Level } from './types';

export type { Role };

const L = <T,>(basic: T, good: T, great: T): Record<Level, T> => ({ basic, good, great });

/** Every number a starting card uses, by level (tuned by the simulation, see tests/football/cup/cup-sim.test.ts). */
export const CARD = {
  cost: { 'one-two': 0, overlap: 1, strike: 1, header: 1, thunderbolt: 2, 'second-wind': 0, fuelled: 1, hold: 1, 'fresh-legs': 1, drilled: 1, system: 2, total: 0, punt: 1, loan: 1 } as Record<CardKind, number>,
  /** Extra One-twos a good or great One-two makes. */
  oneTwoMakes: L(0, 1, 2),
  overlapDraw: L(1, 2, 2),
  strike: L(7, 8, 9),
  header: L(5, 5, 6),
  headerPerPass: L(2, 2, 3),
  thunderbolt: 16,
  punt: 3,
  secondWind: L(1, 1, 2),
  secondWindDraw: L(0, 1, 0),
  fuelled: L(1, 2, 2),
  fuelledDraw: L(0, 0, 1),
  hold: L(7, 8, 9),
  freshCover: L(4, 5, 6),
  freshFit: L(2, 3, 4),
  drilled: L(2, 2, 3),
  drilledDraw: L(0, 1, 1),
  systemCover: L(1, 2, 2),
  systemShot: L(0, 0, 1),
};

export const ROLE: Record<CardKind, Role> = {
  'one-two': 'pass', overlap: 'carry', strike: 'finish', header: 'finish', thunderbolt: 'finish', punt: 'finish',
  'second-wind': 'stamina', fuelled: 'stamina', hold: 'cover', 'fresh-legs': 'cover', drilled: 'recycle', system: 'system',
  total: 'wild', loan: 'wild',
};

export const TITLE: Record<CardKind, string> = {
  'one-two': 'One-two', overlap: 'Overlap run', strike: 'Strike', header: 'Header', thunderbolt: 'Thunderbolt',
  'second-wind': 'Second wind', fuelled: 'Fuelled', hold: 'Hold the line', 'fresh-legs': 'Fresh legs', drilled: 'Drilled',
  system: 'The system', total: 'Total football', punt: 'Hopeful punt', loan: 'Loan star',
};

// --- any card, starting or from the pool ---------------------------------------------------------------------------
export const roleOf = (k: AnyKind): Role => (isPool(k) ? poolDef(k)!.role : ROLE[k as CardKind]);
export const titleOf = (k: AnyKind): string => (isPool(k) ? poolDef(k)!.title : TITLE[k as CardKind] ?? k);
export const baseCost = (k: AnyKind): number => (isPool(k) ? poolDef(k)!.cost : CARD.cost[k as CardKind]);
const START_AXIS: Partial<Record<CardKind, Axis>> = {
  'one-two': 'Pace', overlap: 'Pace', strike: 'Power', header: 'Power', thunderbolt: 'Power', 'second-wind': 'Fuel', fuelled: 'Fuel',
  hold: 'Rest', 'fresh-legs': 'Rest', drilled: 'Routine', system: 'Shape',
};
export const axisOfKind = (k: AnyKind): Axis | null => (isPool(k) ? poolDef(k)!.axis : START_AXIS[k as CardKind] ?? null);
/** A new card of a kind for a run (picked, bought or given in an event). */
export const newCard = (id: string, kind: AnyKind, level: Level): Card => ({ id, kind, level, axis: axisOfKind(kind) });
/** The name on a card: a rare finish's exercise, or the card's title. */
export const cardName = (c: Card) => (c.name && c.kind !== 'loan' ? c.name : titleOf(c.kind));

/** The card a wild card or loan card plays as. */
export const actsAs = (c: Card, as?: AnyKind): { kind: AnyKind; level: Level } =>
  c.kind === 'loan' ? { kind: c.loanAs ?? 'strike', level: 'great' } : c.kind === 'total' && as ? { kind: as, level: 'basic' } : { kind: c.kind, level: c.level };

const xb = (x: number) => `×${x}`;
/** The short words for a pool card's effect: at most three parts, so it fits the card face. */
export function fxShort(role: Role, f: Fx): string {
  const parts: string[] = [];
  if (role === 'finish') {
    parts.push(`Shot ${f.shot ?? 0}${f.perPass ? ` +${f.perPass}/pass` : ''}`);
    if (f.anywhere) parts.push('anywhere'); else if (f.fromMid) parts.push('from midfield');
    if (f.rebound) parts.push('rebound');
  } else if (role === 'pass') {
    parts.push(f.zones === 0 ? `Keep it, +${xb(f.pass ?? 0.5)}` : f.zones === 2 ? 'Pass two zones' : f.pass && f.pass !== 0.5 ? `Pass +${xb(f.pass)}` : 'Pass');
  } else if (role === 'carry') {
    parts.push(f.zones === 2 ? 'Carry two zones' : 'Carry');
  }
  if (f.build) parts.push(`Build +${xb(f.build)}`);
  if (f.shotUp) parts.push(`shot +${f.shotUp}`);
  if (f.makeOneTwo) parts.push(`+${f.makeOneTwo} One-two`);
  if (f.cover) parts.push(`Cover ${f.cover}${f.coverPerPass ? ` +${f.coverPerPass}/pass` : ''}${f.keepCover ? ', kept' : ''}`);
  if (f.threatDown) parts.push(`Their attack −${f.threatDown}`);
  if (f.stamina) parts.push(`+${f.stamina} stamina`);
  if (f.nextStamina) parts.push(`Next spell +${f.nextStamina}`);
  if (f.fit) parts.push(`+${f.fit} fit`);
  if (f.freeRecycles) parts.push(`${f.freeRecycles} free recycle${f.freeRecycles > 1 ? 's' : ''}`);
  if (f.sysSpellCover) parts.push(`Each spell: cover ${f.sysSpellCover}`);
  if (f.sysSpellStamina) parts.push(`Each spell: +${f.sysSpellStamina} stamina`);
  if (f.sysSpellDraw) parts.push(`Each spell: draw ${f.sysSpellDraw}`);
  if (f.sysSpellFit) parts.push(`Each spell: +${f.sysSpellFit} fit`);
  if (f.sysShot) parts.push(`Every shot +${f.sysShot}`);
  if (f.sysPassBuild) parts.push(`Passes +${xb(f.sysPassBuild)}`);
  if (f.sysRecycleCover) parts.push(`Recycle: +${f.sysRecycleCover} cover`);
  if (f.sysCarryDraw) parts.push(`Carries draw ${f.sysCarryDraw}`);
  if (f.draw) parts.push(`draw ${f.draw}`);
  if (f.nextDraw) parts.push(`next spell draw ${f.nextDraw}`);
  if (f.freePass) parts.push('next pass free');
  const s = parts.slice(0, 3).join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The full words for a pool card, for press and hold. */
export function fxLong(role: Role, f: Fx): string {
  const out: string[] = [];
  if (role === 'finish') {
    out.push(`A finish${f.anywhere ? ' from anywhere' : f.fromMid ? ' from midfield or the final third' : ' from the final third'}. Shot ${f.shot ?? 0}${f.perPass ? `, plus ${f.perPass} for every pass in this move` : ''}, times your build-up, against their defence.`);
    if (f.rebound) out.push('If it does not go in, the ball stays in the final third and the build-up is kept.');
  } else if (role === 'pass') {
    out.push(f.zones === 0 ? `A pass that keeps the ball where it is and adds ${xb(f.pass ?? 0.5)} to the build-up.` : `A pass: the ball moves up ${f.zones === 2 ? 'two zones' : 'one zone'} and the build-up rises by ${xb(f.pass ?? 0.5)}.`);
    if (f.quick) out.push('A quick pass: two in a row land a One-two.');
  } else if (role === 'carry') {
    out.push(`A carry: the ball moves up ${f.zones === 2 ? 'two zones' : 'one zone'}, with no build-up.`);
  } else if (role === 'system') out.push('Stays in play all match.');
  if (role === 'recycle' && f.zones) out.push('The ball moves up one zone.');
  if (f.build) out.push(`Build-up +${xb(f.build)}.`);
  if (f.shotUp) out.push(`This move's finish gets +${f.shotUp} shot.`);
  if (f.makeOneTwo) out.push(`Puts ${f.makeOneTwo} basic One-two${f.makeOneTwo > 1 ? 's' : ''} in your hand.`);
  if (f.cover) out.push(`Cover ${f.cover}${f.coverPerPass ? `, plus ${f.coverPerPass} for every pass in this move` : ''} against their attack this spell${f.keepCover ? ', and it still counts next spell' : ''}.`);
  if (f.threatDown) out.push(`Their attack this spell is ${f.threatDown} smaller.`);
  if (f.stamina) out.push(`+${f.stamina} stamina now.`);
  if (f.nextStamina) out.push(`Next spell you start with ${f.nextStamina} more stamina.`);
  if (f.fit) out.push(`Recover ${f.fit} fitness.`);
  if (f.freeRecycles) out.push(`Your next ${f.freeRecycles} recycle${f.freeRecycles > 1 ? 's' : ''} this spell cost nothing.`);
  if (f.sysSpellCover) out.push(`Each spell starts with ${f.sysSpellCover} cover.`);
  if (f.sysSpellStamina) out.push(`Each spell starts with ${f.sysSpellStamina} more stamina.`);
  if (f.sysSpellDraw) out.push(`Each spell you draw ${f.sysSpellDraw} more.`);
  if (f.sysSpellFit) out.push(`Each spell you recover ${f.sysSpellFit} fitness.`);
  if (f.sysShot) out.push(`Every finish gets +${f.sysShot} shot.`);
  if (f.sysPassBuild) out.push(`Every pass adds ${xb(f.sysPassBuild)} more build-up.`);
  if (f.sysRecycleCover) out.push(`Each recycle gives ${f.sysRecycleCover} cover.`);
  if (f.sysCarryDraw) out.push(`Each carry draws ${f.sysCarryDraw}.`);
  if (f.draw) out.push(`Draw ${f.draw}.`);
  if (f.nextDraw) out.push(`Next spell you draw ${f.nextDraw} more.`);
  if (f.freePass) out.push('Your next pass costs nothing.');
  return out.join(' ');
}

/** One short line for the card face (14 px, fits a narrow card). */
export function shortText(kind: AnyKind, lv: Level): string {
  if (isPool(kind)) return fxShort(poolDef(kind)!.role, fxOf(kind, lv));
  switch (kind as CardKind) {
    case 'one-two': return lv === 'basic' ? 'Pass' : `Pass, +${CARD.oneTwoMakes[lv]} One-two`;
    case 'overlap': return lv === 'great' ? 'Carry, draw 2, free pass' : `Carry, draw ${CARD.overlapDraw[lv]}`;
    case 'strike': return `Shot ${CARD.strike[lv]}`;
    case 'header': return `Shot ${CARD.header[lv]} +${CARD.headerPerPass[lv]}/pass`;
    case 'thunderbolt': return `Shot ${CARD.thunderbolt}, from midfield`;
    case 'punt': return `Shot ${CARD.punt}, anywhere`;
    case 'second-wind': return `+${CARD.secondWind[lv]} stamina${CARD.secondWindDraw[lv] ? ', draw 1' : ''}`;
    case 'fuelled': return `Next spell +${CARD.fuelled[lv]}${CARD.fuelledDraw[lv] ? ', draw 1' : ''}`;
    case 'hold': return `Cover ${CARD.hold[lv]}`;
    case 'fresh-legs': return `Cover ${CARD.freshCover[lv]}, +${CARD.freshFit[lv]} fit`;
    case 'drilled': return `${CARD.drilled[lv]} free recycles${CARD.drilledDraw[lv] ? ', draw 1' : ''}`;
    case 'system': return `Recycle: +${CARD.systemCover[lv]} cover`;
    case 'total': return 'Any basic card';
    case 'loan': return 'Plays as a great card';
  }
  return '';
}

/** The full text, for press and hold. */
export function longText(c: Card): string {
  const lv = c.level;
  const cost = baseCost(c.kind);
  const pay = cost ? `Costs ${cost} stamina. ` : 'Costs nothing. ';
  if (isPool(c.kind)) return `${pay}${fxLong(poolDef(c.kind)!.role, fxOf(c.kind, lv))}`;
  switch (c.kind as CardKind) {
    case 'one-two': return `${pay}A quick pass: the ball moves up one zone and build-up rises.${CARD.oneTwoMakes[lv] ? ` Puts ${CARD.oneTwoMakes[lv]} more basic One-two${CARD.oneTwoMakes[lv] > 1 ? 's' : ''} in your hand.` : ''} Two One-twos in a row land a One-two combination.`;
    case 'overlap': return `${pay}A carry: the ball moves up one zone and you draw ${CARD.overlapDraw[lv]}. No build-up.${lv === 'great' ? ' Your next pass costs nothing.' : ''}`;
    case 'strike': return `${pay}A finish from the final third. Shot ${CARD.strike[lv]}, times your build-up, against their defence.`;
    case 'header': return `${pay}A finish from the final third. Shot ${CARD.header[lv]}, plus ${CARD.headerPerPass[lv]} for every pass in this move, times your build-up.`;
    case 'thunderbolt': return `${pay}A rare finish from your record${c.name ? ` in ${c.name}` : ''}. Shot ${CARD.thunderbolt}, times your build-up. May be hit from midfield.`;
    case 'punt': return `${pay}A shot of ${CARD.punt} from anywhere, times your build-up. It ends the move. Dealt for an axis or a day with nothing logged.`;
    case 'second-wind': return `${pay}+${CARD.secondWind[lv]} stamina now.${CARD.secondWindDraw[lv] ? ' Draw 1.' : ''}`;
    case 'fuelled': return `${pay}Next spell you start with ${CARD.fuelled[lv]} more stamina.${CARD.fuelledDraw[lv] ? ' And draw 1 more card.' : ''}`;
    case 'hold': return `${pay}Cover ${CARD.hold[lv]} against their attack at the end of this spell.`;
    case 'fresh-legs': return `${pay}Cover ${CARD.freshCover[lv]} this spell, and recover ${CARD.freshFit[lv]} fitness.`;
    case 'drilled': return `${pay}Your next ${CARD.drilled[lv]} recycles this spell cost nothing.${CARD.drilledDraw[lv] ? ' Draw 1.' : ''} A recycle: drop a card, draw a card, the ball stays put.`;
    case 'system': return `${pay}Stays in play all match. Each recycle gives ${CARD.systemCover[lv]} cover.${CARD.systemShot[lv] ? ' Each One-two adds 1 to the move\'s shot.' : ''}`;
    case 'total': return `${pay}The wild card from a day with every ring closed. Plays as any basic card in your deck.`;
    case 'loan': return `${c.name ? `${c.name}, on loan. ` : ''}Plays as a great ${TITLE[c.loanAs ?? 'strike']}.`;
  }
  return '';
}
