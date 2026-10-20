import type { DayKey } from './dates';
import type { PlanDef } from './plan';

export type Meal = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
/** Minutes after midnight for each meal. */
export type MealTimes = Record<Meal, number>;

export type PlaceKind = 'home' | 'office' | 'trip' | 'friends';

/** Where a day happens. Each place brings its own meal times, step easing and the foods shown first. */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  meals: MealTimes;
  /** The step goal is eased on days spent here (office, trip). */
  eased: boolean;
  foodsFirst: 'home' | 'outside' | 'normal';
}

/** A status relaxes targets to maintenance and pauses streaks while it lasts. */
export type Status = 'sick' | 'injured' | 'travelling' | 'break' | 'occasion';

export const MUSCLES = ['chest', 'upper-back', 'lats', 'front-delts', 'side-delts', 'rear-delts', 'biceps', 'triceps', 'forearms', 'abs', 'glutes', 'quads', 'hamstrings', 'calves'] as const;
export type MuscleId = (typeof MUSCLES)[number];

export const DEFAULT_MEAL_TIMES: { home: MealTimes; office: MealTimes } = {
  home: { breakfast: 540, lunch: 810, snacks: 1050, dinner: 1260 },
  office: { breakfast: 480, lunch: 780, snacks: 1020, dinner: 1230 },
};

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
  /** v2: medicine details, when the item is a medicine or supplement. */
  med?: MedInfo;
}

export interface MedInfo {
  kind: 'medicine' | 'supplement';
  form?: 'drops' | 'tablet' | 'capsule' | 'powder' | 'liquid' | 'other';
  /** "1 drop, both eyes", "5 g". */
  dose?: string;
  /** Courses that end or change: from each date on, these slots (none ends it). */
  courses?: { from: DayKey; slots: string[] }[];
  /** Pills or doses left, and how many one dose uses. */
  stock?: { left: number; perDose: number };
}

export interface Appointment {
  id: string;
  date: DayKey;
  /** Minutes after midnight. */
  time?: number;
  title: string;
  notes: string[];
}

/** A personal experiment: change one thing from a date and watch one measure. */
export interface Experiment {
  id: string;
  question: string;
  metric: 'steps' | 'sleep' | 'protein' | 'kcal' | 'energy' | 'readiness';
  from: DayKey;
  /** The last day of it; open while running. */
  to?: DayKey;
}

/** What an on-time dose can earn; each switchable. */
export interface MedRewards {
  lantern: boolean;
  keptWeek: boolean;
  perfectDay: boolean;
  keptCount: boolean;
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
  /** Water tracking; the owner's starter turns it off. */
  water?: boolean;
  /** Battery saver for sessions: true black, no animation, the dimmed rest screen. */
  batterySaver?: boolean;
  /** Check-in photos shot in a mirror: flip them back so left stays left. */
  mirrorCheckIn?: boolean;
  /** Full-screen celebrations: records, firsts, perfect days. */
  moments?: boolean;
  /** No confetti or buzz from 10 pm to 7 am, or while the app is in the background. */
  quietPublic?: boolean;
}

const PREF_DEFAULTS: Required<Prefs> = {
  ding: true,
  wakeLock: true,
  nightMode: true,
  buzz: true,
  confirmSteps: true,
  ticker: false,
  shake: true,
  shuffleVoices: false,
  seasonal: true,
  tempoCoach: true,
  blurPhotos: true,
  lockPhotos: false,
  suggestTargets: true,
  freeMealSaveUp: false,
  goldRings: false,
  water: false,
  batterySaver: false,
  mirrorCheckIn: false,
  moments: true,
  quietPublic: true,
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
  /** v2: doctor appointments, with notes to take along. */
  appointments?: Appointment[];
  /** v2: the switchable rewards for on-time doses. */
  medRewards?: MedRewards;
  /** v2: personal experiments. */
  experiments?: Experiment[];
  /** v2: a status switched on in one tap, carried day to day until switched off. */
  activeStatus?: { status: Status; from: DayKey; through: DayKey };
  homes: Home[];
  equipment: Equipment;
  loopSteps?: number;
  prefs: Prefs;
  backup: { lastQuick?: number; lastFull?: number; lastFullBytes?: number; nudgeDays: number };
  plan?: PlanDef;
  /** Choices made while following the plan: harder variants and band levels. */
  planState: { variants: Record<string, number>; band: Record<string, number> };
  /** The session picked to start the loop at import; holds until a rotation session is done after `at`. */
  rotationStart?: { session: string; at: number };
  /** What a plan import replaced, so it can be undone for 7 days. */
  planUndo?: { at: number; name: string; plan?: PlanDef; planState: Settings['planState']; rotationStart?: Settings['rotationStart'] };
  /** Fastest morning log, in seconds. */
  morningBest?: number;
  /** A worn title, by achievement id. */
  title?: string;
  theme?: string;
  confetti?: string;
  /** 'MM-DD', for the birthday theme. */
  birthday?: string;
  /** v2: the day of the month the check-in falls on (1–28). */
  checkInDay?: number;
  /** v2: the maintenance figure the owner last answered the weekly check-in for. */
  maintenanceSeen?: number;
  /** v2: for the fat-mass estimate behind maintenance. Kept private (starter file). */
  birthYear?: number;
  customTracks?: CustomTrack[];
  /** WebAuthn credential that unlocks photos with the fingerprint. */
  photoKey?: string;
  /** Saved combinations of foods, logged in one tap. */
  meals?: SavedMeal[];
  lastReview?: number;
  /** Festivals, weddings, travel: calories at maintenance, streaks paused. */
  occasions?: Occasion[];
  /** v2: where days happen. Replaces homes; old home ids become place ids. */
  places?: Place[];
  /** The owner's own food categories, shown as tabs in Add food. */
  foodCategories?: { id: string; name: string; foodIds: string[] }[];
  lastfm?: { key: string; users: string[] };
  /** 0 = Sunday … 6 = Saturday. */
  reviewDay?: number;
  /** Records count clean reps only (default on). */
  formRecordsClean?: boolean;
  /** Steps per room turn, for farmer carries. */
  turnSteps?: number;
  /** The learned maintenance estimate, refreshed as data comes in. */
  maintenance?: { kcal: number; at: number; weeks: number };
  /** v2: readiness weights refitted to how sessions went, and when. */
  /** v2: a lighter week the owner accepted, and when the offer was last waved off. */
  lighterWeek?: { from: DayKey; to: DayKey };
  lighterDismissed?: DayKey;
  readinessWeights?: { at: number; weights: import('./readiness').Weights; sessions: number };
  createdAt: number;
}

export interface Sleep {
  /** Minutes after midnight. Asleep may be the evening before. */
  asleep: number;
  woke: number;
  rested?: number;
  /** Copied with "Same as yesterday", not typed. */
  carried?: boolean;
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
  /** v2: the place the day starts at (replaces home). */
  place?: string;
  /** Mid-day moves: from this time on the day follows the new place. */
  placeChanges?: { at: number; place: string }[];
  status?: Status;
  /** Checklist slots marked missed, keyed like ticks. */
  missed?: Record<string, true>;
  /** Food marked complete for the day. */
  foodDone?: boolean;
  /** Readiness answers. */
  energy?: number;
  stomach?: boolean;
  soreness?: Partial<Record<MuscleId, 1 | 2 | 3>>;
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
  /** Outside dishes: small, regular and large as multiples of the usual amount. */
  sizes?: { s: number; m: number; l: number };
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
  /** When it was eaten (at = when it was logged). */
  eatenAt?: number;
  proteinUnknown?: boolean;
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
  /** v2: the readiness inputs at the start, -1…+1, for refitting the weights. */
  readinessX?: Partial<Record<string, number>>;
  context?: string[];
  quality?: number;
  /** Lifting and rest spans, in ms since epoch. */
  restLog?: { from: number; to: number; kind: 'lift' | 'rest' }[];
  /** v2: the rest running now, kept on the session so leaving the screen doesn't drop it. */
  activeRest?: { from: number; endsAt: number; total: number } | null;
  battery?: boolean;
  /** v2: the answer to each "Ready for heavier?" offer this session. */
  heavier?: Record<string, 'yes' | 'no'>;
  /** v2: the side picked first on per-side exercises without a lead side. */
  firstSide?: Record<string, 'L' | 'R'>;
  /** v2: big dials and chips instead of the keyboard. */
  tiredHands?: boolean;
  /** v2: part of a lighter week, one set fewer per exercise. */
  lighter?: boolean;
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
  /** Skipped: counts as done for the flow, left out of every stat. */
  skipped?: boolean;
  /** 1 sloppy … 5 textbook. */
  form?: 1 | 2 | 3 | 4 | 5;
  cleanReps?: number;
  /** Reps in reserve: 0, 1, 2, 3 (3 = 3+). */
  rir?: number;
  faults?: string[];
  challenges?: string[];
  discomfort?: 'knee' | 'wrist' | 'shoulder' | 'back';
  /** Carries measured in steps. */
  steps?: number;
  firstSide?: 'L' | 'R';
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

export type OccasionKind = 'festival' | 'wedding' | 'travel' | 'sick' | 'injured' | 'break' | 'other';

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

/** v2 tables. */
export interface UsageEvent {
  id?: number;
  at: number;
  kind: string;
  detail?: string;
}

export interface EditRecord {
  id?: number;
  at: number;
  table: string;
  rowId: string;
  before: unknown;
  after: unknown;
}

export interface AuditNote {
  id?: number;
  at: number;
  screen: string;
  text: string;
}

export interface ForecastRecord {
  id: string;
  kind: string;
  madeAt: number;
  targetDate: string;
  low: number;
  high: number;
  outcome?: number;
}

export interface ChartMarker {
  id: string;
  date: string;
  text: string;
  auto?: boolean;
}

export interface WalkRecord {
  id: string;
  kind: 'journal' | 'camp' | 'structure' | 'souvenir' | 'quest';
  date: string;
  km?: number;
  text?: string;
  data?: Record<string, unknown>;
}

export interface SongRecord {
  id: string;
  at: number;
  artist: string;
  track: string;
}
