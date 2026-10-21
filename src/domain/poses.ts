import type { ExerciseDef } from './plan';
import { movementKind } from './trainingChecks';

export type Pt = [number, number];

/** A pose as a constellation: joints are stars, limbs the lines between them; `pair` links left and right. */
export interface Pose {
  stars: Pt[];
  lines: [number, number][];
  pair?: [number, number][];
}

/** Front-on standing figure: head, shoulders, elbows, hands, hips, knees, feet. */
const front = (arms: { elbows: [Pt, Pt]; hands: [Pt, Pt] }): Pose => ({
  stars: [[50, 18], [38, 32], [62, 32], arms.elbows[0], arms.elbows[1], arms.hands[0], arms.hands[1], [44, 66], [56, 66], [42, 92], [58, 92], [42, 118], [58, 118]],
  lines: [[0, 1], [0, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]],
  pair: [[3, 4], [5, 6]],
});

/** Every movement pattern in the plan, drawn in a 100 × 130 box. */
const DEFS = {
  // a hip hinge from the side: head, shoulder, elbow, hand, hip, knee, ankle, toe
  hinge: { stars: [[30, 30], [38, 42], [42, 60], [44, 78], [64, 52], [66, 82], [64, 112], [74, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7]] },
  // a goblet squat from the side, the weight at the chest
  squat: { stars: [[46, 22], [46, 36], [36, 50], [42, 44], [58, 72], [34, 84], [40, 112], [30, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7]] },
  // a split squat: front knee bent, back knee low
  'split-squat': { stars: [[50, 18], [50, 32], [44, 52], [44, 66], [50, 64], [30, 82], [28, 112], [66, 100], [82, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [4, 7], [7, 8]], pair: [[5, 7]] },
  // a glute bridge: shoulders down, hips up, one leg lifted
  bridge: { stars: [[12, 108], [24, 104], [52, 82], [70, 74], [78, 108], [86, 56], [36, 112]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [1, 6]] },
  // seated press, both arms overhead, front-on
  'overhead-press': front({ elbows: [[28, 28], [72, 28]], hands: [[32, 8], [68, 8]] }),
  // standing, one arm on the door frame, the other raised out to the side
  lateral: { stars: [[46, 22], [38, 36], [56, 36], [24, 44], [14, 50], [72, 36], [86, 34], [44, 70], [42, 94], [40, 118], [52, 94], [54, 118]], lines: [[0, 1], [0, 2], [1, 3], [3, 4], [2, 5], [5, 6], [1, 7], [2, 7], [7, 8], [8, 9], [7, 10], [10, 11]], pair: [[3, 5], [4, 6]] },
  // a Y-raise: both arms up and out
  'y-raise': front({ elbows: [[28, 22], [72, 22]], hands: [[18, 8], [82, 8]] }),
  // lying, arms straight up from the chest
  'floor-press': { stars: [[14, 96], [26, 94], [30, 72], [30, 50], [60, 96], [74, 80], [86, 98]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6]] },
  // lying back, forearms folded back over the face
  skull: { stars: [[18, 84], [30, 82], [66, 84], [82, 100], [86, 120], [34, 48], [22, 40], [40, 46]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [1, 7]] },
  // lying, arms wide in a fly
  fly: { stars: [[14, 96], [26, 94], [16, 76], [8, 62], [36, 76], [44, 62], [60, 96], [74, 80], [86, 98]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [1, 6], [6, 7], [7, 8]], pair: [[2, 4], [3, 5]] },
  // seated, elbow pointing up, the weight behind the head
  'overhead-extension': { stars: [[44, 30], [48, 44], [54, 14], [38, 30], [50, 80], [70, 82], [70, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6]] },
  // bent over a bench, one hand braced, the other rowing to the hip
  row: { stars: [[24, 44], [34, 50], [36, 70], [36, 88], [52, 48], [56, 66], [70, 50], [72, 80], [72, 110], [84, 76]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [1, 6], [4, 5], [6, 7], [7, 8], [6, 9]], pair: [[2, 5]] },
  // lying, arms reaching back over the head
  pullover: { stars: [[34, 98], [44, 96], [26, 90], [12, 86], [70, 96], [82, 80], [92, 98]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6]] },
  // face down along a bench, arms out to the side
  'rear-fly': { stars: [[18, 58], [30, 62], [70, 66], [86, 72], [96, 80], [30, 80], [26, 94], [38, 80], [44, 94]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [1, 7], [7, 8]], pair: [[5, 7], [6, 8]] },
  // standing front-on, both forearms up in a curl
  curl: { stars: [[50, 20], [38, 34], [62, 34], [36, 58], [64, 58], [42, 44], [58, 44], [44, 72], [56, 72], [44, 96], [56, 96], [44, 120], [56, 120]], lines: [[0, 1], [0, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]], pair: [[3, 4], [5, 6]] },
  // seated, forearm along the thigh, the wrist curling up
  'wrist-curl': { stars: [[38, 24], [40, 40], [42, 80], [66, 80], [66, 110], [58, 72], [80, 70], [86, 62]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7]] },
  // a forearm plank from the side
  plank: { stars: [[18, 86], [28, 92], [28, 108], [42, 108], [60, 94], [78, 98], [94, 104]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6]] },
  // a side plank, the top arm raised
  'side-plank': { stars: [[18, 72], [28, 80], [26, 104], [58, 92], [76, 100], [94, 108], [36, 58]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [1, 6]] },
  // a push-up, hands on a raised edge
  'push-up': { stars: [[24, 52], [32, 60], [34, 76], [30, 90], [64, 84], [78, 98], [92, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6]] },
  // up on the toes of one foot, a hand on the wall
  'calf-raise': { stars: [[50, 16], [50, 30], [64, 34], [72, 26], [50, 66], [50, 90], [50, 110], [58, 118], [42, 92], [34, 98]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7], [4, 8], [8, 9]] },
  // standing tall, a weight in each hand
  carry: front({ elbows: [[34, 48], [66, 48]], hands: [[34, 66], [66, 66]] }),
  // on the back, one arm up and the opposite leg out
  'dead-bug': { stars: [[16, 96], [28, 94], [30, 72], [32, 50], [60, 94], [66, 72], [80, 74], [86, 92], [14, 80]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [4, 7], [1, 8]] },
  // pulling a band to the face, elbows high
  'face-pull': { stars: [[46, 22], [46, 36], [62, 30], [54, 22], [92, 26], [48, 72], [44, 96], [44, 120], [54, 96], [56, 120]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [5, 8], [8, 9]] },
  // standing, for anything without a pattern yet
  stand: front({ elbows: [[34, 48], [66, 48]], hands: [[34, 64], [66, 64]] }),
} satisfies Record<string, Pose>;

export type PoseId = keyof typeof DEFS;
export const POSES: Record<PoseId, Pose> = DEFS;

const BY_ID: Record<string, PoseId> = {
  rdl: 'hinge', 'goblet-squat': 'squat', 'split-squat': 'split-squat', 'single-leg-bridge': 'bridge', ohp: 'overhead-press',
  'lateral-raise': 'lateral', 'lean-lateral': 'lateral', 'seated-lateral': 'lateral', 'y-raise': 'y-raise', 'floor-press': 'floor-press',
  'close-grip-press': 'floor-press', 'skull-crusher': 'skull', 'floor-fly': 'fly', 'overhead-ext': 'overhead-extension', row: 'row',
  'seal-row': 'rear-fly', pullover: 'pullover', 'rear-delt': 'rear-fly', curl: 'curl', 'hammer-curl': 'curl', 'reverse-curl': 'curl',
  'concentration-curl': 'curl', 'wrist-curl': 'wrist-curl', plank: 'plank', 'side-plank': 'side-plank', 'incline-pushup': 'push-up',
  'calf-raise': 'calf-raise', 'farmer-carry': 'carry', 'dead-bug': 'dead-bug', 'face-pull': 'face-pull',
};

const BY_NAME: [RegExp, PoseId][] = [
  [/rear delt|reverse fly/i, 'rear-fly'],
  [/side plank/i, 'side-plank'],
  [/plank/i, 'plank'],
  [/split squat|lunge/i, 'split-squat'],
  [/squat/i, 'squat'],
  [/deadlift|\brdl\b|hinge|good morning/i, 'hinge'],
  [/bridge|thrust/i, 'bridge'],
  [/overhead press|shoulder press|military/i, 'overhead-press'],
  [/y-raise/i, 'y-raise'],
  [/lateral/i, 'lateral'],
  [/skull/i, 'skull'],
  [/fly/i, 'fly'],
  [/extension/i, 'overhead-extension'],
  [/pullover/i, 'pullover'],
  [/\brows?\b/i, 'row'],
  [/wrist curl/i, 'wrist-curl'],
  [/curl/i, 'curl'],
  [/push-?up/i, 'push-up'],
  [/\bpress\b/i, 'floor-press'],
  [/calf/i, 'calf-raise'],
  [/carry|walk/i, 'carry'],
  [/dead bug/i, 'dead-bug'],
  [/face pull/i, 'face-pull'],
];

const BY_KIND = { legs: 'squat', push: 'floor-press', pull: 'row', core: 'plank' } as const;

/** The pose for an exercise: by its id, else its name, else its kind of movement, else standing. */
export function poseFor(ex: Pick<ExerciseDef, 'id' | 'name'>): PoseId {
  const kind = movementKind(ex);
  return BY_ID[ex.id] ?? BY_NAME.find(([re]) => re.test(ex.name))?.[1] ?? (kind ? BY_KIND[kind] : 'stand');
}
