import type { PlanDef } from '../src/domain/plan';
import type { Equipment, SetEntry, Side } from '../src/domain/types';

/** A made-up plan with the same shapes as a real one. */
export const PLAN: PlanDef = {
  format: 'health-plan',
  version: 1,
  name: 'Test A/B',
  from: '2026-01-01',
  rotation: ['A', 'B'],
  bigJump: 0.25,
  sessions: [
    {
      id: 'A',
      name: 'Session A',
      focus: 'Pull',
      minutes: 60,
      short: ['row', 'hinge', 'raise'],
      exercises: [
        { id: 'row', order: '1', name: 'Row', sets: 3, reps: [10, 15], perSide: true, load: 'single', startKg: 10 },
        { id: 'hinge', order: '2', name: 'Hinge', sets: 3, reps: [10, 15], load: 'pair', startKg: 10, variants: [{ name: 'Hard hinge', note: 'one foot back' }] },
        { id: 'raise', order: '3a', name: 'Raise', sets: 3, reps: [12, 20], load: 'pair', startKg: 5, drop: { kg: 2.5 } },
        { id: 'band', order: '3b', name: 'Band pull', sets: 3, reps: [15, 20], load: 'band', bandLevels: ['Band', 'Doubled band'] },
        { id: 'curl', order: '4', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair', startKg: 5, tempo: true },
        { id: 'carry', order: '5', name: 'Carry', sets: 2, seconds: [45, 60], load: 'pair', startKg: 10 },
      ],
    },
    {
      id: 'B',
      name: 'Session B',
      focus: 'Push',
      minutes: 60,
      short: ['press', 'lunge'],
      exercises: [
        { id: 'press', order: '1', name: 'Press', sets: 3, reps: [10, 15], load: 'pair', startKg: 10 },
        { id: 'lunge', order: '2', name: 'Lunge', sets: 2, reps: [8, 12], perSide: true, lead: 'L', load: 'body', thenLoad: { load: 'pair', kg: 5 } },
        { id: 'squat', order: '3', name: 'Squat', sets: 3, reps: [12, 15], load: 'single', startKg: 10 },
        { id: 'pushup', order: '4', name: 'Push-up', sets: 3, open: true, load: 'body', stopFlag: 'wrist' },
      ],
    },
  ],
  flags: [
    { id: 'joint', label: 'Joint: pain', group: 'Joint', when: 'session', swap: { from: 'lunge', to: 'squat', session: 'B' } },
    { id: 'joint-am', label: 'Joint swollen', group: 'Joint', when: 'morning', question: 'Joint swollen?', after: ['lunge'], swap: { from: 'lunge', to: 'squat', session: 'B' } },
    { id: 'wrist', label: 'Wrist: pain', group: 'Wrist', when: 'session' },
  ],
  triggers: [{ id: 'gym', exercise: 'row', kg: 20, sets: 3, reps: 12, title: 'Gym time', message: 'Rows at 20 kg for 3 × 12.' }],
};

export const EQ: Equipment = {
  plates: [
    { kg: 2.5, count: 8, owned: true },
    { kg: 1.25, count: 4, owned: false },
  ],
  fixed: [],
  band: true,
  bench: '',
};

let n = 0;
/** Sets for one session of one exercise. `reps` per set; sides doubled when given. */
export function sets(
  exerciseId: string,
  exercise: string,
  sessionId: string,
  date: string,
  loadKg: number | null,
  reps: number[],
  opts: { sides?: Side[]; tempo?: boolean; seconds?: boolean } = {},
): SetEntry[] {
  const out: SetEntry[] = [];
  reps.forEach((r, i) => {
    for (const side of opts.sides ?? (['both'] as Side[])) {
      out.push({
        id: `s${++n}`,
        sessionId,
        date,
        session: 'A',
        exerciseId,
        exercise,
        setNo: i + 1,
        side,
        loadKg,
        ...(opts.seconds ? { seconds: r } : { reps: r }),
        tempo: opts.tempo,
        at: Date.parse(date) + n * 1000,
      });
    }
  });
  return out;
}
