# Training redesign, part 2: the session's edges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everything around the set loop from part 1:
- the Before screen (leg check, kit check, warm-up, load blocks, usual length);
- the guide with personal setups before each exercise's first set;
- the plate change with the collar check;
- the record moment;
- the Sets and Session quick looks;
- adaptive rest with its reason;
- exercise notes;
- the part 1 deferred minors.

**Architecture:** Pure rules go in a new `src/domain/sessionEdges.ts`, with tests. New full screens go in `src/screens/live/`, each rendering its own `LiveFrame`, as in part 1. `LiveSession` gains phases that come before `set`: `before`, then `guide`, then `plates`, then `set`. It also gains a `record` phase between check and rest. Phase flags that must survive a reload live on the session row.

**Tech Stack:** As part 1.

**Spec:** `docs/superpowers/specs/2026-10-21-training-redesign-design.md`: "The live session" §1, §2, §5 (adaptive rest, note), §6, §7 and "Quick looks"; "Data" (derived numbers). Visual reference: the prototype's `Before`, `Guide`, `Plates`, `Record`, `SessionSheet` and `SetsSheet` in `src/screens/proto/SessionLiving.tsx`.

## Global Constraints

Everything in part 1's Global Constraints, plus:
- **Leg check:** asked only when tonight has leg work (`movementKind(ex) === 'legs'`). At 4–5, every leg exercise drops to 1 set. It is never skipped.
- **Usual length:** the median of the last 5 completed sessions with the same session id, leaving out logged-later sessions. Use the plan's `minutes` when there are fewer than 2 such sessions.
- **Adaptive rest:** start from the existing rest (`challengeRest`), then look at last time's working sets for this exercise:
  - reps fell by more than 20% from the first set to the last: +15 s, up to +45 s in total;
  - reps held within 10%: −10 s, down to −20 s in total;
  - one plain line says why.
- **Collar check:** before the first `overFace` exercise of a session, "Collars tight on both handles" must be ticked. Once per session.
- **Record moment:** shown when a live save returns `'!!'`. Gold only.

## Review Focus

1. **A reload in the middle of Before or the guide.** It must not ask the leg check again or replay a guide that was dismissed. → The flags live on the session; covered by Task 1 tests.
2. **A session with no leg work, no warm-up text, or no guide for an exercise.** Those parts are left out, not shown empty. → Task 3 and Task 4 tests.
3. **A plate change to bodyweight or band work** (`kg` null). No plate screen. → Task 2 `plateChange` test.
4. **Adaptive rest with no history, or with a drop set or skipped sets in last time's sets.** Use the base rest; skipped and drop sets are ignored. → Task 2 tests.
5. **A record on the second side of a per-side set.** The record moment shows. Then, because the round is over, rest follows. → Task 6 test of the phase order.

---

### Task 1: Data and session flags

**Files:** `src/domain/types.ts`, `src/domain/plan.ts`. Test: `tests/edges-data.test.ts`.

**Produces:**
- `TrainingSession` gains:
  - `legSoreness?: 1 | 2 | 3 | 4 | 5`
  - `beforeDone?: boolean`
  - `guided?: string[]` (exercise ids whose guide was seen tonight)
  - `collarCheckedAt?: number`
  - `exNotes?: Record<string, string>`
- `Settings` gains `setups?: Record<string, { from: DayKey; text: string }[]>`.
- `ExerciseDef` gains `setup?: string`, `overFace?: boolean` and `leadWhy?: string`.
- `src/domain/sessionEdges.ts`:
  - `setupOn(settings: Pick<Settings, 'setups'>, ex: Pick<ExerciseDef, 'id' | 'setup'>, day: DayKey): { text: string; from?: DayKey } | undefined`. Returns the latest version from on or before `day`, else the plan's `setup`, else nothing.
  - `addSetup(setups, exId, day, text)`. Returns a new map. A second edit on the same day replaces that day's version.
  - `legSets(ex: ExerciseDef, soreness?: number): number`.

- [ ] **Test:**
  - `setupOn` picks the latest version on or before the day, and ignores versions from later days.
  - It falls back to the plan's `setup`.
  - `addSetup` on the same day replaces that version; on a new day it appends.
  - `legSets`:
    - a legs exercise at soreness 4 → 1;
    - the same at soreness 3 → `ex.sets`;
    - a push exercise at 5 → `ex.sets`.
- [ ] **Watch it fail, implement, watch it pass.**
- [ ] **Commit** with the message `feat(train): session edge fields`.

### Task 2: Edge rules

**File:** `src/domain/sessionEdges.ts`. Test: `tests/edges-rules.test.ts`.

**Produces:**
- `usualLength(sessions: TrainingSession[], sets: SetEntry[], sessionId: string, fallbackMin: number): { min: number; fromHistory: boolean }`
- `adaptiveRest(base: number, last: SetEntry[]): { sec: number; why?: string }`. `last` holds last time's sets of this exercise. The reasons are:
  - "Rest is {m:ss} here: your reps dropped from {a} to {b} across sets last time."
  - "Rest is {m:ss} here: your reps held at {a} last time."
- `loadBlocks(exs: ExerciseDef[], kgOf: (ex) => number | null): { kg: number | null; exs: ExerciseDef[] }[]`. It groups consecutive exercises by load in plan order. It never splits a superset (a superset's load is its first exercise's load), and bodyweight joins whichever block it sits in. The plan's order is kept.
- `plateChanges(blocks): number`. Counts changes between consecutive blocks that both have a dumbbell load.
- `plateChange(prevKg: number | null | undefined, kg: number | null): { from: number; to: number } | undefined`. Returns `undefined` when either side is null or the two are equal.

- [ ] **Test:**
  - `usualLength`:
    - The median of the last 5 done sessions of "C" is right.
    - A logged-later session is left out.
    - With one session, it returns `{ min: fallback, fromHistory: false }`.
  - `adaptiveRest(90, ...)`:
    - reps 18, 16, 15 → 105 s, and the reason mentions 18 and 15;
    - reps 12, 12, 11 → 80 s;
    - no sets → 90 s with no reason;
    - drop and skipped sets are ignored.
    - The caps hold: base 90 never goes past 135 or below 70.
  - `loadBlocks`: [10, 10, 5, 5, 10] gives three blocks, and `plateChanges` gives 2. A superset [3a at 5, 3b at 10] stays in one block.
  - `plateChange(10, 5)` gives `{ from: 10, to: 5 }`. `plateChange(10, null)` and `plateChange(5, 5)` give `undefined`.
- [ ] **Fail, implement, pass, commit** with the message `feat(train): usual length, adaptive rest, load blocks`.

### Task 3: The Before screen

**Files:** create `src/screens/live/BeforeScreen.tsx`; modify `src/screens/session/useRunner.ts` (`exs` applies `legSets` when `session.legSoreness >= 4`) and `src/styles/live.css`. Test: `tests/edges-screens.test.tsx`.

**Produces:** `BeforeScreen(props: { name: string; usual: { min: number; fromHistory: boolean }; startedAt: number; blocks: { kg: number | null; names: string[]; sets: number[] }[]; changes: number; legs: boolean; soreness?: number; onSoreness: (n: 1|2|3|4|5) => void; warmup?: string; onStart: () => void; saver: boolean; top?: ReactNode })`.

The screen shows:
- the usual length ("usually 92 min", or "about 60 min" from the plan), and the finish time;
- the number of plate changes;
- the leg check, only when `legs` is true. At 4–5 it says "Every leg exercise is 1 set tonight";
- the kit check (4 optional ticks, local state only);
- the warm-up text, only when there is one;
- the blocks, each with a "Plates change → 5 kg" line between them;
- Start.

- [ ] **Test** (static markup):
  - With `legs: false` there is no "Legs sore".
  - With no warm-up there is no "Warm-up".
  - With soreness 4 it shows "1 set tonight".
  - The block markup has "Plates change" between blocks.
  - "usually 92 min" shows.
- [ ] **Implement** the screen, porting the prototype's `Before`. **Wire it in:** `LiveSession` shows Before while `!session.beforeDone && !r.mine.length`. Start patches `beforeDone: true`.
- [ ] **Fail → pass; suite; commit** with the message `feat(train): before the session`.

### Task 4: The guide, setups and notes

**Files:** create `src/screens/live/GuideScreen.tsx`; modify `LiveSession.tsx` and `RestLive.tsx` (note link). Test: `tests/edges-screens.test.tsx`.

**Produces:** `GuideScreen(props: { ex: ExerciseDef; name: string; kg: number | null; lead?: 'L' | 'R'; tempo: boolean; setup?: { text: string; from?: DayKey }; onSetup: (text: string) => void; checks: FormCheck[]; onGo: () => void; saver: boolean; top?: ReactNode })`.

The screen shows:
- the guide sections that exist (setup, movement, feel, stop);
- sets × range and the load;
- the side badge, with `leadWhy` when present;
- "Tempo: lower 3 s, lift 1 s" when tempo is on;
- "Your setup" with its date, and "Change my setup" (a textarea, saved on blur);
- the checks list (read-only);
- "Start set 1".

**Wiring in `LiveSession`:** show the guide when the current row is set 1 of an exercise not in `session.guided` and with no set logged tonight. "Start" adds the exercise to `guided`.

**`RestLive`:** add a `note?: string` and `onNote: (text) => void` link, "+ Note on this exercise". It saves to `session.exNotes[exId]`.

- [ ] **Test:**
  - The guide renders "LEFT FIRST" and the `leadWhy` text.
  - It leaves out the sections the guide lacks.
  - It shows "Your setup · from 21 Oct".
  - It has no checks block when there are no checks.
  - `RestLive` with `note: 'x'` renders "Note: x".
- [ ] **Fail → pass; commit** with the message `feat(train): guide, setups and exercise notes`.

### Task 5: Plate change and collar check

**Files:** create `src/screens/live/PlatesScreen.tsx`; modify `LiveSession.tsx`. Test: `tests/edges-screens.test.tsx`.

**Produces:** `PlatesScreen(props: { from: number; to: number; forNames: string[]; collar: boolean; onCollar: () => void; onGo: () => void; saver: boolean; top?: ReactNode })`.

The screen shows "Plates change", "10 → 5 kg", and which exercises the new load is for. With `collar`, the "Collars tight on both handles" tick must be ticked before "Ready" is enabled.

**Wiring:** before a set screen, when `plateChange(kg of the last logged non-skipped set tonight, kg of this row)` exists, and no set of this row's exercise is logged yet, and its key isn't in local `platesSeen`. The collar is asked when the row's exercise is `overFace` and `!session.collarCheckedAt`. An `overFace` exercise without a plate change still gets the collar screen once.

- [ ] **Test:**
  - With `collar`, Ready renders `disabled` until ticked: the static render shows `disabled`.
  - Without `collar`, Ready is enabled.
  - The text shows "10 → 5 kg".
- [ ] **Fail → pass; commit** with the message `feat(train): plate change and collar check`.

### Task 6: The record moment and quick looks

**Files:** create `src/screens/live/RecordScreen.tsx` and `src/screens/live/QuickLooks.tsx`; modify `LiveSession.tsx` (header gains Sets and Session chips; the `record` phase); add `src/domain/sessionEdges.ts` `afterSave(mark, restAfter): 'record' | 'rest' | 'next'`. Test: `tests/edges-screens.test.tsx` and `tests/edges-rules.test.ts`.

**Produces:**
- `RecordScreen(props: { name: string; kg: number | null; value: string; was?: { value: number; date: DayKey }; song?: string; onGo: () => void; saver: boolean })`. It shows the gold count with the bloom (no motion under saver or reduced motion), the old best and its date, the song when known, and "Keep going".
- `afterSave`: `'!!'` → `'record'` (rest, if any, starts after Keep going); otherwise `'rest'` when `restAfter === 'rest'`, else `'next'`.
- The song is best-effort: `fetchSessionTracks` for the open session, then `songAt(now)`. Nothing shows on failure or offline.
- `SetsLook` lists this exercise set by set, tonight against last time, with tags and the note. `SessionLook` shows the blocks with plate changes, the usual length and the finish time. Both open as a bottom sheet over the live screen.

- [ ] **Test:**
  - `afterSave('!!', 'none')` → `'record'`; `afterSave('!', 'rest')` → `'rest'`; `afterSave(undefined, 'glide')` → `'next'`.
  - `RecordScreen` shows "best was 12 · 3 Oct", the class `st-record`, and no `blob` under saver.
  - `SetsLook` shows tonight and last time side by side, with the "burn" tag.
- [ ] **Implement.** For a record that ends the round, rest starts as normal but stays hidden behind the record screen until Keep going. Save already starts the rest; the record screen only covers it.
- [ ] **Fail → pass; commit** with the message `feat(train): record moment and quick looks`.

### Task 7: Adaptive rest, usual length in the header, and part 1 minors

**Files:** `useRunner.ts` (`afterRow` uses `adaptiveRest`), `RestLive.tsx` (the why line), `LiveSession.tsx`, `SetScreen.tsx`, `Session.tsx`, `live.css`. Tests go in the existing files.

- [ ] **Adaptive rest:** `afterRow` passes `statuses.get(ex).last.sets` filtered to the exercise into `adaptiveRest`, and keeps the `why` on the session as `restWhy?: string`, so `RestLive` can show it.
- [ ] **Minors:**
  - Ready and "Up next" go to the first incomplete group after the current one, else the first incomplete group anywhere.
  - "Set N of max(sets, N)", plus "extra" when N > sets.
  - The list view's "Live" chip is at least 44 px.
  - −1 is enabled when `burnAt` is set and there are no taps; it clears the burn.
  - Remove the dead and duplicate CSS (`lv-ring`, `lv-ripple-spin`, `.lv-track`, `.lv-scroll`, the duplicate `.lv-tempo` and `.lv.saver`).
- [ ] **Tests:**
  - `nextGroupIndex(complete: boolean[], gi: number): number | undefined` (pure, in `rows.ts`) picks the next incomplete group after `gi`, else the first incomplete one, else `undefined`.
  - The set screen renders "Set 4 of 4 · extra" for an extra set.
  - −1 is enabled with `burnAt: 0` and no taps.
- [ ] **Fail → pass; commit** with the message `feat(train): adaptive rest and part 1 polish`.

### Task 8: Check and review

- [ ] `TZ=UTC npx vitest run`, `npm run typecheck`, `npm run build`.
- [ ] Phone-size browser check of Before, the guide, plates and collar, record, both quick looks and the rest reason, on dev data.
- [ ] Final whole-branch review with a fresh reviewer, then one fix pass.
