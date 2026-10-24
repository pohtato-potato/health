# Walk redesign, part 6: challenges and expeditions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Routes become something you can find, join, walk and finish: the shelf, the joining moment with its visa, one route page for every route, the finish moment, news from the road on Today and the Walk tab inside a one-moment-a-day budget, and Xuanzang's road fully written as the first expedition.

**Architecture:** Pure rules first, test-first: `src/walk/news.ts` (what happened on each road today or yesterday, gathered into one banner), `src/walk/moments.ts` (the day's one full-screen moment), `src/walk/story.ts` (story, paused or places), `src/walk/shelf.ts` (choose for me, the target line, what the shelf offers). Screens are pure views fed by small page wrappers, as in parts 2–5: `src/screens/walk/{Visa,Shelf,JoinMoment,RoutePage,FinishMoment,NewsBanner}.tsx`, routes `#/routes`, `#/join?id=`, `#/route?id=`, `#/finish?id=`. The engine from part 1 (`src/walk/runs.ts`, `src/db/walkRoutes.ts`) is reused; it gains `setRouteStory` and pins (seen ids `walk-pin:<id>`).

**Tech Stack:** React 19, TypeScript, Dexie 4, Vitest, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("Challenges and expeditions", "Data").

## Global Constraints

- "Challenges are routes up to 1,500 km. Expeditions are longer. You can walk two challenges and two expeditions at once." "Join is offered only when a place of that kind is free."
- "Setting down and picking up works for both. Progress is kept… Nothing ever fails." Target: "'aiming for 14 March', never 'behind'. A missed target disappears quietly."
- "Each route has one ink… Never gold: gold is only for records, finished routes' exit stamps and the top achievement."
- "At most one expedition banner a day. Several events gather into one banner ('2 things happened on the road', 'See both'). A day's budget: one full-screen moment (a finish, or else an arrival, or else a state line). Anything else that day becomes a banner."
- Book routes: "'with the story' or 'places only' when joining; 'Pause the story here' bookmarks the plot…; 'Resume' catches you up. Full synopsis behind a warning, unlocked at the finish." "Written in our own words: no quotations."
- "Then vs you only where a record exists… Where there's no record, the app says nothing rather than invent." All sides, critically; pilgrim routes culture first.
- "Only ready routes appear on the shelf."
- Accessibility: nothing that carries meaning under 14 px; never colour alone (every state has a word); targets 44 px, main actions 50–56 px; long names fit by measured shrinking, never cut off; checked at 360 px. Reduced motion: fades; battery saver: still.
- Tests under `TZ=UTC`.

## Review Focus

1. **No free place:** two challenges walking, the shelf sheet for a third says why and offers no Join; a direct `#/join?id=` for it doesn't write a run. Task 3/4.
2. **A finish and an arrival on one save:** the finish plays, the arrival waits as a banner, and the next save the same day plays nothing full-screen. Task 1/6.
3. **A book route paused, then walked on:** no chapter news while paused; Resume shows the chapters missed since the pause as one catch-up. Task 1/5.
4. **A route opened by a stale link** (unknown id, or a draft in a production build): a plain "This route isn't on the shelf" page, no crash. Task 3–5.
5. **The longest name** ("Hannibal's march over the Alps" and the visa's 16-character fit) at 360 px, on the card, the visa and the route page head. Task 3–5.

---

### Task 1: The rules (`src/walk/{news,moments,story,shelf}.ts`, `tests/walk-challenges.test.ts`)

- `storyState(run, def, km): 'story' | 'paused' | 'places' | undefined` — undefined for a route without `book`; `paused` when `storyPauseKm` is set; else `run.story ?? 'story'`.
- `chaptersShown(run, def, km)` — the book's chapters at or before `km`, or before `storyPauseKm` when paused; none with places only.
- `roadNews(runs, stepsByDay, today, seen): RoadNews[]` with `RoadNews = { key, routeId, kind: 'challenge' | 'expedition', what, km, open }` — for each run walking now, the route pages, named signature marks and (story mode only) book chapters whose km was crossed on today or yesterday; keys `walk-news:<route>:<km>`; seen ones dropped.
- `gatherNews(items): { title, text, action, items } | undefined` — one item: "Challenge · <name>" / the event, "Read what happened"; two: "2 things happened on the road", "See both"; more: "See all".
- `momentToday(candidates, seen, today): { play?: Candidate; later: Candidate[] }` — order finish > arrival > state line; nothing plays when `walk-moment:<today>` is seen.
- `targetLine(target, today)` — "aiming for 14 March" from today on; undefined once the day has passed.
- `chooseForMe(defs, runs, pinned, kmById)` — ready, not joined, a free place of its kind; pinned first (shelf order), then the group you've finished most, then the shortest challenge.
- Tests: two events on one day gather into one banner reading "2 things happened on the road"; a second expedition event joins the first banner; finish beats arrival and the arrival is in `later`; a seen `walk-moment` plays nothing; paused stops chapters at the paused km; places-only shows none; a missed target is undefined; choose-for-me prefers a pinned route and never offers a full kind; no "behind" in any walk copy (grep over `src/walk` and `src/screens/walk`).

### Task 2: Xuanzang's road, written (`src/walk/catalogue/routes/xuanzang.ts`, `scripts/geo/routes.json`)

- Waypoints along his recorded route out (Chang'an, Liangzhou, Guazhou, Hami, Turfan, Karashahr, Kucha, the Bedel pass, Issyk-Kul, Suyab, Tashkent, Samarkand, the Iron Gate, Termez, Balkh, Bamiyan, Kapisa, Peshawar, Taxila, Kashmir, Mathura, Kanauj, Prayag, Sravasti, Kushinagar, Varanasi, Vaishali, Nalanda) and home (Kanauj, Taxila, the Indus crossing, Kapisa, the Pamirs, Tashkurgan, Kashgar, Khotan, Dunhuang, Chang'an); km from great-circle distances along the line × 1.25, rounded; the generator re-run.
- Places, turn at Nalanda, the 24 letters of introduction as marks on the road out, years (629–645), pages every few hundred km (line, short paragraphs, a deeper read on the travel ban, Harsha's assembly, the historians' use of his record, and how Indian archaeology leaned on it), a dated chronicle, sources for each page; `ready: true` once the catalogue checks and a fact-check pass.
- Tests: the catalogue checks (part 1) pass for it; every page has a source; marks lie on the road out.

### Task 3: The visa and the shelf (`src/screens/walk/{Visa,Shelf}.tsx`, `#/routes`)

- `Visa({ def, stamp?: DayKey })` — hexagon (challenge), double-ringed seal with "EXPEDITION VISA" on its rim (expedition), admission slip with the author (book); the signature mark at the centre; the name fitted by `textLength` past 16 characters; with `stamp`, a gold exit stamp.
- `Shelf` — the four groups as map cards (length, time at your pace, era, hook; book routes the spoiler-free synopsis), "Choose for me" at the top, a route sheet with "Join this walk" (only with a place free, else the reason in words), "See its page", "Pin for later". Drafts show only in development builds, under "Drafts (not on the shelf)".
- Entry: a "Find a route" button under the Walk tab's routes.
- Tests: the visa for every kind renders its mark at 20–40 px on screen (iterate kinds); the longest name is fitted, not cut; the sheet offers no Join with both places taken and says why; production shelf lists ready routes only.

### Task 4: Joining (`src/screens/walk/JoinMoment.tsx`, `#/join?id=`)

- The whole road drawing itself faintly in its ink, the visa landing, title ("You've joined…" / "Your expedition begins…"), length, time at your pace, "with no deadline", chips (record, era, "Challenge 2 of 2"), the collection waiting empty ("0 of 20"), book routes "With the story" / "Places only" (saved with `setRouteStory`), "Start walking" / "Set out", "Add a target date" for challenges (a date input).
- The page writes nothing on its own: it is reached after `joinRoute` returned 'joined'. Opened for a route you aren't walking, it says so and offers the route page.
- Tests: static render of a challenge, an expedition and a book route; place count reads from the runs; the story choice only for books.

### Task 5: The route page (`src/screens/walk/RoutePage.tsx`, `#/route?id=`)

- In order: header (kind with mark and era, name, "A to B · <record>"), the route map (out and home drawn apart where it turns, with a key in words), the number ("1,234 of about 10,000 km · 12% · your day 45"), then and you (only with `then` or `years`), on the road (today's page: line, page, "Go deeper"), the signature collection (marks reached, names), the chronicle, milestones named in order, the target line, actions ("Set it down" / "Pick it up"; books "Pause the story here" / "Resume", with the chapters missed shown on resume), "About the book" with the full synopsis behind a warning until finished.
- Tests: no then-and-you without a record; full synopsis absent from the markup until finished or "Show it anyway"; paused shows Resume and no new chapter; an unknown id renders the plain page; the target line never says "behind".

### Task 6: Finishing and the day's budget (`src/screens/walk/FinishMoment.tsx`, `#/finish?id=`, `src/state/Celebrations.tsx`)

- Finish moment: the route drawn whole, the visa with its gold exit stamp, the numbers, "See its page". Seen id `walk-finish:<id>`.
- Celebrations builds the candidates (finishes unseen, the arrival, the state line), plays `momentToday`'s pick, writes `walk-moment:<today>`, and records the rest as `walk-later:<today>:<path>` for the banner.
- Tests: a finish and an arrival on one day: `/finish` opens and the arrival is recorded for later; a second save the same day opens nothing.

### Task 7: News from the road (`src/screens/walk/NewsBanner.tsx`, Walk tab and Today)

- `NewsBanner({ banner, onOpen, onDismiss })` — the first route's ink and thumbnail with you on it, its mark, the title and text, one action; several items open into a list, each with "Read". Dismiss marks every item's key seen.
- On the Walk tab in the slot above the routes; on Today as a banner candidate (priority 45, between occasion and install) rendered by the same view.
- Tests: one item and two items render the right words and action; dismiss writes the keys.

## Closing the part

Full suite under `TZ=UTC`, typecheck, build. Browser check at 360 px: shelf, join, route page, banner and finish for one challenge (Dandi), one book route (Harold Fry) and Xuanzang, with reduced motion and battery saver. One fresh reviewer; one fix pass.
