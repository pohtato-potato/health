# Today redesign, part 1: the page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Today page with the approved layout (sections 1–8 of the spec): the walk scene with its caption, one banner slot, the line, numbers-only rings, the moment card, the Next up strip, logging below the fold, and the drawer. Remove the night screen.

**Architecture:** New pure rules go in `src/domain/` (usual portions, Same as yesterday, the moment card, banner dismissal, the glance line, the protein state), each test-first. New components go in `src/screens/today/`, one file per section, styled in `src/styles/today.css` and ported from the prototype's `today-home.css`. `Today.tsx` becomes a thin page that loads data and lays the sections out in order. Living colour and the moments are part 2; this part uses the existing Dusk background.

**Tech Stack:** Vite, React 18, TypeScript, Dexie (`dexie-react-hooks`), Vitest, `react-dom/server` for static render tests.

**Spec:** `docs/superpowers/specs/2026-10-21-today-redesign-design.md` (sections "The page, top to bottom", "Data › Derived numbers", "Removed"). Prototype for the look: `src/screens/proto/TodayHome.tsx` with `src/styles/today-home.css` on branch `proto/today`.

## Global Constraints

- "Standard text size for the magnifier: never larger by default. Nothing that carries meaning is under 14 px."
- "Never colour alone."
- "Every target is at least 44 px. Main actions are 50–56 px."
- "Stable positions: blocks never move while you read. The banner slot and the moment card keep their places; only their contents change."
- "Gold: records and a perfect day." Nothing else is gold.
- "Only the moment card is a card. The walk, the line, the rings and Next up sit straight on the sky, each in its own form."
- All times are log-day times: "1 am still counts as the evening before" (minutes before 04:00 count as +1440).
- **This repo is public:** no names, places, foods, medicines, body numbers or plans in code, tests or comments. Test values are invented.
- Tests run under `TZ=UTC`. A test that reads a git-ignored fixture skips cleanly when the file is absent.
- A component that imports the router (`window.location`) can't be rendered with `renderToStaticMarkup`. Keep pure view parts in files that don't import the router, and pass actions in as props.
- Colours come from CSS tokens, so `html.contrast` reaches them.

## Review Focus

1. **Logging after midnight** (00:30) belongs to the evening before. The moment card, the meal of the moment and Same as yesterday's "yesterday" all use the log day, not the calendar day. Pinned in Task 2 and Task 3.
2. **A food logged once, or archived.** A food logged fewer than 3 times at a meal falls back to its most recent amount, then to its default. Archived foods never appear in usual foods. Pinned in Task 1.
3. **No plan, no targets, nothing logged.** A new or empty day must not crash or lie. Steps not logged show "—", not 0. With no plan, the Next up strip says "No plan yet". The moment card falls back to the glance. Pinned in Task 3 and Task 8.
4. **Sick, injured or a break.** The rest card wins over every other card, and the steps ring uses the eased goal. Pinned in Task 3.
5. **Same as yesterday with nothing to copy.** When yesterday's meal is empty, the tile offers nothing (no button that does nothing). Pinned in Task 2 and Task 11.

No spec promise in this part depends on the production build; part 2's battery saver and reduced motion are checked there.

---

### Task 0: Branch and spec

**Files:** none new.

- [ ] **Step 1:** `git checkout main && git pull --ff-only && git checkout -b feat/today-page`.
- [ ] **Step 2:** Bring the spec over: `git cherry-pick b9fd979 30c6d8a` (the spec and its "Decided after review" commits from `proto/today`). Expected: `docs/superpowers/specs/2026-10-21-today-redesign-design.md` exists on the branch.
- [ ] **Step 3:** Copy the plan in. `git add docs/superpowers/plans/2026-10-21-today-redesign-part-1.md && git commit -m "docs: Today part 1 plan"`.

### Task 1: Usual foods and usual portions

**Files:**
- Create: `src/domain/usual.ts`
- Test: `tests/usual.test.ts`

**Interfaces:**
- Produces: `usualPortion(entries: FoodEntry[], food: Food, meal: Meal, today: DayKey): number` and `usualFoods(entries: FoodEntry[], foods: Food[], meal: Meal, today: DayKey, limit = 6): { food: Food; amount: number }[]`.

- [ ] **Step 1: Write the failing tests** in `tests/usual.test.ts`, with invented foods (`f1` "Test dal", default amount 1; `f2` grams, default 100):
  - `usualPortion is the median amount at that meal over 60 days when logged there 3+ times`: entries of f2 at lunch with amounts 100, 250, 250, 300 within 60 days → `250`.
  - `usualPortion ignores entries older than 60 days`: three entries of f2 at lunch 61+ days ago with 400, one entry 2 days ago with 150 → `150`.
  - `usualPortion falls back to the most recent amount at any meal`: f2 logged twice at lunch (120, then 180 most recently, at dinner) → `180`.
  - `usualPortion falls back to the food's default with no history`: → `100`.
  - `usualFoods ranks by count at the meal, ties to the most recent, and stops at the limit`: 7 foods → 6 returned, in order.
  - `usualFoods never includes archived foods`.
  - `usualFoods pairs each food with its usual portion`.
- [ ] **Step 2:** Run `TZ=UTC npx vitest run tests/usual.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement both in `src/domain/usual.ts`. The window is `date > addDays(today, -60) && date <= today`. Food entries are those with `kind === 'food'` and a `foodId`. The default amount is the food's base amount (`food.per`, the amount its kcal are for; check the field name in `types.ts` "The amount the kcal and protein values are for").
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): usual foods and usual portions`.

### Task 2: Same as yesterday

**Files:**
- Modify: `src/domain/usual.ts`
- Test: `tests/usual.test.ts`

**Interfaces:**
- Consumes: `addDays`, `DayKey`, `Meal` from `src/domain/dates` and `src/domain/types`.
- Produces: `sameAsYesterday(entries: FoodEntry[], meal: Meal, today: DayKey, at: number): Omit<FoodEntry, 'id'>[]`.

- [ ] **Step 1: Write the failing tests:**
  - `sameAsYesterday copies yesterday's entries at that meal with today's date and the given time`: two lunch entries on `addDays(today, -1)` → two entries with `date === today` and `at === given`, with the same `foodId`, `amount`, `kcal` and `protein`.
  - `sameAsYesterday returns [] when yesterday's meal is empty`.
  - `sameAsYesterday never copies other meals`.
  - `sameAsYesterday uses the log day: at 00:30 "today" is the evening before`: call with `today` = the log day, and assert it copies from the day before that, not from the calendar day.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Drop `id`, and copy everything else except `date` and `at`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): same as yesterday`.

### Task 3: The moment card rule

**Files:**
- Create: `src/domain/todayMoment.ts`
- Test: `tests/today-moment.test.ts`

**Interfaces:**
- Produces:
  - `type MomentKind = 'rest' | 'closed' | 'morning' | 'perfect' | 'close' | 'protein' | 'steps' | 'glance'`
  - `interface MomentInput { minutes: number; status?: Status; morningDone: boolean; perfect: boolean; dayClosed: boolean; proteinGapG: number; stepsLeft: number }`, where `minutes` is log-day minutes (00:30 → 1470)
  - `momentFor(i: MomentInput): MomentKind`
  - `logMinutes(now: number): number`

**Rule order (a ruling on the spec's table):** rest → closed → morning → perfect → close → protein → steps → glance. "Day closed" moves up, so a day closed early never shows a protein or steps card.

- [ ] **Step 1: Write the failing tests:**
  - `sick, injured and break show rest whatever else is true`.
  - `a closed day shows closed`, even at 20:00 with a protein gap.
  - `morning shows before 14:00 when the morning log isn't done`: 13:59 → `morning`; 14:00 → not `morning`.
  - `perfect from 19:00`: 18:59 with perfect → not `perfect`; 19:00 → `perfect`.
  - `close from 21:00`: 20:59 → `protein` (with a 22 g gap); 21:00 → `close`.
  - `00:30 still counts as the evening`: minutes 1470, not closed → `close`.
  - `protein 19:00–21:00 only with a gap`: a gap of 0 → not `protein`.
  - `steps 11:00–19:00 when steps are left`: 10:59 → not `steps`; 11:00 → `steps`; 19:00 with steps left and no gap → `glance`.
  - `an empty day falls back to glance`: all zeros at 16:00 with the morning done → `glance`.
  - `logMinutes counts 00:30 as 1470 and 03:59 as 1679, and 04:00 as 240`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `momentFor` and `logMinutes` (local hours × 60 + minutes, plus 1440 when under 240).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): moment card rule`.

### Task 4: One banner, in its slot, dismissable for the day

**Files:**
- Modify: `src/domain/banners.ts`, `src/screens/Banners.tsx`
- Test: `tests/banners.test.ts` (extend if it exists, else create)

**Interfaces:**
- Produces:
  - `BANNER_PRIORITY: Record<'update' | 'morningLog' | 'backup' | 'checkin' | 'recap' | 'occasion' | 'install', number>`, with the values 100, 90, 80, 70, 60, 50, 40;
  - `notDismissed<T extends BannerCandidate>(c: T[], dismissed: { date: DayKey; ids: string[] } | null, today: DayKey): T[]`.

**Ruling:** the spec's order (morning log → backup → check-in → occasion) keeps the existing banners slotted in around it: an app update first, the week recap after check-in, install last. Banners keep their existing hour window from `pickBanner`.

- [ ] **Step 1: Write the failing tests:**
  - `priority order is update > morningLog > backup > checkin > recap > occasion > install`.
  - `a dismissed banner stays away for the rest of the log day`.
  - `a dismissal from yesterday no longer hides it`.
  - `the occasion banner is a candidate when a festival is within 21 days and not covered`, using the existing `festivalSoon` and the covered check from `src/sheets/Occasion.tsx`, moved to `src/domain/occasions.ts` as `occasionDue(settings, today): { name: string; from: DayKey; to: DayKey; inDays: number } | undefined`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. In `Banners.tsx`, use the priorities, add the occasion candidate ("*Festival* in *n* days" with "Set up" opening `openSheet('occasion', …)`), and filter through `notDismissed`. Keep dismissals in `localStorage` under `health.banner.dismissed` inside try/catch; it's a per-device convenience. Render the chosen banner as `<TodayBanner title sub action onAction onDismiss />` from `src/screens/today/TodayBanner.tsx`: a line between two hairlines, with a 44 px action and a 44 px dismiss. Remove `OccasionCard` from Today.
- [ ] **Step 4:** Run the banner tests plus `TZ=UTC npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): one banner slot with day-long dismissal`.

### Task 5: Remove the night screen

**Files:**
- Create: `src/domain/wake.ts`
- Delete: `src/screens/TodayNight.tsx`
- Modify: `src/screens/Week.tsx:15`, `src/screens/TrackExtras.tsx:7`, `src/App.tsx` (the `night` constant and its effect), `DESIGN.md` (the Night Dims rule)
- Test: `tests/wake.test.ts`

**Interfaces:**
- Produces: `usualWake(days: Day[], today: DayKey): number | undefined`, unchanged from `TodayNight.tsx:12`.

- [ ] **Step 1: Write the failing test** `usualWake is the median wake time of the last 8 days with at least 3 nights, else undefined`, with invented sleep records.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Move `usualWake` into `src/domain/wake.ts`, point the two imports there, delete `TodayNight.tsx`, remove the `night` code in `App.tsx` and the `:root.night` styles that only served it, and delete the Night Dims rule from DESIGN.md.
- [ ] **Step 4:** Run `TZ=UTC npx vitest run && npx tsc --noEmit -p .`. Expected: PASS, with no reference to `TodayNight`.
- [ ] **Step 5:** Commit: `refactor(today): remove the unused night screen`.

### Task 6: The walk at the top, and the full walk

**Files:**
- Create: `src/screens/today/WalkTop.tsx`, `src/screens/today/WalkFull.tsx`, `src/styles/today.css`
- Test: `tests/today-walk.test.tsx`

**Interfaces:**
- Produces:
  - `walkCaption(i: { date: DayKey; place?: string; status?: Status; near: string; dayN: number; kmToNext: number; landmark: string }): [string, string, string]` (pure, in `WalkTop.tsx` or `src/domain/walkCaption.ts`);
  - `<WalkTop caption scene onOpen />`;
  - `<WalkFull … onClose />`, with the place pickers (calling `changePlace`) and `StatusRow`.

- [ ] **Step 1: Write the failing tests:**
  - `walkCaption gives date · place · status, Near place, and Day n · x km to landmark`: → `['Wed 21 Oct · Home · sick', 'Near Test Town', 'Day 31 · 16 km to Test Fort']`.
  - `walkCaption leaves the status out on a normal day`.
  - `WalkTop renders the three caption lines and a 44 px+ button labelled for the walk, place and status` (static render).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `Top` (variant A) and `WalkFull`. The scene runs edge to edge with the bottom mask. The caption sits on `rgba(8,10,22,.66)`, which gives at least 4.5:1. The old `PlaceChip` and its inline panel are removed from Today.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): the walk in the page's sky, with the full walk on tap`.

### Task 7: The line

**Files:**
- Create: `src/domain/glance.ts`, `src/screens/today/TodayLine.tsx`
- Test: `tests/glance.test.ts`

**Interfaces:**
- Produces: `glanceLine(i: { minutes: number; closedRings: number; dayClosed: boolean; sessionTonight?: string; nextSession?: string; morningDone: boolean }): string` and `<TodayLine text voice gold clock why? />`.

The copy is fixed by these tests:
- [ ] **Step 1: Write the failing tests:**
  - closed: `Day closed with 2 of 3 rings.` and, with a next session, ` Session D on Saturday.`, where the next session's text is passed in whole as `nextSession`.
  - morning before 11:00, morning log not done, session tonight: `Session C tonight. Log the morning when you’re up.`
  - session tonight, otherwise: `Session C tonight.`
  - from 19:00 with 2 rings closed: `Two rings in reach before bed.` (1 closed: `One ring closed so far.`; 0 closed: `The rings are still open.`).
  - all three closed: `All three closed.`
  - nothing else applies: `On track.`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `glanceLine`. In `Today.tsx`, keep the existing `moment` logic and `voiceLine`, but show the voice only for `perfect`, `proteinClosed` (a ring closed), `trained` with a record tonight, and theme days. Otherwise show `glanceLine`. Plain flag lines (joint flags) still override both, as today. The theme day's "why" comes from `themeDayOn(...).why`. On seasonal days with no theme day, the season strip's text becomes the why line, and `SeasonStrip` leaves Today (a ruling: the season strip and Why today were to merge).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): the day's line, the voice only at moments`.

### Task 8: Numbers-only rings

**Files:**
- Create: `src/screens/today/RingsNumbers.tsx`
- Test: `tests/today-rings.test.tsx`

**Interfaces:**
- Consumes: `Rings`, `ThemedRings`, the `rings`, `totals` and `targets` from `dayRings` in `Today.tsx`.
- Produces: `<RingsNumbers rows={RingRow[]} closed progress theme? onLogFood onSaveSteps />`, with `type RingRow = { key: 'kcal' | 'protein' | 'steps'; value: string; unit: string; target: string; ink: string; known: boolean }`.

- [ ] **Step 1: Write the failing tests** (static render):
  - `at rest it shows only each number and its unit`: the markup has `1,640`, `kcal`, `98`, `g` and `7,310`, and does not have `of 130`, `%` or `closed`.
  - `steps not logged show "—", never 0`.
  - `each number is a 44 px+ button with an aria-label naming the ring, value and unit`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `RingsHero` (variant A). Tapping a number opens the target in place, with "Log food" (going to `/food`) or the steps pad (`setSteps`, plus "Copy today's total from Samsung Health." after 19:00). The centre shows `n/3`. Gold rings follow the existing `Gold rings` reward. Use `ThemedRings` on theme days. Delete the old `ringRow` from `Today.tsx`, and the `.ring-row` rules part 0 added, once nothing uses them.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): numbers-only rings, target on tap`.

### Task 9: The moment card

**Files:**
- Create: `src/screens/today/MomentCard.tsx`
- Test: `tests/today-moment-card.test.tsx`

**Interfaces:**
- Consumes: `momentFor`, `MomentKind` (Task 3).
- Produces: `<MomentCard kind={MomentKind} data={{ closedRings: number; proteinGapG: number; gapFoods: string; stepsLeft: number; laps?: string; easedTo?: number }} actions={{ logMorning; closeDay; addGap; typeSteps }} />`.

- [ ] **Step 1: Write the failing tests:** one per kind, asserting its title and its action labels:
  - rest: "Rest is the plan", no button;
  - morning: "Last night is waiting" / "Log the morning";
  - perfect: "All three closed" / "Close the day", gold class;
  - close: "Ready to close the day?" / "Close the day" and "Add both · *n* g";
  - protein: "22 g protein to go";
  - steps: "3,880 steps to go" / "Type steps";
  - closed: "Today, kept";
  - glance: renders nothing.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `MomentCard`. Wire it in `Today.tsx`:
  - log morning: `openSheet('morning')`;
  - close day: `go('/close')`;
  - add the gap: the existing `addGap`, moved into `src/screens/today/useGapAdd.ts` (the hook, toast and Undo unchanged);
  - type steps: `openSheet('steps')`.

  The card keeps its place whatever its kind; for `glance` it renders nothing, but its slot stays in the layout order.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): the moment card`.

### Task 10: Next up and records strips

**Files:**
- Create: `src/screens/today/NextStrip.tsx`
- Modify: `src/screens/NextUpCard.tsx` (keep its data logic; drop its card markup or delete it once unused)
- Test: `tests/today-next.test.tsx`

**Interfaces:**
- Produces: `<NextStrip title sub ready? week={{ done: number; of: number }} start? unfinished? />` and `<RecordsStrip records={string[]} onFinale />`.

- [ ] **Step 1: Write the failing tests:**
  - `the strip shows the session, its usual length, the ready word and "2 of 4"`;
  - `unfinished sets replace the length with "4 sets look unfinished · check on Train"` (the check part 0 added);
  - `no plan shows "No plan yet"`;
  - `records strip shows "2 records tonight" in gold with each record and a Finale button`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `NextStrip` and `RecordStrip`. Tonight's records come from the same record list Train's after state uses: find it with `grep -rn "records tonight\|tonightRecords" src/screens/train`, and export it if it's private. Readiness as a word uses `readinessText` / `heldBackText` from `src/domain/readiness.ts`. "Ready to go heavier" is in plain ink, not gold, because gold is only for records and a perfect day. Start goes to `/session`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): Next up and records as strips`.

### Task 11: Logging below the fold

**Files:**
- Create: `src/sheets/LogSearch.tsx` (extracted from `LogSheet.tsx:60-126`), `src/screens/today/LogBelow.tsx`
- Modify: `src/sheets/LogSheet.tsx` (use `LogSearch`)
- Test: `tests/today-log.test.tsx`

**Interfaces:**
- Consumes: `usualFoods`, `usualPortion`, `sameAsYesterday` (Tasks 1–2); `addEntries`, `deleteEntry`, `setTick` from `src/db/actions.ts`; `mealForTime`.
- Produces: `<LogSearch foods onPickFood onAction />`, `<UsualChips items onAdd />`, `<MealTiles meals={{ meal: Meal; kcal?: number; protein?: number; canRepeat: boolean }[]} onOpen onRepeat />` and `<ChecklistChips items={{ key: string; name: string; on: boolean }[]} onToggle />`.

- [ ] **Step 1: Write the failing tests** (static render, plus a pure helper `mealTotals(entries: FoodEntry[]): Partial<Record<Meal, { kcal: number; protein: number }>>`):
  - `UsualChips shows each food with its usual portion text` (`portionFor`);
  - `a logged meal tile shows kcal on one line and "21 g protein" on its own line`;
  - `an empty tile shows "Empty" and offers "Same as yesterday" only when canRepeat`;
  - `checklist chips say "taken" when ticked`;
  - `mealTotals sums kcal and protein per meal`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `LogSection` (meal tiles, variant A), and wire it up:
  - **Usual chips:** `addEntries` with the usual amount; the toast offers Undo (`deleteEntry`) and "Change" (opens that food's sheet).
  - **Same as yesterday:** `addEntries(sameAsYesterday(...))`.
  - **Checklist:** the hold is 650 ms with a fill, then `setTick(today, `${item.id}:${slot}`, !on)`. One chip per active item and slot, labelled "*name*" or "*name* · *slot*" when the item has several slots.
  - **LogSearch:** the same behaviour as in the sheet.
- [ ] **Step 4:** Run. Expected: PASS. Then run the existing LogSheet tests to confirm the sheet still behaves the same.
- [ ] **Step 5:** Commit: `feat(today): logging below the fold`.

### Task 12: The drawer

**Files:**
- Create: `src/domain/proteinState.ts`, `src/screens/today/TodayDrawer.tsx`
- Test: `tests/today-drawer.test.tsx`

**Interfaces:**
- Produces:
  - `proteinState(i: { gapG: number; closed: boolean; dayClosed: boolean }): string`, which returns "22 g to go", "8 g short" or "Protein closed";
  - `<DrawerHandle ready={number | undefined} protein={string} closeLabel={'Close the day' | 'Day closed'} onOpen />`;
  - `<TodayDrawer voice readiness={{ score?: number; reason?: string }} protein={{ text: string; foods: string }} dayClosed onReadiness onAddGap onClose />`.

- [ ] **Step 1: Write the failing tests:**
  - `proteinState says "Protein closed" when closed, "8 g short" after the day is closed, "22 g to go" otherwise`;
  - `the handle shows Ready 78, the protein state and Close the day`;
  - `readiness without sleep shows "—" and "Log sleep", never a made-up score`;
  - `a closed day's drawer offers "Change the closed day"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from the prototype's `Handle` and `Drawer`. The handle sits above the tab bar (`bottom: calc(var(--tab-h) + var(--safe-bottom) + 10px)`). The drawer's bottom padding includes the tab bar's height, so Close the day stays above it. The page's bottom padding leaves room for the handle. The readiness tile goes to `/readiness`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(today): the drawer and its handle`.

### Task 13: Put the page together

**Files:**
- Modify: `src/screens/Today.tsx` (the page: data loading, then sections in order), `src/styles/today.css`, `DESIGN.md` (the new Today components: the banner line, the strip, the moment card, the drawer handle)
- Test: `tests/today-page.test.tsx`

- [ ] **Step 1: Write the failing test** `the page lays sections out in the spec's order`, by static-rendering a pure `TodayLayout` (create it in `src/screens/today/TodayLayout.tsx`, with each section's element passed in as props) and asserting this DOM order of `data-section` attributes: `walk, banner, line, rings, moment, next, log`, with the handle after them.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `TodayLayout`, and rewrite `Today.tsx` to compute the inputs (it already loads everything it needs) and render `TodayLayout`. Remove the old cards: voice div, Why today card, season strip, rings card, `NextUpCard`, readiness card, protein gap card, occasion card and Close the day card. Remove any `.card` rules that only those used. Keep the Konami easter egg on the rings.
- [ ] **Step 4:** Run `TZ=UTC npx vitest run && npx tsc --noEmit -p . && npm run build`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat(today): the new page`.

### Task 14: Browser check

- [ ] **Step 1:** `preview_start` (name `health`), on the restored dev data, with battery saver switched off for the check and back on after. View `#/today` at 375×812.
- [ ] **Step 2:** Measure with `javascript_tool`. The checks are:
  - no visible text under 14 px except the clock, which is also 14 px;
  - every `button`, `a` and `[role=button]` has a tap area of at least 44 px;
  - no text boxes overlap by more than 3 px on both axes;
  - the moment card and banner slot keep their positions when the content changes (toggle the time with the system clock override, or check two times of day).

  Expected: zero findings.
- [ ] **Step 3:** Exercise, reading the results back from IndexedDB:
  - a usual-food chip, then Undo;
  - Same as yesterday on an empty meal;
  - a checklist hold;
  - a ring number's steps Save;
  - opening and closing the drawer;
  - opening the full walk and changing status, then changing it back.
- [ ] **Step 4:** Screenshot the first screen at morning, afternoon and evening for the part summary.
- [ ] **Step 5:** Privacy scan: `git diff --name-only origin/main...HEAD | tr '\n' '\0' | xargs -0 grep -n -i -E "<owner name>|<home place>|<personal foods and medicines>"`, using the real values from the private starter file. Expected: no hits.
