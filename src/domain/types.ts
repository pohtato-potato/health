import type { DayKey } from './dates';
import type { PlanDef } from './plan';

export type Meal = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
export const MEAL_NAMES: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

export interface Targets {
  kcalMin: number;
  kcalMax: number;
  proteinG: number;
  steps: number;
  waterMl: number;
  sleepMin: number;
  sessionsPerWeek: number;
}

/** Targets change over time; each record applies from its date onward. */
export interface TargetsRecord {
  from: DayKey;
  targets: Targets;
}

export interface ChecklistItem {
  id: string;
  name: string;
  /** One tick per slot per day, e.g. ['Morning', '9 pm']. */
  slots: string[];
  active: boolean;
}

export interface Home {
  id: string;
  name: string;
}

export interface Plate {
  kg: number;
  count: number;
  owned: boolean;
}

export interface Equipment {
  /** Loose plates that go on the adjustable handles in matching pairs. */
  plates: Plate[];
  /** Fixed dumbbells owned as pairs, in kg each. */
  fixed: number[];
  band: boolean;
  bench: string;
  /** A reward: training at a gym, with a full rack of dumbbells. */
  gym?: boolean;
}

export type VoiceId = 'zen' | 'coach' | 'comm' | 'gremlin';

export interface Prefs {
  ding: boolean;
  wakeLock: boolean;
  nightMode: boolean;
  buzz: boolean;
  confirmSteps: boolean;
  /** Added after launch, so older saves may not have them: read through prefOn(). */
  ticker?: boolean;
  shake?: boolean;
  shuffleVoices?: boolean;
  seasonal?: boolean;
  tempoCoach?: boolean;
  blurPhotos?: boolean;
  lockPhotos?: boolean;
  suggestTargets?: boolean;
  freeMealSaveUp?: boolean;
  /** A reward: closed rings turn gold. */
  goldRings?: boolean;
}

const PREF_DEFAULTS: Required<Prefs> = {
  ding: true,
  wakeLock: true,
  nightMode: true,
  buzz: true,
  confirmSteps: true,
  ticker: true,
  shake: true,
  shuffleVoices: false,
  seasonal: true,
  tempoCoach: true,
  blurPhotos: true,
  lockPhotos: false,
  suggestTargets: true,
  freeMealSaveUp: false,
  goldRings: false,
};

export function prefOn(prefs: Prefs, key: keyof Prefs): boolean {
  return prefs[key] ?? PREF_DEFAULTS[key];
}

export interface SavedMeal {
  id: string;
  name: string;
  items: { foodId: string; amount: number }[];
  createdAt: number;
}

export interface CustomTrack {
  id: string;
  name: string;
  /** count: a number a day; scale: 1 to 5; yesno: did it happen. */
  kind: 'count' | 'scale' | 'yesno';
  unit?: string;
  target?: number;
  /** Lower is better, e.g. caffeine. */
  lowerIsBetter?: boolean;
  active: boolean;
  createdAt: number;
}

export interface Settings {
  id: 'app';
  setupDone: boolean;
  name: string;
  heightCm?: number;
  goalDate?: DayKey;
  voice: VoiceId;
  targets: TargetsRecord[];
  checklist: ChecklistItem[];
  homes: Home[];
  equipment: Equipment;
  loopSteps?: number;
  prefs: Prefs;
  backup: { lastQuick?: number; lastFull?: number; lastFullBytes?: number; nudgeDays: number };
  plan?: PlanDef;
  /** Choices made while following the plan: harder variants and band levels. */
  planState: { variants: Record<string, number>; band: Record<string, number> };
  /** Fastest morning log, in seconds. */
  morningBest?: number;
  /** A worn title, by achievement id. */
  title?: string;
  theme?: string;
  confetti?: string;
  /** 'MM-DD', for the birthday theme. */
  birthday?: string;
  customTracks?: CustomTrack[];
  /** WebAuthn credential that unlocks photos with the fingerprint. */
  photoKey?: string;
  /** Saved combinations of foods, logged in one tap. */
  meals?: SavedMeal[];
  lastReview?: number;
  /** Festivals, weddings, travel: calories at maintenance, streaks paused. */
  occasions?: Occasion[];
  /** The learned maintenance estimate, refreshed as data comes in. */
  maintenance?: { kcal: number; at: number; weeks: number };
  createdAt: number;
}

export interface Sleep {
  /** Minutes after midnight. Asleep may be the evening before. */
  asleep: number;
  woke: number;
  rested?: number;
}

export interface Day {
  date: DayKey;
  weightKg?: number;
  weighedAt?: number;
  steps?: number;
  stepsAt?: number;
  /** Set when the next morning's log confirms the final count. */
  stepsFinal?: boolean;
  waterMl?: number;
  sleep?: Sleep;
  home?: string;
  morning?: { at: number; seconds?: number };
  /** Morning follow-up answers, keyed by flag id. */
  answers?: Record<string, boolean>;
  /** Checklist ticks, keyed `${itemId}:${slotIndex}`, valued by time. */
  ticks?: Record<string, number>;
  /** Parts of the day water was logged in: 1 morning, 2 afternoon, 4 evening. */
  waterParts?: number;
  /** Walking tagged as outdoors. */
  outdoors?: boolean;
  /** A night out was logged: a free meal and drinks, or either. */
  nightOut?: boolean;
  /** The day after a night out: a gentler step goal, and no shield spent if it's missed. */
  eased?: boolean;
  /** Custom track values live in trackValues; notes for the day live here. */
  note?: string;
}

export type FoodUnit = 'g' | 'ml' | 'piece' | 'serving';

export interface Food {
  id: string;
  name: string;
  /** Shown after the amount, e.g. "cooked". */
  note?: string;
  unit: FoodUnit;
  /** For pieces: "piece", "egg", "bottle". */
  unitName?: string;
  unitPlural?: string;
  /** For servings: what one serving is, e.g. "2 roti, 1 katori dal". */
  servingDesc?: string;
  /** The amount the kcal and protein values are for: 100 for grams, 1 for pieces. */
  per: number;
  kcal: number;
  protein: number;
  defaultAmount: number;
  presets?: number[];
  step?: number;
  /** A home id, when the food is mostly eaten there. */
  home?: string;
  archived?: boolean;
  createdAt: number;
}

export type EntryKind = 'food' | 'quick' | 'free' | 'drink';

export interface FoodEntry {
  id: string;
  date: DayKey;
  meal: Meal;
  at: number;
  kind: EntryKind;
  foodId?: string;
  name: string;
  amount?: number;
  portion: string;
  kcal: number;
  protein: number;
  drink?: { type: string; count: number };
}

export type Side = 'L' | 'R' | 'both';

export interface TrainingSession {
  id: string;
  date: DayKey;
  session: string;
  planName: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'done';
  short: boolean;
  exercises: string[];
  swapped?: { from: string; to: string | null; reason: string }[];
  flags?: string[];
  notes?: string;
  tempo?: Record<string, boolean>;
  /** Readiness when the session started, to learn what the score predicts. */
  readiness?: number;
}

export interface SetEntry {
  id: string;
  sessionId: string;
  date: DayKey;
  session: string;
  exerciseId: string;
  /** The name at the time, which records the variant too. */
  exercise: string;
  setNo: number;
  side: Side;
  /** Per dumbbell. Null for bodyweight and band work. */
  loadKg: number | null;
  band?: string;
  reps?: number;
  seconds?: number;
  tempo?: boolean;
  drop?: boolean;
  at: number;
  mark?: Mark;
}

export type Mark = '!!' | '!' | '=';

export interface Measurement {
  id: string;
  date: DayKey;
  at: number;
  /** Inches. */
  waistStanding?: number;
  waistSlouched?: number;
  shoulders?: number;
  note?: string;
}

/** A celebration or notice already shown, so it never repeats. */
export interface Seen {
  id: string;
  at: number;
}

export interface Unlock {
  /** Achievement id. */
  id: string;
  at: number;
  date: DayKey;
  /** Unlocked in the first sweep over existing data, without a celebration. */
  quiet?: boolean;
}

export interface Win {
  id: string;
  date: DayKey;
  at: number;
  text: string;
}

export type Pose = 'front' | 'side' | 'back' | 'tshirt';

export interface CheckIn {
  id: string;
  date: DayKey;
  at: number;
  /** The t-shirt test, each 1 to 5. */
  tshirt?: { shoulders: number; arms: number; stomach: number };
  line?: string;
  measurementId?: string;
  photos: Partial<Record<Pose, string>>;
}

export interface Photo {
  id: string;
  checkinId: string;
  date: DayKey;
  pose: Pose;
  blob: Blob;
  width: number;
  height: number;
}

export interface Clip {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise: string;
  date: DayKey;
  at: number;
  blob: Blob;
  type: string;
  seconds?: number;
}

export type OccasionKind = 'festival' | 'wedding' | 'travel' | 'sick' | 'other';

export interface Occasion {
  id: string;
  kind: OccasionKind;
  name: string;
  from: DayKey;
  to: DayKey;
}

/** One row per week, keyed by its Monday. */
export interface WeekNote {
  id: DayKey;
  oneThing?: string;
  /** Did last week's one thing happen? */
  done?: boolean;
  recapSeenAt?: number;
}

export interface TrackValue {
  id: string;
  trackId: string;
  date: DayKey;
  value: number;
  at: number;
}

/** Counts things you do in the app that leave no other trace, like tapping the ticker. */
export interface Counter {
  id: string;
  n: number;
  /** Distinct days it happened on. */
  days?: DayKey[];
  /** Distinct values seen, like the voices you've tried. */
  values?: string[];
  at?: number;
}
