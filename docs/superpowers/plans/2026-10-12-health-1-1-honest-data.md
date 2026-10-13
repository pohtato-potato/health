# Health 1.1 (honest data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make what Health saves match what really happened (morning log, meals, checklist, sets, foods, missing days), add office days and weight chips, and hide water.

**Architecture:**
- New optional fields on existing records. No Dexie index change, so no schema bump.
- Pure rules live in `src/domain` and are unit-tested.
- Screens call them.
- Skipped sets are filtered out where sets are read, so records, stats and achievements never see them.

**Tech Stack:** Vite, React 19, TypeScript, Dexie 4, Vitest, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-10-12-health-1-1-honest-data-design.md`

## Global Constraints
- **Public repo.** No personal values in `src/`, `tests/` or `docs/`: no meal times, checklist names, foods, weights or birth year. They live in `private/`.
- **New fields are optional.** 1.0 backups must restore, and 1.1 backups must restore in 1.0.
- **Stay inside the brief's rules.**
  - No logging streak.
  - No notifications.
  - Nothing rewards eating less.
  - Humour never targets body or food.
  - Joint flags switch to plain speech.
- **Copy** is plain and specific, with no voice jokes in data prompts (spec §9).
- **Generic code defaults for `mealTimes`:**
  - home: breakfast 09:00, lunch 13:30, snacks 17:30, dinner 21:00
  - office: breakfast 08:00, lunch 13:00, snacks 17:00, dinner 20:30
- **Thresholds:**
  - Large-portion check above 800 kcal.
  - Impossible above 900 kcal per 100 g or 100 ml.
  - A late tick is more than 2 h after the planned time.
  - "What can I still eat" switches to "Mark the day complete" from 22:00.
- **Office day step goal:** `stepsGoal(t, true)`, which is 2,000 lower and never below 6,000.
- **Version** 1.1.0 in `package.json`.

## Review Focus
1. **Logging after midnight for yesterday.** `eatenAt` must fall on the entry's `date`, not on today. Test in Task 2.
2. **A sleep window crossing midnight** (asleep 23:40, woke 07:10) with ±15 nudges wrapping past 00:00 and 24:00. Minutes stay within 0–1439. Test in Task 3.
3. **An exercise where every set was skipped.** The session still finishes. "Last time" falls back to the previous real session, and no record or achievement fires. Test in Task 7.
4. **A week where no day is marked complete.** Averages fall back to logged days. A week with nothing logged shows "Not logged", never 0 and never NaN. Test in Task 8.
5. **Duplicate check on short or near-identical names** ("Dal" vs "Dal makhani", "Whey" vs "Whey with water"). It only flags genuinely close names, not every food containing a common word. Test in Task 5.

---

### Task 1: Data shape and settings defaults

**Files:**
- Modify: `src/domain/types.ts`, `src/db/actions.ts` (`defaultSettings`), `package.json` (version 1.1.0)
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces:
  - `FoodEntry.eatenAt?: number`
  - `FoodEntry.proteinUnknown?: boolean`
  - `Day.office?: boolean`
  - `Day.missed?: Record<string, true>`
  - `Day.foodDone?: boolean`
  - `Sleep.carried?: boolean`
  - `SetEntry.skipped?: boolean`
  - `type MealTimes = Record<Meal, number>` (minutes after midnight)
  - `Settings.mealTimes?: { home: MealTimes; office: MealTimes }`
  - `Prefs.water?: boolean` (default `true` via `PREF_DEFAULTS`)
  - `DEFAULT_MEAL_TIMES` exported from `types.ts`, holding the values in Global Constraints
  - `ExerciseDef.noBand?: Omit<ExerciseDef, 'id' | 'order'> & { id: string }` in `src/domain/plan.ts`

- [ ] **Step 1:** Write the failing test `restores a 1.0 backup unchanged and keeps new fields through a 1.1 round trip`.
  - Restore `tests/fixtures` 1.0-shaped data. Then add an entry with `eatenAt`, a day with `office: true`, and a set with `skipped: true`.
  - Assert that `exportData()` → `restoreData()` keeps all three, and that `prefOn(defaultSettings().prefs, 'water') === true`.
- [ ] **Step 2:** Run `npx vitest run tests/db.test.ts`. Expected: FAIL (`prefOn` water is undefined).
- [ ] **Step 3:** Add the fields and defaults above. `morningBest` stays in the type (old data) but is marked `@deprecated`.
- [ ] **Step 4:** Run `npx vitest run tests/db.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(1.1): new optional fields for honest data`.

### Task 2: Meal times and "eaten at"

**Files:**
- Modify: `src/domain/foods.ts`, `src/sheets/AddFood.tsx`, `src/sheets/FoodForms.tsx`, `src/sheets/QuickSheets.tsx` (Drink, FreeMeal), `src/sheets/Meals.tsx`, `src/sheets/NightOut.tsx`, `src/screens/Today.tsx` (timeline), `src/screens/Diary.tsx`
- Test: `tests/daily.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:
  - `mealTimesFor(settings: Settings, office: boolean): MealTimes`
  - `eatenAtFor(date: DayKey, meal: Meal, office: boolean, settings: Settings, now?: number): number`
    - Returns `now` when `now` falls on `date` and within ±90 min of the meal time.
    - Otherwise returns `date` at the meal time.
  - `entryTime(e: FoodEntry): number`, which returns `e.eatenAt ?? e.at`.

- [ ] **Step 1:** Write the failing tests:
  - `eatenAtFor uses the office row on office days`: breakfast on an office day → 08:00 on that date.
  - `eatenAtFor keeps now when logging live`: lunch at 13:20, home 13:30 → now.
  - `eatenAtFor at 23:00 for lunch gives that date at the lunch time`.
  - `eatenAtFor for yesterday after midnight stays on yesterday`: date 2026-10-11, now 2026-10-12 00:30, dinner → 2026-10-11 21:00.
- [ ] **Step 2:** Run `npx vitest run tests/daily.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the three functions in `foods.ts`.
- [ ] **Step 4:** In the screens:
  - Replace the cycling meal chip with `<Seg>` (from `src/ui/controls.tsx`) using the four `MEALS` and `MEAL_NAMES`.
  - Every `addEntry` call passes `eatenAt: eatenAtFor(date, meal, !!day?.office, settings)`.
  - The edit-entry flow allows changing the meal and recomputes `eatenAt`.
  - The timeline and Diary sort and show times by `entryTime`.
- [ ] **Step 5:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(1.1): meal switch and eaten-at times`.

### Task 3: Morning log without carried answers, office day, time tiles

**Files:**
- Modify: `src/sheets/MorningLog.tsx`, `src/ui/controls.tsx` (`TimeTile`), `src/styles/app.css` (`.timebtn`), `src/db/actions.ts` (`MorningInput`, `saveMorningLog`), `src/domain/achievements.ts` ("World record", "Glitch in the Matrix"), `src/domain/achStats.ts`, `src/domain/shakeStats.ts`, `src/domain/headlines.ts`, `src/domain/insights.ts` (drop `morning.seconds` uses)
- Test: `tests/daily.test.ts`, `tests/achievements.test.ts`

**Interfaces:**
- Produces:
  - `MorningInput` loses `seconds` and gains `office?: boolean`.
  - `saveMorningLog(date, input, yesterday): Promise<void>`
  - `nudgeMinutes(m: number, by: number): number` in `src/domain/dates.ts`, wrapping into 0–1439.
  - `RETIRED_ACHIEVEMENTS: string[]` exported from `achievements.ts`; these are hidden from lists and totals.

- [ ] **Step 1:** Write the failing tests:
  - `saveMorningLog leaves weight and sleep untouched when not given`: an existing day keeps no `weightKg`.
  - `saveMorningLog stores carried sleep`: the input sleep with `carried: true` is persisted.
  - `saveMorningLog sets office`.
  - `nudgeMinutes wraps`: `nudgeMinutes(5, -15) === 1430` and `nudgeMinutes(1435, 15) === 10`.
  - `retired achievements are excluded from the total`: the total is 223 minus `RETIRED_ACHIEVEMENTS.length`, and `RETIRED_ACHIEVEMENTS` contains the ids of "World record" and "Glitch in the Matrix".
- [ ] **Step 2:** Run `npx vitest run tests/daily.test.ts tests/achievements.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the actions and domain changes:
  - Remove the speed record and seconds from `saveMorningLog` and the toast (new toast: "Morning log saved").
  - Add `nudgeMinutes`.
  - Retire the two achievements.
- [ ] **Step 4:** UI changes in `MorningLog.tsx`:
  - `weight`, `asleep` and `woke` start as `day?.… ?? undefined`.
  - Last values show as placeholders ("last: 72.0 kg"; sleep "last: 11:40 pm → 7:10 am").
  - A **Same as yesterday** chip copies `lastSleep` with `carried: true`.
  - The sleep is saved only if both times are set.
  - An **Office day** `Switch` sits beside the home chips.
- [ ] **Step 5:** `TimeTile` changes:
  - It becomes a `<button>` showing a clock `Icon`.
  - On click it calls `input.showPicker?.()`, falling back to `input.focus(); input.click()`.
  - The `<input type="time">` becomes visually hidden but still in the tab order.
  - −15 and +15 buttons sit below it, at least 44 px tall.
- [ ] **Step 6:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(1.1): honest morning log, office day, tappable time tiles`.

### Task 4: Office days elsewhere

**Files:**
- Modify: `src/domain/occasions.ts` (eased set), `src/screens/Today.tsx` (timeline toggle, short-session offer on `NextUpCard`), `src/screens/NextUpCard.tsx`, `src/screens/Journey.tsx` (heatmap mark), `src/domain/insights.ts` (weekday patterns marker)
- Test: `tests/occasions.test.ts`

**Interfaces:**
- Consumes: `Day.office` (Task 1).
- Produces: `stepGoalFor` (the existing function at `occasions.ts:60-68`) treats `office` days as eased.

- [ ] **Step 1:** Write the failing test `office day eases the step goal and spends no shield`. With a target of 12,000, an office day's goal is 10,000, and missing it keeps the streak with no shield spent.
- [ ] **Step 2:** Run `npx vitest run tests/occasions.test.ts`. Expected: FAIL.
- [ ] **Step 3:** In `occasions.ts`, add `d.office` to the `eased` set.
- [ ] **Step 4:** Today and NextUpCard:
  - Show an "Office day" toggle row in the timeline.
  - When `day.office` is set and a session is due, NextUpCard leads with "Short session" (the existing short flow).
  - The Journey heatmap cell gets a small office mark (`aria-label` includes "office day").
- [ ] **Step 5:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(1.1): office days ease steps and suggest the short session`.

### Task 5: Food checks and quick add

**Files:**
- Create: `src/domain/foodChecks.ts`
- Modify: `src/sheets/FoodForms.tsx` (save food, quick add), `src/ui/Sheet.tsx` (add a `ConfirmSheet`; see Task 9)
- Test: `tests/foodChecks.test.ts`

**Interfaces:**
- Produces:
  - `portionWarning(food: Pick<Food,'unit'|'per'|'kcal'|'defaultAmount'|'name'>): { kcal: number } | null` returns non-null when the default portion is over 800 kcal.
  - `impossibleDensity(food): boolean` is true for g/ml units when `kcal / per * 100 > 900`.
  - `similarFood(name: string, foods: Food[]): Food | null`:
    - Normalise to lower case and strip punctuation and the words "with", "and", "the".
    - Match when the normalised names are equal, when one contains the other and the shorter has at least 2 words, or when the Levenshtein distance is ≤ 2 for names of 5 or more characters.
    - Archived foods are ignored.

- [ ] **Step 1:** Write the failing tests:
  - `salad at 330 per 100 g with 400 g default warns at 1320`.
  - `roti 105 per piece x2 does not warn`.
  - `oats 389 per 100 g is possible; 950 per 100 g is not`.
  - `similarFood: 'Seekh' vs 'Chicken seekh kebab' → null` (one word).
  - `similarFood: 'Whey water' vs 'Whey with water' → match`.
  - `similarFood: 'Dal' vs 'Dal makhani' → null`.
  - `similarFood: 'Chiken breast' vs 'Chicken breast' → match`.
- [ ] **Step 2:** Run `npx vitest run tests/foodChecks.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `foodChecks.ts`.
- [ ] **Step 4:** Wire the checks into the forms:
  - **Save food:**
    - An impossible value blocks with the message "That's more than pure fat (900 kcal per 100 g). Check the number."
    - A large portion opens `ConfirmSheet`: "[Name] at [amount] is [kcal] kcal. Is that right?" with **Yes** and **Make it 1 serving** (which converts to `unit: 'serving', per: 1, kcal: portion kcal, defaultAmount: 1`).
    - A similar food opens `ConfirmSheet`: "You already have [name] ([kcal] per [unit])" with **Use that one** and **Save anyway**.
  - **Quick add:**
    - Name is required (Save is disabled when the name is blank).
    - Protein chips: 0 · 5 · 10 · 20 · 30 g, plus **Not sure** (saves `protein: 0, proteinUnknown: true`).
    - Name inputs get `spellCheck` and `autoCapitalize="sentences"`.
- [ ] **Step 5:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(1.1): sanity checks when saving foods; quick add asks for a name and protein`.

### Task 6: Checklist in place, times and missed

**Files:**
- Create: `src/domain/checklist.ts`
- Modify: `src/db/actions.ts` (`setTick`, new `setMissed`), `src/sheets/QuickSheets.tsx` (`ChecklistSheet`), `src/screens/Settings.tsx` (link to the sheet), `src/export/workbook.ts` (checklist sheet)
- Test: `tests/daily.test.ts`

**Interfaces:**
- Produces:
  - `slotTime(slot: string, settings: Settings, day: Day | undefined): number`, in minutes after midnight.
    - Parses "9 pm", "21:00", "9:30 am".
    - "Morning" maps to `mealTimesFor(settings, !!day?.office).breakfast`.
    - "Night" maps to 1380.
    - Anything else maps to 720.
  - `isLateTick(date: DayKey, slotMin: number, now: number): boolean` is true when `now` is more than 120 min after the slot time on `date`, including any time on a later date.
  - `slotStatus(day: Day | undefined, key: string): { kind: 'taken'; at: number } | { kind: 'missed' } | { kind: 'not-logged' }`
  - `setTick(date: DayKey, key: string, on: boolean, at?: number)`: when `on` is true it also clears `missed[key]`.
  - `setMissed(date: DayKey, key: string, missed: boolean)`: setting `missed` also clears the tick.

- [ ] **Step 1:** Write the failing tests:
  - `slotTime parses '9 pm' as 1260`.
  - `slotTime maps Morning to the office breakfast on office days`.
  - `isLateTick: slot 21:00, now 23:41 same day → true; 22:30 → false; next day 00:10 → true`.
  - `setMissed clears the tick and setTick clears missed`.
  - `slotStatus not-logged when neither`.
- [ ] **Step 2:** Run `npx vitest run tests/daily.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `checklist.ts` and the two actions.
- [ ] **Step 4:** `ChecklistSheet` changes:
  - Each slot row has a checkbox, the time taken, and a **Missed** chip.
  - Ticking late shows an inline row: **At [slot time]** · **Just now** · **Other time** (a time input). The choice is passed as `at`.
  - The item name is an inline text input; it saves on blur through `patchSettings`, and blank reverts.
  - Each item has "＋ slot" and "× slot" controls.
  - **Add an item** sits at the bottom.
- [ ] **Step 5:** Workbook checklist sheet: one column per slot showing `HH:MM`, `missed` or `not logged`.
- [ ] **Step 6:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(1.1): edit the checklist in place; record times and missed doses`.

### Task 7: Skipped sets, placeholder guard, weight chips, no-band swaps

**Files:**
- Modify: `src/db/hooks.ts` (line 50 `useSets`), `src/state/Achievements.tsx:25`, `src/ui/Shake.tsx:38`, `src/screens/Session.tsx`, `src/domain/progression.ts`, `src/domain/plan.ts`, `src/domain/loads.ts` (reuse `loadOptions`)
- Test: `tests/training.test.ts`

**Interfaces:**
- Produces:
  - `realSets<T extends SetEntry>(sets: T[]): T[]` in `src/domain/plan.ts`, which drops `skipped` sets.
  - `useSets()` returns real sets only.
  - New `useSessionSets(sessionId: string)` returns all sets, including skipped, for Session.tsx.
  - `isPlaceholder(s: { reps?: number; seconds?: number; loadKg: number | null }): boolean` is true when `(reps ?? 0) <= 1 && !s.seconds && s.loadKg === null`.
  - `effectiveExercise(ex: ExerciseDef, eq: Equipment): ExerciseDef | null`:
    - When `ex.load === 'band' && !eq.band`, returns `ex.noBand` (with `order` copied from `ex`), or `null`, which means "skip tonight".
  - `chipLoads(eq: Equipment, kind: 'pair' | 'single'): number[]` returns `loadOptions(eq, kind)`, sorted and deduplicated.

- [ ] **Step 1:** Write the failing tests:
  - `realSets drops skipped`.
  - `progression ignores skipped sets: all-skipped last session falls back to the session before`.
  - `isPlaceholder: 1 rep no load → true; 1 rep 10 kg → false; carry with seconds → false`.
  - `effectiveExercise swaps band face pull for its noBand when band is false; null without noBand`.
  - `chipLoads for plates 2.5×8 and fixed [1,2.5,5,10] includes 1, 2.5, 5, 7.5, 10`.
- [ ] **Step 2:** Run `npx vitest run tests/training.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the domain functions.
  - Route `useSets`, the Achievements sweep and Shake through `realSets`.
  - `progression.ts` reads `realSets` before choosing "last time".
- [ ] **Step 4:** `Session.tsx` changes:
  - Use `useSessionSets`.
  - The active row gets a **Skip** button, which calls `logSet({... , skipped: true, loadKg: null, reps: undefined})`. Skipped rows render as "Skipped", count as done for group completion, and give "Undo skip".
  - Saving a row where `isPlaceholder` is true opens `ConfirmSheet`: "Skip this set instead?" with **Skip it** and **Save 1 rep**.
  - The kg field becomes a chip row from `chipLoads`, with the suggested load pre-selected, plus **Other** to reveal the existing decimal input.
  - Exercises pass through `effectiveExercise` when the session is built (null ones go to the "skipped tonight" list).
- [ ] **Step 5:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(1.1): skip a set honestly; weight chips; band moves swap out without a band`.

### Task 8: Not logged, day complete, and late-night "what's left"

**Files:**
- Create: `src/domain/logged.ts`
- Modify: `src/domain/weekly.ts` (`weekStats`, `receiptLines`), `src/screens/Tracks.tsx`, `src/screens/TrackExtras.tsx`, `src/screens/Diary.tsx`, `src/screens/FoodToday.tsx` (Day complete toggle), `src/sheets/WhatsLeft.tsx`, `src/export/workbook.ts`
- Test: `tests/insights.test.ts`

**Interfaces:**
- Produces:
  - `foodDaysFor(range: DayKey[], days: Map<DayKey, Day>, entries: FoodEntry[]): { counted: DayKey[]; basis: 'complete' | 'logged' | 'none' }`
    - Uses complete days (`foodDone`) when any exist in the range, otherwise days with at least one entry.
  - `avgOver(values: number[]): number | undefined` returns undefined for an empty array.
  - `dayFoodLabel(day: Day | undefined, entryCount: number): 'not-logged' | 'partial' | 'complete'`

- [ ] **Step 1:** Write the failing tests:
  - `averages skip unlogged days`: 5 logged days in a 7-day range give the average of 5, `basis 'logged'`.
  - `complete days win when any exist`.
  - `a week with nothing logged has basis none and avg undefined`.
  - `weekStats kcalAvg uses foodDaysFor`.
- [ ] **Step 2:** Run `npx vitest run tests/insights.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `logged.ts` and use it in `weekStats` and the Tracks averages.
  - Labels read "avg of N logged days" or "avg of N complete days".
  - Diary and the receipt show "Not logged" instead of 0.
  - The workbook food sheet gets a Status column.
- [ ] **Step 4:** UI changes:
  - A **Day complete** switch sits at the end of FoodToday, saving `patchDay(date, { foodDone })`.
  - In `WhatsLeft.tsx`, from 22:00 the sheet shows "It's late. Mark the day complete?" with the switch, instead of food suggestions.
- [ ] **Step 5:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(1.1): not logged is not zero; day complete`.

### Task 9: Water off, streak label, confirm sheet, Log sheet tap guard

**Files:**
- Modify: every file that reads water and lacks a `prefOn(settings.prefs, 'water')` guard. The water readers are:
  - `App.tsx`
  - `domain/achStats.ts`, `domain/golden.ts`, `domain/period.ts`, `domain/rings.ts`, `domain/shakeStats.ts`, `domain/weekly.ts`, `domain/achievements.ts`
  - `export/workbook.ts`
  - `screens/Settings.tsx`, `screens/Setup.tsx`, `screens/Today.tsx`, `screens/TrackExtras.tsx`, `screens/Tracks.tsx`
  - `sheets/LogSheet.tsx`
  - `state/derived.ts`
  - `ui/Ticker.tsx`
- Also modify: `src/screens/Train.tsx` (streak line), `src/ui/Sheet.tsx` (`ConfirmSheet`), every `window.confirm` site (`CheckIn.tsx:92`, `Clips.tsx:109`, `CustomTracks.tsx:146`, `Session.tsx:293`, `SessionDone.tsx:143`, `SessionView.tsx:76`, `Settings.tsx:357-358`, `AddFood.tsx:161`), and `src/sheets/LogSheet.tsx`
- Test: `tests/achievements.test.ts`, `tests/daily.test.ts`

**Interfaces:**
- Produces:
  - `useConfirm(): (o: { title: string; body?: string; yes: string; no?: string; danger?: boolean }) => Promise<boolean>` from `src/ui/Sheet.tsx`, rendered in the app's sheet style.
  - `visibleAchievements(settings: Settings): Achievement[]` excludes the water category when water is off, and excludes `RETIRED_ACHIEVEMENTS`.

- [ ] **Step 1:** Write the failing tests:
  - `with water off, achievement total excludes water and retired`.
  - `with water off, weekStats has no water line in receiptLines`.
  - `trainingWeeks label text: 'This week 0 of 4 · best run 1 week'`. Add the pure helper `trainingStreakLine(w: TrainingWeeks, perWeek: number): string` in `streaks.ts`.
- [ ] **Step 2:** Run `npx vitest run tests/achievements.test.ts tests/daily.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the water guards, `visibleAchievements`, and `trainingStreakLine` (used in `Train.tsx`). Settings gains a **Track water** switch.
- [ ] **Step 4:** Implement `useConfirm`/`ConfirmSheet` and replace every `window.confirm` with it.
- [ ] **Step 5:** In `LogSheet.tsx`, ignore pointer events until the sheet's open transition ends (an `animationend` or `transitionend` flag, with a 350 ms fallback timer).
- [ ] **Step 6:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 7:** Commit: `feat(1.1): hide water, clear training streak line, themed confirmations, tap guard`.

### Task 10: Workbook columns and the private repair

**Files:**
- Modify: `src/export/workbook.ts`
- Create (git-ignored, private): `private/repair-1.1.mjs`
- Modify (git-ignored, private): `private/make-starter.mjs`
- Test: `tests/xlsx.test.ts`

**Interfaces:**
- Consumes: every field from Task 1.
- Produces:
  - Workbook columns: Food → "Eaten at", "Protein unknown", "Status"; Days → "Office day"; Sets → "Skipped".
  - `node private/repair-1.1.mjs <backup.json> <out.json>` prints each change, then writes the output.

- [ ] **Step 1:** Write the failing test `workbook has 1.1 columns` (assert the header cells exist).
- [ ] **Step 2:** Run `npx vitest run tests/xlsx.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Add the columns.
- [ ] **Step 4:** Write `repair-1.1.mjs`, applying exactly the edits listed in `private/repair-1.1.md`. Update `make-starter.mjs` with `prefs.water: false`, `mealTimes` and the plan change.
- [ ] **Step 5:** Run the repair on the copy of the owner's latest backup and check its printed change list against `repair-1.1.md`.
- [ ] **Step 6:** Run `npx vitest run`, then `npm run build`. Expected: all PASS and a clean build.
- [ ] **Step 7:** Commit (public files only): `feat(1.1): workbook columns for honest data`.

### Task 11: Final check
- [ ] Run `npm test` and `npm run build`. Expected: PASS and a clean build.
- [ ] Load the repaired backup into the dev server (`health-dev`). Check at 375×812:
  - morning log hints, Same as yesterday, the time tile opening on one tap
  - office toggle
  - meal switch and eaten-at in the timeline
  - checklist inline edit, late tick and missed
  - session Skip, the placeholder prompt and weight chips
  - Y-raise present and dead bug gone
  - "Not logged" in Diary
  - no water anywhere
  - themed confirm
- [ ] Run `C:/Users/sanya/.claude/skills/impeccable/scripts/impeccable detect --json src` once over the changed UI.
- [ ] One whole-branch review, then report to the owner. Pushing waits for the owner's go-ahead.
