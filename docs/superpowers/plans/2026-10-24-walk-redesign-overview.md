# Walk redesign: the build, part by part

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md`. The look: the prototype at `#/proto/walk` (`src/screens/proto/walk*.tsx`, `src/styles/walk-proto.css`).

This is the map of the whole build. Each part gets its own detailed plan (writing-plans format: tasks, interfaces, tests with real values, commits), written when the part before it is closed, because each part's tasks consume names the part before it settles. Parts 0 and 1 are written in full now:

- `2026-10-24-walk-redesign-part-0-groundwork.md`
- `2026-10-24-walk-redesign-part-1-route-engine.md`

**Branch:** `feat/walk`, cut from `feat/today-page`. Every part commits there. No push, PR or merge without the owner's word.

**Running each part** (from the playbook, Phase E): execute natively with superpowers executing-plans; progress ledger first; test-first for every pure rule; rulings recorded as `Ruling: what — why — cost if wrong`; a browser check at 360 px on the restored dev data; one fresh final reviewer per part on the most capable model; one fix pass; a closing summary with one go-ahead question.

## Order and dependencies

```
0 groundwork ─► 1 route engine ─┬─► 2 the page ─► 3 stretches & stops
                                ├─► 4 arrivals & passport ─► 5 the map
                                └─► 6 challenges & expeditions
7 catalogue content: batches alongside 3–6 (needs 1's RouteDef)
8 stories: last (needs 2, 4, 6)
```

## Part 0 — Groundwork

Merge `debloat/walk` and `proto/walk` onto `feat/today-page` as `feat/walk`; retire Today's `WalkFull` so Today's walk opens the Walk tab; replace the landmarks the owner picks. Detailed plan written.

## Part 1 — Geography and the route engine

The geo generator in the repo; generated regions, states, areas and route lines; `RouteDef` and the catalogue checks; signatures; the `routes` table (database version 4) with join, set down, pick up and finish; route km over spans; places taken; the map card (`RouteArt`), `RouteMap` and `MarkShape` as real components. Detailed plan written.

## Part 2 — The Walk tab page

- **Files:** `src/screens/WalkTab.tsx` (rewritten as a thin page); new `src/screens/walk/` sections: `WalkSceneTop.tsx` (scene, stone, strip), `WalkTitle.tsx`, `StatusLines.tsx`, `TomorrowLine.tsx`, `RouteCards.tsx` (challenge cards and expedition lines), `WalkDoors.tsx`; `src/styles/walk.css`; pure rules in `src/walk/page.ts`.
- **Produces:** `nearOrBetween(km): { kind: 'near' | 'between'; a: string; b?: string }`, `statusLines(input): StatusLine[]` (max 3, one per kind, fixed order), `usualAndBig(days): { usualKm; bigKm }`, `timeAtPace(km, usualKm): string`, `stoneFor(km): { hindi: string; name: string; km: number }`.
- **Key tests:** 19.9 km from a place says "Near", 20.1 says "Between"; four candidate lines give three, in order arrival · stop · person · rest; usual is the median and big the 90th percentile of the last 28 days with steps, 10 km with fewer than 7 days; `timeAtPace(10000, 10)` is "about 2.7 years"; the stone's name for every city has a Hindi form.
- **Also:** living colour on the tab (Aurora tinted by `regionAt(km)`), rest and travel days in words, the place and status row moved from Today, the doors (Map · Passport · Departures · Wrapped), the "Choose a walk" door with free places.
- **Exit check:** 360 px, no overflow, every target 44 px, status lines don't shift the page when they come and go (reserved space measured), battery saver black and still.

## Part 3 — Stretches and small stops

- **Files:** `src/walk/content/stretches.ts`, `src/walk/content/stops.ts` (chapter 1's writing, with sources), `src/walk/road.ts` (rules), `src/screens/walk/StretchPage.tsx`, `StretchEndSheet.tsx`, `StopCard.tsx`.
- **Produces:** `Stretch { id; name; plain; fromKm; toKm; page: string[]; deeper?; sources }`, `SmallStop { id; kind: StopKind; km; name; facts: string[]; creature?: string; sources }`, `StopKind = 'river' | 'border' | 'food' | 'fort' | 'wildlife' | 'strange'`, `stretchAt(km)`, `stopOn(day, stepsByDay)`, `stretchEnded(prevKm, km)`.
- **Key tests:** stretches tile chapter 1 from Agra with no gap or overlap; every stretch is 50–220 km; no two consecutive stops more than 45 km apart (about three days at the default pace); every stop has 3–5 facts and a source; every `StopKind` has a word and a mark (iterate all kinds); the stretch-end sheet shows once (seen id `walk-stretch:<id>`).
- **Content task:** drafts for every chapter 1 stretch and stop go to the owner in one batch before the part closes.

## Part 4 — Arrivals and the passport

- **Files:** `src/walk/arrivals.ts` (rules), `src/screens/walk/Arrival.tsx` (five beats, ported from `walkArrival.tsx`), `StateLine.tsx`, `src/screens/walk/Passport.tsx` (booklet, from `walkPassport.tsx`), `StampTemplate.tsx`, `src/walk/art/` additions (one landmark per city from the kit), `src/walk/content/cities.ts` (heights, souvenirs, eat, hear), `src/walk/speeds.ts` (typical speeds through history, with sources); replaces `src/screens/Postcard.tsx` layout.
- **Produces:** `arrivalsToPlay(savedDay, today, stepsByDay, seenIds): Arrival[]` (today or yesterday play; older days go quiet), `markQuiet(...)`, `stampShape(name, ut): StampShape`, `passportPages(stepsByDay): PassportPage[]`, `areaShare(statesReached): number`.
- **Key tests:** saving yesterday plays, saving three days ago only stamps; two cities crossed in one save play the later one full-screen and the other quietly; never inside the morning reveal (the reveal flag suppresses); state and UT counts separate ("3 of 28 states · 1 of 8 union territories"); every one of the 46 cities has a landmark, a height and a stamp shape (iterate all); the longest name (Thiruvananthapuram) fits its stamp at 360 px (static render: computed font size ≥ 14).
- **Exit check:** all 46 arrivals stepped through at 360 px with reduced motion on and off.

## Part 5 — The map

- **Files:** `src/screens/MapPage.tsx` (rewritten), `src/screens/walk/map/IndiaMap.tsx` (from `walkIndiaMap.tsx`), `Flyover.tsx`, `src/walk/mapView.ts`.
- **Produces:** `mapLevels(km): { stretch: Box; chapter: Box; india: Box }`, `labelSize(box, viewportPx): number`, `flyoverFrames(trail, seconds): Frame[]`.
- **Key tests:** labels never compute under 14 px at any level at 360 px; reached states listed by name, not only shaded; the Chambal is drawn as the Rajasthan–Madhya Pradesh border (from the state outlines) and Dholpur is labelled as a place on the road; the flyover stops on tap and has a still version for reduced motion.

## Part 6 — Challenges and expeditions

- **Files:** `src/screens/walk/Shelf.tsx`, `JoinMoment.tsx` (from `walkJoin.tsx`), `RoutePage.tsx` (from `walkRoutePage.tsx`), `FinishMoment.tsx`, `NewsBanner.tsx` (from `walkBanner.tsx`, placed in Today's and Walk's banner slot), `src/walk/news.ts`, `src/walk/moments.ts`, `src/walk/story.ts`; `src/walk/catalogue/routes/xuanzang.ts` fully written.
- **Produces:** `roadNews(runs, defs, stepsByDay, today): RoadNews[]`, `gatherNews(news): Banner | undefined` (one expedition banner a day, several gathered), `momentToday(candidates, seenIds, today): Moment | undefined` (finish > arrival > state line; the rest become banners), `chooseForMe(pinned, finished, defs): RouteDef`, `storyState(run, km): 'story' | 'paused' | 'places'`, `targetLine(target, today): string | undefined`.
- **Key tests:** two events on one day make one banner reading "2 things happened on the road"; a second expedition event the same day joins the first banner rather than adding one; a finish and an arrival on one day: the finish is full-screen and the arrival a banner; a missed target date returns nothing (no "behind" anywhere: grep test over the walk's copy); "Pause the story here" stops new chapters at the paused km; the full synopsis is hidden until finished; join is refused with two challenges active; the visa for every kind renders its mark at 20–40 px (static render, iterate kinds).
- **Exit check:** shelf, join, route page, banner and finish for one challenge, one book route and Xuanzang at 360 px.

## Part 7 — The catalogue

Batches of about ten routes, each one a file in `src/walk/catalogue/routes/`, with its waypoints in `scripts/geo/routes.json`, its places, signature, pages, chronicle and sources. Each batch: drafted, passed by the catalogue checks (Part 1, Task 2), sent to the owner, then `ready: true`. Order: Indian history challenges; Indian expeditions; world challenges; world expeditions; books and films; strange and wild. New regions (Andes, Sahel, East Africa, North America, Australia, Antarctica's edge) are added to the generator as their routes arrive, and new era kits to the art.

## Part 8 — Stories

- **Files:** Today's Monday story (walk cards inside), `src/domain/film.ts` (the month's trail drawing, the chapter film), `src/screens/walk/Wrapped.tsx` with the road so far timeline, Close the day's walker, festivals and sky events in the scene (`src/domain/festivals.ts`, `src/walk/sky.ts`); remove `src/screens/proto/walk*` and `src/styles/walk-proto.css`.
- **Key tests:** the Monday story holds the week's walk cards once; the chapter film is skippable; Wrapped's timeline lists arrivals in date order; festival scenes key off the calendar, never a religious emblem.

## Ship

Privacy scan, tests under `TZ=UTC`, typecheck, build, the production preview checked offline. Then, on the owner's word: push, PR, merge, watch the deploy.
