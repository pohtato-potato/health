# Training redesign, part 5: exercise cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every plan exercise gets a card:
- **Art:** the constellation of its own pose on a star field seeded by the exercise.
- **Tier:** First light, Clean, Even, Plated or Mastery. The tier changes the drawing, and is earned and never lost.
- **"Next":** a line with the exact step to the next tier.
- **Back:** a flip side showing the best sets, a strength curve and the records.

The cards appear as a swipeable row on Train.

**Architecture:**
- `src/domain/cards.ts` works out the tiers from history (pure, tested).
- `src/domain/poses.ts` holds about 18 movement-pattern poses, plus `poseFor(ex)` (id, then name, then movement kind).
- `src/screens/train/ExerciseCard.tsx` draws the front and back.
- `Train.tsx` adds a `CardsRow` after the records card.

**Spec:** `docs/superpowers/specs/2026-10-21-training-redesign-design.md`, "Exercise cards". Visual reference: `ExerciseCard` and `POSES` in `src/screens/proto/TrainLiving.tsx`, and the `.tr-excard` rules in `living.css`.

## Global Constraints

Part 1's constraints, plus these tier rules, which are earned and never lost (a tier counts if its condition was ever met):

| Tier | Earned when |
|---|---|
| First light | the exercise is first logged |
| Clean | every working set of one session was textbook (`isTextbook`: all checks ok, or an old 5/5) |
| Even | per-side: every set number logged on both sides in one session, within 1 rep (or 1 s); others: two sessions running, all textbook |
| Plated | a record (`mark: '!!'`) at a load heavier than any earlier load of that exercise |
| Mastery | 10 working sets running (in time order), each textbook and at or above the top of the range |

More rules:
- **The tier shown** is the highest one met. "Next" names the next tier's step in plain words. A Mastery card says "Mastered at {load}".
- **Gold** is only for Mastery (it is the top achievement). Each tier also has its name in words on the card.
- **Poses:** every exercise in the built-in plan, and in a fixture copying the 29 ids of the owner's current plan, gets a pose. Unknown exercises fall back to their movement kind, then to a standing figure.
- **Motion:** none. The flip is instant under reduced motion and in battery saver.

## Review Focus

1. **An exercise never logged.** No card, or a dim unlit one? → Show cards only for exercises logged at least once. Task 1 test.
2. **Exercises with no checks and no old scores.** They can never be Clean, so "Next" must say how ("Clean needs form checks from the coach"), not promise the impossible. → Task 1 test.
3. **Per-side exercises with only one side logged.** Not Even. → Task 1 test.
4. **Timed exercises** (seconds). The top of the range uses `seconds`. → Task 1 test.
5. **A renamed or swapped variant.** Cards key by exercise id, the same way records do. → Uses `exerciseId`.

---

### Task 1: Tiers

**File:** `src/domain/cards.ts`. Test: `tests/cards.test.ts`.

**Produces:**
- `type Tier = 'First light' | 'Clean' | 'Even' | 'Plated' | 'Mastery'`
- `TIERS: Tier[]` (the order above)
- `cardFor(ex: ExerciseDef, sets: SetEntry[]): { tier: Tier; next: string; logged: boolean }`. `sets` is that exercise's real sets across all sessions.

The "next" texts are:
- after First light: "Every check went well on a whole session, for Clean" (or the no-checks text);
- after Clean: per-side, "Left and right within one rep for a whole session, for Even"; otherwise, "Two clean sessions running, for Even";
- after Even: "A record at a new load, for Plated";
- after Plated: "{n} more clean sets at the top of the range, for Mastery". `n` = 10 − the current run.
- Mastery: "Mastered at {fmtKg(kg)} kg", or "Mastered".

- [ ] **Tests:**
  - Each tier on a small fixture.
  - Never-lost: a later sloppy session keeps Clean.
  - No checks and no scores: First light, with the no-checks text.
  - One side only: not Even.
  - Timed top of the range.
  - Mastery run counting.
  - `logged: false` with no sets.
- [ ] **Fail → implement → pass; commit** with the message `feat(train): exercise card tiers`.

### Task 2: Poses

**File:** `src/domain/poses.ts`. Test: `tests/poses.test.ts`.

**Produces:**
- `type Pt = [number, number]`
- `interface Pose { stars: Pt[]; lines: [number, number][]; pair?: [number, number][] }`, in a 100 × 130 box.
- `POSES: Record<PoseId, Pose>`, covering:
  - hinge, squat, split-squat, bridge, overhead-press, lateral, floor-press, overhead-extension;
  - row, pullover, rear-fly, curl, wrist-curl, plank, side-plank, push-up, fly, calf-raise, carry, dead-bug, face-pull.
- `poseFor(ex: Pick<ExerciseDef, 'id' | 'name'>): PoseId`. It tries a map by id, then a name regex, then `movementKind` (legs → squat, push → floor-press, pull → row, core → plank), then `'carry'` (standing).

- [ ] **Tests:**
  - Every pose's stars are inside the box.
  - Every line and pair index points at a real star.
  - Every exercise in `DEFAULT_PLAN`, and the 29 ids from the current plan (ids and names only, as a fixture list in the test), gets a pose that isn't the standing fallback. The exceptions are listed explicitly in the test.
- [ ] **Fail → implement → pass; commit** with the message `feat(train): exercise poses`.

### Task 3: The card and the row

**Files:** `src/screens/train/ExerciseCard.tsx`, `src/styles/live.css` (port the `.tr-excard` rules as `.lv-card-ex`). Wire `CardsRow` into `Train.tsx`. Test: `tests/train-screens.test.tsx`.

**Produces:**
- `ExerciseCard(props: { name: string; pose: Pose; tier: Tier; next: string; seed: string; back: { best: string[]; curve: number[]; records: number } })`. A tap flips to the back, held in local state.
  - The front uses the prototype's drawing. The guilloche pattern ids include the seed, so they are unique per card.
  - The back shows "Best sets" (up to 3), a sparkline `<svg>` of the curve (the best estimated one-rep max per session, last 12), and "{n} records".
- `cardBack(sets: SetEntry[]): { best: string[]; curve: number[]; records: number }` in `cards.ts`, with a test in Task 1's file.
- `CardsRow` on Train:
  - The heading reads "Your cards · {logged} exercises · {mastered} mastered".
  - The row scrolls horizontally, with cards sorted by tier (highest first) and then by name. It shows nothing before the first logged set.

- [ ] **Tests** (static):
  - The tier name is in words.
  - The Mastery card has the class `t-mastery`, and the others don't use gold.
  - Two cards with different seeds have different pattern ids.
  - The back renders "Best sets" after a flip, via an `initialBack` prop for the test.
- [ ] **Fail → pass; commit** with the message `feat(train): exercise cards on Train`.

### Task 4: Check and review

- [ ] `TZ=UTC npx vitest run`, typecheck, build. Browser check at phone size: the row, a flip, and several tiers on dev data.
- [ ] Final review by a fresh reviewer, then one fix pass.
