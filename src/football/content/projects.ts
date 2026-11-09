// Projects and building stages, as one list (spec §16, "The club quarter"): every building on the
// Kaai skyline (Kaai 42, the club shop, café, academy, training ground, museum and ferry stop), each
// with its stages, plus a few journeys that aren't buildings. It extends ground.ts: every shipped
// bundle appears here once, read from BUNDLES, so its needs, money and gating never disagree.
// New stages are added after the shipped ones. One project is active at a time (spec §11.3).
import { bundleById, type Place } from '../ground';
import type { Effect, Metric, ProjectDef } from './types';

/** A shipped ground.ts bundle, as a project. */
function ground(id: string, stage: number, effects: Effect[] = []): ProjectDef {
  const b = bundleById(id);
  return {
    id, name: b.name, place: b.place, source: 'ground', stage,
    needs: b.needs.filter((n) => n.what !== 'none').map((n) => ({ what: n.what as Metric, count: n.count })),
    money: b.money, after: b.after, tier: b.tier, moved: b.moved,
    reward: b.effect, effects, tease: b.tease, capacity: b.capacity, downtime: b.downtime,
  };
}
type StageInput = Omit<ProjectDef, 'source' | 'place' | 'stage'>;
const stage = (place: Place, n: number, p: StageInput): ProjectDef => ({ ...p, place, source: 'stage', stage: n });
const journey = (p: StageInput): ProjectDef => ({ ...p, place: null, source: 'journey', stage: 0 });

export const PROJECTS: ProjectDef[] = [
  // ---------- Kaai 42: stands and roof ----------
  ground('plot', 1),
  ground('kaai-stand', 2),
  ground('river-end', 3),
  ground('crane-stand', 4),
  ground('dock-end', 5),
  ground('floodlights', 6),
  ground('scoreboard', 7),
  ground('physio', 8),
  ground('roof', 9),
  stage('kaai', 10, { id: 'kaai-pressbox', name: 'Press box', tech: 'r-pressoffice', moved: true, after: ['kaai-stand'], tier: 3,
    needs: [{ what: 'bedtime', count: 15 }], money: 0.8, reward: 'Reporters at home: a press line after every home win.',
    effects: [{ kind: 'cosmetic', what: 'press-box' }], tease: 'A row of empty desks under the main stand roof.' }),
  stage('kaai', 11, { id: 'river-upper', name: 'River End upper tier', tech: 't-secondtiers', moved: true, after: ['river-end', 'roof'], tier: 2,
    needs: [{ what: 'sleep', count: 30 }], money: 3, capacity: 3000, downtime: 21, reward: 'A second tier on the home end: more seats, more noise.',
    effects: [], tease: 'Scaffolding above the River End, and a lot of opinions about it.' }),
  stage('kaai', 12, { id: 'crane-upper', name: 'Crane Stand upper tier', tech: 't-secondtiers', moved: true, after: ['crane-stand', 'roof'], tier: 2,
    needs: [{ what: 'protein', count: 30 }], money: 3, capacity: 3000, downtime: 21, reward: 'A second tier on the Crane Stand, level with the old crane’s arm.',
    effects: [], tease: 'The crane has a view. Soon, so will three thousand others.' }),
  stage('kaai', 13, { id: 'kaai-corners', name: 'Corner stands', tech: 'r-kaai42', moved: true, after: ['roof'], tier: 2,
    needs: [{ what: 'steps', count: 40 }, { what: 'training', count: 30 }], money: 4, capacity: 4000, downtime: 21, reward: 'The corners filled in: Kaai 42 becomes a bowl.',
    effects: [], tease: 'Four gaps where the wind gets in.' }),

  // ---------- the club shop ----------
  ground('shop-1', 1),
  ground('shop-2', 2),
  ground('shop-3', 3),
  stage('shop', 4, { id: 'shop-4', name: 'Kit gallery', tech: 'n-classickit', moved: true, after: ['shop-3'], tier: 2,
    needs: [{ what: 'steps', count: 30 }], money: 2, reward: 'Every kit on the kit wall, and the classics, on sale: shop money +10%.',
    effects: [{ kind: 'money', what: 'shop', share: 0.1 }], tease: 'An empty glass wall with hangers on it.', downtime: 14 }),

  // ---------- the café ----------
  ground('cafe-1', 1),
  stage('cafe', 2, { id: 'cafe-tea', name: 'Tea hut', tech: 's-teahut',
    needs: [{ what: 'steps', count: 8 }], money: 0.03, reward: 'Chai at half-time: +1 Fuel on defence in the last 15 at home.',
    effects: [{ kind: 'axis', axis: 'Fuel', d: 1, side: 'def', when: 'home-late' }], tease: 'A shed, a kettle, and a queue already.' }),
  ground('cafe-2', 3),
  ground('cafe-3', 4),

  // ---------- the academy ----------
  ground('academy-1', 1),
  ground('academy-2', 2),
  stage('academy', 3, { id: 'academy-wing', name: 'The academy wing', tech: 'r-academy', after: ['academy-2'], tier: 3,
    needs: [{ what: 'session-week', count: 12 }], money: 1.2, reward: 'A fourth youngster’s place in the academy.',
    effects: [{ kind: 'slot', slot: 'academy', add: 1 }], tease: 'Plans for a wing, pinned to the Portakabin door.', downtime: 14 }),
  ground('academy-3', 4),

  // ---------- the training ground ----------
  ground('training-1', 1),
  ground('training-2', 2),
  stage('training', 3, { id: 'training-video', name: 'Video room', tech: 'r-videoroom', after: ['training-2'], tier: 3,
    needs: [{ what: 'training', count: 25 }], money: 0.8, reward: 'Every goal on tape: each loss names the unit it turned on.',
    effects: [{ kind: 'cosmetic', what: 'loss-replays' }], tease: 'A dark room with a very big screen.' }),
  stage('training', 4, { id: 'training-pool', name: 'Recovery pool', tech: 't-pool', after: ['training-2'], tier: 2,
    needs: [{ what: 'sleep', count: 25 }], money: 2, reward: 'Cold water and warm water: knocks heal a day faster.',
    effects: [{ kind: 'rule', rule: 'knock-days', value: -1 }], tease: 'A hole in the ground with tiles stacked beside it.', downtime: 21 }),
  ground('training-3', 5),

  // ---------- the museum ----------
  ground('museum-1', 1),
  ground('museum-2', 2),
  stage('museum', 3, { id: 'museum-hall', name: 'The album hall', tech: 'n-museum', after: ['museum-2'], tier: 2,
    needs: [{ what: 'steps', count: 40 }], money: 2.5, reward: 'A hall for the museum pieces from every finished album set.',
    effects: [{ kind: 'cosmetic', what: 'album-hall' }], tease: 'A long room with numbered plinths, all empty.', downtime: 14 }),

  // ---------- the ferry stop ----------
  ground('ferry-1', 1),
  ground('ferry-2', 2),
  stage('ferry', 3, { id: 'ferry-3', name: 'The night ferry', tech: 'c-europeannights', after: ['ferry-2'], tier: 1,
    needs: [{ what: 'steps', count: 40 }, { what: 'bedtime', count: 20 }], money: 3, reward: 'A late boat for continental nights: continental gate money +10%.',
    effects: [{ kind: 'money', what: 'continental-gate', share: 0.1 }], tease: 'Lanterns strung along the pier.', downtime: 7 }),

  // ---------- journeys, not buildings ----------
  journey({ id: 'long-road', name: 'The long road', tech: 'p-minibus', needs: [{ what: 'km', count: 1000 }], money: 0,
    reward: 'Pace can field 3.', effects: [{ kind: 'slot', slot: 'pace-places', add: 1 }], tease: 'A thousand kilometres, one day at a time.' }),
  journey({ id: 'night-school', name: 'Night school', tech: 'p-sleepcoach', needs: [{ what: 'bedtime', count: 60 }], money: 0,
    reward: 'Youngsters arrive with +1 potential.', effects: [{ kind: 'rule', rule: 'youth-potential', value: 1 }], tease: 'Sixty nights of lights out on time.' }),
  journey({ id: 'the-hundred', name: 'The hundred', tech: 'r-sportsscience', needs: [{ what: 'training', count: 100 }], money: 0,
    reward: 'Power can field 3.', effects: [{ kind: 'slot', slot: 'power-places', add: 1 }], tease: 'A hundred sessions. Count them on the dressing-room wall.' }),
  journey({ id: 'square-meals', name: 'Square meals', tech: 'p-meals', needs: [{ what: 'three-meals', count: 90 }], money: 0,
    reward: 'Fuel can field 3.', effects: [{ kind: 'slot', slot: 'fuel-places', add: 1 }], tease: 'Breakfast, lunch and dinner, ninety times over.' }),
  journey({ id: 'the-tape', name: 'The tape', tech: 't-datateam', needs: [{ what: 'waist', count: 12 }], money: 0,
    reward: 'Shape can field 3.', effects: [{ kind: 'slot', slot: 'shape-places', add: 1 }], tease: 'Twelve standing measurements, in inches.' }),
];
export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);
