# You redesign, Part 1: the You page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner's standing choice is native execution with one final reviewer) to implement this plan task-by-task. Load impeccable and impeccable-extras before Task 7. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the You tab with the approved page: film poster, clock, Momentum with trends, Due lines, one finding, trophy case, six doors, browse cards, today's lift, How's today and the Go to box.

**Architecture:** Pure rules live in small `src/domain/` modules, tested first. The page is thin: `src/screens/You.tsx` loads data and composes sections from `src/screens/you/`. Shared colour and motion live in `src/ui/you/` and `src/styles/you.css`, so later parts reuse them.

**Tech Stack:** React 19, TypeScript, Dexie, Vite, Vitest (`environment: node`).

**Spec:** `docs/superpowers/specs/2026-11-05-you-redesign-design.md`. **The look:** `#/proto/you`.

## Global Constraints

- The repo is public: no names, body numbers, plans, loads or medical details in code, tests or comments.
- Nothing from the match report is built. Football titles are Part 2's.
- Text that carries meaning is at least 14 px. Tap targets are 44 px. Checked at 360 px.
- Animate only `transform`, `opacity` and stroke offset. Every entry keyframe states its `to`. No fixed layer inside an animated block. No gradient text. No reduced-motion or battery-saver variants.
- Gold `#f2c46d` only for what was earned. Anything that judges carries a word.
- "Not logged" is never zero. Weight and calories never enter Momentum.
- No push, PR or merge without the owner's word.

## Review Focus

1. **A new or sparse install:** no days, no plan, no backup. Every section is absent or says what it needs, and nothing shows NaN or 0%. *(Tests in Tasks 2, 3, 4, 5.)*
2. **A gap in logging:** two weeks away means Momentum falls back to "needs more days", not zero. *(Task 2.)*
3. **A logged zero against a missing value:** `steps: 0` counts as logged and not met; undefined doesn't count. *(Task 2.)*
4. **Day rollover with the page open:** finding and lift change with `useToday`, not on re-render within a day. *(Tasks 4, 5.)*
5. **Hidden or backgrounded page:** a count-up must land on its true number even if frames never run, and content must be visible at rest. *(Task 1 measurement step.)*

---

### Task 1: Branch and shared blocks

**Files:**
- Create: `src/ui/you/palette.ts`, `src/ui/you/paths.ts`, `src/ui/you/Reveal.tsx`, `src/ui/you/CountUp.tsx`, `src/ui/you/DrawnLine.tsx`, `src/styles/you.css`
- Modify: `src/main.tsx` (import `you.css`)
- Test: `tests/you-paths.test.ts`

**Interfaces:**
- Produces: `HUE` (spec 2's colours, by measure); `smoothPath(pts: [number, number][]): string`; `<Reveal className style>` adds `in` once 10% is in view; `<CountUp to ms? fmt?>`; `<DrawnLine vals c c2? h? area? width? last?>`, with `tip?: boolean` for a dot that rides the drawing line by `getPointAtLength` and a `transform`, landing on the last point; with no frames it sits on the last point.

- [ ] **Step 1: Cut the branch.** `git switch -c feat/you origin/main`, then bring over `src/screens/proto/YouLiving.tsx`, `src/styles/you-proto.css`, the dev-only route in `src/App.tsx`, the spec and these plans. First commit: `docs(you): spec, plans and the approved prototype`.
- [ ] **Step 2: Write the failing test** in `tests/you-paths.test.ts`:

```ts
it('starts at the first point and ends at the last', () => {
  const d = smoothPath([[0, 10], [5, 5], [10, 0]]);
  expect(d.startsWith('M0 10')).toBe(true);
  expect(d.endsWith('10.0 0.0')).toBe(true);
});
it('draws one curve per gap', () => {
  expect(smoothPath([[0, 0], [1, 1], [2, 2], [3, 3]]).match(/C/g)).toHaveLength(3);
});
it('a single point draws nothing past its move', () => {
  expect(smoothPath([[4, 4]])).toBe('M4 4');
});
```

- [ ] **Step 3: Run it.** `npx vitest run tests/you-paths.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement** the five files, moved from the prototype's `Play`, `Count`, `smooth`, `Line`. `CountUp` keeps its timeout that lands on `to` when frames don't run. `you.css` takes the arrival keyframes, with every entry keyframe stating its `to`.
- [ ] **Step 5: Run it.** Expected: PASS.
- [ ] **Step 6: Measure.** Load a test page with the pane hidden: `CountUp` shows its true number after `ms + 200`. Record as "verified by measurement".
- [ ] **Step 7: Commit.** `feat(you): shared colour and motion blocks`.

### Task 2: Momentum

**Files:**
- Create: `src/domain/momentum.ts`
- Test: `tests/momentum.test.ts`

**Interfaces:**
- Consumes: `dayRings(settings, date, day, entries)`, `targetsFor`, `sleepMinutes`, `addDays`.
- Produces:
  - `type MomentumArea = 'steps' | 'protein' | 'sleep' | 'training'`
  - `interface MomentumInput { settings: Settings; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[] }`
  - `areaScores(date: DayKey, i: MomentumInput): Partial<Record<MomentumArea, number>>` (0 to 1)
  - `momentumOn(date: DayKey, i: MomentumInput): number | undefined`
  - `momentumSeries(today: DayKey, i: MomentumInput, days = 28): (number | null)[]`
  - `momentumChange(today: DayKey, i: MomentumInput): number | undefined`
  - `interface TrendRow { area: MomentumArea; word: 'Improving' | 'Building' | 'Steady' | 'Easing'; now: string; was: string; series: number[] }`
  - `trendRows(today: DayKey, i: MomentumInput): TrendRow[]`

- [ ] **Step 1: Write the failing tests,** using `defaultSettings()` with targets `{ steps: 10000, proteinG: 140, sleepMin: 420, sessionsPerWeek: 4 }`, a plan from `tests/fixtures`, and `date = '2026-10-20'` so the window is 6 to 19 Oct:

```ts
it('steps: 7 of 14 logged days closed scores 0.5')
it('a logged 0 counts as not met; an undefined day is not counted')     // 10 logged, 5 met → 0.5
it('an area with 3 logged days is left out')                            // areaScores has no steps key
it('training: 4 done sessions at 4 a week scores 0.5; 12 caps at 1')
it('training is left out without a plan')
it('sleep meets at exactly the target minutes')                         // 420 → met, 419 → not
it('today is not in the window')                                        // a closed ring on 20 Oct changes nothing
it('momentum is the rounded mean: 0.5 and 0.75 give 63')
it('one area gives no score')                                           // undefined
it('nothing logged gives no score, and no series value')                // series all null
it('weight changes do not move momentum')                               // same input + measurements → same number
it('free meals and calories do not move momentum')                      // kcal far over → same number
it('change is today minus 28 days ago; absent if there is no earlier score')
it('trend: up 8 points reads Improving, up 7 Steady, down 8 Easing, training up reads Building')
it('trendRows leaves out an area with no score and gives 16 series values')
it('now and was read as sentences: "8,900 a day" and never NaN')
```

- [ ] **Step 2: Run them.** `npx vitest run tests/momentum.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** to spec 6.1 and 6.2. Protein uses `rings.protein.closed` and never the calorie ring. Group entries by date once per call.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(you): momentum and trend rows`.

### Task 3: Due lines

**Files:**
- Create: `src/domain/dueLines.ts`
- Test: `tests/due-lines.test.ts`

**Interfaces:**
- Consumes: `lastFullWeek`, `checkInDue(today, day, lastCheckIn)`, `settings.backup`.
- Produces: `interface DueItem { id: 'story' | 'checkin' | 'backup'; text: string; action: string; path: string }`, `dueItems(i: { today: DayKey; settings: Settings; days: Day[]; lastCheckIn?: DayKey; storySeenWeek?: DayKey }): DueItem[]`, `backupLine(settings: Settings, today: DayKey, days: Day[]): string | undefined`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('fixed order: story, then check-in, then backup')
it('story goes once that week has been opened, and with no data that week')
it('backup: silent at 9 days, due at 10')
it('backup line reads "Backup safe up to 26 Oct · 10 days not saved"')
it('no backup ever: silent for 9 days of use, "No backup yet" at 10')
it('lastFull counts as well as lastQuick; the later one wins')
it('nothing due gives an empty list')
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Weekly story's `path` is `/week` for now. `storySeenWeek` is kept in `localStorage` key `you-story-seen`, read by the page and passed in; a read that throws counts as not seen.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(you): the due lines`.

### Task 4: One finding a day

**Files:**
- Create: `src/domain/dailyFinding.ts`
- Test: `tests/daily-finding.test.ts`

**Interfaces:**
- Consumes: `seeded` (`domain/creatures`), `sleepPayoff`, `weekdayPattern`, `bestWeekday`, `formTrend`.
- Produces: `interface Finding { id: string; text: string; working: string }`, `findingCandidates(i: FindingInput): Finding[]`, `dailyFinding(today: DayKey, i: FindingInput): Finding | undefined`, with `FindingInput = { today; days; entries; sessions; sets }`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('holds for a whole day')                    // same date, same id, whatever order the data arrives
it('moves on across a week')                   // 7 dates with 3+ candidates give at least 2 ids
it('no data gives no finding')                 // undefined
it('sleep finding needs its minimum of days')  // below the minimum, it is not a candidate
it('every finding has working in words')       // working is a non-empty sentence
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** At least three candidates: sleep after a big step day, best weekday for steps, form trend. Sort candidates by id before seeding.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(you): one finding a day`.

### Task 5: The slow-day block

**Files:**
- Create: `src/domain/slowDay.ts`
- Test: `tests/slow-day.test.ts`

**Interfaces:**
- Produces:
  - `type Lift = { kind: 'ago'; text: string } | { kind: 'rank'; beat: number; of: number } | { kind: 'visitor'; id: string; mornings: number } | { kind: 'best'; value: string; note: string }`
  - `todaysLift(today, i: SlowInput): Lift | undefined`
  - `comebacks(days: Day[], today: DayKey): { count: number; longestGap: number; backInDays: number | undefined }`
  - `moodCard(mood: 'tired' | 'off' | 'bored', today, i: SlowInput, stat?: Stat): { title: string; line: string; gremlin: string }`
- `SlowInput = { days; entries; sessions; sets; sightings; settings }`

- [ ] **Step 1: Write the failing tests:**

```ts
it('a lift holds for a day and skips kinds with nothing to say')
it('rank: 5 of 6 weeks reads beat 5 of 6, counting only logged weeks')
it('no lift with no data')
it('comebacks: a gap of 3 or more unlogged days counts; 2 does not')
it('comebacks: 2 gaps of 4 and 9 give count 2, longestGap 9')
it('back in days is the mean days from return to a usual step day, absent with no gaps')
it('tired never owes anything: the line has no number to hit')
it('off plan with no gaps yet still has a kind card')
it('bored without a stat falls back to a line, never empty')
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Gremlin lines here are three short constants per mood, replaced in Part 6.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(you): today's lift and how's today`.

### Task 6: Trophy case, browse cards and Go to

**Files:**
- Create: `src/domain/trophies.ts`, `src/domain/goTo.ts`, `src/domain/browse.ts`
- Modify: `src/domain/types.ts` (`Settings.youQuestions?: string[]`)
- Test: `tests/you-browse.test.ts`

**Interfaces:**
- Produces:
  - `autoTrophies(i): Trophy[]`, `Trophy = { id: string; value: string; label: string }`; Part 2 adds picks.
  - `QUESTIONS: { id: string; label: string; answer(i): string | undefined }[]`, three to start: protein on office days, best week for steps, sessions after 11 pm.
  - `whatWouldItTake(km: number, today: DayKey, stride: number): { stop: string; by: DayKey; stepsPerDay: number } | undefined`
  - `surprise(seed: string, i): { text: string; sub?: string; path?: string } | undefined`
  - `GO_TO: { label: string; path: string; words?: string[] }[]`, `matchGoTo(q: string, months: string[]): GoToHit[]`

- [ ] **Step 1: Write the failing tests:**

```ts
it('auto trophies give up to 3 on You, biggest step day first, and none without data')
it('every trophy label is 2 words or more, so tiles wrap alike')
it('a question with no data answers undefined, and the row says "Not enough yet"')
it('what would it take: 100 km in 14 days at 0.74 m a step is 9,653 steps a day')
it('what would it take is absent past the last stop')
it('surprise is stable for one seed and returns nothing with no data')
it('go to: "back" finds Backup; an empty query lists nothing; a month name finds its report')
it('go to matches without regard to case, and never lists Journey or Character')
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** `km ÷ days ÷ stride`, rounded up; the date defaults to 14 days out.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(you): trophies, browse cards and go to`.

### Task 7: The page

Load impeccable, impeccable-extras and the craft floor first.

**Files:**
- Rewrite: `src/screens/You.tsx`
- Create: `src/screens/you/FilmPoster.tsx`, `ClockCard.tsx`, `MomentumPanel.tsx`, `DueLines.tsx`, `FindingCard.tsx`, `TrophyCase.tsx`, `Doors.tsx`, `Browse.tsx`, `TodaysLift.tsx`, `HowsToday.tsx`, `GoToBox.tsx`; `src/screens/Insights.tsx` (holds `Heatmap` for now)
- Modify: `src/App.tsx` (`/insights` route), `src/styles/you.css`
- Test: `tests/you-doors.test.ts`

**Interfaces:**
- Consumes: everything above; `RegionFrameView`, `useWalkKm`, `clockAt`, `lastMonth`, `monthlyFilm`, `statDeck`, `wornTitle`, `useLevel`.
- Produces: `DOORS: { label: string; path: string; hue: string }[]`, exported from `src/screens/you/Doors.tsx`.

- [ ] **Step 1: Write the failing test** in `tests/you-doors.test.ts`:

```ts
it('six doors in the fixed order', () => {
  expect(DOORS.map((d) => d.label)).toEqual(['Reports', 'Earned', 'Body', 'Tracks', 'Diary', 'Insights']);
});
it('every door opens a route that exists')   // read src/App.tsx as text; each path appears as a key of PAGES, `'/week':`
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Build the sections** in spec 4.1's order, from the prototype's markup and CSS, moved into `you.css`. Poster shows on days 1–7 with last month's data. Doors open: `/week`, `/achievements`, `/checkin`, `/tracks`, `/diary`, `/insights`. `What if`, `BenchmarkCard`, `Heatmap` and the rows for Journey, Character, Experiments and "A stat" leave the page; their routes stay until their parts replace them, and Go to still finds what remains.
- [ ] **Step 3b: Animate Momentum** to spec 4.1's "It moves": number and chart together over 1.1 s, `tip` dot riding the line and pulsing once on today, rows arriving one after another (slide, draw, word). `MomentumPanel` plays once per visit, and lands at rest with no frames.
- [ ] **Step 4: Run it.** Expected: PASS. Then `npx tsc --noEmit -p .` and `npx vitest run`: all pass.
- [ ] **Step 5: Look.** With the Browser pane showing (`preview_start` name `health-you`), restored data, 360 px. Compare side by side with `#/proto/you`, in each of two regions, and with the film poster forced on by date.
- [ ] **Step 6: Probe and record the numbers:** text under 14 px is 0; overflow is 0; text collisions are 0; targets under 44 px are 0; with animations left to run, every `.y-play` block ends visible; poster, clock, chart, count-up, Momentum's tip dot and its rows seen moving, with the pane showing. Also a new install: empty IndexedDB origin, no NaN, no "0%".
- [ ] **Step 7: Commit.** `feat(you): the new You page`.

### Task 8: Close the part

- [ ] **Step 1:** Run `npx vitest run`, then `TZ=UTC npx vitest run`, typecheck and `npm run build`. Report "green locally and under the CI clock".
- [ ] **Step 2:** Write a short note: built, checked, not checked, rulings. Go on to Part 2's plan without a stop. The one reviewer comes after the last part (overview).
