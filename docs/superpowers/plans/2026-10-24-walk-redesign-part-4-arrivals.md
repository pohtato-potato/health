# Walk redesign, part 4: arrivals and the passport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-screen arrival for every city (five beats) and every state line, played right after the steps that reach it are saved; and the passport: a booklet with a page per state or union territory, a stamp for every city, separate counts, souvenirs, places I've been, and replay from any stamp.

**Architecture:** City facts (height, real position) are data: positions come from the geo generator (`CITY_POINTS`, from longitude and latitude), heights from `src/walk/content/cities.ts`. Rules in `src/walk/arrivals.ts`, test-first: what an arrival shows (`arrivalFor`), which arrival or state line plays (`arrivalToPlay`), and the passport's pages (`passportPages`). Screens: `src/screens/walk/Arrival.tsx` (ported from the prototype's `walkArrival.tsx`, five beats, Skip), `StateLine.tsx`, `Passport.tsx` (from `walkPassport.tsx`), `StampTemplate.tsx`; routes `/arrive` and `/passport`. `src/state/Celebrations.tsx` opens the arrival instead of its postcard toast, keeping its seen keys (`city:<name>`, `city:<chapter>:<name>`) so cities already celebrated never replay.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, `react-dom/server`; Python for the generator.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("Arrivals", "The passport").

## Global Constraints

- **This repo is public:** no personal values.
- "When it plays: right after the steps that reach it are saved … when the day saved is today or yesterday. Saving an older day only adds the stamp quietly. It never plays inside the morning reveal." (The morning reveal isn't built yet; arrivals use the app's existing moment queue, which already shows one moment at a time.)
- "A city arrival is five beats, tap to go on, with 'Skip' always visible."
- "States and union territories have different stamp shapes and separate counts ('3 of 28 states · 1 of 8 union territories')."
- "Reduced motion uses fades; battery saver uses still frames."
- "Nothing that carries meaning under 14 px"; "never colour alone"; "targets at least 44 px"; long names fit by measured shrinking, never cut off.
- Tests run under `TZ=UTC`.

## Review Focus

1. **A city reached twice** (Delhi, Bengaluru, Chennai later in the walk) plays again in its later chapter, under its own key, and its passport stamp shows the first date. Task 2.
2. **Two cities in one save:** the farther one plays; the other is stamped quietly. Task 2.
3. **The longest names** (Thiruvananthapuram, Andaman and Nicobar Islands, Dadra and Nagar Haveli and Daman and Diu) fit the stamp, the page head and the arrival title at 360 px. Tasks 3–4 (measured).
4. **An arrival opened by link with an unknown city** (old or hand-typed URL): a calm fallback, not a crash. Task 3.
5. **Battery saver:** still frames, nothing animating. Task 3 (measured).

---

### Task 1: Where every city is, and how high

- Generator: `CITY_POINTS: Record<string, [number, number]>` for all 46 cities in `src/walk/geo/routes.ts`, from their longitude and latitude; India's state named "Andaman and Nicobar" in Natural Earth is written as the walk's "Andaman and Nicobar Islands".
- `src/walk/content/cities.ts`: `CITY_FACTS: Record<string, { heightM: number }>` for all 46, with a source list.
- Tests: every city has a point inside India's box and a height; every state on the walk has a map shape; every state has a souvenir.

### Task 2: The arrival rules

- `arrivalFor(name, stepsByDay, startDay): ArrivalInfo | undefined` — `{ name, km, date, dayN, steps, state, ut, n, at, trail, next, reached, heightM }`; `n` is the city's stamp number among distinct cities in the order first reached.
- `arrivalToPlay(stepsByDay, today, seenIds): { city?: { name; key }; quiet: string[] }` — arrivals dated today or yesterday that aren't seen; the farthest plays, the rest go quiet; keys as Celebrations uses them.
- `stateLineToPlay(stepsByDay, today, seenIds): { state?: string; key } ` — key `state:<name>`.
- `passportPages(stepsByDay): { state; ut; date; cities: { name; date; n }[] }[]`, `passportCounts(pages): { states; uts }`, `areaShare(pages): number` (reached states' areas over `INDIA_AREA_KM2`).
- Tests: stamp numbers in first-reached order; a revisit keeps the first date; two cities in one save; yesterday plays, three days ago doesn't; counts split states and territories; area share 0 at the start, 1 with all 36.

### Task 3: The arrival and the state line on screen

- `ArrivalView({ a, beat, onNext, onSkip })` and `StateLineView({ ... })` pure; `ArrivalPage` at `/arrive?c=<city>` (and `?s=<state>`), stepping beats, Skip to the passport page.
- Celebrations: the city branch opens `/arrive?c=` (chapter ends keep their own moment); a state line opens `/arrive?s=` when no city plays the same day.
- Tests: each beat renders its words (name, "day 31", height, "of 28 states"); Skip on every beat; the stamp template fits the longest name (computed font ≥ 14 px or `textLength`); unknown city renders the fallback.

### Task 4: The passport

- `Passport` at `/passport`: cover with counts, a page per state reached (in order) with its outline, its city stamps (template; states and territories differently shaped), the souvenir line, places I've been (counts and share of India's area); a stamp's tap replays its arrival.
- The Walk tab's doors gain Passport; its "Cities reached" chips go.
- Tests: page per reached state, hidden ones counted on the cover ("33 still to find"); state vs territory stamp shapes; replay link per stamp.
- Browser check at 360 px: every beat for three cities including the longest name, the passport, battery saver and reduced motion.

## Closing the part

Full suite, typecheck, build; one fresh reviewer; one fix pass; summary and go-ahead for part 5.
