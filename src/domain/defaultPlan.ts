import { upgradePlan, type PlanDef } from './plan';
import type { Equipment } from './types';

/**
 * The built-in plan: two home dumbbell sessions, A and B, four times a week.
 * A new install starts with it; a starter file or "Import a plan" replaces it.
 */
export const DEFAULT_PLAN: PlanDef = upgradePlan({
  format: 'health-plan',
  version: 2,
  name: 'Home A/B',
  from: '2026-09-27',
  rotation: ['A', 'B'],
  perWeek: 4,
  bigJump: 0.25,
  warmup: '5 minutes: band pull-aparts, arm circles, 10 bodyweight squats, one light set of the first exercise.',
  rules: [
    { title: 'Effort', text: 'End every set with 1–2 reps left in you. Leave 3 in the first few sessions of any new movement.' },
    { title: 'Progression', text: 'When every set hits the top of the rep range, go heavier next session. Before a big jump, slow the lowering to 3 seconds or add a pause first.' },
    { title: 'Knee', text: 'Stop split squats and use goblet squats only if the knee click comes with pain, the knee catches or feels like it might give, or the joint is swollen or stiff the next day. If that happens, see a physio.' },
    { title: 'Wrist', text: 'Stop any push-up variation at wrist pain.' },
    { title: 'Short on time', text: 'Do the first two exercises of the session plus lateral raises, and skip the rest.' },
    { title: 'Supersets', text: 'Exercises sharing a number (3a, 3b) are done back to back, then rest before the next round.' },
    { title: 'Loads', text: 'All dumbbell loads are per dumbbell unless marked as one dumbbell.' },
  ],
  sessions: [
    {
      id: 'A',
      name: 'Session A',
      focus: 'Pull, hinge, biceps',
      minutes: 60,
      short: ['row', 'rdl', 'lateral-raise'],
      exercises: [
        { id: 'row', order: '1', name: 'One-arm dumbbell row', sets: 3, reps: [10, 15], perSide: true, load: 'single', startKg: 10, restSec: 90, note: 'Knee and hand on the bed, palm facing in. 15 kg, then 20 kg on one handle.' },
        { id: 'rdl', order: '2', name: 'Romanian deadlift', sets: 3, reps: [10, 15], load: 'pair', startKg: 10, restSec: 120, variants: [{ name: 'Kickstand RDL', note: 'back toes down for balance, weight on the front leg' }] },
        { id: 'lateral-raise', order: '3a', name: 'Lateral raise', sets: 3, reps: [12, 20], load: 'pair', startKg: 5, drop: { kg: 2.5 }, note: 'Last set: drop to 2.5 kg and keep going.' },
        { id: 'y-raise', order: '3b', name: 'Bent-over Y-raise', sets: 3, reps: [12, 15], load: 'pair', startKg: 2.5, restSec: 90, note: 'Hinge forward, thumbs up, raise the arms into a Y. Light is right.' },
        { id: 'hammer-curl', order: '4a', name: 'Hammer curl', sets: 3, reps: [10, 15], load: 'pair', startKg: 5 },
        { id: 'rear-delt', order: '4b', name: 'Rear delt fly', sets: 3, reps: [12, 15], load: 'pair', startKg: 5, restSec: 75 },
        { id: 'curl', order: '5a', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair', startKg: 5, tempo: true, note: 'Strict, 3-second lowering.' },
        { id: 'wrist-curl', order: '5b', name: 'Wrist curl', sets: 2, reps: [20, 30], load: 'pair', startKg: 5, restSec: 75, tiredHands: true },
        { id: 'farmer-carry', order: '6', name: 'Farmer carry', sets: 2, measure: 'seconds', seconds: [60, 90], load: 'pair', startKg: 10, restSec: 90, tiredHands: true, note: 'Walk tall, shoulders down.' },
      ],
    },
    {
      id: 'B',
      name: 'Session B',
      focus: 'Push, legs, triceps',
      minutes: 60,
      short: ['floor-press', 'split-squat', 'lean-lateral'],
      exercises: [
        { id: 'floor-press', order: '1', name: 'Floor press', sets: 3, reps: [10, 15], load: 'pair', startKg: 10, restSec: 120 },
        { id: 'split-squat', order: '2', name: 'Split squat', sets: 2, reps: [8, 12], perSide: true, lead: 'L', load: 'body', thenLoad: { load: 'pair', kg: 5 }, restSec: 90, note: 'Hand on the wall. Left leg first; the right never does more reps than the left. Build to 12, then hold 5 kg dumbbells.' },
        { id: 'goblet-squat', order: '3', name: 'Goblet squat', sets: 3, reps: [12, 15], load: 'single', startKg: 10, restSec: 120, note: '15 kg, then 20 kg on one handle.' },
        { id: 'ohp', order: '4a', name: 'Seated overhead press', sets: 3, reps: [8, 12], load: 'pair', startKg: 5, note: 'Palms facing in.' },
        { id: 'lean-lateral', order: '4b', name: 'Lean-away lateral raise', sets: 3, reps: [12, 15], perSide: true, load: 'single', startKg: 5, restSec: 90, note: 'Hold a door frame and lean away.' },
        { id: 'pullover', order: '5a', name: 'Pullover', sets: 3, reps: [12, 15], load: 'single', startKg: 10, note: 'One dumbbell, both hands.' },
        { id: 'incline-pushup', order: '5b', name: 'Incline push-up', sets: 3, open: true, load: 'body', stopFlag: 'wrist-pain', restSec: 90, note: 'Grip a sturdy table edge; go lower as it gets easier. Stop at any wrist pain.' },
        { id: 'skull-crusher', order: '6a', name: 'Skull crusher', sets: 3, reps: [10, 15], load: 'pair', startKg: 5, note: 'Palms facing in.' },
        { id: 'reverse-curl', order: '6b', name: 'Reverse-grip curl', sets: 3, reps: [12, 15], load: 'pair', startKg: 5, restSec: 75, tiredHands: true },
        { id: 'calf-raise', order: '7', name: 'Single-leg calf raise', sets: 3, reps: [12, 20], perSide: true, load: 'single', startKg: 5, restSec: 60, note: 'Off a step, full stretch at the bottom.' },
        { id: 'side-plank', order: '8', name: 'Forearm side plank', sets: 2, seconds: [30, 45], perSide: true, load: 'body', restSec: 45 },
      ],
    },
  ],
  flags: [
    { id: 'knee-pain', label: 'Knee: pain with the click', group: 'Knee', when: 'session', swap: { from: 'split-squat', to: 'goblet-squat', session: 'B' }, advice: 'If it keeps happening, see a physio.' },
    { id: 'knee-catch', label: 'Knee: caught, or felt like it might give', group: 'Knee', when: 'session', swap: { from: 'split-squat', to: 'goblet-squat', session: 'B' }, advice: 'If it keeps happening, see a physio.' },
    {
      id: 'knee-swelling',
      label: 'Knee: swollen or stiff the next day',
      group: 'Knee',
      when: 'morning',
      question: 'Knee swollen or stiff?',
      hint: "After yesterday's split squats",
      after: ['split-squat'],
      swap: { from: 'split-squat', to: 'goblet-squat', session: 'B' },
      advice: 'If it keeps happening, see a physio.',
    },
    { id: 'wrist-pain', label: 'Wrist: pain on any exercise', group: 'Wrist', when: 'session', advice: 'Stop push-up variations at wrist pain.' },
    { id: 'shoulder-pain', label: 'Shoulder: pain on any exercise', group: 'Shoulder', when: 'session' },
  ],
  triggers: [
    { id: 'gym', exercise: 'row', kg: 20, sets: 3, reps: 12, title: 'Gym trigger', message: 'Rows at 20 kg for 3 × 12. When kickstand RDLs feel easy too, start 3 gym days a week.' },
  ],
  phases: [
    { from: '2026-09-27', to: '2026-11-30', title: 'Lifts climb fast', text: 'Mostly from learning the movements. The waist keeps dropping, and posture is often the first visible change.' },
    { from: '2026-12-01', to: '2027-02-28', title: 'The slow stretch', text: 'Scale flat, waist creeping down. Muscle is building but not yet visible. Keep going: this is the stretch the plan predicted.' },
    { from: '2027-03-01', to: '2027-05-31', title: "The winter's work shows", text: 'The last of the fat comes off and everything built since October starts to show. Judge by photos and the ratio.' },
  ],
});

/** The home kit the plan's loads are built from: 2.5 kg plates in pairs, a few fixed dumbbells, a band. */
export const DEFAULT_EQUIPMENT: Equipment = {
  plates: [
    { kg: 2.5, count: 8, owned: true },
    { kg: 1.25, count: 4, owned: false },
  ],
  fixed: [1, 2.5, 5, 10],
  band: true,
  bench: 'Bed',
};
