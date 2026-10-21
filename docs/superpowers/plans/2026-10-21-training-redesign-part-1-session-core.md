# Training redesign, part 1: the session core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the session's set table with the live flow from the approved prototype: tap to count, hold for the burn, the set timer, woven tempo, sides, the form checklist, and one rest per round. All of it sits on the living-colour background, with a battery-saver version.

**Architecture:** The pure rules (counter, colour state, tempo, slowing, burn nudge, rest decision, checks) go in a new `src/domain/liveSet.ts`, with tests. The existing `Runner` in `Session.tsx` keeps its data logic, which moves into a `useRunner` hook. That hook feeds two views: the existing list (kept for editing, swaps and tools) and the new live view in `src/screens/live/`. The look (aurora, theme ripple shapes, ring colours, state tokens) lives in `src/domain/liveLook.ts`, `src/ui/live/Aurora.tsx` and `src/styles/live.css`.

**Tech Stack:** React 18 + TypeScript, Dexie, vitest (`renderToStaticMarkup` for screen tests, `fake-indexeddb` for db tests).

**Spec:** `docs/superpowers/specs/2026-10-21-training-redesign-design.md` (sections "Design language", "The live session" §3–5, and "Data"). Visual reference: the prototype at `#/proto/session` (`src/screens/proto/SessionLiving.tsx`, `src/styles/living.css`). Copy its markup and CSS where they fit, renaming `lc-` to `lv-`.

## Global Constraints

- The repo is public. No personal values (plan, loads, setups) go in code, tests or fixtures. Use `tests/fixtures.ts` and `tests/dev-seed.ts` patterns.
- No streaks, no notifications, no extra credit. Gold (`--gold`) is used only for the record state.
- State colours, in priority order: record gold > burn orange > in range green > building white. Rest is blue.
- Never colour alone: each state also shows its word: "building", "in range", "in the burn", "new record · best was N".
- Targets are at least 44 px. Mid-set actions (−1, Set done, Ready, +30 s) are 56–60 px tall. The tap area is the whole space between the header and the bottom buttons.
- Text uses the app's standard scale. Do not add oversized type beyond the count numeral, which is a display element.
- Every colour comes from CSS custom properties on `.lv`, with overrides under `html.contrast`.
- Under `prefers-reduced-motion: reduce`, and in battery saver: no drift, no ripples, no dim pulse.
- Battery saver (`batteryMode(level, prefs.batterySaver)`, below 30%) means a true-black background and no aurora.
- Hold to mark the burn: 450 ms. Tempo: a 3 s lowering, then a 1 s lift, starting at each tap. "Reps slowing": the mean of the last 2 gaps is more than 1.3 × the mean of the first 3 gaps (needs 6 or more taps).
- `npm test`, `npm run typecheck` and `npm run build` pass after every task.

## Review Focus

1. **The app closes or is minimised mid-set** (a phone call, screen off, a reload). The taps, burn mark and start time must still be there on return. → Task 4 keeps the counter on the session row; Task 8 test "resumes a counter saved on the session".
2. **Set done with no taps**, or after −1 back to 0. Expected: Set done is disabled at 0, and "Skip this set" is offered instead. → Task 6 test.
3. **A hold that becomes a scroll or a second finger** (pointercancel, multi-touch). Expected: no burn mark and no extra rep. → Task 3 reducer test for `cancel`, and Task 6 ignores non-primary pointers.
4. **Editing an old set from the list view.** This must keep the set's checks, burn mark and timestamps rather than wiping them. → Task 4 test "save keeps live fields on edit".
5. **Old sets with only a 1–5 form score.** They must still drive "ready for heavier", session quality and firsts after checks replace form. → Task 2 tests.

---

### Task 1: Data fields and checks

**Files:**
- Modify: `src/domain/types.ts` (`SetEntry`, `TrainingSession`)
- Modify: `src/domain/plan.ts` (`ExerciseDef`), `src/domain/defaultPlan.ts:42` (farmer carry: `measure: 'seconds', seconds: [60, 90]`, note "Walk tall, shoulders down."; drop `steps`)
- Create: `src/domain/checks.ts`
- Test: `tests/live-checks.test.ts`

**Interfaces:**
- Produces:
  - `type CheckMark = 'ok' | 'slip'`
  - `interface FormCheck { id: string; text: string; kind: 'do' | 'avoid' }`
  - `SetEntry` gains `startedAt?: number`, `endedAt?: number`, `burnAt?: number` (the reps counted when the burn was marked) and `checks?: Record<string, CheckMark>`
  - `TrainingSession` gains `view?: 'live' | 'list'` and `liveSet?: LiveCounter | null`, with `interface LiveCounter { key: string; taps: number[]; burnAt?: number; startedAt?: number }` defined here in `types.ts`
  - `ExerciseDef` gains `checks?: FormCheck[]` and `isolation?: boolean`
  - `checksFor(ex: Pick<ExerciseDef, 'checks'>): FormCheck[]`: `ex.checks?.slice(0, 6) ?? []`. No stand-in from `guide.faults`: the coach writes the checks.
  - `cycleCheck(m: CheckMark | undefined): CheckMark | undefined`
  - `slipCount(s: Pick<SetEntry, 'checks'>): number`
  - `okCount(s: Pick<SetEntry, 'checks'>): number`

- [ ] **Step 1: Write the failing tests** in `tests/live-checks.test.ts`:
  - `checksFor` returns `ex.checks` when present, at most 6, and `[]` without them (even when `guide.faults` exist).
  - The built-in plan's farmer carry is `measure: 'seconds'` with `seconds: [60, 90]`.
  - `cycleCheck`: `undefined → 'ok' → 'slip' → undefined`.
  - `slipCount({ checks: { a: 'ok', b: 'slip', c: 'slip' } }) === 2`, and `okCount` of the same is `1`. Both return `0` for `{}`.
- [ ] **Step 2: Run** `npx vitest run tests/live-checks.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Add the fields, implement `src/domain/checks.ts`, and switch the farmer carry to seconds.** Write JSDoc on each new field in the style of `types.ts`.
- [ ] **Step 4: Run** the test, then `npm run typecheck`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit** with the message `feat(train): set timer, burn and form-check fields`.

### Task 2: Checks feed records, readiness and quality

**Files:**
- Modify: `src/domain/marks.ts`, `src/domain/quality.ts`, `src/domain/progression.ts:233,250`, `src/domain/sessionQuality.ts:21-22`, `src/domain/firsts.ts:23,31`
- Test: `tests/live-quality.test.ts`

**Interfaces:**
- Consumes: `slipCount` and `okCount` (Task 1).
- Produces:
  - `formScore(s: Pick<SetEntry, 'form' | 'checks'>): 1 | 2 | 3 | 4 | 5 | undefined`. The old `form` wins. Otherwise, with checks: `1 + round(4 × ok / (ok + slip))`. With no checks, `undefined`.
  - `isTextbook(s): boolean`. True for `form === 5`, or for checks with at least one ok and no slip.
  - `recordBar(set: Pick<SetLike, 'side' | 'loadKg' | 'drop'>, prior: SetEntry[], minValue: number, opts?: { clean?: boolean }): number | undefined`. This is the value a set must beat to be a record. It returns `undefined` when there are no earlier sets on that side, and `minValue - 1` when the load is above every earlier load.
  - The `SetLike` passed to `markFor` gains `checks`.

- [ ] **Step 1: Write the failing tests.**
  - `formScore({ form: 4 }) === 4`.
  - `formScore({ checks: { a: 'ok', b: 'ok', c: 'slip' } }) === 4`, and the same with all ok is `5`. `formScore({}) === undefined`.
  - `isTextbook({ checks: { a: 'ok' } })` is true. `isTextbook({ checks: { a: 'ok', b: 'slip' } })` is false.
  - `recordBar`:
    - With earlier sets on side `both` at 10 kg × 12 and 8 kg × 15, a 10 kg set gives `12`.
    - A 12.5 kg set gives `0` (with `minValue` 1).
    - A set on side `L` with no earlier `L` sets gives `undefined`.
  - `markFor` with `{ clean: true }`: a 13-rep set with one slipped check, against a prior best of 12, is **not** `'!!'`. The same set without the slip is `'!!'`.
  - Progression readiness (`progression.ts:233`) treats an old set with `form: 4` and a new set with all checks ok the same way.
  - `sessionQuality` gives the same result for a session of old `form: 5` sets and a session of all-ok-checks sets.
  - `detectFirsts` fires the "first textbook set" moment for an all-ok-checks set.
- [ ] **Step 2: Run** `npx vitest run tests/live-quality.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add `formScore` and `isTextbook` to `quality.ts`.
  - In `marks.ts`, factor `recordBar` out of `markFor` so both share the "at or above this load" rule. With `clean`, a set whose `slipCount > 0` has value `0`.
  - Replace the direct `s.form` reads in progression, sessionQuality and firsts with `formScore(s)` and `isTextbook(s)`.
- [ ] **Step 4: Run** the full `npm test`. Expected: PASS, including the existing training tests, unchanged.
- [ ] **Step 5: Commit** with the message `feat(train): form checks count for records, readiness and quality`.

### Task 3: Live set rules

**Files:**
- Create: `src/domain/liveSet.ts`
- Test: `tests/live-set.test.ts`

**Interfaces:**
- Consumes: `recordBar` (Task 2).
- Produces:
  - `LiveCounter` comes from `types.ts` (Task 1). `key` is the row key; `startedAt` is the time of the first tap.
  - `type CounterAction = { t: 'tap'; at: number } | { t: 'hold'; at: number } | { t: 'undo' } | { t: 'cancel' }`
  - `counter(state: LiveCounter, a: CounterAction): LiveCounter`
    - `tap` appends `at` and sets `startedAt` on the first tap.
    - `hold` sets `burnAt = taps.length`; a second hold moves it.
    - `undo` drops the last tap and clamps `burnAt` to at most `taps.length`. At 0 taps it clears `burnAt` and `startedAt`.
    - `cancel` returns the state unchanged.
  - `type SetState = 'build' | 'in' | 'burn' | 'record'`
  - `setState(p: { reps: number; burnAt?: number; bottom?: number; bar?: number }): SetState`. The order is: `bar !== undefined && reps > bar` gives record; then `burnAt !== undefined` gives burn; then `bottom !== undefined && reps >= bottom` gives in range; otherwise build.
  - `STATE_WORD: Record<SetState | 'rest', string>`, using the exact words from Global Constraints. The record word is built by `stateWord(state, bar)`, giving `new record · best was ${bar}`. When `bar` is 0 (a new load), it is `new record · first time at this load`.
  - `tapTempo(msSinceTap: number | undefined, downSec = 3, upSec = 1): { phase: 'idle' | 'down' | 'up'; beat: 3 | 2 | 1 | 0 | null; frac: number }`.
    - It is `idle` with beat `null` when there is no tap yet or `ms ≥ (down + up) × 1000`.
    - `down`: beat `down − floor(s)`, frac `s / down`.
    - `up`: beat `0`, frac `1 − (s − down) / up`.
  - `repsSlowing(taps: number[]): boolean`, using the rule in Global Constraints.
  - `burnNudge(ex: Pick<ExerciseDef, 'isolation'>, prev: Pick<SetEntry, 'rir'> | undefined): boolean`. True when `isolation` is set and `prev.rir >= 2`.
  - `seconds(c: LiveCounter, now: number): number`. This is `floor((now − startedAt) / 1000)`, or `0` before the first tap. It is used by timed exercises.

- [ ] **Step 1: Write the failing tests.**
  - Counter:
    - tap, tap, hold, tap gives `taps.length 3, burnAt 2`.
    - undo twice from there gives `burnAt 1`.
    - undo to 0 clears `burnAt` and `startedAt`.
    - `cancel` leaves the state unchanged.
  - `setState`:
    - `{ reps: 13, bar: 12, burnAt: 9, bottom: 10 }` is `'record'`.
    - `{ reps: 11, burnAt: 9, bar: 12, bottom: 10 }` is `'burn'`.
    - `{ reps: 10, bottom: 10 }` is `'in'`.
    - `{ reps: 9, bottom: 10 }` is `'build'`.
    - `{ reps: 5, bar: undefined }` is never `'record'`.
  - `stateWord('record', 0)` is `'new record · first time at this load'`.
  - `tapTempo`:
    - `undefined` is idle.
    - `0` gives `down, beat 3, frac 0`.
    - `2500` gives `down, beat 1`.
    - `3500` gives `up, beat 0, frac 0.5`.
    - `4000` is idle.
  - `repsSlowing`:
    - Gaps `[2, 2, 2, 2, 3, 3]` (7 taps) is true.
    - Even gaps are false.
    - 5 taps is false.
  - `burnNudge`:
    - `{ isolation: true }` with `{ rir: 2 }` is true.
    - `{ rir: 1 }` is false.
    - A non-isolation exercise is false.
- [ ] **Step 2: Run** `npx vitest run tests/live-set.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/domain/liveSet.ts`. Lift the logic from `useEngine` in the prototype (`SessionLiving.tsx:194-211`).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(train): live set rules`.

### Task 4: Pull the runner's logic into a hook

Behaviour does not change in this task. The list view must look and act exactly as before.

**Files:**
- Create: `src/screens/session/useRunner.ts`, `src/screens/session/rows.ts`
- Modify: `src/screens/Session.tsx` (`Runner` becomes a thin view over the hook; `rowsFor` moves to `rows.ts`)
- Test: `tests/live-runner.test.ts`

**Interfaces:**
- Consumes: `LiveCounter` (Task 3), and `CheckMark` (Task 1).
- Produces:
  - `rowsFor(group: ExerciseDef[], extra: Record<string, number>, first?: Record<string, 'L' | 'R'>): Row[]`, moved unchanged.
  - `restAfter(rows: Row[], logged: (r: Row) => boolean, r: Row): 'rest' | 'glide' | 'none'`. This is the pure form of today's `afterRow` decision.
    - `rest` comes after the last row of a round.
    - `glide` is used when the next row in the round is another exercise (a superset).
    - `none` is used when the next row is the same exercise's other side.
  - `interface LiveInput { val: number; startedAt?: number; endedAt?: number; burnAt?: number; checks?: Record<string, CheckMark>; rir?: number }`
  - `useRunner(session, settings, plan, allSets)` returns everything `Runner` uses today: `exs, groups, gi, setGi, groupRows, rows, current, mine, history, statuses, defaults, save, skip, undoSkip, remove, startRest, extendRest, stopRest, rest, restLeft, saver, offerFor, answer, extra, setExtra, editing, setEditing, draft, setDraft, watch, setWatch, finish, complete, tired`. It also adds `saveCounter(c: LiveCounter | null): void`, which writes `session.liveSet` through `patchSession`.
  - `save(r: Row, live?: LiveInput): Promise<'!!' | '!' | '=' | undefined | 'skipped'>`.
    - When `live` is given, its `val` replaces the draft and defaults.
    - `startedAt`, `endedAt`, `burnAt` and `checks` are written to the `SetEntry`. `at` stays as today.
    - `form` and `cleanReps` are not written when `live.checks` is present.
    - On an edit (`existing`), any live fields not passed keep their stored values.
    - It returns the mark, or `'skipped'` when the "Real set, or skip?" confirm chose to skip.
    - It clears `session.liveSet` after saving.

- [ ] **Step 1: Write the failing tests.**
  - `restAfter` on `rowsFor([perSideEx], {})`, where `perSideEx` has 2 sets and lead `L`:
    - after `1:L` gives `none`;
    - after `1:R` gives `rest`.
  - On a superset group `[a, b]`:
    - after `a:1` gives `glide`;
    - after `b:1` gives `rest`.
  - A db test (fake-indexeddb, following `tests/v2-db.test.ts`): logging a set with `checks` and `burnAt`, then re-saving it through `logSet` with only a changed `reps`, keeps `checks` and `burnAt`. To test this, call the save path's set-building helper. Factor it out as `buildSet(existing, base, live)` in `useRunner.ts` and test that.
- [ ] **Step 2: Run** `npx vitest run tests/live-runner.test.ts`. Expected: FAIL.
- [ ] **Step 3: Move the logic.** Move `Runner`'s state, effects and handlers into `useRunner`, and `afterRow`'s branch into `restAfter`. `Runner` then renders the list from the hook's return value. Do not change any copy or markup.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`, then smoke-test the list. Start the `health` preview, open `#/session?start=next` on dev data, log one set and check that the rest pill starts. Expected: everything passes, and the list looks and acts as before.
- [ ] **Step 5: Commit** with the message `refactor(session): runner logic into useRunner`.

### Task 5: The living look

**Files:**
- Create: `src/domain/liveLook.ts`, `src/ui/live/Aurora.tsx`, `src/styles/live.css`
- Modify: `src/main.tsx` (import `./styles/live.css`)
- Test: `tests/live-look.test.ts`

**Interfaces:**
- Produces:
  - `RIPPLE: Record<ThemeId, string>`: SVG path data in a −50…50 box.
  - `RINGS: Record<ThemeId, [string, string, string]>`
  - `useLiveTheme(settings: Settings): ThemeId`, which uses `useUnlockedIds` and `themeFor(settings, dayKey(), unlocked)`, falling back to `'dusk'`.
  - `<Aurora still?: boolean />`. This renders the field with four blobs (`b1`–`b4`) and the `.lv-dim` layer. With `still`, the blobs are not drawn at all.
  - CSS:
    - `.lv` with the state classes `st-build | st-in | st-burn | st-record | st-rest | st-calm`.
    - The tokens `--lv-a`, `--lv-b` and `--lv-accent`, plus the ring tokens `--ring1..3`, set inline from `RINGS`.
    - The tempo class `tempo-down | tempo-up` and the `--tempo` fraction.
    - `.lv.saver`, which gives a true-black background, hides the blobs and ripples, and uses grey text.
    - Overrides under `html.contrast` and `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 1: Write the failing tests.**
  - Every `THEMES` id has a `RIPPLE` and a `RINGS` entry.
  - Every ripple path starts with `M` and ends with `Z`.
  - Within each theme, the three ring hues (HSL hue of each hex) are at least 30° apart from each other.
- [ ] **Step 2: Run** `npx vitest run tests/live-look.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Copy `shapePath` and the six ring sets from the prototype (`SessionLiving.tsx:100-157`).
  - Add the three themes the prototype lacks:
    - birthday: a 5-point star `star(5, 48, 22)`, rings `['#f7c96b', '#d6a8ff', '#ff8fb8']`;
    - antimatter: a hexagon, rings `['#4ff5e6', '#ff5fd2', '#b7ff5f']`;
    - platinum: a diamond `star(4, 48, 30)`, rings `['#dde8f2', '#7fa8d0', '#c9a7e8']`.
  - Port the `.lc`, `.st-*`, `.look-aurora`, blob, drift and `.lc-dim` rules from `living.css:3-37`, renamed to `lv`.
  - The Train blue for the rest state stays `#24426b` / `#0a1222`.
- [ ] **Step 4: Run** the tests and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(train): living-colour look and theme ripples`.

### Task 6: The set screen

**Files:**
- Create: `src/screens/live/SetScreen.tsx`
- Modify: `src/styles/live.css`
- Test: `tests/live-screens.test.tsx`

**Interfaces:**
- Consumes: `counter`, `setState`, `stateWord`, `tapTempo`, `repsSlowing` and `burnNudge` (Task 3); `RIPPLE` and `useLiveTheme` (Task 5).
- Produces: `SetScreen(props: { row: Row; name: string; kg: number | null; aim?: number; bottom?: number; bar?: number; tempo: boolean; timed: boolean; nudge: boolean; leadSide?: 'L' | 'R'; c: LiveCounter; onCounter: (c: LiveCounter) => void; onDone: () => void; onSkip: () => void; saver: boolean; theme: ThemeId; buzz: boolean; now: number })`.

The layout follows the prototype's `SetScreen` (`SessionLiving.tsx:598-657`):
- **Above the count:** "Set n of m", the load, and the side badge. The badge reads `LEFT FIRST` / `RIGHT FIRST` and is filled on the lead side; the other side reads `LEFT` / `RIGHT`.
- **Count:** the count numeral, ringed by the tempo ring when `tempo` is on. When `timed` is on, the numeral shows the counter's seconds as `m:ss`.
- **Lettering:** the faint large L or R at the top left (per-side only), and the faint kg lettering at the top right (`.lv-bigkg`, only when `kg !== null`).
- **Below the count:**
  - aim and best;
  - the state word;
  - the hint "Burn from rep {burnAt + 1} · {reps − burnAt} past it";
  - "reps slowing";
  - the beat line "3 · 2 · 1 · lift", with the current beat bold.
- **Nudge:** the burn nudge line at the top, shown only on the first side and only before the first tap.
- **Bottom row:** −1 and `Set done · n`. At 0 taps, Set done is disabled and a "Skip this set" link shows instead.

How taps and holds work:
- Pointer handlers on the tap area act only when `e.isPrimary` is true. A hold timer of 450 ms dispatches `hold`.
- `pointerup` before the hold fires dispatches `tap`; `pointercancel` clears the timer.
- A tap buzzes 12 ms when `buzz` is on. The rep that first beats `bar` buzzes `[40, 30, 40, 30, 80]`.
- Up to 6 ripples are drawn at once in the state's colour. None are drawn when `saver` or reduced motion is on.

- [ ] **Step 1: Write the failing tests** with `renderToStaticMarkup`:
  - A counter with 11 taps, `burnAt` 9, `bar` 12 and `bottom` 10 renders `in the burn` and `Burn from rep 10 · 2 past it`, and the root has class `st-burn`.
  - 13 taps renders `new record · best was 12` with `st-record`.
  - 0 taps renders a `disabled` Set done button and `Skip this set`.
  - A per-side row on side `L` with lead `L` renders `LEFT FIRST`.
  - `timed` with `startedAt` 65 s before `now` renders `1:05`.
  - `saver` renders no `blob` element.
  - `nudge` with 0 taps renders "Last set ended with 2+ left. Go through the burn this time."
- [ ] **Step 2: Run** `npx vitest run tests/live-screens.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the screen and its CSS. Port `.lc-side`, `.lc-bigside`, `.lc-bigkg`, `.lc-nudge`, the count, ripple and tempo-ring rules from `living.css`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(train): live set screen`.

### Task 7: The check screen

**Files:**
- Create: `src/screens/live/CheckScreen.tsx`
- Modify: `src/styles/live.css`, `tests/live-screens.test.tsx`

**Interfaces:**
- Consumes: `checksFor` and `cycleCheck` (Task 1), and `setState` / `stateWord` (Task 3).
- Produces: `CheckScreen(props: { reps: number; unit: 'reps' | 'seconds'; state: SetState; bar?: number; checks: FormCheck[]; prev?: { checks?: Record<string, CheckMark>; rir?: number }; onSave: (v: { checks: Record<string, CheckMark>; rir?: number }) => void; saver: boolean })`.

What the screen shows:
- **Header:** the count and the state word, in the set's colour class.
- **Checks:** one 56 px row each. With no checks in the plan, this part is left out and only "Left in the tank" shows. The row shows ✓ with the words "went well" (green), or ✕ with "slipped" (red), or nothing when the check is unset.
- **Left in the tank:** the chips `0`, `1`, `2`, `3+`.

Behaviour:
- The state starts from `prev`. The button reads `Same as last set` while the values equal `prev` and `prev` exists; otherwise it reads `Save`.
- With `formRecordsClean`, a slip on a set whose state is `record` changes the word to "not a record · 1 check slipped". The parent passes the state after it is recomputed.

- [ ] **Step 1: Write the failing tests.**
  - With prev `{ a: 'ok' }`, the screen renders `Same as last set`. With no prev, it renders `Save`.
  - The text "went well" and the class `ok` are present for an ok check.
  - Three checks render three buttons, each with an accessible label like "Elbows tucked: went well".
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the screen, porting the prototype's `Check` (`SessionLiving.tsx:659-716`).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(train): form checklist after each set`.

### Task 8: Rest, and the live view wired in

**Files:**
- Create: `src/screens/live/RestLive.tsx`, `src/screens/live/LiveSession.tsx`
- Modify: `src/screens/Session.tsx` (choose the view), `src/styles/live.css`, `tests/live-screens.test.tsx`

**Interfaces:**
- Consumes: everything above, plus `useRunner` (Task 4).
- Produces:
  - `RestLive(props: { endsAt: number; total: number; now: number; from: SetState; just: { tags: string[] }; next: { label: string; kg: number | null; aim?: number; tempo: boolean; cue?: string } | null; onMore: () => void; onReady: () => void; saver: boolean })`. The ring empties in `--ring1`. The background fades from the `from` state to blue: set `--fade` to `1 − left / total`, and blend `--lv-a` with `color-mix`. The saver version is black, still, and shows the time and next set in grey.
  - `LiveSession(props: { r: ReturnType<typeof useRunner>; session; settings; plan })`. It works out the phase:
    1. `rest` when `r.rest && r.restLeft > 0`;
    2. else `check` when a counted set is waiting (local state `pending: { row, counter, endedAt }`);
    3. else `set` for `r.current`.
  - `justTags(set: SetEntry, checks: FormCheck[]): string[]`, which gives for example `['record', 'burn from 10', '2 went well', '1 slipped']`.

How it works:
- **Start:** `session.liveSet` restores the counter when its `key` matches `r.current.key`; otherwise the counter starts fresh. Each counter change calls `r.saveCounter`.
- **Set done:** stores `pending` with `endedAt = Date.now()`, then goes to check.
- **Check save:** calls `r.save(row, { val, startedAt, endedAt, burnAt, checks, rir })`. Then `restAfter` decides: `rest` calls `r.startRest(...)` with today's rest length; `none` and `glide` go straight to the next row's set screen.
- **Ready:** calls `r.stopRest()`.
- **Header:** a minimise chevron, the session name and clock, a `List` chip (`patchSession({ view: 'list' })`) and Finish. Below it, a strip of numbered group buttons that calls `r.setGi`.
- **Fallbacks:**
  - Carries are timed like holds. Only an old imported plan could still count steps: such a row renders the list view for that group, with the line "Steps are logged in the list".
  - `HeavierMoment` shows above the set screen when `r.offerFor` matches the current exercise.
  - When every row is logged, the view shows "Finish session".
- **Session.tsx:** render `LiveSession` when `session.view !== 'list'`, else the list. The list header gains a `Live` chip that sets `view: 'live'`.

- [ ] **Step 1: Write the failing tests.**
  - `justTags` for a record with `burnAt` 9, two ok checks and one slip gives `['record', 'burn from 10', '2 went well', '1 slipped']`.
  - `RestLive` with `saver` renders no `blob` and renders the next label.
  - `RestLive` at half time sets `--fade: 0.5` in the style attribute.
  - Resumes a counter saved on the session: a pure helper `restoreCounter(saved: LiveCounter | null | undefined, key: string): LiveCounter` returns the saved counter for a matching key, and `{ key, taps: [] }` otherwise.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the rest screen, `LiveSession` and the view switch.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck` and `npm run build`. Expected: all pass.
- [ ] **Step 5: Commit** with the message `feat(train): live session flow with rest after each round`.

### Task 9: Check it on a phone-sized screen

**Files:** none new. Fixes go to the files above.

- [ ] **Step 1: Run the suite under the CI clock:** `TZ=UTC npx vitest run`. Expected: PASS.
- [ ] **Step 2: Build the session on dev data.** Start the `health` preview, set mobile 375×812, load dev data, and open `#/session?start=next`.
- [ ] **Step 3: Check the set screen.** Count 3 reps, hold, then count 2 more. The state word, hint and colour should match. The tempo ring and beats should run on a tempo exercise.
- [ ] **Step 4: Check save, rest and resume.**
  - Set done, tick checks, then Save. A per-side exercise should go to the second side with no rest, then rest after it.
  - Reload mid-set: the count is kept.
  - Ready: the next set starts.
- [ ] **Step 5: Check the variants.**
  - Switch on the battery saver pref: the screen is black and still.
  - Emulate reduced motion with `matchMedia` in devtools, or the CSS media in the browser pane: there are no ripples and no drift.
  - Switch on high contrast: the text is readable.
  - Switch the theme to Diwali: the ripple shape and ring colours change.
- [ ] **Step 6: Check the list view.** Edit a set. Its checks survive, as `db.sets` shows in the console.
- [ ] **Step 7: Commit any fixes** with the message `fix(train): live session polish from the phone check`. Record each fix as "verified by measurement" when it was checked in the browser.

## Later parts (separate plans)

2. Session edges: Before, guide and setups, plate change and collar check, the record moment, quick looks, adaptive rest, usual length, exercise notes.
3. The finale. 4. Train. 5. Cards. 6. Plan file fields, import warnings and the coach export.
