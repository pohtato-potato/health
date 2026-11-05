import type { RingStyle } from '../ui/rings/styles';
import type { CreatureRules } from './creatures';

/**
 * The first twenty visitors, drawn in Warli stars: triangles, circles, lines and dots, on a 240 × 200 field. Each
 * part moves on its own hinge, so a tap makes a limb, a wing or a head act, and the figure never just slides.
 * Wildlife of the road walked so far, what's been lost from it, and secular folk tales from further away. Nothing
 * here is religious-coded and there is no astrology.
 */
export type Line = string | { d: string; acc: true };
export type Role = 'leg' | 'wing' | 'feather' | 'tail' | 'head' | 'jaw' | 'body';
export interface Part {
  a: 'sway' | 'bob' | 'swish' | 'breathe' | 'still';
  o: string;
  role?: Role;
  /** Legs swing either way; feathers fan by this many degrees. */
  turn?: number;
  l: Line[];
  f?: [number, number, number][];
  s?: [number, number][];
  /** Everyday: the stage this detail arrives at. */
  from?: 2 | 3;
  /** Medium-rare: part of the faint shape seen at a glimpse. */
  glimpse?: boolean;
}
export type Reaction = 'fan' | 'gallop' | 'flap' | 'snap' | 'nod' | 'leap' | 'dive' | 'curl' | 'shift';
export type Footprint = 'paw' | 'hoof' | 'web';

export interface Creature extends CreatureRules {
  name: string;
  /** How a sentence calls it: "the nilgai". */
  short: string;
  /** Where a guest's tale comes from. */
  from?: string;
  main: string;
  acc: string;
  star: string;
  /** Three deep colours for the sky behind its card. */
  sky: [string, string, string];
  reaction: Reaction;
  notes: string[];
  parts?: Part[];
  /** Rare guests: a drawing, a name and a line for each form. */
  forms?: { name: string; note: string; parts: Part[] }[];
  footprint?: Footprint;
  /** A grown everyday creature's theme day. */
  theme?: { name: string; why: string; ring: RingStyle };
  /** The ring style a legend or a completed guest gives. */
  ring?: { style: RingStyle; name: string };
}

const C = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
const A = (d: string): Line => ({ d, acc: true });
const legs = (arr: [number, number, number, number][], extra: Partial<Part> = {}): Part[] =>
  arr.map(([x1, y1, x2, y2], i) => ({ a: 'still', role: 'leg', turn: i % 2 ? 16 : -16, o: `${x1}px ${y1}px`, l: [`M${x1} ${y1} L${x2} ${y2}`], s: [[x2, y2]], ...extra }));
const wing = (o: string, l: Line[], s: [number, number][], turn: number, extra: Partial<Part> = {}): Part => ({ a: 'sway', role: 'wing', turn, o, l, s, ...extra });

const FEATHERS: [string, number, number, number, string][] = [
  ['M140 120 Q185 60 205 18', 205, 18, -18, 'M172 72 L180 64'],
  ['M140 120 Q200 82 228 62', 228, 62, -9, 'M186 92 L196 88'],
  ['M140 120 Q205 112 232 118', 232, 118, 0, 'M196 114 L204 116'],
  ['M140 120 Q198 145 222 170', 222, 170, 9, 'M190 146 L198 150'],
  ['M140 120 Q178 158 186 192', 186, 192, 18, 'M172 162 L178 170'],
];

const CHEETAH_BODY: Part = { a: 'breathe', role: 'body', o: '105px 112px', l: ['M50 95 L105 112 L50 128 Z', 'M160 95 L105 112 L160 128 Z'], f: [[64, 104, 2.2], [74, 116, 2.2], [62, 118, 2], [146, 104, 2.2], [136, 118, 2.2], [150, 116, 2], [92, 108, 1.8], [118, 108, 1.8]], s: [[50, 95], [50, 128], [160, 95], [160, 128]] };

const everyday: Creature[] = [
  {
    id: 'peacock', name: 'Indian peacock', short: 'peacock', tier: 'everyday', region: 'plains', temperament: 'bold', hours: 'dawn', main: '#6fe0e8', acc: '#5b8cff', star: '#c8fbff', sky: ['#0f6b74', '#1f3f9a', '#1b5a46'], reaction: 'fan',
    theme: { name: 'Peacock day', why: 'Grown at last, and it wants the whole field to know.', ring: 'scallop' },
    notes: ['Peachick. Follows the hen everywhere and falls over its own feet.', 'Struts the full length of the field edge before it settles, as if measuring it.', 'Its first eyespots are coming in. Displays at nothing in particular.', 'Calls before rain, and also when there is no rain.', 'Roosts high and complains about the height.', 'The train is complete. It drags it through the mud anyway.'],
    parts: [
      ...FEATHERS.map(([d, x, y, fan, barb]): Part => ({ a: 'sway', role: 'feather', turn: fan, o: '140px 122px', l: [d, A(C(x, y, 6)), barb], f: [[x, y, 3]], s: [[x, y]], from: 3 })),
      { a: 'sway', role: 'feather', turn: -10, o: '130px 128px', l: ['M130 128 Q150 116 158 104', 'M130 128 Q156 128 166 124'], s: [[158, 104], [166, 124]] },
      { a: 'breathe', role: 'body', o: '115px 120px', l: ['M88 120 L115 78 L142 120 Z', 'M108 120 L100 162 L94 166 M122 120 L130 162 L136 166'], s: [[88, 120], [142, 120], [115, 78], [94, 166], [136, 166]] },
      { a: 'breathe', o: '115px 120px', l: [A('M100 112 L108 100 L115 112 L122 100 L130 112')], from: 2 },
      { a: 'bob', role: 'head', o: '115px 80px', l: ['M115 78 Q112 64 115 52', C(115, 46, 7), 'M122 46 L130 48'], f: [[117, 44, 1.6]], s: [[115, 39]] },
      { a: 'bob', role: 'head', o: '115px 80px', l: [A('M111 39 L106 26 M115 38 L115 24 M119 39 L124 26')], f: [[106, 26, 2.5], [115, 24, 2.5], [124, 26, 2.5]], s: [[106, 26], [115, 24], [124, 26]], from: 2 },
    ],
  },
  {
    id: 'nilgai', name: 'Nilgai', short: 'nilgai', tier: 'everyday', region: 'plains', temperament: 'restless', hours: 'dawn', main: '#f0b77a', acc: '#f6e7c8', star: '#fff1d6', sky: ['#8a5626', '#5a2f5f', '#3a3a1c'], reaction: 'gallop',
    theme: { name: 'Nilgai day', why: 'It finally stopped running long enough to be counted.', ring: 'thrown' },
    notes: ['First sighting. Grazes at dawn near the fields. Bolts at nothing, then stops to stare at it.', 'Uses the same dung pile as its neighbours, which passes for local government.', 'A blue-grey sheen has started along its back.', 'Clears a fence from a standing start, then looks surprised.', 'Eats what the farmer planted and looks at the farmer while doing it.', 'Horns in. It still bolts at nothing.'],
    parts: [
      { a: 'swish', role: 'tail', o: '58px 95px', l: ['M58 95 Q44 110 40 128', A('M36 128 L40 136 L44 128')], s: [[40, 136]] },
      { a: 'breathe', role: 'body', o: '105px 110px', l: ['M58 90 L105 110 L58 130 Z', 'M152 90 L105 110 L152 130 Z'], s: [[58, 90], [58, 130], [152, 90], [152, 130]] },
      { a: 'breathe', o: '105px 110px', l: [A('M68 100 L68 120 M78 104 L78 116 M140 100 L140 120 M130 104 L130 116')], from: 2 },
      ...legs([[70, 128, 66, 176], [84, 122, 88, 176], [128, 122, 124, 176], [142, 128, 148, 176]]),
      { a: 'bob', role: 'head', o: '152px 92px', l: ['M152 90 L174 56', C(178, 50, 9)], f: [[181, 49, 1.8]], s: [[178, 41]] },
      { a: 'bob', role: 'head', o: '152px 92px', l: ['M172 42 L166 26 M182 42 L190 27', A('M168 46 L160 40 M188 46 L196 40')], s: [[166, 26], [190, 27], [160, 40], [196, 40]], from: 3 },
      { a: 'bob', role: 'head', o: '152px 92px', l: [A('M164 70 L160 82 M168 66 L165 78')], s: [[160, 82]], from: 2 },
    ],
  },
  {
    id: 'sarus', name: 'Sarus crane', short: 'sarus', tier: 'everyday', region: 'plains', temperament: 'watchful', hours: 'dawn', main: '#e7ecf4', acc: '#ff7a6b', star: '#ffffff', sky: ['#3f5a7a', '#6a2f3f', '#2a3a4a'], reaction: 'flap',
    theme: { name: 'Sarus day', why: 'The tallest thing in the wet field, and it knows.', ring: 'ripple' },
    notes: ['Stands in the wet field like a question nobody asked.', 'Always two of them. This one is looking for the other.', 'The red has come up on its head. It looks permanently embarrassed.', 'Dances with its partner for no audience, badly and with commitment.', 'Trumpets. The whole village knows.', 'Fully grown, and taller than the farmer who walks around it.'],
    parts: [
      wing('120px 100px', ['M120 100 L70 72 L92 112', A('M84 84 L90 98')], [[70, 72]], -18, { from: 2 }),
      { a: 'breathe', role: 'body', o: '120px 106px', l: ['M92 112 L150 96 L120 132 Z'], s: [[92, 112], [120, 132]] },
      ...legs([[112, 128, 106, 186], [126, 128, 134, 186]]),
      { a: 'bob', role: 'head', o: '150px 96px', l: ['M150 96 Q172 70 168 36', C(170, 30, 6), 'M176 30 L196 34'], f: [[172, 29, 1.5]], s: [[196, 34]] },
      { a: 'bob', role: 'head', o: '150px 96px', l: [A('M164 40 L176 40 M165 46 L174 46')], from: 2 },
      { a: 'sway', role: 'tail', turn: 12, o: '92px 112px', l: ['M92 112 L66 126 M92 112 L70 134 M92 112 L78 142'], s: [[66, 126], [70, 134], [78, 142]], from: 3 },
    ],
  },
  {
    id: 'jackal', name: 'Golden jackal', short: 'jackal', tier: 'everyday', region: 'plains', temperament: 'restless', hours: 'night', main: '#e8c070', acc: '#a8835a', star: '#fff0c8', sky: ['#6a4a1f', '#2f2f5a', '#3a2a1f'], reaction: 'leap',
    theme: { name: 'Jackal day', why: 'One voice starts it, and by midnight the whole plain has an opinion.', ring: 'sparks' },
    notes: ['Crosses the road after dark, looking both ways for no reason.', 'One starts howling and the rest feel they must say something.', 'Has learned what time the dhaba throws out the bones.', 'Trots with its head down, as if late for an appointment.', 'Grown, and still eating what falls off the cart.'],
    parts: [
      { a: 'swish', role: 'tail', o: '62px 106px', l: ['M62 106 Q40 118 34 142', A('M34 142 L30 132 M34 142 L42 134')], s: [[34, 142]] },
      { a: 'breathe', role: 'body', o: '110px 110px', l: ['M62 98 L110 114 L62 128 Z', 'M158 98 L110 114 L158 128 Z'], s: [[62, 98], [62, 128], [158, 98], [158, 128]] },
      ...legs([[72, 126, 68, 172], [86, 120, 90, 172], [132, 120, 128, 172], [146, 126, 150, 172]]),
      { a: 'bob', role: 'head', o: '158px 100px', l: ['M158 100 L178 78', 'M172 82 L186 62 L206 86 Z'], f: [[188, 76, 1.8]], s: [[206, 86]] },
      { a: 'bob', role: 'head', o: '158px 100px', l: ['M180 68 L176 48 M192 70 L198 50'], s: [[176, 48], [198, 50]], from: 2 },
      { a: 'breathe', o: '110px 110px', l: [A('M74 106 L82 110 M92 110 L100 112 M120 112 L128 110 M138 108 L146 106')], from: 3 },
    ],
  },
  {
    id: 'mongoose', name: 'Grey mongoose', short: 'mongoose', tier: 'everyday', region: 'plains', temperament: 'bold', main: '#c9c4b0', acc: '#e89a6a', star: '#f4f0e0', sky: ['#4f4a3a', '#5a3f2a', '#2a3a3a'], reaction: 'nod',
    theme: { name: 'Mongoose day', why: 'Small, grey and afraid of nothing it has met so far.', ring: 'cane' },
    notes: ['Stands up to look at you, then acts as though it didn’t.', 'Has checked under every stone on this verge.', 'Runs low, stops dead, and stands. Repeats this until it’s somewhere else.', 'Fights above its weight, and has the ear to prove it.', 'Grown. The verge is under new management.'],
    parts: [
      { a: 'swish', role: 'tail', o: '86px 150px', l: ['M86 150 Q50 160 28 136', A('M46 148 L42 138 M38 146 L32 136')], s: [[28, 136]] },
      { a: 'breathe', role: 'body', o: '110px 120px', l: ['M84 164 L114 76 L142 164 Z'], s: [[84, 164], [142, 164]] },
      { a: 'breathe', o: '110px 120px', l: [A('M100 130 L126 130 M104 112 L122 112')], from: 2 },
      ...legs([[96, 164, 92, 182], [130, 164, 134, 182]]),
      { a: 'sway', role: 'wing', turn: -20, o: '124px 106px', l: ['M124 106 L146 122', 'M104 106 L84 122'], s: [[146, 122], [84, 122]], from: 2 },
      { a: 'bob', role: 'head', o: '114px 76px', l: [C(116, 60, 13), 'M128 58 L146 64 L128 68'], f: [[120, 56, 1.8]], s: [[146, 64]] },
      { a: 'bob', role: 'head', o: '114px 76px', l: [A('M106 48 L100 38 M116 46 L116 36')], s: [[100, 38], [116, 36]], from: 3 },
    ],
  },
  {
    id: 'parakeet', name: 'Rose-ringed parakeet', short: 'parakeet', tier: 'everyday', region: 'plains', temperament: 'restless', hours: 'dawn', main: '#7ee08a', acc: '#ff8fa8', star: '#e4ffe0', sky: ['#1f6a3a', '#6a2f4f', '#1f4a3a'], reaction: 'flap',
    theme: { name: 'Parakeet day', why: 'It has told everyone already, loudly, and from a great height.', ring: 'blossom' },
    notes: ['Goes past at speed, shouting.', 'A hundred of them in one tree, and all of them are right.', 'The ring has come in round its neck. It seems pleased.', 'Eats one bite of each guava and leaves the rest as a warning.', 'Grown. Lower in pitch, not in volume.'],
    parts: [
      { a: 'swish', role: 'tail', o: '96px 120px', l: ['M96 120 Q60 158 34 186', A('M92 126 Q64 164 46 190')], s: [[34, 186], [46, 190]], from: 3 },
      { a: 'swish', role: 'tail', o: '96px 120px', l: ['M96 120 L72 148'], s: [[72, 148]] },
      { a: 'breathe', role: 'body', o: '120px 100px', l: ['M96 120 L134 64 L154 118 Z'], s: [[96, 120], [154, 118]] },
      wing('128px 88px', ['M128 88 L92 62 L108 104'], [[92, 62]], -24, { from: 2 }),
      { a: 'bob', role: 'head', o: '134px 64px', l: [C(142, 50, 14), 'M154 48 Q166 52 158 62'], f: [[146, 46, 1.8]], s: [[158, 62]] },
      { a: 'bob', role: 'head', o: '134px 64px', l: [A('M130 60 Q142 72 156 60')], from: 2 },
      ...legs([[122, 116, 118, 142], [136, 116, 140, 142]]),
    ],
  },
  {
    id: 'gharial', name: 'Gharial', short: 'gharial', tier: 'everyday', region: 'ravines', temperament: 'slow', main: '#9fd0a8', acc: '#e0d48a', star: '#eaffe8', sky: ['#1f5a4a', '#3a4a2a', '#1f3a4a'], reaction: 'snap',
    theme: { name: 'Gharial day', why: 'It has not moved since this morning, and that is the point of it.', ring: 'ripple' },
    notes: ['On the sandbar with its mouth open. It’s not doing anything; that’s just how it cools off.', 'A long thin jaw, built for fish and for nothing else, and it holds no ambitions.', 'Slides into the Chambal without a sound, and the sandbar seems smaller.', 'Older than the ravines around it, in spirit.', 'The knob has come up on its snout. It hums through it, in the water.', 'Grown. It’s still on the sandbar.'],
    parts: [
      { a: 'swish', role: 'tail', o: '86px 130px', l: ['M86 130 Q50 136 16 120', A('M64 134 L60 124 M48 132 L44 122 M32 127 L30 117')], s: [[16, 120]] },
      { a: 'breathe', role: 'body', o: '115px 132px', l: ['M86 130 L120 110 L152 130 L120 150 Z'], s: [[86, 130], [152, 130]] },
      { a: 'breathe', o: '115px 132px', l: [A('M104 122 L104 138 M120 116 L120 144 M136 122 L136 138')], from: 2 },
      ...legs([[100, 142, 88, 164], [140, 142, 150, 164]]),
      { a: 'still', role: 'head', o: '152px 128px', l: ['M152 124 L228 118'], f: [[160, 120, 2]], s: [[228, 118]] },
      { a: 'still', role: 'jaw', turn: 14, o: '152px 132px', l: ['M152 132 L228 124'], s: [[228, 124]] },
      { a: 'still', role: 'head', o: '152px 128px', l: [A(C(226, 112, 6))], s: [[226, 112]], from: 3 },
    ],
  },
  {
    id: 'blackbuck', name: 'Blackbuck', short: 'blackbuck', tier: 'everyday', region: 'ravines', temperament: 'watchful', hours: 'dawn', main: '#d8d4e0', acc: '#f0c48a', star: '#ffffff', sky: ['#3a3a5a', '#6a4a2a', '#2a2a3a'], reaction: 'leap',
    theme: { name: 'Blackbuck day', why: 'Straight up, four feet at once, for reasons of its own.', ring: 'kite' },
    notes: ['Springs straight up, all four feet at once, and comes down facing the same way.', 'The herd watches in shifts. This one drew the short straw.', 'Spiral horns are starting. It carries its head as if they’d arrived.', 'Holds its ground in the same small patch all season, against all comers.', 'Grown and dark across the back. It runs faster than it needs to.'],
    parts: [
      { a: 'swish', role: 'tail', o: '62px 96px', l: ['M62 96 L48 112'], s: [[48, 112]] },
      { a: 'breathe', role: 'body', o: '108px 106px', l: ['M62 88 L108 106 L62 124 Z', 'M154 88 L108 106 L154 124 Z'], s: [[62, 88], [62, 124], [154, 88], [154, 124]] },
      { a: 'breathe', o: '108px 106px', l: [A('M70 112 L98 112 M118 112 L146 112')], from: 2 },
      ...legs([[74, 120, 70, 176], [88, 116, 92, 176], [128, 116, 124, 176], [142, 120, 146, 176]]),
      { a: 'bob', role: 'head', o: '154px 90px', l: ['M154 90 L176 62', C(182, 56, 8)], f: [[185, 55, 1.6]], s: [[182, 48]] },
      { a: 'bob', role: 'head', o: '154px 90px', l: ['M178 50 L172 38 M186 50 L192 38'], s: [[172, 38], [192, 38]], from: 2 },
      { a: 'bob', role: 'head', o: '154px 90px', l: [A('M172 38 L178 28 L170 20 L176 8 M192 38 L186 28 L194 20 L188 8')], s: [[176, 8], [188, 8]], from: 3 },
    ],
  },
  {
    id: 'skimmer', name: 'Indian skimmer', short: 'skimmer', tier: 'everyday', region: 'ravines', temperament: 'watchful', hours: 'night', main: '#f2b070', acc: '#e8eef8', star: '#fff0dc', sky: ['#7a4a1f', '#1f3f6a', '#2a2a4a'], reaction: 'dive',
    theme: { name: 'Skimmer day', why: 'Its lower jaw is longer than the upper. It has made this work.', ring: 'sparks' },
    notes: ['Flies with its lower jaw in the river, which sounds worse than it is.', 'Fishes at dusk, by feel, in one long straight line.', 'Rests on the sand with its bill on the ground, as if the bill were heavy.', 'Rarer every year on this river, and unconcerned about it.', 'Grown. It has not once looked where it was going.'],
    parts: [
      wing('120px 104px', ['M120 104 L52 60 L92 112'], [[52, 60]], -22),
      wing('120px 104px', ['M124 104 L96 44 L138 96'], [[96, 44]], 18, { from: 2 }),
      { a: 'breathe', role: 'body', o: '120px 110px', l: ['M84 118 L120 98 L160 112 L124 126 Z'], s: [[84, 118]] },
      { a: 'swish', role: 'tail', o: '84px 118px', l: ['M84 118 L60 124 M84 118 L64 132'], s: [[60, 124], [64, 132]], from: 3 },
      { a: 'bob', role: 'head', o: '160px 112px', l: [C(168, 106, 8), A('M176 104 L198 110'), A('M176 110 L212 122')], f: [[170, 104, 1.5]], s: [[212, 122]] },
      { a: 'still', o: '120px 170px', l: [A('M120 136 L212 136 M90 148 L176 148')], from: 2 },
    ],
  },
  {
    id: 'dolphin', name: 'River dolphin', short: 'river dolphin', tier: 'everyday', region: 'ravines', temperament: 'slow', hours: 'night', main: '#a8c8e8', acc: '#d8c8f0', star: '#ecf6ff', sky: ['#1f4a6a', '#3a3a6a', '#1a2f4a'], reaction: 'dive',
    theme: { name: 'River dolphin day', why: 'Nearly blind, and it has never once been lost.', ring: 'ripple' },
    notes: ['Comes up, breathes, gone. That’s the whole sighting.', 'Nearly blind, and swims on one side with a flipper trailing the bed.', 'You hear it before you see it, and usually you don’t see it.', 'The long snout has come in. It finds fish in water like tea.', 'Grown. Up, a breath, gone.'],
    parts: [
      { a: 'swish', role: 'tail', o: '66px 120px', l: ['M66 120 L38 104 L46 124 L34 138 Z'], s: [[38, 104], [34, 138]] },
      { a: 'breathe', role: 'body', o: '120px 112px', l: ['M66 120 Q120 62 172 108 Q120 138 66 120 Z'], s: [[120, 86]] },
      { a: 'breathe', o: '120px 112px', l: [A('M92 112 Q120 100 150 110')], from: 2 },
      { a: 'sway', role: 'wing', turn: 16, o: '124px 124px', l: ['M124 124 L114 150'], s: [[114, 150]], from: 2 },
      { a: 'bob', role: 'head', o: '172px 108px', l: ['M172 108 L188 106'], f: [[166, 102, 1.4]], s: [[188, 106]] },
      { a: 'bob', role: 'head', o: '172px 108px', l: ['M188 106 L224 96', A('M196 108 L222 100')], s: [[224, 96]], from: 3 },
      { a: 'still', o: '120px 160px', l: [A('M42 160 Q84 150 120 160 T198 160')] },
    ],
  },
  {
    id: 'sloth-bear', name: 'Sloth bear', short: 'sloth bear', tier: 'everyday', region: 'ravines', temperament: 'slow', hours: 'night', main: '#c8b0e0', acc: '#f0e4c0', star: '#f4ecff', sky: ['#3a2a5a', '#4a3a2a', '#1f1f3a'], reaction: 'nod',
    theme: { name: 'Sloth bear day', why: 'It digs, it sniffs, it digs. Nothing about today will hurry it.', ring: 'thrown' },
    notes: ['Shambles. There is no other word, and none is needed.', 'You can hear it sucking termites out of the ground from a long way off.', 'Long claws have come in. It looks like it’s carrying garden tools.', 'Sits down to eat, like a person who has given up on the day.', 'Grown, with a pale V on its chest and no plans.'],
    parts: [
      { a: 'breathe', role: 'body', o: '112px 124px', l: ['M58 164 L112 66 L166 164 Z'], s: [[58, 164], [166, 164]] },
      { a: 'breathe', o: '112px 124px', l: [A('M96 110 L112 136 L128 110')], s: [[112, 136]], from: 3 },
      { a: 'breathe', o: '112px 124px', l: [A('M78 148 L146 148')], from: 2 },
      ...legs([[80, 164, 72, 186], [144, 164, 152, 186]]),
      { a: 'sway', role: 'wing', turn: -14, o: '136px 110px', l: ['M136 110 L168 132'], s: [[168, 132]] },
      { a: 'sway', o: '136px 110px', l: [A('M168 132 L176 142 M168 132 L170 146 M168 132 L162 144')], from: 2 },
      { a: 'bob', role: 'head', o: '112px 66px', l: [C(112, 48, 18), 'M100 34 L92 24 L106 30 M124 34 L132 24 L118 30', 'M112 56 L112 68'], f: [[105, 45, 1.8], [119, 45, 1.8]], s: [[92, 24], [132, 24]] },
    ],
  },
  {
    id: 'softshell', name: 'Softshell turtle', short: 'softshell', tier: 'everyday', region: 'ravines', temperament: 'slow', hours: 'dawn', main: '#b8d88a', acc: '#d8b888', star: '#f0ffd8', sky: ['#3f5a2a', '#4a3a2a', '#1f3a2a'], reaction: 'curl',
    theme: { name: 'Softshell day', why: 'A flat round creature with its nose out of the water, breathing.', ring: 'blossom' },
    notes: ['A plate on the river bed with a snorkel for a nose.', 'Comes up once, breathes, and has no further business with you.', 'The shell’s markings have come in. They look like a map of nothing.', 'Buries itself in the sand until only the nose is left, and waits.', 'Grown, broad as a cartwheel, and just as talkative.'],
    parts: [
      { a: 'breathe', role: 'body', o: '115px 120px', l: [C(115, 120, 50)], s: [[65, 120], [165, 120], [115, 70], [115, 170]] },
      { a: 'breathe', o: '115px 120px', l: [A('M80 100 L150 100 M72 120 L158 120 M80 140 L150 140')], from: 2 },
      { a: 'breathe', o: '115px 120px', l: [A('M115 70 L90 120 L115 170 L140 120 Z')], f: [[115, 120, 3]], from: 3 },
      { a: 'still', role: 'head', o: '162px 110px', l: ['M162 110 L188 96', C(194, 92, 7), 'M200 90 L212 86'], f: [[196, 89, 1.4]], s: [[212, 86]] },
      ...legs([[82, 86, 60, 66], [84, 156, 62, 176], [146, 156, 168, 176]]),
      { a: 'swish', role: 'tail', o: '66px 124px', l: ['M66 124 L46 130'], s: [[46, 130]] },
    ],
  },
];

const medium: Creature[] = [
  {
    id: 'cheetah', name: 'Asiatic cheetah', short: 'cheetah', tier: 'medium', region: 'ravines', temperament: 'restless', hours: 'dawn', main: '#f2c86a', acc: '#ffe9b8', star: '#fff4d6', sky: ['#8a6a2a', '#3a2a6a', '#4a2a1a'], reaction: 'gallop', footprint: 'paw',
    ring: { style: 'spots', name: 'Spots' },
    notes: ['Pugmarks in the dust, older than the road. No claw shows where it should.', 'Something long and fast at the edge of the fields, and then only the fields.', 'Fully seen. Hunted in these grasslands for centuries, until it wasn’t here at all.', 'Kept and trained by the courts, and never once bred for them.', 'Its story joins the sky.'],
    parts: [
      { a: 'swish', role: 'tail', o: '50px 100px', l: ['M50 100 Q30 110 26 140 Q24 150 34 150', A('M27 128 L36 130 M26 138 L35 140')], s: [[34, 150]], glimpse: true },
      { ...CHEETAH_BODY, glimpse: true },
      ...legs([[60, 126, 52, 180], [78, 120, 84, 180], [140, 120, 134, 180], [152, 126, 160, 180]]),
      { a: 'bob', role: 'head', o: '160px 96px', l: ['M160 96 L180 74', C(186, 68, 9), 'M180 60 L177 53 M192 60 L196 53', A('M184 71 L181 82')], f: [[189, 67, 1.6]], s: [[177, 53], [196, 53]], glimpse: true },
    ],
  },
  {
    id: 'lion', name: 'Asiatic lion', short: 'lion', tier: 'medium', region: 'ravines', temperament: 'bold', hours: 'night', main: '#f0a860', acc: '#ffd890', star: '#fff0d0', sky: ['#7a4a1f', '#5a1f3f', '#3a2a1a'], reaction: 'nod', footprint: 'paw',
    ring: { style: 'rays', name: 'Mane' },
    notes: ['Broad pugmarks, wider than any cat’s that lives here now.', 'A shape lying on a ridge line, too heavy for the ridge.', 'Fully seen. These ravines held lions, before the hunting parties came through.', 'One forest holds them all now, far to the west of here. This one has not heard.', 'Its story joins the sky.'],
    parts: [
      { a: 'swish', role: 'tail', o: '56px 104px', l: ['M56 104 Q30 112 26 92', A(C(24, 86, 5))], s: [[24, 86]], glimpse: true },
      { a: 'breathe', role: 'body', o: '105px 112px', l: ['M56 94 L105 114 L56 132 Z', 'M150 88 L105 114 L150 136 Z'], s: [[56, 94], [56, 132], [150, 136]], glimpse: true },
      ...legs([[66, 130, 60, 180], [82, 124, 86, 180], [128, 126, 124, 180], [144, 132, 150, 180]]),
      { a: 'bob', role: 'head', o: '150px 100px', l: [C(170, 84, 24), C(172, 84, 13)], f: [[176, 82, 1.8]], s: [[170, 60], [194, 84], [170, 108], [146, 84]], glimpse: true },
      { a: 'bob', role: 'head', o: '150px 100px', l: [A('M170 60 L170 48 M186 66 L196 56 M194 84 L208 84 M186 102 L196 112 M170 108 L170 120 M154 102 L144 112 M154 66 L144 56')] },
    ],
  },
  {
    id: 'aurochs', name: 'Indian aurochs', short: 'aurochs', tier: 'medium', region: 'plains', temperament: 'watchful', hours: 'dawn', main: '#d89878', acc: '#f0dcc0', star: '#ffeee0', sky: ['#6a3a2a', '#3a2a4a', '#2a2a1a'], reaction: 'gallop', footprint: 'hoof',
    ring: { style: 'ticks', name: 'Tally' },
    notes: ['A cloven print the size of a plate, in clay that set a very long time ago.', 'Something with a great hump stood on the far bank, and did not look domestic.', 'Fully seen. Every humped cow on this road is its descendant, and none of them remember.', 'Gone for thousands of years. It’s been drawn on seals, and bred into everything.', 'Its story joins the sky.'],
    parts: [
      { a: 'swish', role: 'tail', o: '54px 92px', l: ['M54 92 Q38 118 42 140', A('M38 140 L42 150 L46 140')], s: [[42, 150]], glimpse: true },
      { a: 'breathe', role: 'body', o: '100px 112px', l: ['M54 88 L104 116 L54 136 Z', 'M154 74 L104 116 L156 138 Z'], s: [[54, 88], [54, 136], [154, 74], [156, 138]], glimpse: true },
      { a: 'breathe', o: '100px 112px', l: [A('M64 104 L64 124 M76 110 L76 122 M130 100 L130 124 M142 96 L142 126')] },
      ...legs([[66, 132, 62, 182], [82, 126, 86, 182], [130, 128, 126, 182], [146, 134, 152, 182]]),
      { a: 'bob', role: 'head', o: '154px 96px', l: ['M154 96 L182 96 L198 118 L176 124 Z', 'M178 92 Q170 66 196 60 M186 92 Q204 76 224 80'], f: [[182, 104, 1.8]], s: [[196, 60], [224, 80], [198, 118]], glimpse: true },
    ],
  },
  {
    id: 'pink-duck', name: 'Pink-headed duck', short: 'pink-headed duck', tier: 'medium', region: 'plains', temperament: 'slow', hours: 'night', main: '#ff9ac0', acc: '#c8a878', star: '#ffe8f0', sky: ['#6a2f4f', '#3a3a2a', '#2a1f3a'], reaction: 'flap', footprint: 'web',
    ring: { style: 'leaves', name: 'Reeds' },
    notes: ['Webbed marks at the edge of a marsh that’s now a field.', 'A pale head among the reeds, seen once, by someone who wasn’t sure.', 'Fully seen. No one has reliably recorded one since before the war before last.', 'People still go looking in the far north-east, and come back unsure.', 'Its story joins the sky.'],
    parts: [
      { a: 'swish', role: 'tail', o: '72px 124px', l: ['M72 124 L46 112'], s: [[46, 112]], glimpse: true },
      { a: 'breathe', role: 'body', o: '112px 124px', l: ['M72 124 Q112 92 156 122 L120 148 Z'], s: [[72, 124], [120, 148]], glimpse: true },
      wing('112px 116px', ['M112 116 L78 92 L96 128', A('M92 104 L100 118')], [[78, 92]], -20),
      { a: 'bob', role: 'head', o: '156px 122px', l: ['M156 122 Q164 96 158 74', C(162, 62, 13), 'M174 60 L194 66 L174 70'], f: [[166, 58, 1.8]], s: [[194, 66], [162, 49]], glimpse: true },
      { a: 'still', o: '112px 160px', l: [A('M40 162 Q76 152 112 162 T186 162'), 'M196 170 L200 124 M208 170 L206 134'], s: [[200, 124], [206, 134]] },
    ],
  },
];

const rare: Creature[] = [
  {
    id: 'tanuki', name: 'Tanuki', short: 'tanuki', tier: 'rare', from: 'Japan', temperament: 'bold', hours: 'night', main: '#ff9a62', acc: '#e6c47a', star: '#ffe3b0', sky: ['#7a3fa0', '#a8552c', '#3a2a6a'], reaction: 'shift',
    ring: { style: 'claws', name: 'Paw prints' },
    notes: ['A long way from home. This one seems to have followed the smell of dinner.', 'Back again, and it has brought a very convincing kettle.', 'The straw hat is new, and so is the promissory note.'],
    forms: [
      { name: 'The tanuki', note: 'A long way from home. Folk tales give it a leaf for changing shape.', parts: [
        { a: 'swish', role: 'tail', o: '160px 142px', l: ['M158 142 Q198 136 208 98 Q194 92 172 120', A('M178 132 L184 124 M190 126 L194 116 M200 112 L204 104')], s: [[208, 98], [184, 124]] },
        { a: 'breathe', role: 'body', o: '115px 130px', l: ['M70 152 L115 74 L160 152 Z', A(C(115, 128, 14)), 'M84 116 L60 122 L56 116 M146 116 L170 104 L176 108', 'M95 152 L90 182 M135 152 L140 182'], f: [[115, 128, 8]], s: [[70, 152], [160, 152], [60, 122], [176, 108], [90, 182], [140, 182]] },
        { a: 'bob', role: 'head', o: '115px 74px', l: [C(115, 56, 22), 'M98 40 L90 20 L106 32 M132 40 L140 20 L124 32', A('M97 56 L133 56 M101 62 L129 62'), 'M113 68 L117 68', A('M108 32 Q115 14 126 22 Q120 30 108 32 M110 30 L122 23')], f: [[106, 57, 2.4], [124, 57, 2.4]], s: [[90, 20], [140, 20], [126, 22]] },
      ] },
      { name: 'The kettle', note: 'From the tale of the tea kettle that grew a tail, and walked off the fire when nobody looked.', parts: [
        { a: 'swish', role: 'tail', o: '166px 138px', l: ['M164 138 Q200 134 210 100 Q196 94 176 118', A('M182 128 L188 120 M194 122 L198 112')], s: [[210, 100]] },
        { a: 'breathe', role: 'body', o: '115px 130px', l: ['M64 156 L115 92 L166 156 Z', A('M78 140 L152 140'), 'M66 128 Q44 118 40 100', A('M84 96 Q115 52 146 96'), 'M90 156 L86 174 M140 156 L144 174'], f: [[115, 120, 6]], s: [[64, 156], [166, 156], [40, 100], [115, 74], [86, 174], [144, 174]] },
        { a: 'bob', role: 'head', o: '115px 92px', l: [C(115, 86, 7), 'M106 82 L100 72 M124 82 L130 72'], f: [[112, 86, 1.6], [118, 86, 1.6]], s: [[100, 72], [130, 72]] },
      ] },
      { name: 'The traveller', note: 'The statue outside the noodle shop: a straw hat, a flask, and a bill it never means to pay.', parts: [
        { a: 'swish', role: 'tail', o: '158px 146px', l: ['M158 146 Q190 150 200 128'], s: [[200, 128]] },
        { a: 'breathe', role: 'body', o: '115px 130px', l: ['M74 164 L115 84 L156 164 Z', A(C(115, 138, 18)), 'M90 112 L58 134', 'M140 112 L170 128', A('M170 128 L170 150 L186 150 L186 128 Z'), 'M95 164 L90 186 M135 164 L140 186'], f: [[115, 138, 9]], s: [[58, 134], [186, 150], [90, 186], [140, 186]] },
        { a: 'bob', role: 'head', o: '115px 84px', l: [C(115, 68, 18), A('M72 54 L115 22 L158 54 Z')], f: [[108, 68, 2.2], [122, 68, 2.2]], s: [[72, 54], [158, 54], [115, 22]] },
      ] },
    ],
  },
  {
    id: 'selkie', name: 'Selkie', short: 'selkie', tier: 'rare', from: 'Scottish islands', temperament: 'watchful', hours: 'night', main: '#a8d8f0', acc: '#e0e8f8', star: '#f0faff', sky: ['#1f4a7a', '#2a2a6a', '#1a3a4a'], reaction: 'shift',
    ring: { style: 'waves', name: 'Tide' },
    notes: ['A seal, very far inland, watching with a person’s patience.', 'It has taken the skin off, and is carrying it carefully.', 'Going home. It always does, in the stories.'],
    forms: [
      { name: 'The seal', note: 'From the northern isles, where some seals are only seals on the days they’re at sea.', parts: [
        { a: 'swish', role: 'tail', o: '64px 142px', l: ['M64 142 L36 128 L44 148 L32 162 Z'], s: [[36, 128], [32, 162]] },
        { a: 'breathe', role: 'body', o: '110px 132px', l: ['M64 142 Q110 86 156 104 L150 158 Q104 166 64 142 Z'], s: [[110, 104]] },
        { a: 'sway', role: 'wing', turn: 16, o: '130px 150px', l: ['M130 152 L120 178'], s: [[120, 178]] },
        { a: 'bob', role: 'head', o: '156px 104px', l: [C(166, 86, 18), A('M176 94 L190 90 M176 98 L190 100')], f: [[170, 82, 2]], s: [[166, 68]] },
        { a: 'still', o: '110px 186px', l: [A('M28 186 Q70 176 110 186 T192 186')] },
      ] },
      { name: 'Out of the skin', note: 'On certain nights it steps out of the skin and dances on the rocks. Whoever hides the skin keeps it ashore.', parts: [
        { a: 'still', role: 'tail', o: '180px 170px', l: [A('M154 176 Q180 146 212 170 Q190 186 154 176 Z')], s: [[212, 170]] },
        { a: 'breathe', role: 'body', o: '100px 110px', l: ['M72 152 L100 72 L128 152 Z', 'M88 152 L82 190 M112 152 L118 190'], s: [[72, 152], [128, 152], [82, 190], [118, 190]] },
        wing('100px 88px', ['M100 88 L60 58'], [[60, 58]], -22),
        wing('100px 88px', ['M100 88 L142 54'], [[142, 54]], 22),
        { a: 'bob', role: 'head', o: '100px 72px', l: [C(100, 54, 14), A('M88 46 Q70 62 74 84 M112 46 Q130 62 126 84')], f: [[95, 52, 1.6], [105, 52, 1.6]], s: [[100, 40]] },
      ] },
      { name: 'The way back', note: 'When it finds the skin, it goes. It looks back once from the water, in every version of the tale.', parts: [
        { a: 'still', o: '120px 150px', l: [A('M18 142 Q60 130 104 142 T196 142 M18 164 Q60 152 104 164 T196 164')] },
        { a: 'bob', role: 'head', o: '120px 120px', l: [C(120, 106, 22), 'M108 128 Q120 144 134 128'], f: [[112, 100, 2.2], [128, 100, 2.2]], s: [[120, 84], [98, 106], [142, 106]] },
        { a: 'swish', role: 'tail', o: '180px 130px', l: ['M172 128 L204 110 L198 130 L214 142 Z'], s: [[204, 110], [214, 142]] },
      ] },
    ],
  },
  {
    id: 'jackalope', name: 'Jackalope', short: 'jackalope', tier: 'rare', from: 'the American plains', temperament: 'restless', hours: 'dawn', main: '#f0d078', acc: '#d89a60', star: '#fff4c8', sky: ['#7a5a1f', '#6a3a2a', '#2a3a5a'], reaction: 'shift',
    ring: { style: 'forks', name: 'Antlers' },
    notes: ['A hare, with antlers, in a field. It has clearly heard every joke.', 'It’s by the campfire now, and it’s singing the last song back.', 'Thundery, and it’s moving. They only breed in lightning, say the people selling the postcards.'],
    forms: [
      { name: 'The hare with horns', note: 'First stuffed and sold in Wyoming, and believed in ever since by nobody who’ll admit it.', parts: [
        { a: 'swish', role: 'tail', o: '66px 148px', l: [C(56, 146, 8)], s: [[48, 146]] },
        { a: 'breathe', role: 'body', o: '105px 136px', l: ['M64 160 L112 96 L146 160 Z'], s: [[64, 160], [146, 160]] },
        ...legs([[84, 160, 66, 184], [130, 160, 138, 184]]),
        { a: 'bob', role: 'head', o: '124px 100px', l: [C(136, 86, 16), 'M124 72 L114 40 L132 68', 'M142 70 L150 38 L156 72'], f: [[142, 84, 2]], s: [[114, 40], [150, 38]] },
        { a: 'bob', role: 'head', o: '124px 100px', l: [A('M128 66 L120 28 M122 44 L108 30 M124 34 L130 18 M148 64 L168 28 M160 44 L178 40 M166 32 L160 16')], s: [[108, 30], [130, 18], [178, 40], [160, 16]] },
      ] },
      { name: 'The campfire singer', note: 'Cowboys said it could mimic any voice, and sang their songs back to them at night from out of the dark.', parts: [
        { a: 'breathe', role: 'body', o: '92px 130px', l: ['M58 170 L92 92 L126 170 Z', 'M78 170 L72 188 M108 170 L114 188'], s: [[58, 170], [126, 170], [72, 188], [114, 188]] },
        wing('92px 118px', ['M100 118 L128 104'], [[128, 104]], -18),
        { a: 'bob', role: 'head', o: '92px 92px', l: [C(92, 74, 16), 'M84 60 L74 34 M100 60 L112 34', A('M74 34 L64 22 M74 34 L84 20 M112 34 L102 20 M112 34 L124 24'), 'M88 86 Q92 92 98 86'], f: [[87, 72, 1.8], [98, 72, 1.8]], s: [[64, 22], [84, 20], [102, 20], [124, 24]] },
        { a: 'sway', turn: 8, o: '184px 180px', l: [A('M160 186 L208 186 M168 180 L200 190 M200 180 L168 190'), 'M184 178 Q168 158 184 138 Q200 158 184 178 Z'], s: [[184, 138]] },
        { a: 'still', o: '150px 60px', l: [A('M140 70 L150 56 L160 66 M168 44 L178 30 L188 40')], s: [[188, 40]] },
      ] },
      { name: 'The lightning runner', note: 'They say it only runs in storms, and it’s faster than the thunder. The postcards are very firm on this.', parts: [
        { a: 'swish', role: 'tail', o: '54px 120px', l: [C(44, 118, 7)], s: [[37, 118]] },
        { a: 'breathe', role: 'body', o: '100px 118px', l: ['M52 124 L104 92 L158 120 L100 142 Z'], s: [[52, 124], [158, 120]] },
        ...legs([[70, 132, 34, 168], [90, 138, 62, 178], [130, 130, 166, 164], [146, 124, 192, 150]]),
        { a: 'bob', role: 'head', o: '158px 110px', l: [C(172, 96, 14), 'M162 84 L150 50 M176 82 L186 48', A('M150 50 L138 40 M150 50 L156 32 M186 48 L176 32 M186 48 L200 38')], f: [[178, 94, 1.8]], s: [[138, 40], [156, 32], [176, 32], [200, 38]] },
        { a: 'still', o: '60px 40px', l: [A('M56 14 L40 44 L58 44 L42 76')], s: [[42, 76]] },
      ] },
    ],
  },
  {
    id: 'hut', name: 'The walking hut', short: 'walking hut', tier: 'rare', from: 'Russia', temperament: 'watchful', hours: 'night', main: '#e8b0f0', acc: '#f0c890', star: '#fbeeff', sky: ['#5a2a6a', '#6a3a2a', '#2a1f4a'], reaction: 'shift',
    ring: { style: 'hen', name: 'Hen tracks' },
    notes: ['A small wooden hut on two large chicken legs, stopped for now.', 'It has turned to face you, which is the polite thing for it to do.', 'It’s folded up its legs. Sitting, it could almost pass for a building.'],
    forms: [
      { name: 'On its way', note: 'From the old Russian tales of the witch in the forest. The house, unlike her, is mostly harmless.', parts: [
        { a: 'still', role: 'leg', turn: -14, o: '96px 124px', l: ['M96 124 L86 150 L102 178', A('M102 178 L86 186 M102 178 L104 192 M102 178 L118 186')], s: [[86, 150], [102, 178]] },
        { a: 'still', role: 'leg', turn: 14, o: '144px 124px', l: ['M144 124 L156 150 L140 178', A('M140 178 L124 186 M140 178 L142 192 M140 178 L156 186')], s: [[156, 150], [140, 178]] },
        { a: 'breathe', role: 'body', o: '120px 100px', l: ['M78 124 L78 72 L162 72 L162 124 Z', A('M108 124 L108 92 L132 92 L132 124')], s: [[78, 124], [162, 124]] },
        { a: 'bob', role: 'head', o: '120px 72px', l: ['M66 72 L120 26 L174 72 Z', A('M150 46 L150 26 L160 26 L160 56')], f: [[120, 54, 3]], s: [[66, 72], [174, 72], [120, 26]] },
      ] },
      { name: 'Turned to face you', note: 'Say the right words, and it turns its back to the forest and its door to you. It’s usually better not to.', parts: [
        { a: 'still', role: 'leg', turn: -8, o: '98px 130px', l: ['M98 130 L90 156 L100 182', A('M100 182 L84 188 M100 182 L116 188')], s: [[90, 156], [100, 182]] },
        { a: 'still', role: 'leg', turn: 8, o: '142px 130px', l: ['M142 130 L150 156 L140 182', A('M140 182 L124 188 M140 182 L156 188')], s: [[150, 156], [140, 182]] },
        { a: 'breathe', role: 'body', o: '120px 104px', l: ['M72 130 L72 74 L168 74 L168 130 Z', A('M104 130 L104 90 L136 90 L136 130'), A(C(88, 96, 8)), A(C(152, 96, 8))], f: [[120, 112, 2.4], [88, 96, 2], [152, 96, 2]], s: [[72, 130], [168, 130]] },
        { a: 'bob', role: 'head', o: '120px 74px', l: ['M58 74 L120 24 L182 74 Z'], s: [[58, 74], [182, 74], [120, 24]] },
      ] },
      { name: 'At rest', note: 'At night it sits and tucks up its legs. A lamp stays on in the window, and nobody’s asked who for.', parts: [
        { a: 'still', role: 'leg', turn: -6, o: '86px 150px', l: ['M86 150 L60 164 L92 172', A('M92 172 L78 184 M92 172 L102 184')], s: [[60, 164], [92, 172]] },
        { a: 'still', role: 'leg', turn: 6, o: '154px 150px', l: ['M154 150 L180 164 L148 172', A('M148 172 L138 184 M148 172 L162 184')], s: [[180, 164], [148, 172]] },
        { a: 'breathe', role: 'body', o: '120px 120px', l: ['M76 150 L76 104 L164 104 L164 150 Z', A('M104 120 L136 120 L136 142 L104 142 Z')], f: [[120, 131, 6]], s: [[76, 150], [164, 150]] },
        { a: 'bob', role: 'head', o: '120px 104px', l: ['M64 104 L120 60 L176 104 Z', A('M146 78 L146 58 L156 58 L156 88')], s: [[64, 104], [176, 104], [120, 60]] },
        { a: 'sway', turn: 6, o: '150px 40px', l: [A('M150 56 Q140 46 150 36 Q160 26 150 16')], s: [[150, 16]] },
      ] },
    ],
  },
];

export const CREATURES: Creature[] = [...everyday, ...medium, ...rare];
export const creatureById = (id: string | undefined): Creature | undefined => CREATURES.find((c) => c.id === id);

/** A footprint trail for a medium-rare creature's tracks: its feet, its pace, nothing else yet. */
function trackParts(kind: Footprint): Part[] {
  const spots: [number, number][] = [[52, 168], [96, 146], [140, 160], [186, 136]];
  return [{
    a: 'breathe',
    o: '120px 150px',
    l: spots.flatMap(([x, y]) => (kind === 'hoof' ? [`M${x - 7} ${y - 8} Q${x - 9} ${y + 6} ${x - 2} ${y + 7} L${x - 2} ${y - 8} Z`, `M${x + 7} ${y - 8} Q${x + 9} ${y + 6} ${x + 2} ${y + 7} L${x + 2} ${y - 8} Z`] : kind === 'web' ? [`M${x} ${y + 8} L${x - 11} ${y - 8} L${x} ${y - 3} L${x + 11} ${y - 8} Z`] : [C(x, y, 6)])),
    f: kind === 'paw' ? spots.flatMap(([x, y]): [number, number, number][] => [[x - 7, y - 9, 2.2], [x - 2, y - 13, 2.2], [x + 4, y - 13, 2.2], [x + 8, y - 9, 2.2]]) : undefined,
    s: spots,
  }];
}

const LEGEND_RING: [number, number][] = Array.from({ length: 14 }, (_, k) => {
  const a = (k / 14) * Math.PI * 2;
  return [Math.round(115 + Math.cos(a) * 112), Math.round(104 + Math.sin(a) * 92)] as [number, number];
});

/** The drawing for a creature at a stage: detail by stage, tracks to legend, or a guest's form. */
export function figureFor(c: Creature, stage: number): { parts: Part[]; faint?: boolean } {
  const s = Math.max(1, stage);
  if (c.tier === 'everyday') return { parts: (c.parts ?? []).filter((p) => !p.from || p.from <= s) };
  if (c.tier === 'rare') return { parts: c.forms![Math.min(s, c.forms!.length) - 1].parts };
  if (s === 1) return { parts: trackParts(c.footprint ?? 'paw') };
  if (s === 2) return { parts: (c.parts ?? []).filter((p) => p.glimpse).map((p) => ({ ...p, f: undefined })), faint: true };
  if (s === 3) return { parts: c.parts ?? [] };
  return {
    parts: [
      { a: 'breathe', o: '115px 104px', l: [A(`M${LEGEND_RING.map((p) => p.join(' ')).join(' L')} Z`)], s: LEGEND_RING },
      ...(c.parts ?? []),
    ],
  };
}

const TIER_WORD = { everyday: 'Everyday', medium: 'Medium-rare', rare: 'Rare guest' } as const;
export const tierWord = (c: Pick<Creature, 'tier'>) => TIER_WORD[c.tier];
const STAGE_WORDS = ['Tracks', 'Glimpse', 'Sighting', 'Legend'];
/** The stage in words, so a stage is never only dots. */
export function stageWord(c: Creature, stage: number): string {
  if (c.tier === 'medium') return STAGE_WORDS[Math.max(1, stage) - 1];
  if (c.tier === 'rare') return `Form ${stage} of 3`;
  return stage >= 3 ? 'Grown' : `Stage ${stage} of 3`;
}
export const nameAt = (c: Creature, stage: number): string => (c.tier === 'medium' && stage < 3 ? 'Not yet known' : c.tier === 'rare' ? c.forms![Math.min(Math.max(1, stage), 3) - 1].name : c.name);
export const noteAt = (c: Creature, visits: number): string => (c.tier === 'rare' ? c.forms![Math.min(Math.max(1, visits), 3) - 1].note : c.notes[Math.min(Math.max(1, visits), c.notes.length) - 1]);
