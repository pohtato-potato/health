// The starting cards (spec §4.5): what each does at basic, good and great, and the words on screen.
import type { Card, CardKind, Level } from './types';

/** What a card does to the move. */
export type Role = 'pass' | 'carry' | 'finish' | 'stamina' | 'cover' | 'recycle' | 'system' | 'wild';

const L = <T,>(basic: T, good: T, great: T): Record<Level, T> => ({ basic, good, great });

/** Every number a card uses, by level (tuned by the simulation, see tests/football/cup/cup-sim.test.ts). */
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

/** The card a wild card or loan card plays as. */
export const actsAs = (c: Card, as?: CardKind): { kind: CardKind; level: Level } =>
  c.kind === 'loan' ? { kind: c.loanAs ?? 'strike', level: 'great' } : c.kind === 'total' && as ? { kind: as, level: 'basic' } : { kind: c.kind, level: c.level };

/** One short line for the card face (14 px, fits a narrow card). */
export function shortText(kind: CardKind, lv: Level): string {
  switch (kind) {
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
}

/** The full text, for press and hold. */
export function longText(c: Card): string {
  const lv = c.level;
  const cost = CARD.cost[c.kind];
  const pay = cost ? `Costs ${cost} stamina. ` : 'Costs nothing. ';
  switch (c.kind) {
    case 'one-two': return `${pay}A quick pass: the ball moves up one zone and build-up rises.${CARD.oneTwoMakes[lv] ? ` Puts ${CARD.oneTwoMakes[lv]} more basic One-two${CARD.oneTwoMakes[lv] > 1 ? 's' : ''} in your hand.` : ''} Two One-twos in a row land a One-two combination.`;
    case 'overlap': return `${pay}A carry: the ball moves up one zone and you draw ${CARD.overlapDraw[lv]}. No build-up.${lv === 'great' ? ' Your next pass costs nothing.' : ''}`;
    case 'strike': return `${pay}A finish from the final third. Shot ${CARD.strike[lv]}, times your build-up, against their line.`;
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
}
