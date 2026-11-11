// Heirlooms (spec §8): objects that change one rule until the run ends. Twenty-five at launch, each with one clear rule.
// Match heirlooms are read by match.ts through `has(s, id)`; run heirlooms by run.ts. The drawing is a chalk outline
// in the cup's colour (screens), keyed by `art`.

export type HeirloomId =
  | 'match-ball' | 'rake' | 'scarf' | 'physio-bag' | 'napkin' | 'turnstile' | 'armband' | 'boot-bag' | 'needle' | 'chalkboard'
  | 'notebook' | 'stopwatch' | 'floodlight' | 'corner-flag' | 'drum' | 'heavy-pitch' | 'water-crate' | 'programme' | 'spare-boots'
  | 'linesman-flag' | 'studs' | 'ticket-stub' | 'club-tie' | 'hamper' | 'boot-room-key';

export type HeirloomArt = 'ball' | 'rake' | 'scarf' | 'bag' | 'napkin' | 'turnstile' | 'armband' | 'boot' | 'needle' | 'board' | 'book' | 'watch'
  | 'bulb' | 'flag' | 'drum' | 'boot2' | 'crate' | 'programme' | 'key' | 'tie' | 'ticket' | 'hamper' | 'whistleless';

export interface HeirloomDef { id: HeirloomId; name: string; rule: string; art: HeirloomArt; where: 'match' | 'run' }

export const HEIRLOOMS: HeirloomDef[] = [
  { id: 'match-ball', name: 'The old match ball', rule: 'The first pass you play each spell adds double to the build-up.', art: 'ball', where: 'match' },
  { id: 'rake', name: 'Groundsman\'s rake', rule: 'A near miss lowers their defence by half the chance, not a tenth.', art: 'rake', where: 'match' },
  { id: 'scarf', name: 'The lucky scarf', rule: 'Once a match, a goal they would score costs you fitness instead.', art: 'scarf', where: 'match' },
  { id: 'physio-bag', name: 'Physio\'s bag', rule: 'Recover 3 fitness after every match.', art: 'bag', where: 'run' },
  { id: 'napkin', name: 'The tactics napkin', rule: 'One-twos count as two passes for combinations.', art: 'napkin', where: 'match' },
  { id: 'turnstile', name: 'Kaai turnstile', rule: 'Start each match with 5 cover in the first spell.', art: 'turnstile', where: 'match' },
  { id: 'armband', name: 'The frayed armband', rule: '+1 stamina in the first spell of every match.', art: 'armband', where: 'match' },
  { id: 'boot-bag', name: 'A boot bag with a hole in it', rule: 'Draw one more card in the first spell of every match.', art: 'boot', where: 'match' },
  { id: 'needle', name: 'Kit man\'s needle', rule: 'Your first recycle each spell costs nothing.', art: 'needle', where: 'match' },
  { id: 'chalkboard', name: 'The chalkboard', rule: 'See every club\'s attacks two spells ahead, scouted or not.', art: 'board', where: 'match' },
  { id: 'notebook', name: 'The penalty notebook', rule: 'In a shoot-out, every keeper and taker gives their habit away.', art: 'book', where: 'match' },
  { id: 'stopwatch', name: 'The cracked stopwatch', rule: 'Each attack that gets past your cover costs 2 less fitness.', art: 'watch', where: 'match' },
  { id: 'floodlight', name: 'A floodlight bulb', rule: 'In the sixth spell your build-up starts ×0.5 higher.', art: 'bulb', where: 'match' },
  { id: 'corner-flag', name: 'The bent corner flag', rule: 'Every carry adds ×0.5 to the build-up.', art: 'flag', where: 'match' },
  { id: 'drum', name: 'The away-end drum', rule: 'Every combination you land adds 1 cover.', art: 'drum', where: 'match' },
  { id: 'heavy-pitch', name: 'A clod of heavy pitch', rule: 'Their defence starts each match 10% lower.', art: 'boot2', where: 'match' },
  { id: 'water-crate', name: 'The water crate', rule: 'Stamina cards draw one more card.', art: 'crate', where: 'match' },
  { id: 'programme', name: 'A programme from the first final', rule: 'Your first finish each match gets +4 shot.', art: 'programme', where: 'match' },
  { id: 'spare-boots', name: 'Spare boots', rule: 'Once a match, a finish that breaks down comes back to your hand.', art: 'boot', where: 'match' },
  { id: 'linesman-flag', name: 'The linesman\'s flag', rule: 'A through ball needs build-up ×2, not ×2.5.', art: 'flag', where: 'match' },
  { id: 'studs', name: 'Long studs', rule: 'Every near miss also gives you 2 cover.', art: 'boot2', where: 'match' },
  { id: 'ticket-stub', name: 'A season-ticket stub', rule: '+3 coins for every win.', art: 'ticket', where: 'run' },
  { id: 'club-tie', name: 'The club tie', rule: 'Everything at the stall costs a fifth less.', art: 'tie', where: 'run' },
  { id: 'hamper', name: 'The kit hamper', rule: 'Rest stops recover 10% more.', art: 'hamper', where: 'run' },
  { id: 'boot-room-key', name: 'The boot-room key', rule: 'After a win you choose from one more card.', art: 'key', where: 'run' },
];

const BY = new Map(HEIRLOOMS.map((h) => [h.id, h]));
export const heirloomById = (id: string): HeirloomDef | undefined => BY.get(id as HeirloomId);
/** Seam (spec §8): a wonder's own heirloom, once wonders are built. None exist yet. */
export const WONDER_HEIRLOOMS: HeirloomDef[] = [];
