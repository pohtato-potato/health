# Walk redesign, part 8: stories — implementation plan

> Executed natively (superpowers:executing-plans), one fresh review of the whole branch at the end.

**Goal:** the walk's stories across days: the Monday story, the month's trail drawing, the chapter film, the road so far with its replay, the walker on Close the day, sky events in the scene, and the walk prototype removed.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("Stories across days"; build part 8).

**Owner's ruling (25 Oct):** catalogue batches 5–6 (books and films; strange and wild) are deferred until after shipping. The four draft routes stay `ready: false`, so they never reach the shelf.

## Global constraints
- Nothing meaningful under 14 px; 44 px targets; never colour alone; check at 360 px (S23).
- Gold only for what was earned.
- No battery-saver or reduced-motion variants.
- No religious emblems in scenes; festivals key off the calendar.
- Public repo: no personal data in code, tests or fixtures.
- Tests run under `TZ=UTC`.

## What already exists (not rebuilt)
- Festivals and the owner's birthday already dress the Walk scene (`src/walk/art/festive.tsx`, `seasonalThemeOn`).
- The monthly film (`src/screens/MonthlyFilm.tsx`, `src/domain/film.ts`), Wrapped (`WrappedPage` in `src/screens/Reports.tsx`), the weekly recap (`src/screens/Week.tsx`, opened from Today's Monday banner), Day closed (`src/screens/DayClosed.tsx`), the map's flyover replay (`MapPage`).
- A chapter's end already plays as its city's arrival (`/arrive?...&end=1`).

## Tasks

### Task 1: remove the walk prototype
- Delete `src/screens/proto/WalkProto.tsx`, `src/screens/proto/walk*.ts(x)`, `src/screens/proto/walk-art/`, `src/styles/walk-proto.css`; drop its import from `src/main.tsx` and the `/proto/walk` route from `src/App.tsx`.
- Test: `tests/walk-proto-gone.test.ts` — no file under `src/` imports `proto/walk` or `walk-proto.css`; `/proto/walk` is not a route.

### Task 2: the week's walk in the Monday story
- `src/walk/week.ts`: `weekWalk(from: DayKey, stepsByDay, runs: RouteRun[]) => { km: number; fromKm: number; toKm: number; cities: string[]; states: string[]; routes: { id: string; name: string; km: number; done: boolean }[] }` — km walked Monday to Sunday, the cities and state lines first reached that week (date order), and each joined route's km that week (finished that week → `done`).
- `src/screens/Week.tsx`: an "On the road" card after the four cells: km and where it took you ("Gwalior to Jhansi"), cities and states reached, route lines with km. Hidden in a week with no steps.
- Tests: `tests/walk-week.test.ts` — km and fromKm/toKm from a known steps map; a city crossed on Sunday counts, one crossed the next Monday does not; a route finished inside the week is `done`; an empty week is all zeros.

### Task 3: the month's trail drawing in the monthly film
- `src/walk/trail.ts`: `monthTrail(month: string, stepsByDay) => { fromKm: number; toKm: number } | undefined` (undefined when nothing was walked).
- `src/walk/ui/TrailDrawing.tsx`: India's outline, the whole trail so far faint, the month's stretch bright in sage, from `trailTo` / `pointAtKm`, boxed to the month's stretch with margin.
- `MonthlyFilmPage`: a slide after "kilometres walked" with the drawing and "From X to Y" (nearest stops).
- Tests: `tests/walk-trail.test.ts` — the month's km bounds; a month with no steps is undefined; steps before the month move `fromKm`.

### Task 4: the chapter film
- `src/walk/chapterFilm.ts`: `chapterFilm(n: number, stepsByDay, start: DayKey) => { name: string; slides: { big: string; small: string }[] } | undefined` — undefined until the chapter is finished. Slides: the chapter's name; days taken; km; cities; states and territories; the best day's km.
- `src/screens/walk/ChapterFilm.tsx` at `#/chapter?n=`: about 15 seconds, each slide 2.5 s, a tap moves on, Skip closes; the last slide ends on the chapter's trail drawing.
- Reached from the chapter-end arrival's last beat ("Play the chapter film") and from the road so far.
- Tests: `tests/walk-chapter-film.test.ts` — undefined before the end; slide values from a fixture; total length 13–17 s.

### Task 5: the road so far, and Wrapped
- `src/walk/roadSoFar.ts`: `roadSoFar(stepsByDay) => { date: DayKey; name: string; chapter: number; kind: 'city' | 'state' | 'chapter' }[]` in date order (state lines and chapter ends included).
- `src/screens/walk/RoadSoFar.tsx` at `#/road`: the timeline, "Replay the whole road" (opens the map's flyover: `/map?fly=1`), "Play" on each finished chapter, and "The journey, wrapped" (`/wrapped?all=1`).
- The Walk tab's Wrapped door opens `/road`. `MapPage` starts the flyover when `fly=1`.
- Tests: `tests/walk-road-so-far.test.ts` — date order; a city and its state line on the same day keep route order; a chapter end appears once.

### Task 6: the walker on Close the day
- `src/walk/dayWalk.ts`: `dayWalk(date, stepsByDay) => { fromKm: number; toKm: number; next?: { name: string; kmLeft: number } }`.
- `src/screens/walk/DayWalker.tsx`: a strip from the day's start to its end with the walker moving along it (CSS, about 2 s), the stops passed today and the next stop named. Shown in `DayClosed` in place of the plain walk row.
- Tests: `tests/walk-day-walk.test.ts` — bounds; next stop and km left; a zero-step day has fromKm = toKm.

### Task 7: sky events in the scene
- `src/walk/sky.ts`: `moonPhase(date: Date) => number` (0 new, 0.5 full; mean synodic month 29.530588853 d from the new moon of 6 Jan 2000, 18:14 UTC); `isFullMoon(day: DayKey) => boolean` (within 0.75 days of full); `meteorShower(day: DayKey) => 'quadrantids' | 'lyrids' | 'perseids' | 'geminids' | undefined` (peak nights: 3–4 Jan, 22–23 Apr, 12–13 Aug, 13–14 Dec).
- `Vista`: at night the moon is drawn at its phase (full: larger, with a halo); on a shower's nights, a few meteor streaks crossing the sky. Dusk shows a rising full moon.
- A one-line status on the Walk tab on those nights ("Full moon tonight", "The Geminids peak tonight"), in the status lines.
- Tests: `tests/walk-sky.test.ts` — every full moon of 2024 (25 Jan, 24 Feb, 25 Mar, 23 Apr, 23 May, 22 Jun, 21 Jul, 19 Aug, 18 Sep, 17 Oct, 15 Nov, 15 Dec) is a full-moon day; the days a week either side are not; shower nights; no shower on 1 Mar.

## Review focus
1. A user who walks nothing in a week or a month: the Monday card and the trail slide must disappear, not show zeros or an empty map.
2. Chapter film reached by hand before the chapter ends: it must refuse, as the finish page does.
3. Full moon at the date line: day keys are local dates; the phase must be taken at local evening, not UTC midnight.
4. The flyover from `/map?fly=1` when the trail is too short to fly (`flyoverAllowed`): open the map without flying.
5. Removing the prototype must not remove anything the real screens use (the art was rebuilt in `src/walk/art/vista.tsx`).
