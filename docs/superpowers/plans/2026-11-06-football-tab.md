# Football Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Health's fifth tab, Football. Each night's logged habits play a match for Brabo United in a living 108-club European pyramid.

**Architecture:**
- **Pure TypeScript domain in `src/football/`:** the benchmarks, the seeded engine, the season, the club and the world. Every rule is test-first, with no React and no Dexie in it.
- **Seven new Dexie tables (schema version 9)** hold the save. One action module (`src/football/store/`) reads Health's data once at kick-off, runs the domain, and stores the results.
- **React screens in `src/screens/football/`** replay stored events in the aurora outline look, ported from the pinboard mockups.

**Tech Stack:** React 19, TypeScript, Dexie 4, Vitest with fake-indexeddb, Vite PWA. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-06-football-tab-design.md` (approved 6 Nov, with the review answers in its section 17). Section numbers below (§) refer to it.

**Visual reference (outside the repo):** `~/Downloads/claude code/Football shared/mockups/`:
- `b5_engine.js`: the match toy
- `b9_*` to `b13_*`: mocks and CSS for every screen
- `build_kcs3.py` and `build_kcs4.py`: kit and crest drawing
- `b11_mocks.py`: crest kit `SHAPES`, `SYM`, `REAL`, `mk`
- `crests/*.svg`

Board links are in the spec header.

## Global Constraints

- The repo is public. No names, body numbers, plans, loads, medicines, or medical details go into code, tests, specs or comments. Personal targets are read from `settings` at run time.
- Football never writes to a Health table other than its own `fb*` tables.
- Football never asks for an extra log, and never rewards eating less: below the calorie floor always scores lower than inside the range.
- Never read the time a log was made or the time the day was closed. The one exception is Today's card, which switches to its half-time view at 18:00; that changes the display, never the match.
- No water anywhere.
- Every random number comes from the seeded generator. Results are stored at kick-off and only replayed.
- Accessibility floor at 360 px:
  - nothing meaningful under 14 px
  - targets at least 44 px
  - never colour alone
  - no text collisions and no horizontal scroll
- No reduced-motion or battery-saver branches.
- No sound. Haptics only, through `navigator.vibrate`, behind the "Buzz on goals" setting.
- Gold (`#f2c46d`) is only for records, finals and trophies. The one-night patch is cream `#f3e7d3`.
- Result colours: W `#5fd38a`, D `#ffd34d`, L `#ff6464`, always with the letter.
- Axis colours: Pace `#6fb8ff`, Power `#ff8a5c`, Fuel `#ffd36b`, Rest `#b49bff`, Routine `#4fd1c5`, Shape `#ff7ab8`.
- Tier colours: Crown `#e7d7ff`, Two `#a98bff`, Three `#6fb8ff`, Four `#4fd1c5`, Five `#9fd8a8`, Six `#ffa25c`.
- Brabo United colours: orange `#ff7a1a`, purple `#6c3fc4`, black `#141414`.
- No pronouns for youngsters or the owner. Use "they" or the name.
- Never push, open a PR or merge without the owner's word.

## Review Focus

1. **A brand-new install with no Health history.** Every axis plays at 10 marked "no data". Old Selves fill only from months that exist; missing slots get stand-in clubs. The first run never crashes on empty tables. Tests: Task 1.3 (`no-data`), Task 1.14 (`old selves with no history`), Task 2.7 (first-run render with empty db).
2. **The app not opened for many days, or the clock jumping** (time zone, phone date changed back). Catch-up plays every missed day exactly once, in order, capped at 42. A date earlier than the last played day plays nothing. Test: Task 1.12 (`catch-up idempotent`, `clock goes backwards`).
3. **Restoring an old backup** (no `fb*` tables) or a backup taken mid-season. Restore must leave Football valid, either reset to first run or resumed. Test: Task 1.13 (`restore without football tables`).
4. **The day is closed, reopened, edited, then closed again.** Kick-off happens once per date; later closes do nothing. Test: Task 1.12 (`second close is a no-op`).
5. **Any promise only the production build can keep:** the new `#/football` routes work offline from the installed PWA, and the stored match replays with the network off. Step: Task 5.8 runs `npm run build && npm run preview`, loads `#/football`, goes offline and reloads.

---

## File map

```
src/football/
  rng.ts                 seeded PRNG (mulberry32) + hash
  axes.ts                benchmarks: day data -> six real values (§6)
  ratings.ts             tier-relative ratings (§6.3)
  radar.ts               geometry: radii, polygon, inside, coverage
  engine.ts              one match -> MatchEvents (§7)
  opponent.ts            league rating -> reach and shrinks (§7.4)
  otherMatches.ts        Poisson results for non-Brabo fixtures (§7.5)
  calendar.ts            42-day season layout, events between seasons (§9)
  table.ts               standings, sort, form
  promotion.ts           up, playoffs, down, fold (§9.1)
  cups.ts                Big Cup, tier cups, Underdog Shield, brackets
  events.ts              event rotation + World Cup (§9.4)
  squad.ts               squad, armband, stack, abilities, awakening (§8.1–8.2)
  discipline.ts          physio and cards (§8.3), day status rotation (§8.4)
  contracts.ts           contracts, youth, trading (§8.5)
  money.ts               budget, sponsors, offers (§8.6)
  rivals.ts              rival birth, fade, modifiers (§8.7)
  kits.ts                kit catalogue + choices (§8.8)
  ground.ts              tenancy, bundles, quarter (§8.9)
  world.ts               world events, rating drift (§8.10)
  news.ts                line bank picker, no-repeat (§8.10)
  oldSelves.ts           month -> club (§8.11)
  types.ts               shared football types
  data/league.json       generated club data (public part)
  data/lines.json        back page, studio, press bank
  data/abilities.json    ability catalogue
  data/load.ts           typed loaders + private youth merge
  art/crest.ts           crest steps 1a–5e, kit-of-parts, real outlines -> SVG string
  art/kit.ts             kit drawing -> SVG string
  store/tables.ts        fb* table row types
  store/play.ts          kickOff, playDue, catchUp (the only writer)
  store/save.ts          first run, settings, choices
  store/hooks.ts         useFootball* live queries
src/screens/football/   React screens (Parts 2–5)
src/styles/football.css aurora outline styles
scripts/football-data.mjs  league.json -> data/league.json + private/football-youth.json
tests/football/*.test.ts(x)
```

**Shared types (Task 1.1 creates them; every later task uses these names):**

```ts
export type Axis = 'Pace' | 'Power' | 'Fuel' | 'Rest' | 'Routine' | 'Shape';
export const AXES: Axis[] = ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape'];
export type Side = 'atk' | 'def';
export type AxisValues = Record<Axis, number>;              // 1–20
export type AxisFlags = Partial<Record<Axis, 'no-data' | 'not-logged'>>;
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;                    // 1 = Crown League
export type Comp = 'league' | 'bigcup' | 'tiercup' | 'playoff' | 'event' | 'worldcup' | 'friendly';
export type Result = 'W' | 'D' | 'L';
export interface Mod { axis: Axis; d: number; why: string; kind: 'type' | 'captain' | 'sub' | 'opp' | 'hidden' | 'rival' | 'tired' | 'stack' | 'knock' | 'card' }
export interface ChanceEvent { minute: number; side: Side; type: string; mods: Mod[]; values: AxisValues; reach: number | null; pct: number; land: [number, number]; ok: boolean; retake?: { land: [number, number]; ok: boolean; why: string }; glDist: number | null; tag?: 'SCREAMER' | 'HEARTBREAK' | 'WONDER SAVE' }
export interface MatchEvents { seed: number; chances: ChanceEvent[]; score: [number, number]; xg: [number, number]; moments: string[]; revealed?: string }
```

---

# Part 1 — Core (pure logic, no screens)

### Task 1.1: Types, seeded RNG and radar geometry

**Files:**
- Create: `src/football/types.ts`, `src/football/rng.ts`, `src/football/radar.ts`
- Test: `tests/football/radar.test.ts`

**Interfaces:**
- Produces:
  - the shared types above
  - `hashSeed(...parts: string[]): number`
  - `rng(seed: number): () => number` (mulberry32, returns values in [0, 1))
  - `radii(v: AxisValues, side: Side): number[]` (value ÷ 20; unlit axes × 0.7 attack or × 0.75 defence; clamped to 0.03–1)
  - `polygon(rs: number[]): [number, number][]` (unit circle, axis 0 at the top, clockwise)
  - `inside(p, poly): boolean`
  - `hexagon(r: number)`
  - `coverage(region, shape): number` (fraction of the region inside the shape, 0.01 grid)
  - `edgeDistance(p, poly): number`
  - `LIT: Record<Side, Axis[]>`, where `atk = Pace, Power, Fuel` and `def = Rest, Routine, Shape`

- [ ] **Step 1: Write failing tests:**
  - `rng(hashSeed('2026-11-06','bra','hul'))` yields the same first five numbers twice
  - `hashSeed` differs for swapped club order
  - a value of 20 gives radius 1 on lit axes and 0.7 on unlit axes in attack
  - `coverage(hexagon(1), polygon(Array(6).fill(1))) ≈ 1` (±0.01)
  - `coverage(hexagon(1), polygon(Array(6).fill(0.5))) ≈ 0.25` (±0.02)
  - `inside([0,0], polygon(Array(6).fill(.5)))` is true
  - `edgeDistance` of a point on an edge is 0
- [ ] **Step 2:** Run `npx vitest run tests/football/radar.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the three files. Coverage is a grid count over the region's bounding box, as in `b5_engine.js` `cover()`, but in unit space.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit `feat(football): types, seeded rng and radar geometry`.

### Task 1.2: Data import script and loaders

**Files:**
- Create: `scripts/football-data.mjs`, `src/football/data/league.json` (generated), `src/football/data/load.ts`
- Test: `tests/football/data.test.ts`

**Interfaces:**
- Produces:
  - `CLUBS: ClubDef[]`, where `ClubDef = { id, name, short, colours: string[], tier: Tier, rating: number, style: string, kind: 'own'|'real'|'quirky'|'old', elite: boolean, ground: string, city: string, country: string, crest: string, shirt: string, kitMaker: string, known: AbilityDef[], hidden?: AbilityDef, data?: boolean, lore: string, shrinks: Partial<AxisValues>, presses: Partial<AxisValues> }`
  - `AbilityDef = { name: string; text: string; effect: string }`
  - `YOUTH_POOL: YouthDef[]`, the habit entries plus private exercise entries when `private/football-youth.json` exists (read through `import.meta.glob('/private/football-youth.json', { eager: true })`, which resolves to empty when the file is missing)
  - `clubById(id): ClubDef`

- [ ] **Step 1: Write failing tests:**
  - 108 clubs, with 18 in each tier
  - exactly one `kind:'own'` with id `bra` in tier 6
  - 40 real clubs and 60 quirky clubs
  - every club has the six-axis `shrinks` and `presses` keys only from `AXES`
  - no club text contains "Water", "Engine", "Spark" or "Recovery"
  - `YOUTH_POOL` contains no entry with `kind:'exercise'` when the private file is absent, which is the CI case
  - **privacy:** `JSON.stringify(league.json)` contains no ` kg`, no `knee`, and no `physio first`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Write `scripts/football-data.mjs <path-to-league.json>`:
  - map `engine.shrinks_attack` and `engine.presses_defence` to `shrinks` and `presses`
  - copy `known` and `hidden`
  - drop the `axes` note and replace it with the board 13 mapping text
  - write youth entries with `kind:'exercise'` to `private/football-youth.json`, and the rest to `src/football/data/league.json`, together with styles, sponsors, kit makers, income, cup money, sponsor rules, world events, contract rules and old-self rules

  Then run it once against `~/Downloads/claude code/Football shared/league/league.json`.
- [ ] **Step 4:** Implement `load.ts`. Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit `feat(football): league data import and loaders` (the private file stays untracked; check with `git status`).

### Task 1.3: Axis benchmarks (§6.1–6.2)

**Files:**
- Create: `src/football/axes.ts`, `docs/superpowers/notes/2026-11-06-football-benchmarks.md`
- Test: `tests/football/axes.test.ts`

**Interfaces:**
- Consumes: `Day`, `Targets`, `FoodEntry`, `TrainingSession`, `Measurement`, `ChecklistItem` from `src/domain/types.ts`; `totalsFor(day, entries)` from `src/domain/rings.ts`.
- Produces:
  - `type AxisInput = { date: DayKey; day?: Day; entries: FoodEntry[]; sessions: TrainingSession[]; weekSessions: TrainingSession[]; targets: Targets; checklist: ChecklistItem[]; last7: Day[]; waistLogged7: boolean; trendTowardGoal: boolean; historyDays: Record<Axis, number> }`
  - `axisValues(i: AxisInput): { values: AxisValues; flags: AxisFlags }`
  - `paceFromSteps(steps: number): number`
  - `restFromSleep(hours: number, rested?: number): number`
  - `fuelScore(kcal: number, protein: number, t: Targets): number`
  - `powerFromTraining(...)`
  - `routineFromShare(share: number): number`
  - `shapeFromLogs(weighIns: number, waist: boolean, trend: boolean): number`
  - the benchmark tables exported as `PACE_PTS`, `REST_PTS`, `ROUTINE_PTS`

- [ ] **Step 1: The benchmark research pass.** As the owner asked, check each row of §6.2 against published ranges. Steps: Tudor-Locke's activity bands. Sleep: the AASM/NSF 7–9 h adult recommendation. Fuel: the protein-target convention only, never body numbers. Write the sources and any change to the notes file. A row changes only if a source contradicts it; record each change as `Ruling:` in the ledger.
- [ ] **Step 2: Write failing tests with the spec's values:**
  - `paceFromSteps`:

    | Steps | 0 | 2000 | 10000 | 15000 | 18000 | 20000 | 30000 | 9000 |
    |---|---|---|---|---|---|---|---|---|
    | Value | 1 | 3 | 12 | 16 | 19 | 20 | 20 | 11 (linear) |

  - `restFromSleep(4)` is 4, `(7)` is 13, `(7,5)` is 15, `(9,1)` is 16, `(10)` is 18
  - **the food rule:** take `t = {kcalMin:2000,kcalMax:2300,proteinG:140}` with protein 140 in every case:

    | Calories | 2100 | 1700 | 2400 | 2600 |
    |---|---|---|---|---|
    | Fuel | 20 | 14 | 16 | 12 |

    and `fuelScore(1700, …)` must be less than `fuelScore(2100, …)`
  - `routineFromShare` gives 3 at 0, 10 at 0.5, 15 at 0.8 and 19 at 1
  - `shapeFromLogs(5, true, true)` is 18.5, rounded to 19 by `axisValues`; `(0, false, false)` is 6
  - Power, with `sessionsPerWeek` 4 and Wednesday as the 3rd day of the week:

    | Day | Value |
    |---|---|
    | session done | 16 |
    | short session | 11 |
    | second session the same day | 18 |
    | no session with 2 done by Wednesday | 13 (on pace) |
    | no session with 0 done by Wednesday | 4 |

  - `no-data`: `historyDays.Pace` of 3 gives 10 with flag `'no-data'`
  - `not-logged`: no `steps` on a day with history gives 5 with flag `'not-logged'`
  - medicine items (`item.med`) are excluded from the Routine share
- [ ] **Step 3:** Run the tests. Expected: FAIL.
- [ ] **Step 4:** Implement. Interpolation is linear between points and every output is rounded and clamped to 1–20. "On pace" means `doneThisWeek >= round(sessionsPerWeek * dayIndexMon1to7 / 7)`. Medicines are excluded from Routine through `item.med`.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat(football): axis benchmarks`.

### Task 1.4: Tier-relative ratings (§6.3)

**Files:**
- Create: `src/football/ratings.ts`
- Test: `tests/football/ratings.test.ts`

**Interfaces:**
- Produces:
  - `TIER_AVG: Record<Tier, number> = {6:7,5:9,4:11,3:13,2:15.5,1:18}`
  - `shownRating(real: number, tier: Tier): number`
  - `band(v: number): 1|2|3|4` (1–5, 6–10, 11–15, 16–20)

- [ ] **Step 1: Failing tests:**
  - `shownRating(12, 6)` is 20 (clamped)
  - `shownRating(9, 5)` is 10
  - `shownRating(9, 6) - shownRating(9, 5)` is 4
  - `shownRating(18, 1)` is 10
  - `band(5)` is 1, `band(6)` is 2, `band(16)` is 4
- [ ] **Step 2:** Run. FAIL.
- [ ] **Step 3:** Implement. Run. PASS.
- [ ] **Step 4:** Commit `feat(football): tier-relative ratings`.

### Task 1.5: Opponent modifiers (§7.4)

**Files:**
- Create: `src/football/opponent.ts`
- Test: `tests/football/opponent.test.ts`

**Interfaces:**
- Consumes: `ClubDef`.
- Produces: `opponentFor(club: ClubDef, extra?: { rival?: RivalMod; derby?: boolean }): { reach: number; shrinks: Partial<AxisValues>; presses: Partial<AxisValues>; abilities: AbilityDef[] }`. The reach is `0.40 + 0.005 × rating`, clamped to 0.4–0.92. Shrinks and presses come straight from the data. A derby adds +1 to every shrink and press (from the `league.md` world event "Derby day").

- [ ] **Step 1: Failing tests:**
  - the Bayern fixture (rating 96) has reach 0.88
  - a club with rating 40 has reach 0.6
  - a derby adds −1 to each listed shrink
- [ ] **Step 2:** Run. FAIL. Implement. Run. PASS.
- [ ] **Step 3:** Commit `feat(football): opponent modifiers`.

### Task 1.6: The match engine (§7.2–7.3)

**Files:**
- Create: `src/football/engine.ts`
- Test: `tests/football/engine.test.ts`

**Interfaces:**
- Consumes: Tasks 1.1 and 1.5.
- Produces:
  - `type MatchInput = { seed: number; values: AxisValues; opp: ReturnType<typeof opponentFor>; captain?: Axis; stack: number[]; abilities: string[]; bench: { axis: Axis; plus: number }[]; knocks: Mod[]; rival?: RivalMod; home: boolean }`
  - `playMatch(m: MatchInput): MatchEvents`
  - `chanceCount(atkAvg, coin) → total`
  - `splitChances(total, atkAvg, reach) → yours`

- [ ] **Step 1: Failing tests** (all with made-up values):
  - **Determinism:** `playMatch(x)` deep-equals `playMatch(x)`, and a different seed gives a different `land`.
  - **Counts:**
    - `chanceCount(10, 0)` is 5
    - `chanceCount(18, 1)` is 8
    - `chanceCount(30, 1)` is 8 (clamped)
    - `splitChances(5, 13, 0.75)` is 2 or 3 and always leaves at least 2 for each side
  - **Minutes:** every `minute` is in 3–89, distinct and sorted.
  - **Modifier order:** in an attacking chance, the mods appear as `type`, `captain`, `sub`, `opp`, `hidden`/`rival`, `tired`, `stack`.
  - **Tiredness:** a chance at minute 80 with Rest 14 has a `tired` −1 on each lit axis; with Rest 15 it has none.
  - **Stack cap:** the stack never lifts `pct` by more than 15 points over the pre-stack value.
  - **Second wind:** a missed attacking chance with `pct >= 30` retakes once per match when the ability is in `abilities`.
  - **Tags:**
    - `pct <= 20 && ok` on attack → SCREAMER
    - `pct >= 70 && !ok` on attack → HEARTBREAK
    - `pct <= 25 && ok` on defence → WONDER SAVE
  - **Goal-line:** `glDist` is set when `edgeDistance(land, shape) < 7/112`, and is null otherwise.
  - **Score:** the score equals the count of attacking `ok` against defending `!ok`.
  - **Moments:** HEARTBREAK, SCREAMER, WONDER SAVE and conceding at 70% or more each push a moment string.
- [ ] **Step 2:** Run. FAIL.
- [ ] **Step 3: Implement:**
  - port `chance()` and `match()` from `b5_engine.js`, with no DOM and the injected RNG
  - attack landing: uniform over `hexagon(1)`; defence landing: uniform over `hexagon(reach)`; both by rejection sampling with the RNG
  - `pct` is `coverage(region, shape)`
  - xG is the sum of `pct` for each side
- [ ] **Step 4:** Run. PASS.
- [ ] **Step 5:** Commit `feat(football): seeded match engine`.

### Task 1.7: Odds calibration (§7.4)

**Files:**
- Modify: `src/football/opponent.ts` (one tuning constant `MOD_SCALE`, default 1)
- Test: `tests/football/odds.test.ts`

- [ ] **Step 1: Failing simulation tests.** Each case runs 10,000 seeds, using the typical real values from §6.2: Six 8, Five 10, Four 12, Three 14, Two 16, Crown 18 on every axis.
  - a Division Five side (values 10) against a Division Four club (rating 56): the weaker side wins 28–38% of the time
  - Division Six values (8) against Bayern: wins 1–3%
  - Crown values (18) against a Crown club rated 85: the opponent loses 9–16%
- [ ] **Step 2:** Run. Record the rates in the ledger.
- [ ] **Step 3:** Tune `MOD_SCALE`, and if needed the tier-band typical values, until all three bands pass. Record each change as `Ruling:` in the ledger.
- [ ] **Step 4:** Run. PASS.
- [ ] **Step 5:** Commit `feat(football): calibrate odds`.

### Task 1.8: Other clubs' matches (§7.5)

**Files:**
- Create: `src/football/otherMatches.ts`
- Test: `tests/football/other.test.ts`

**Interfaces:**
- Produces: `simResult(home: {rating:number}, away: {rating:number}, r: () => number, homeAdv = 3): [number, number]`. Each side's goals are drawn from a Poisson distribution with mean `1.35 * exp((ra - rb ± homeAdv) / 25)`, clamped to 0.2–4.

- [ ] **Step 1: Failing tests:**
  - deterministic for a given RNG
  - over 5,000 games between equal clubs, home wins land in 40–50% and draws in 22–30%
  - a club rated 90 beats a club rated 40 in at least 85% of games
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): results for the rest of the world`.

### Task 1.9: Season calendar, cups and events (§9)

**Files:**
- Create: `src/football/calendar.ts`, `src/football/cups.ts`, `src/football/events.ts`
- Test: `tests/football/calendar.test.ts`, `tests/football/cups.test.ts`

**Interfaces:**
- Produces:
  - `type DayPlan = { day: number; kind: 'league'|'bigcup'|'tiercup'|'finals1'|'finals2'|'event'; matchday?: number; round?: string; double?: boolean; window?: boolean }`
  - `seasonDays(): DayPlan[]` (42 days)
  - `between(seasonNo: number, rotation: EventState): DayPlan[]`
  - `leagueFixtures(clubIds: string[], seed: number): [string, string][][]` (34 rounds, double round robin)
  - `drawBigCup(ids, tiers, r)`, `advance(bracket, results)`, `bracketFrom16(bracket)`
  - `nextEvent(state: EventState, r): { id: EventId; days: number }`
  - `worldCup(nations: NationDef[], r)`: groups of three, two days, then the last 32 down to the final
  - `calledUp(avg28: number, nationStrength: number): boolean`

- [ ] **Step 1: Failing tests:**
  - `seasonDays()` has 34 league days, 4 Big Cup days and 2 tier-cup days; day 41 is `finals1`, day 42 is `finals2`; days 21–23 have `window: true`; cup days fall every 5 ± 1 days
  - `leagueFixtures` over 18 clubs gives 34 rounds of 9, every pair meets home and away, and no club plays twice in a round
  - the Big Cup: tiers 3–6 enter in round 1, tiers 1–2 at the last 32, and the bracket from the last 16 has 16 slots
  - events: the World Cup and the Continental Nations Cup each come every fourth season, offset by 2; invented events don't repeat until all 12 have run; the Super Cup lasts 1 day and the World Cup 7
  - the World Cup has 48 nations in 16 groups of 3; group day 1 is a double-header; two go through from each group; then 5 knockout days
  - **No rest days:** `between()` returns only event days, and Season 2 day 1 follows the last event day with no gap
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): season calendar, cups and events`.

### Task 1.10: Table, promotion and relegation (§9.1)

**Files:**
- Create: `src/football/table.ts`, `src/football/promotion.ts`
- Test: `tests/football/table.test.ts`

**Interfaces:**
- Produces:
  - `type Row = { id; p; w; d; l; gf; ga; pts; form: Result[] }`
  - `standings(results: {home;away;score:[number,number]}[], ids): Row[]` (sorted by points, goal difference, goals for, then id)
  - `seasonEnd(tables: Record<Tier, Row[]>, playoffWinners: Record<Tier, string>): { up: Record<Tier,string[]>; down: Record<Tier,string[]>; folded?: string }`
  - `playoffPairs(table): [[3,6],[4,5]]`

- [ ] **Step 1: Failing tests:**
  - sort order with a points tie broken by goal difference
  - form keeps the last five results
  - the top two go up, plus the playoff winner; the bottom three go down
  - tier 1 has no promotion and tier 6 has no relegation
  - after `seasonEnd` every tier still has 18 clubs
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): tables and promotion`.

### Task 1.11: Squad, discipline, contracts, rivals, Old Selves, world drift (§8)

**Files:**
- Create: `src/football/squad.ts`, `discipline.ts`, `contracts.ts`, `rivals.ts`, `oldSelves.ts`, `world.ts`, `money.ts`
- Test: one test file per module in `tests/football/`

**Interfaces:**
- Produces:
  - **`squad.ts`:**
    - `HABITS: { id: 'steps'|'training'|'food'|'sleep'|'checklist'|'body'; axis: Axis; label: string }[]`
    - `armbandHarmony(captains: Axis[]): boolean` (the last four weeks hold four distinct captains, and the same captain two weeks running resets the count)
    - `stackStep(chanceBefore, chanceAfter): number` (the per-ability lift ladder, 1, .75, .5, .25, capped at 15 points)
    - `awakens(avg28Prev: number, avg28Now: number): 11|16|18|null`
  - **`discipline.ts`:**
    - `physio(medDays: { date; allTaken: boolean }[], physioRoom: boolean): Mod[]` (one missed day → knock, −2 Rest next match; two in a row → injury, −4 Rest for 2 matches; three with the room)
    - `cards(nightOuts: DayKey[], date): { yellow: boolean; red: boolean }` (two within 14 days → red, Rest at half)
    - `rotationShape(last28: AxisValues[]): AxisValues` (median − 2, clamped to 1–20)
    - `usesRotation(status?: Status): boolean` (true for sick, injured, break and occasion)
  - **`contracts.ts`:**
    - `contractCheck(keptDays: number, days: number): 'renew'|'run-down'` (renew at 5 or more in 7 on average)
    - `weightAfterRenew(w): number` (+5%, capped at 1.15)
    - `youthStatus(logged: number, seasonOver: boolean): 'promoted'|'growing'|'leaves'` (promoted at 12, leaves under 4)
    - `youthBonus(stars: 3|4|5): number` (1, 1.5, 2)
    - `tradeHabit(...)`
  - **`rivals.ts`:**
    - `type RivalMod = { id: string; name: string; text: string; mods: (minute: number, side: Side, autoPlayed: boolean) => Mod[] }`
    - `RIVAL_MODS` (at least 6, including "Giant's hand", "Bad blood", "In step" and "Night shift")
    - `rivalBorn(history, match): { clubId; how } | null` (a big night, three running, or at 4 am)
    - `fades(record): boolean` (five Brabo wins in a row)
    - the cap of 3 earned rivals plus Antigoon
  - **`oldSelves.ts`:** `oldSelfFrom(month: string, values: AxisValues[]): ClubDef` (name "AFC <Month Year>", rating from the average radar onto the tier bands, "Familiar" hidden ability, colours from the best axis), and `fillSlots(months, slots = 7)`
  - **`world.ts`:** `worldTurn(clubs, r): { changes: RatingChange[]; headlines: Headline[] }`, using the event rates from data
  - **`money.ts`:** `incomeFor(tier, capacity, results)`, `offers(slot, tier, r): Offer[]`, and `dodgyCollapse(r)` (1 in 4 a season)

- [ ] **Step 1: Failing tests, one per rule above,** using the spec's numbers:
  - two missed medicine days in a row give −4 Rest for 2 matches; with the physio room it takes three
  - a night out on day 1 and another on day 10 gives a red; days 1 and 16 do not
  - the rotation shape is the median minus 2
  - a habit kept 5 of 7 renews and 4 of 7 runs down
  - weight after six renewals is 1.15
  - youngsters: 12 logged days means promoted, 3 at season end means leaves
  - rivals: a fourth earned rival is refused, and five wins in a row fades one
  - an Old Self built from a month of 18s lands in tier 1 or 2
  - with no months, `fillSlots` returns 7 stand-in clubs
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): squad, discipline, contracts, rivals, old selves, world, money`.

### Task 1.12: Store tables and the play loop

**Files:**
- Create: `src/football/store/tables.ts`, `src/football/store/play.ts`
- Modify:
  - `src/db/db.ts`: add `version(9).stores({ fbSave: 'id', fbClubs: 'id, tier', fbMatches: 'id, date, season, comp', fbSeasons: 'id', fbSquad: 'id', fbNews: 'id, date, kind', fbBundles: 'id' })`, the table fields, and the 7 names in `TABLES`
  - `src/db/actions.ts` `closeDay`: after the patch, when `done`, call `void kickOff(date)`
- Test: `tests/football/play.test.ts`

**Interfaces:**
- Consumes: everything in Part 1.
- Produces:
  - `kickOff(date: DayKey): Promise<StoredMatch[]>` (plays every unplayed day up to and including `date`, in order)
  - `playDue(now = Date.now()): Promise<StoredMatch[]>` (plays any day before today's logging day that was never played; this is the 4 am rule, using `dayOfLogging`)
  - `type StoredMatch = { id: string; date: DayKey; season: number; day: number; comp: Comp; home: string; away: string; values: AxisValues; flags: AxisFlags; events: MatchEvents; result: Result; watched: boolean; rotation: boolean; auto: boolean }`
  - `gatherInput(date): Promise<AxisInput>` (reads Health tables only)

- [ ] **Step 1: Failing tests** (fake-indexeddb, with a made-up settings and days fixture):
  - closing a day stores exactly one match for that date
  - closing it again adds nothing (second close is a no-op)
  - `playDue` on a date three days later plays the 3 missed days once each, marked `auto:true`
  - **catch-up idempotent:** running `playDue` twice adds nothing
  - **clock goes backwards:** a date before the last played date plays nothing
  - the cap is 42 days of catch-up
  - a later edit to the day's steps after kick-off leaves the stored match unchanged
  - a sick status gives `rotation:true` and uses `rotationShape`
  - other clubs' results for that day are stored, all 108 clubs played
  - no football module imports `db` other than `store/*` (checked with a grep in the test)
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Run the full suite `npm test`. Expected: all green, no older test broken by the version 9 change.
- [ ] **Step 4:** Commit `feat(football): tables, kick-off and the 4 am rule`.

### Task 1.13: Save, first-run state, backup and export

**Files:**
- Create: `src/football/store/save.ts`
- Modify: `src/export/workbook.ts` (the Matches sheet), `src/db/backup.ts` if restore needs a missing-table default
- Test: `tests/football/save.test.ts`

**Interfaces:**
- Produces:
  - `foundClub(date, choices: { shirt: string; crest: '1a'|'1b'|'1c'|'1d'|'1e' }): Promise<void>` (seeds `fbClubs` from data, builds Old Selves, sets Season 1 day 1)
  - `getSave()`
  - `setFbSetting(k: 'buzz'|'wcCountry'|'ownSponsor', v)`
  - `resetFootball()`
  - the workbook gets a sheet named `Matches` with the columns Date, Season, Matchday, Competition, Opponent, Home/Away, Score, Result, Pace, Power, Fuel, Rest, Routine, Shape

- [ ] **Step 1: Failing tests:**
  - `foundClub` creates 108 clubs, Brabo in tier 6, and the save at season 1 day 1
  - **restore without football tables:** restoring an older backup leaves `getSave()` undefined, so the first run shows; no throw
  - the backup round-trip keeps `fbMatches`
  - the workbook has a `Matches` sheet with those 14 headers
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): save, first run state, backup and export`.

### Task 1.14: News and the line bank

**Files:**
- Create: `src/football/news.ts`, `src/football/data/lines.json`, `src/football/data/abilities.json`
- Test: `tests/football/news.test.ts`

**Interfaces:**
- Produces:
  - `pickLine(kind: 'back'|'studio'|'press', facts: Facts, used: {id:string; date:DayKey}[], r): { id; text }`
  - `fill(template, facts)` (placeholders `{club}`, `{score}`, `{minute}`, `{pct}`, `{streak}`, `{axis}`, `{opp}`, `{tier}`)
  - `ABILITIES` (at least 12, each `{ id, name, from: MomentKind, effect: { axis, d, when } }`)

- [ ] **Step 1: Write the content:**
  - at least 400 back-page lines, 150 studio exchanges (three lines each: gremlin, pundit, gremlin), and 60 press questions with three joke answers and a headline each
  - every press answer is a joke; none is mundane
  - lines are grouped by situation: win, loss, draw, screamer, heartbreak, rival, promotion, relegation, streak, cup, world, old self, 4 am, rotation
  - no religious, astrological or India-coded content; no personal values
- [ ] **Step 2: Failing tests:**
  - the counts above
  - no template id repeats within 30 days of use, over a 120-day simulation
  - every placeholder used is in the facts list
  - every press item has exactly 3 answers and 3 headlines
  - every ability axis is in `AXES`
- [ ] **Step 3:** FAIL. Implement. PASS.
- [ ] **Step 4:** Commit `feat(football): news, cast lines and abilities`.

**Part 1 exit:** `npm test` and `npm run typecheck` both green. Mark Part 1 done in the ledger.

---

# Part 2 — The tab and the match

### Task 2.1: Styles and art ports

**Files:**
- Create: `src/styles/football.css` (the aurora field, the glow outlines, the `.fb-*` classes ported from `b7`–`b13` CSS), `src/football/art/crest.ts`, `src/football/art/kit.ts`
- Test: `tests/football/art.test.ts`

**Interfaces:**
- Produces:
  - `crestSvg(step: 1|2|3|4|5, opt: 'a'|'b'|'c'|'d'|'e', size: number): string` (ported from `build_kcs3/4` `crest()`, matching `mockups/crests/*.svg`)
  - `kitCrest(shape, sym, colour, size)` (b11 `mk`)
  - `realCrest(id, size)` (b11 `REAL`, extended to all 40 real clubs as simplified outlines)
  - `clubCrest(club: ClubDef, size)` (real → `realCrest`, quirky or old → `kitCrest`, own → the chosen step)
  - `kitSvg(kit: KitDef, view: 'front'|'back', size, patch?: {text:string})` (ported from `build_kcs3.kit`, with the patch at (100, 82) between the badges and the sponsor, in cream)

- [ ] **Step 1: Failing tests:**
  - every one of the 108 clubs returns an SVG string with a `viewBox`
  - `crestSvg(1,'a',64)` contains the turret path from `crests/1a.svg`
  - a kit with a patch contains `cx="100" cy="82"` and the colour `#f3e7d3`
  - every `realCrest` has `aria-hidden`
- [ ] **Step 2:** FAIL. Port. PASS.
- [ ] **Step 3:** Commit `feat(football): aurora styles, crests and kits`.

### Task 2.2: Tab bar A and routes

**Files:**
- Modify:
  - `src/ui/TabBar.tsx`: tabs Today, Train, Football (centre), Walk, You; the Football tab is a crest ring with the label "Football"
  - `src/ui/Icon.tsx` if needed
  - `src/App.tsx`: routes `/football`, `/football/club`, `/football/league`, `/football/story`, `/football/match`, `/football/player`, `/football/club-page`, `/football/cups`, `/football/settings`, all with `tab: 'football'`
  - `src/styles/app.css`: the floating plus `.fab-plus` (56 px, bottom right above the bar)
  - `src/screens/today/TodayDrawer.tsx` (or `TodayLayout`): the plus docks beside the handle on Today
- Create: `src/screens/football/FootballHome.tsx` (the four top tabs Tonight, Club, League, Story, as a segmented control with 44 px targets)
- Test: `tests/football/tabbar.test.tsx`

- [ ] **Step 1: Failing tests (render):**
  - the bar has 5 links in the order Today, Train, Football, Walk, You
  - the plus is not inside the bar
  - on `/today` the plus renders inside the handle row; on `/walk` it renders as the fixed corner button
  - the Football home renders 4 segment buttons
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Browser check at 360×780 on `#/today` and `#/walk`: the plus and the handle don't overlap (bounding boxes), and every bar target is at least 44 px. Screenshot.
- [ ] **Step 4:** Commit `feat(football): tab bar with Football in the centre`.

### Task 2.3: Tonight

**Files:**
- Create: `src/screens/football/Tonight.tsx`, `src/screens/football/Radar.tsx` (the breathing two-layer radar, with labels in band colours and the [C] marker), `src/football/store/hooks.ts` (`useSave()`, `useTonight()`, `useMatches(range)`)
- Test: `tests/football/tonight.test.tsx`

**Interfaces:**
- Produces: `<Radar values flags side reach? captain? size />` and `useTonight(): { fixture; opp: ClubDef; liveValues: AxisValues; flags; known: AbilityDef[]; hiddenNote: boolean; stack; knocks; next } | undefined`

- [ ] **Step 1: Failing tests:**
  - with a fixture, Tonight shows "Matchday N of 42", both club names, six axis labels with values, and "One ability, found out after you first play them" for an unmet quirky club
  - after the match it shows the result card
- [ ] **Step 2:** FAIL. Implement, matching board 8 Tonight and board 13 home B. PASS.
- [ ] **Step 3:** Commit `feat(football): Tonight`.

### Task 2.4: The match screen

**Files:**
- Create: `src/screens/football/Match.tsx`, `src/screens/football/match/Replay.ts` (a timeline driver over `ChanceEvent[]`), `match/Shockwave.tsx` (the five kinds, cycling), `match/Save.tsx` (the glove lands on the ball and deflects it), `match/GoalLine.tsx`, `match/AbilityBanner.tsx`, `match/Takeover.tsx`, `match/Bookends.tsx`
- Test: `tests/football/replay.test.ts`

**Interfaces:**
- Consumes: `StoredMatch`.
- Produces:
  - `timeline(events: MatchEvents, big: boolean): Step[]` (each step has `{ at: ms; kind: 'phase'|'mod'|'pct'|'fly'|'goalline'|'result'|'banner'|'feed'; data }`)
  - total length ≤ 180,000 ms, and ≤ 90,000 ms on a normal night with 6 chances
  - `skipToEnd(): FinalState`

- [ ] **Step 1: Failing tests:**
  - **length:** 8 chances on a big night stay under 180 s; 6 chances on a normal night stay under 90 s
  - **content:** every chance produces phase → mods → pct → fly → result in that order
  - goal-line steps appear only when `glDist` is set
  - a retake produces a banner that says "Chance 2 of 2"
  - **big goals:** takeover kinds appear for SCREAMER and for every goal on big nights (derby, final, last day, promotion or relegation goals)
  - the shockwave kind cycles through 5 kinds in order across a match's goals
  - `skipToEnd` gives the stored score
- [ ] **Step 2:** FAIL. Implement the driver. Port the visuals from `b5_engine.js`, `b8_cycle.js`, `b9_moment.js`, `b10_moment.js` and `b11_ab.js` into React components driven by the timeline. Haptics come from `navigator.vibrate([60,40,120])` on a goal and `80` when conceding, only when `save.buzz`. PASS.
- [ ] **Step 3:** Browser check at 360 px: a full match plays, skip works, the takeover covers the screen, and there is no text collision during the replay (probe mid-replay). Screenshot each kind.
- [ ] **Step 4:** Commit `feat(football): the match screen`.

### Task 2.5: Full time, the studio and the press conference

**Files:**
- Create: `src/screens/football/FullTime.tsx`, `Studio.tsx` (the redrawn gremlin and pundit SVGs from `b13_mocks.py` `GREM13`/`PUND13`), `Press.tsx`
- Modify: `src/football/store/save.ts` (`answerPress(matchId, i)` stores the headline for tomorrow's back page)
- Test: `tests/football/fulltime.test.tsx`

- [ ] **Step 1: Failing tests:**
  - full time lists the score, xG, moments and the "Found out" ability once
  - the studio shows exactly 3 lines
  - pressing an answer stores a news item dated the next day with that answer's headline
  - the press screen shows 3 answer buttons, each at least 44 px tall
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): full time, studio and press`.

### Task 2.6: Today's card and the Close the day handover

**Files:**
- Create: `src/screens/today/FootballCard.tsx`
- Modify: `src/screens/today/TodayLayout.tsx` (place the card once), `src/screens/CloseDay.tsx` (the last screen gets the kick-off card with "Watch now" and "Later")
- Test: `tests/football/today-card.test.tsx`

**Interfaces:**
- Produces: `footballCardState(now: number, last?: StoredMatch, tonight?: Fixture): 'sealed'|'halftime'|'evening'|'none'`. It is `sealed` until the last match is watched or until 18:00, `halftime` from 18:00, and `evening` after the day is closed but before the match is watched. `none` before the first run.

- [ ] **Step 1: Failing tests:**
  - at 08:00 with an unwatched match: `sealed`, and the render has no score digits
  - at 18:30: `halftime`
  - before `foundClub`: `none`, and nothing renders
  - the Close the day final screen shows "Watch now" and "Later"; "Later" leaves `watched:false`
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): Today card and kick-off handover`.

### Task 2.7: First run and catch-up

**Files:**
- Create: `src/screens/football/FirstRun.tsx` (six steps, each skippable except the shirt), `src/screens/football/CatchUp.tsx` ("N while you were away": watch as one reel or just see the results)
- Modify: `src/App.tsx` so the app start calls `playDue()` once
- Test: `tests/football/firstrun.test.tsx`

- [ ] **Step 1: Failing tests:**
  - on an empty db, `/football` renders step 1 with no throw
  - "Skip" exists on every step except the shirt
  - finishing calls `foundClub`
  - with 3 unwatched auto matches, Tonight shows "3 while you were away" and two buttons
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Browser check at 360 px: the whole first run, then close a day on dev data and watch the first match. Screenshot.
- [ ] **Step 4:** Commit `feat(football): first run and catch-up`.

**Part 2 exit:** `npm test`, typecheck and the browser probe (the accessibility floor on `#/football` and `#/football/match`) all clean.

---

# Part 3 — League

### Task 3.1: Table and pyramid

**Files:**
- Create: `src/screens/football/league/LeagueHome.tsx`, `Table.tsx`, `Pyramid.tsx`
- Test: `tests/football/league-screens.test.tsx`

- [ ] **Step 1: Failing tests:**
  - the table renders 18 rows, each with a tier-coloured border, a result-letter form and points
  - cut lines after rows 2 and 6 and before row 16
  - every row is a link to `/football/club-page?id=`
  - the pyramid renders 6 tiers with the tier colours, and each rating has a gap class (`gap-up`, `gap-even`, `gap-down`)
- [ ] **Step 2:** FAIL. Implement, matching boards 9 and 10, with the pulsing tier colours. PASS.
- [ ] **Step 3:** Commit `feat(football): table and pyramid`.

### Task 3.2: Calendar and cups

**Files:**
- Create: `league/Calendar.tsx`, `league/Cups.tsx` (round list, then the bracket from the last 16 in club colours, the winner carrying its colour forward, the full bracket after the final), `league/Events.tsx` (event nights and the World Cup group rows "label, result, circle", then the knockouts and the giant-killings rundown)
- Test: `tests/football/cups-screens.test.tsx`

- [ ] **Step 1: Failing tests:**
  - the calendar has 42 cells: circle for league, diamond for the Big Cup, square for a trophy, hexagon for an event, gold for finals
  - played cells show the result letter
  - the bracket shows 16 slots from the last 16
  - each World Cup group day row has its label, text and result in that order
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): calendar, cups and events`.

### Task 3.3: Club pages, grounds, news and wiki

**Files:**
- Create: `league/ClubPage.tsx`, `league/News.tsx` (the back page, the weekly roundup, club feeds), `league/Wiki.tsx`, `src/football/grounds.ts` (`groundFor(club): GroundShape`: the tier shape for most; unique for rivals, the elite, and a seeded random 12; neutral for finals)
- Test: `tests/football/club-page.test.tsx`

- [ ] **Step 1: Failing tests:**
  - an unmet quirky club's page says "Hidden until you meet them"; after a meeting it shows the quirk name and "[data]" when `data`
  - the head-to-head counts match the stored matches
  - `groundFor` is unique for the elite clubs and Antigoon
  - the back page shows today's headline and calls back a past result
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): club pages, grounds and news`.

### Task 3.4: Season change, promotion and relegation screens, Old Selves

**Files:**
- Create: `src/screens/football/moments/SeasonChange.tsx` (promotion or relegation with names, the playoff final, the new division with ratings dropping), `story/OldSelves.tsx`
- Modify: `src/football/store/play.ts` so day 42 runs `seasonEnd`, moves clubs, retires the weakest Old Self, adds the newest month, and starts the events
- Test: `tests/football/season-end.test.ts`

- [ ] **Step 1: Failing tests:**
  - a simulated full season ends with every tier at 18
  - Brabo finishing 1st in Division Six moves to Division Five, and their shown ratings drop by 4
  - the Old Selves Cup gets the retired self
  - Season 2 day 1 is the day after the last event day
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): season end, promotion and old selves`.

**Part 3 exit:** tests, typecheck and the browser probe on every League page.

---

# Part 4 — Club

### Task 4.1: Squad, player page, armband, abilities and awakening

**Files:**
- Create: `src/screens/football/club/Squad.tsx` (six rings on the pitch in FM band colours, a dashed ring for a knock, [C], the bench), `club/Player.tsx` (shown rating with the real value beside it, form, traits, awakenings, no legend), `moments/Awakening.tsx` (only one axis stretches; gold label)
- Modify: `store/save.ts` (`setCaptain(axis)`, `equipAbility(id, slot)`), `store/play.ts` (abilities earned from moments, awakening check after each match)
- Test: `tests/football/club-squad.test.tsx`

- [ ] **Step 1: Failing tests:**
  - the squad renders 6 members, each labelled with its habit and its axis
  - a knock renders a dashed ring plus the word "knock"
  - the player shows `shownRating` and the real value
  - a fourth ability can't be equipped
  - an awakening is stored once per band per axis
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): squad, player and abilities`.

### Task 4.2: Contracts, youth, trading, budget and sponsors

**Files:**
- Create: `club/Deals.tsx` (one line per member with the renewal tap, youth cards, the trade flow), `club/Money.tsx` (budget, income, offers with stable, flashy or dodgy written in words)
- Modify: `store/play.ts` (weekly contract checks, youth intake in the days before each season, sponsor offers between seasons)
- Test: `tests/football/deals.test.tsx`

- [ ] **Step 1: Failing tests:**
  - three youngsters at intake with at most one exercise
  - trading a habit removes it from the squad and keeps its history, and Health's own settings are untouched
  - an offer list shows the risk in words
  - "Add your own sponsor" saves a typed name to a chosen slot
  - real brands are offered only from Division Three up
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): deals, youth and money`.

### Task 4.3: Kits, the kit wall and the crest level-up

**Files:**
- Create: `src/football/kits.ts` (the catalogue H1–H6, A1–A6, T1–T6 from `build_kcs4.SLOTS`, four sponsor styles, the third kit from Division Four, the data kit from season 2, the anniversary kit every fifth season), `club/Kits.tsx` (launch day picker, the wall where a tap shows the record and the throwback), `moments/LevelUp.tsx` (the old crest dims, light traces the new one, five options plus keep from step 2, a line saying what changed)
- Test: `tests/football/kits.test.ts`

- [ ] **Step 1: Failing tests:**
  - the data kit has 6 stripes whose widths come from the six weeks' average radar and whose tones are orange, purple or hatched black for W, D or L
  - the weekly numbers appear in the collar text
  - the anniversary kit only in seasons 5, 10 and so on
  - the patch appears only on finals and derbies, and stays on the wall
  - the level-up offers 5 options plus keep from step 2, and none at step 1
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): kits and crest level-up`.

### Task 4.4: The ground, the quarter and bundles

**Files:**
- Create: `src/football/ground.ts` (the tenancy events, the bundle table from the stadium design §4 with day and week totals only, capacity, overhaul stages and downtime), `club/Ground.tsx` (sealed: only what exists plus the next name and teasing line), `club/Quarter.tsx` (top-down map that develops), `moments/OpeningNight.tsx`, and bookends wired into `Match.tsx`
- Test: `tests/football/ground.test.ts`

- [ ] **Step 1: Failing tests:**
  - the plot bundle completes after 20 days at the step goal plus the money
  - the River End adds +1 at home in the last 15 minutes and nothing elsewhere
  - an overhaul closes the building for its downtime
  - bundle progress never reads log times (grep test over `ground.ts` for `stepsAt`, `weighedAt` and `logMinutes`: none)
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): the ground and the quarter`.

**Part 4 exit:** tests, typecheck and the browser probe on every Club page and moment.

---

# Part 5 — Story and the edges

### Task 5.1: Rivals and the rival moment

**Files:**
- Create: `story/Rivals.tsx`, `story/Rivalry.tsx`, `moments/RivalBorn.tsx`
- Modify: `store/play.ts` (rival birth and fade after each match, rival mods into `MatchInput`)
- Test: `tests/football/rivals-screens.test.tsx`

- [ ] **Step 1: Failing tests:**
  - Antigoon is always listed
  - a cup loss creates a rival with "Bad blood", or with whichever mod the birth maps to
  - the list never goes past 1 + 3
  - the rivalry page shows the record and the meetings
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): rivals`.

### Task 5.2: Moments, seasons and Season Wrapped

**Files:**
- Create: `story/StoryHome.tsx`, `story/Moments.tsx`, `story/Seasons.tsx`, `moments/Wrapped.tsx` (five swipe cards: the season, your best axis, the moments, the gremlin's verdict, what's next)
- Test: `tests/football/wrapped.test.tsx`

- [ ] **Step 1: Failing tests:**
  - Wrapped has 5 cards and the dots show the position in words for screen readers
  - the moments list holds both upsets for and against you
  - the best axis is the highest season average
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): story and Season Wrapped`.

### Task 5.3: Events, the World Cup and settings

**Files:**
- Create: `story/Settings.tsx` (five rows: match times shown, the mapping shown, buzz on goals, World Cup country, your own sponsor)
- Modify: `store/play.ts` (event days and World Cup days: you play if `calledUp`, otherwise you follow)
- Test: `tests/football/worldcup-flow.test.ts`

- [ ] **Step 1: Failing tests:**
  - with no country picked, the World Cup only follows
  - with a strong nation and a low average, no call-up
  - with a high average, Brabo's owner plays on group day 1 as a double-header
  - turning buzz off leaves `navigator.vibrate` uncalled (spy)
  - settings has exactly 5 rows
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): events, World Cup and settings`.

### Task 5.4: The lines on Train, Walk and You

**Files:**
- Create: `src/screens/football/HabitLine.tsx` (`<HabitLine axis="Power" />` shows "Power 12 → 15 for tonight", and tapping goes to `#/football`)
- Modify: `src/screens/SessionDone.tsx` (Power), `src/screens/WalkTab.tsx` (Pace, with "N more steps makes it M" from the `PACE_PTS` next step), `src/screens/You.tsx` momentum (a thin league-position line), `src/screens/Week.tsx` or the Monday recap (one results line)
- Test: `tests/football/habit-lines.test.tsx`

- [ ] **Step 1: Failing tests:**
  - with no save, none of the lines render
  - the Walk line shows the step count needed for the next value from `PACE_PTS`
  - the recap line reads "This week: 3 won, 2 drawn, 2 lost. Up to 4th." from fixture matches
- [ ] **Step 2:** FAIL. Implement. PASS.
- [ ] **Step 3:** Commit `feat(football): lines on Train, Walk and You`.

### Task 5.5: Privacy guard

**Files:**
- Test: `tests/football/privacy.test.ts`

- [ ] **Step 1: Write a test that fails if any of these hold:**
  - a file under `src/football/` or `src/screens/football/` contains a value from the gitignored private fixture keys
  - any of those files contains `kg"`, `knee`, `mg` or a medicine name pattern
  - `src/football/data/league.json` contains a youth entry of kind exercise
- [ ] **Step 2:** Run. PASS, or fix the offender.
- [ ] **Step 3:** Commit `test(football): privacy guard`.

### Task 5.6: Whole-tab accessibility sweep

- [ ] **Step 1:** At 360×780, run the probe on every Football route and moment. It checks:
  - text under 14 px (excluding SVG art)
  - overflow
  - pairwise text collisions over 3 px
  - targets under 44 px
  - `scrollWidth` above 360

  Fix each hit.
- [ ] **Step 2:** Do a greyscale pass (`filter: grayscale(1)`) on Table, Calendar, Cups, Squad and Match: each state must still read from its letter, shape or word. Screenshots.
- [ ] **Step 3:** Commit `fix(football): accessibility sweep`.

### Task 5.7: Final review

- [ ] **Step 1:** Dispatch one fresh reviewer on the most capable model over the whole branch. The package contains the spec, this plan and the ledger's rulings, plus the Review Focus.
- [ ] **Step 2:** Fix every confirmed finding. A style or config fix may be "verified by measurement" in the ledger.
- [ ] **Step 3:** Commit `fix(football): final review fixes`.

### Task 5.8: Built-artefact check

- [ ] **Step 1:** Run `npm run build && npm run preview`. Open `#/football` in the preview, play a stored match, set the pane offline, reload, and replay it. Expected: it works offline.
- [ ] **Step 2:** Run `TZ=UTC npm test`. Expected: green.
- [ ] **Step 3:** Stop the preview. Report to the owner: green locally and under the CI clock, nothing pushed.
