# Health 1.1: honest data

Date: 12 Oct 2026 · Branch: built on `shelf-v2` · Status: draft for the owner's review

1.1 is a focused release. It makes what the app saves match what really happened, and fixes the small frictions the owner named. The full v2 revamp comes later, after the feature-rating pinboard round.

**This repo is public.** Personal values (meal times, checklist names, the repair details) live in `private/` (the starter file and the repair script), never in this file or in `src/`.

## Why

Two weeks of real use (27 Sep – 11 Oct) showed six ways the data drifts from the truth:

- **Sleep carried over.** The morning log pre-fills yesterday's sleep, so identical wake times repeat across days.
- **Meals filed by the clock.** The meal is guessed from the time of logging, so evening logging files whole days under dinner, stamped at 23:00.
- **Checklist times lost.** Checklist ticks land in one burst at night, so the record cannot say when a dose was taken, or tell a missed one from an unlogged one.
- **Placeholder sets.** Sets with nothing to log were saved as placeholders ("1 rep, no weight") because there is no way to skip a set.
- **Bad food entries.**
  - A food saved per 100 g with a large default portion turned "one salad" into 1,320 kcal.
  - Duplicate foods disagree with each other.
  - Quick adds go in with typos and no protein.
- **Empty days counted as low ones.** Days with nothing logged pull averages down as if they were real low days.

## Scope

### 1. Morning log
- **No pre-filled answers.**
  - Weight and sleep start empty. Last known values show as grey hint text ("last: 84.3 kg", "last: 1:35 am → 9:50 am").
  - Untouched fields are not saved.
- **"Same as yesterday".** A chip in the sleep section copies yesterday's times and saves them with `sleep.carried = true`, so charts and stats can tell a copied value from a typed one.
- **Easy time entry.**
  - Each time tile gets a visible clock icon. Tapping anywhere on the tile opens the time picker (`input.showPicker()`, falling back to focus and click).
  - Two small buttons, −15 and +15 minutes, sit under each tile for fine adjustment.
  - This replaces the invisible full-tile input, which needed several blind taps to open.
- **No speed rewards.**
  - The speed toast, `settings.morningBest` and the timing are removed.
  - The secret achievements "World record" (morning log speed) and "Glitch in the Matrix" (same value twice) are retired. Existing unlocks stay in the data but are hidden.

### 2. When you ate
- **Two times per entry.** A food entry gains `eatenAt`, kept separate from `at` (when it was logged).
  - Older entries with no `eatenAt` read as `at`.
- **Meal switch.** A four-part control (Breakfast · Lunch · Snacks · Dinner) replaces the meal chip that cycles, in Add food, Quick add, drinks and saved meals.
  - The default stays clock-based. One tap changes it.
- **Default meal times.** `eatenAt` defaults to the chosen meal's usual time.
  - The times come from new `settings.mealTimes`, with separate rows for a home day and an office day.
  - The owner's values go in the private starter. Code defaults are generic.
  - If you log live, inside the meal's window, "now" is used instead.
- **Editing.** Editing an entry can change its meal (and so its time).

### 3. Office days
- **Logging it.** The morning log's "Where are you today?" row gains an **Office day** toggle, saved as `day.office = true`.
  - It can also be toggled from the Today timeline later that day.
- **Effects in 1.1:**
  - **Meal times:** the office-day row is used.
  - **Steps:** the goal is eased exactly like the day after a night out (`stepsGoal(t, true)`: 2,000 lower, never below 6,000), and no shield is spent if it's missed.
  - **Training:** if a session is due, Today offers the short version first.
- **Stats.** Office days are marked in the day heatmap and the weekday patterns, so tired days read as context, not failure.

### 4. Checklist
- **Edit in place.** In the checklist sheet, tap an item's name to rename it.
  - Slots can be added or removed there, and an "Add an item" row sits at the bottom.
  - Settings keeps its list and links to the sheet.
- **Recording the time.** Each slot has a planned time.
  - The time comes from the slot label ("9 pm"), or for "Morning"/"Night" from the day's breakfast time and 11 pm.
  - Ticking within 2 hours of the planned time saves "now".
  - Ticking later asks once, in a small inline row: **At [planned time]** · **Just now** · **Other time**.
- **Missed.** A third state, **Missed**, is stored in `day.missed[itemSlotKey] = true`. Days with neither a tick nor "missed" show as "not logged" in the record.
- **The record.** The record you can share with a doctor shows the time taken, "missed", or "not logged" for each slot.

### 5. Training sets
- **Skip a set.**
  - The active set row gets a **Skip** button, which saves `SetEntry.skipped = true` with no load and no reps.
  - Skipped sets count as done for moving on through the session.
  - They are left out of records, last-time values, progression, strength scores and achievements.
- **Placeholder guard.** Saving 1 rep with no weight asks, in a themed sheet, "Skip this set instead?"
- **Weight picker.**
  - The weight field becomes a row of chips holding the loads you can actually make (`loadOptions(equipment, kind)`). For the owner's kit that is 1 · 2.5 · 5 · 7.5 · 10 kg, plus plate builds above that.
  - An **Other** chip keeps typing for anything else. The suggested load is pre-selected.
- **No band.** When `equipment.band` is false, band exercises are swapped out automatically: to the exercise's band-free substitute if the plan defines one, otherwise "skip tonight".
  - Plan files gain an optional `noBand` substitute per band exercise.
- **The owner's plan** (private starter and repair, not `defaultPlan.ts`):
  - Remove Dead bug.
  - Replace Band face pull with **Bent-over Y-raise** (light pair, 12–15 reps).

### 6. Saving foods and quick adds
- **Large-portion check.** When the default portion comes to more than 800 kcal, saving asks: "[Food] at [amount] is [kcal] kcal. Is that right?" Options: Yes, or "Make it 1 serving".
- **Impossible values.** Values over 900 kcal per 100 g are rejected (nothing is denser than pure fat).
- **Duplicate check.** If a saved food's name is close to an existing one, saving says "You already have [name] ([kcal] per [unit])". Options: use that one, or save anyway.
- **Quick add.**
  - A name is required.
  - Protein gets quick chips (0 · 5 · 10 · 20 · 30 g) and a **Not sure** chip, which saves `proteinUnknown = true`.
  - Spellcheck and sentence capitalisation are turned on for food name fields.

### 7. Not logged
- **Not logged is not zero.**
  - A day with no food entries shows "Not logged" (never 0 kcal) in Diary, Tracks, the weekly receipt and the workbook.
  - Averages skip days that weren't logged and say so ("avg of 5 logged days").
- **Day complete.** A small **Day complete** toggle at the end of the day's food list sets `day.foodDone = true`.
  - When a week has any completed days, food averages use only those. Partly logged days get a "partial" mark.
  - This is the seed of v2's "Close the day".
- **"What can I still eat?"** After 10 pm it offers "Mark the day complete" instead of suggesting more food.

### 8. One definition per number, and no water
- **Water is hidden.**
  - A new `prefs.water` defaults to on in code; the owner's starter turns it off.
  - When off, water leaves Today, the Log sheet, Tracks, the receipt, the ticker, perfect-day secrets and the achievement totals. The water category is hidden, so "N of 223" becomes "N of 216".
  - Water data already saved is kept.
- **Step averages** divide by the days that have steps.
- **Perfect days** come from one function, used by the ticker, Journey and achievements alike.
- **Training streak.** Train shows "This week 0 of 4 · best run N weeks" instead of a bare "Streak: 0 weeks".

### 9. Small fixes that ride along
- **Log sheet taps.** The sheet ignores taps until its slide-in finishes. A mis-tap here started a session during the critique.
- **Styled confirmations.** `window.confirm` calls in Session, Check-in and Meals become the app's own themed confirm sheet.

## Data and compatibility
- **New optional fields only:**
  - `FoodEntry.eatenAt` and `FoodEntry.proteinUnknown`
  - `Day.office`, `Day.missed` and `Day.foodDone`
  - `Sleep.carried`
  - `SetEntry.skipped`
  - `Settings.mealTimes` and `Prefs.water`
  - the plan file's `noBand` substitute
- **No index changes,** so no Dexie schema bump.
- **Backups:** old backups restore unchanged, and 1.1 backups still restore in 1.0 (unknown fields are ignored).
- **Workbook:** adds Eaten at, Office day, Skipped and Missed columns.
- **Version:** 1.1.0.

## One-off repair of the owner's data
A private script, `private/repair-1.1.mjs`:
1. It reads a fresh backup and writes a corrected one for the owner to restore from Settings.
2. It prints every change before writing.
3. The exact edits are listed in `private/repair-1.1.md`:
   - food fixes and merges
   - placeholder sets marked as skipped
   - quick-add names
   - plan changes
4. Nothing personal goes into `src/`.

## Testing
Vitest cases for:
- the morning log not saving untouched fields, and carried sleep
- meal-time defaults (home and office) and live logging
- the late-tick "when?" rule and missed slots
- skipped sets being excluded from records and progression
- `loadOptions` producing the picker chips
- the large-portion, impossible-value and duplicate checks
- averages skipping unlogged days and preferring completed days
- water-off totals
- an old backup restoring

Then one final check in the browser on a phone-sized viewport, with a copy of the owner's backup loaded.

## Not in 1.1 (goes to the v2 pinboard)
- Close the day / quick capture of a whole day
- Plan editor (add, remove, edit exercises)
- Goals tuned to the "athletic" benchmark, using the birth year
- Bedtime guidance
- Today and Log sheet simplification
- The Story door
- Pruning achievements
- Backup escalation
- Accessibility sizing pass
- Any visual changes
