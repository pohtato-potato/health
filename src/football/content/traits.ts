// Traits (spec §9.3): small named effects, each limited to one situation. A player holds up to 3.
// They come from limit breaks, international duty, packs, loans and the gym move. A Legend's third
// trait can be its unit's signature move: its own named goal type in the commentary.
import type { SignatureMove, TraitDef } from './types';

export const TRAITS: TraitDef[] = [
  // From Awakening (squad.ts TRAIT): kept by name, so an Awakened player's first limit break keeps its trait.
  { id: 'burst', name: 'Burst', unit: 'Pace', from: ['awakening', 'limit-break'], text: '+1 Pace on its own chance type.', effect: { kind: 'axis', axis: 'Pace', d: 1, side: 'atk', when: 'own-type' } },
  { id: 'thunder', name: 'Thunder', unit: 'Power', from: ['awakening', 'limit-break'], text: '+1 Power on its own chance type.', effect: { kind: 'axis', axis: 'Power', d: 1, side: 'atk', when: 'own-type' } },
  { id: 'engine', name: 'Engine', unit: 'Fuel', from: ['awakening', 'limit-break'], text: 'Freshness costs half on back-to-back days.', effect: { kind: 'rule', rule: 'freshness-cost', value: -50 } },
  { id: 'fresh-legs', name: 'Fresh legs', unit: 'Rest', from: ['awakening', 'limit-break'], text: '+1 Rest on its own chance type.', effect: { kind: 'axis', axis: 'Rest', d: 1, side: 'def', when: 'own-type' } },
  { id: 'clockwork', name: 'Clockwork', unit: 'Routine', from: ['awakening', 'limit-break'], text: '+1 Routine on its own chance type.', effect: { kind: 'axis', axis: 'Routine', d: 1, side: 'both', when: 'own-type' } },
  { id: 'frame', name: 'Frame', unit: 'Shape', from: ['awakening', 'limit-break'], text: '+1 Shape on its own chance type.', effect: { kind: 'axis', axis: 'Shape', d: 1, side: 'def', when: 'own-type' } },
  // The spec's examples
  { id: 'late-runner', name: 'Late runner', unit: 'Pace', from: ['limit-break', 'duty'], text: 'A chance of its own after 80′.', effect: { kind: 'extra-chance', when: 'late', unit: 'Pace' } },
  { id: 'captains-armband', name: 'Captain’s armband', unit: 'any', from: ['limit-break', 'pack'], text: 'Chemistry +1 in its unit while it captains.', effect: { kind: 'chemistry', d: 1, when: 'always' } },
  // Limit breaks, by unit
  { id: 'second-gear', name: 'Second gear', unit: 'Pace', from: ['limit-break'], text: '+2 Pace in the second half.', effect: { kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'second-half' } },
  { id: 'counter-runner', name: 'Counter runner', unit: 'Pace', from: ['limit-break', 'duty'], text: '+1 Pace once the other side scores.', effect: { kind: 'axis', axis: 'Pace', d: 1, side: 'atk', when: 'after-concede' } },
  { id: 'heavy-touch', name: 'Heavy hitter', unit: 'Power', from: ['limit-break'], text: '+2 Power on long shots.', effect: { kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'long' } },
  { id: 'big-game', name: 'Big game', unit: 'Power', from: ['limit-break', 'duty'], text: '+1 Power against a higher division.', effect: { kind: 'axis', axis: 'Power', d: 1, side: 'atk', when: 'vs-higher' } },
  { id: 'dead-ball', name: 'Dead ball', unit: 'Power', from: ['limit-break', 'pack'], text: '+2 Power on set pieces it takes.', effect: { kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'set-piece' } },
  { id: 'box-to-box', name: 'Box to box', unit: 'Fuel', from: ['limit-break'], text: '+1 Fuel both ways from 75′.', effect: { kind: 'axis', axis: 'Fuel', d: 1, side: 'both', when: 'late' } },
  { id: 'third-lung', name: 'Third lung', unit: 'Fuel', from: ['limit-break', 'duty'], text: '+2 Fuel while you’re behind.', effect: { kind: 'axis', axis: 'Fuel', d: 2, side: 'atk', when: 'behind' } },
  { id: 'safe-pair', name: 'Safe pair', unit: 'Rest', from: ['limit-break'], text: 'Once a match while level, a near miss on defence is saved.', effect: { kind: 'retake', when: 'level' } },
  { id: 'sweeper', name: 'Sweeper', unit: 'Rest', from: ['limit-break', 'duty'], text: '+1 Rest on defence away from home.', effect: { kind: 'axis', axis: 'Rest', d: 1, side: 'def', when: 'away' } },
  { id: 'night-watch', name: 'Night watch', unit: 'Rest', from: ['limit-break'], text: '+2 Rest on defence when the match plays itself.', effect: { kind: 'axis', axis: 'Rest', d: 2, side: 'def', when: 'auto' } },
  { id: 'metronome', name: 'Metronome', unit: 'Routine', from: ['limit-break'], text: '+1 Routine both ways while level.', effect: { kind: 'axis', axis: 'Routine', d: 1, side: 'both', when: 'level' } },
  { id: 'game-manager', name: 'Game manager', unit: 'Routine', from: ['limit-break', 'duty'], text: '+2 Routine on defence while you’re ahead.', effect: { kind: 'axis', axis: 'Routine', d: 2, side: 'def', when: 'ahead' } },
  { id: 'overlap', name: 'Overlap', unit: 'Shape', from: ['limit-break'], text: '+1 Shape on attack at home.', effect: { kind: 'axis', axis: 'Shape', d: 1, side: 'atk', when: 'home' } },
  { id: 'last-ditch', name: 'Last ditch', unit: 'Shape', from: ['limit-break', 'duty'], text: '+2 Shape on defence from 75′.', effect: { kind: 'axis', axis: 'Shape', d: 2, side: 'def', when: 'late' } },
  { id: 'press-trigger', name: 'Press trigger', unit: 'Shape', from: ['limit-break'], text: '+1 Shape on the first chance of each half.', effect: { kind: 'axis', axis: 'Shape', d: 1, side: 'both', when: 'first-chance' } },
  // International duty
  { id: 'capped', name: 'Capped', unit: 'any', from: ['duty'], text: 'A chance of its own in the first match after an international break.', effect: { kind: 'extra-chance', when: 'international' } },
  { id: 'well-travelled', name: 'Well travelled', unit: 'any', from: ['duty'], text: 'Chemistry +1 in its unit on away days.', effect: { kind: 'chemistry', d: 1, when: 'away' } },
  // The gym move (calibration §12): the first session on new kit
  { id: 'gym-hardened', name: 'Gym-hardened', unit: 'Power', from: ['gym'], text: '+1 Power once the other side scores.', effect: { kind: 'axis', axis: 'Power', d: 1, side: 'atk', when: 'after-concede' } },
  // Packs (one match each, as boosts)
  { id: 'derby-head', name: 'Derby head', unit: 'any', from: ['pack'], text: '+2 Shape on defence in a derby.', effect: { kind: 'axis', axis: 'Shape', d: 2, side: 'def', when: 'derby' } },
  { id: 'cup-run', name: 'Cup run', unit: 'any', from: ['pack'], text: '+1 Fuel both ways in a cup match.', effect: { kind: 'axis', axis: 'Fuel', d: 1, side: 'both', when: 'cup' } },
  { id: 'fast-out', name: 'Fast out', unit: 'any', from: ['pack'], text: '+2 Pace in the first half.', effect: { kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'first-half' } },
  { id: 'home-crowd', name: 'Home crowd', unit: 'any', from: ['pack'], text: '+1 Routine on defence in the last 15 at home.', effect: { kind: 'axis', axis: 'Routine', d: 1, side: 'def', when: 'home-late' } },
];
export const traitById = (id: string) => TRAITS.find((t) => t.id === id);

/** One per unit: a Legend's third trait can be its unit's signature move (spec §9.3). */
export const SIGNATURE_MOVES: SignatureMove[] = [
  {
    unit: 'Pace', name: 'The Scheldt run', text: 'The first Pace chance each match gets +2.',
    effect: { kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'first-chance' },
    lines: ['{player} picks it up in our own half and simply keeps going: the Scheldt run, {minute}′.', 'The Scheldt run! {player} goes past three of {opp} like the tide coming in.', '{minute}′. {player}, the whole length of the quay, and in. That is the Scheldt run.'],
  },
  {
    unit: 'Power', name: 'The hand of Brabo', text: 'Once a match, a Power shot from distance gets +2.',
    effect: { kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'long' },
    lines: ['{player} lets fly from thirty yards. The hand of Brabo: thrown, and into the river end.', 'The hand of Brabo! {player} hurls it into the top corner, {minute}′.', '{opp} gave {player} a yard. The hand of Brabo needs only one.'],
  },
  {
    unit: 'Fuel', name: 'The full tank', text: 'Once a match, a Fuel chance after 80′ gets +2.',
    effect: { kind: 'axis', axis: 'Fuel', d: 2, side: 'atk', when: 'late' },
    lines: ['Everyone else is running on fumes. {player} is on the full tank: box to box and in, {minute}′.', 'The full tank! {player} wins it, carries it, finishes it.', '{minute}′ and {player} still has the legs of the first minute. {opp} have nothing left.'],
  },
  {
    unit: 'Rest', name: 'The long throw home', text: 'After a save, the next Pace chance gets +2.',
    effect: { kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'after-save' },
    lines: ['{player} saves, rises, and throws it seventy yards. The long throw home, and it ends in the net.', 'The long throw home! From {player}’s hands to a goal in eleven seconds.', '{minute}′. {opp} shoot, {player} catches, and the whole ground knows what comes next.'],
  },
  {
    unit: 'Routine', name: 'The clockwork goal', text: 'While level, Routine chances get +2.',
    effect: { kind: 'axis', axis: 'Routine', d: 2, side: 'atk', when: 'level' },
    lines: ['Twenty-two passes, not one rushed, and {player} rolls it in. The clockwork goal.', 'The clockwork goal! {opp} touch the ball once in a minute, and it is to kick off.', '{minute}′. Tick, tock, {player}.'],
  },
  {
    unit: 'Shape', name: 'The wall that walks', text: 'After a block, the next Shape chance on attack gets +2.',
    effect: { kind: 'axis', axis: 'Shape', d: 2, side: 'atk', when: 'after-save' },
    lines: ['{player} blocks it, keeps it, and walks it up the pitch. The wall that walks, and it ends in a goal.', 'The wall that walks! {player} from last man to scorer in one move, {minute}′.', '{opp} hit the wall. Then the wall went and scored.'],
  },
];
