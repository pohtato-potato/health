import { musclesOf } from './muscles';
import { allExercises, type ExerciseDef, type PlanDef, type SessionDef } from './plan';

/** Bodyweight stand-ins for each movement pattern, for hotel rooms and guest rooms. */
const PATTERNS: { test: (m: string[]) => boolean; ex: Omit<ExerciseDef, 'order'> }[] = [
  { test: (m) => m.includes('chest'), ex: { id: 'trip-pushup', name: 'Push-up (hands on a bed or chair if needed)', sets: 3, open: true, load: 'body', restSec: 75, measure: 'reps' } },
  {
    test: (m) => m.includes('lats') || m.includes('upper-back'),
    ex: { id: 'trip-towel-row', name: 'Towel row on a door', sets: 3, reps: [10, 15], load: 'body', restSec: 75, measure: 'reps', note: 'Loop a towel round both handles of a closed door and lean back.' },
  },
  { test: (m) => m.includes('front-delts') || m.includes('side-delts'), ex: { id: 'trip-pike', name: 'Pike push-up', sets: 2, reps: [6, 12], load: 'body', restSec: 75, measure: 'reps' } },
  { test: (m) => m.includes('quads'), ex: { id: 'trip-split-squat', name: 'Split squat', sets: 3, reps: [10, 15], perSide: true, load: 'body', restSec: 60, measure: 'reps' } },
  { test: (m) => m.includes('hamstrings') || m.includes('glutes'), ex: { id: 'trip-hinge', name: 'Single-leg hip hinge', sets: 3, reps: [10, 15], perSide: true, load: 'body', restSec: 60, measure: 'reps' } },
  { test: (m) => m.includes('rear-delts'), ex: { id: 'trip-prone-y', name: 'Prone Y-raise on the floor', sets: 2, reps: [12, 20], load: 'body', restSec: 45, measure: 'reps' } },
  { test: (m) => m.includes('calves'), ex: { id: 'trip-calf', name: 'Single-leg calf raise off a step', sets: 2, reps: [15, 25], perSide: true, load: 'body', restSec: 45, measure: 'reps' } },
  { test: (m) => m.includes('abs'), ex: { id: 'trip-plank', name: 'Side plank', sets: 2, seconds: [30, 45], perSide: true, load: 'body', restSec: 45, measure: 'seconds' } },
];

export const TRIP_SESSION_ID = 'trip';

/** A bodyweight session built from the movement patterns the plan trains. */
export function tripSession(plan: PlanDef): SessionDef {
  const worked = [...new Set(allExercises(plan).flatMap((e) => musclesOf(e).primary))];
  const picks = PATTERNS.filter((p) => p.test(worked)).map((p, i) => ({ ...p.ex, order: String(i + 1) }));
  return { id: TRIP_SESSION_ID, name: 'Trip workout', focus: 'Bodyweight, anywhere', minutes: 30, short: [], exercises: picks };
}

/** The plan with the trip session added, so a trip workout runs like any other. */
export function withTrip(plan: PlanDef): PlanDef {
  return plan.sessions.some((s) => s.id === TRIP_SESSION_ID) ? plan : { ...plan, sessions: [...plan.sessions, tripSession(plan)] };
}
