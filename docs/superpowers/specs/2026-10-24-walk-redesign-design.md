# Walk redesign: the page, the road, arrivals, the passport, the map, and challenges

Date: 24 Oct 2026 · Branch: prototype on `proto/walk` · Status: draft for the owner's review

This spec turns the Walk scoping (four cloud rounds), the debloat, two pinboards, a four-part challenges deep dive, three mockup rounds and five prototype rounds into one design for the Walk tab. The look comes from the working prototype the owner approved (`#/proto/walk`, files `src/screens/proto/walk*.tsx`, `src/styles/walk-proto.css`), built in the app's own living-colour world.

**This repo is public.** No names, places walked, step counts, dates walked or body numbers go into code, tests or comments. Numbers below are examples. The owner's decision files live outside the repo in the shared Walk folder.

## Sources

- Cloud scoping, rounds 1–4, and the debloat spec: branch `scope/walk`, `docs/superpowers/decisions/2026-10-21-walk-scoping.md` and `docs/superpowers/specs/2026-10-21-walk-debloat.md`. The debloat is built on `debloat/walk`.
- The consolidated plan, the pinboard verdicts and every mockup and prototype round: shared Walk folder, `decisions/`.
- The challenges deep dive, parts 1–4 (the catalogue of 50 routes, how history is told, book routes and spoilers): shared Walk folder, `from-claude-code/`.
- The Today redesign spec (`2026-10-21-today-redesign-design.md`), where the two meet: the walk scene on Today, the banner slot, the Monday story, films.

## Goals

1. **A story to follow, and a sense of scale.** Your everyday steps, done as one journey, really would have reached these places. Every screen is built to make that land.
2. **Leaner mechanics, richer road.** Fewer systems (the debloat), more history, people and land on the road you're on.
3. **One template for everything.** Every route page, joining page, banner, arrival and stamp is drawn from data. Adding a route or a city never needs a new screen.
4. **Grand moments, rarely.** One full-screen moment a day at most. Everything else waits as a banner or a quiet line.

Non-goals: no logging streak, no notifications, nothing rewards eating less, nothing ever fails or goes backwards, no choosing where steps go, data stays on the phone.

## Design language

- **Living colour.** Every Walk screen sits on the aurora from Today and Train (`src/ui/live/Aurora.tsx`, `src/styles/live.css`), tinted by the region you're walking through. Battery saver is black and still; reduced motion replaces drift and drawing with fades; `html.contrast` reaches every colour through tokens.
- **Each route has one ink,** set in its data. A route's ink tints its card glow, its border, its walked line, its banner and its joining page. **Never gold:** gold is only for records, finished routes' exit stamps and the top achievement.
- **The map card** is the one look for challenge and shelf cards: the route's real land, framed to the route's own extent, with a glow in its ink behind it, the walked part bright and the rest dashed, an era stamp, and a ribbon for book routes. The poster, ticket and data-art looks were tried and discarded.
- **Landmarks** are painted, layered silhouettes in the scene's four inks, seen along their setting (the Gwalior fort on its cliff is the standard). The same drawing is engraved on its passport stamp. **No religious motifs** in any drawing, stamp or ornament; places of worship appear as part of a skyline only when they are the city's single defining landmark, and never as the emblem.
- **Accessibility, every screen:**
  - standard text size for the magnifier, never larger by default, nothing that carries meaning under 14 px;
  - never colour alone: every state has a word ("walked", "set down", "aiming for", "reached");
  - targets at least 44 px, main actions 50–56 px;
  - stable positions: nothing moves while you look at it, and lines that come and go keep their space;
  - long names fit by measured shrinking (`textLength`, a computed size), never by cutting them off.
- **Phone fit.** Every screen is checked at 360 px wide (the owner's phone), not only at 375.

## The Walk tab, top to bottom

One scroll, no sub-tabs. Tapping Today's walk opens this tab (Today's full-screen walk sheet is retired).

1. **The scene.** The road, the walker at road scale, and the land of the region. Today's piece of road is drawn brighter. The next two or three stops stand on the horizon, and the nearest landmark rises as you get within about 40 km. Festivals, sky events and personal dates reach the scene (lamps at Diwali, the Geminids, full moons, bunting on the owner's birthday).
2. **The milestone stone and the strip.** One front-on stone at the road's edge, about 40 × 50 px, with the next city's name in Hindi on its cap and the distance on its body. Under the scene, a strip says it in full: "Gwalior · 112 km".
3. **The title.** The stretch's storybook name, with the plain route under it. "Near X" within 20 km of a place, otherwise "Between X and Y". Below it, the small row of place and status pickers moved from Today.
4. **Status lines.** Up to three short lines, each kind at most once, in this order: an arrival, a small stop, a person met, a rest or travel day ("Resting at camp outside Agra. The road waits."). Their space is reserved so the page doesn't jump.
5. **Tomorrow.** One line: what a usual day reaches, and what a big day reaches.
6. **Challenges.** Up to two challenge cards (the map card), each with your dot on its line, km of total, the stretch, today's line and any target. Tapping opens the route page.
7. **Expeditions.** Up to two slim lines, each with the route's thumbnail, name, km and a tap to its route page.
8. **Doors.** Map · Passport · Departures · Wrapped. ("Wrapped so far" is renamed "Wrapped".)
9. **The shelf door.** "Choose a walk", with a count of free places ("1 challenge place free").

## The road: stretches, small stops, people

- **Stretches.** One to two weeks long (about 100 km at the default pace), each ending where the land changes. Naming starts from Agra. Each has a storybook name, the plain route, and a long page: history, politics, people and land, written for a political-science reader, from every side. A stretch's end is a half-screen sheet on the next open.
- **Chapters step back.** They show only on the map and at a chapter's end (the chapter film).
- **Small stops.** Six kinds, each with a word and a mark: River, Border, Food, Fort and palace, Wildlife, Strange but true. They follow the land, but never more than about three days apart. Each has three to five facts, shown one at a time ("1 of 4"), and appears as a status line on the day you reach it. A wildlife stop shows its creature (Today's Warli-star drawing) if you've found it, or a blank star outline if not.
- **People met** on the road appear as a status line on the days you meet them.
- **Height above sea level** shows on every arrival, as on Indian railway station boards.
- **Writing.** All of chapter 1's stretches and small stops are written, with sources, before their part ships.

## Arrivals

- **Every city and every state line** gets a full-screen arrival, drawn from data for any of the 46 cities.
- **When it plays:** right after the steps that reach it are saved, from the Steps sheet or the morning log, when the day saved is today or yesterday. Saving an older day only adds the stamp quietly. It never plays inside the morning reveal.
- **A city arrival is five beats,** tap to go on, with "Skip" always visible:
  1. **Approach:** the walker reaches the landmark (the city's own scene when drawn, otherwise the app's scene for its region).
  2. **Footprints:** the name, the day of the walk, the km and the steps it took.
  3. **Zoom out:** from the walker to all of India, the whole trail drawn, the states reached shaded.
  4. **The same road at other speeds:** how long this distance took at typical speeds through history, from a bullock cart to a train today.
  5. **The stamp:** it lands in the passport, with "ARRIVED · AGRA · date" and the height.
- **A state line** adds how the land changed since you set off, and the count ("3 of 28 states").
- **Day one beside today** sits on the Footprints beat.
- **One page per city:** the postcard, what to eat and hear, the land, the next stop. Buttons say where they go ("Passport", "Back to the walk").
- **Arrival days** mark Today's walk caption with the stamp until midnight.
- **Reduced motion** uses fades; **battery saver** uses still frames.

## The passport

- **A booklet** with a page per state or union territory, in the order reached. City stamps go on their state's page. Pages you haven't reached are hidden; the cover says how many there are to find.
- **Every stamp is different:** its own shape and border from a stamp template, the city's landmark engraved, "ARRIVED · AGRA · date". States and union territories have different stamp shapes and separate counts ("3 of 28 states · 1 of 8 union territories").
- **One souvenir line** per state page ("Kept: a box of petha from Agra").
- **Visas** for finished challenges and expeditions, at the back, each in its route's visa shape.
- **Replay** any arrival from its stamp.
- **Places I've been:** the counts and the share of India's area you've walked into.

## The map

- **A night map with survey details:** reached places glow, the trail is drawn in its region's ink, with the survey sheet's hatching and triangulation marks.
- **Real geography:** Natural Earth (public domain), India's point-of-view borders, all 36 states and union territories, drawn equirectangularly and simplified. Borders the route really crosses are drawn (Dholpur, and the Chambal as the Rajasthan–Madhya Pradesh line).
- **Three levels, with word buttons:** the current stretch (opens here), the chapter, all of India. Reached states take their region's ink, with names always written, never under 14 px.
- **The flyover:** a Strava-style flight along your trail so far, about 15 seconds, tap to stop.

## Challenges and expeditions

### Shape

- **Every road moves with the same steps,** from the day you join it.
- **The main walk** is India, then a new country you pick (later).
- **Challenges** are routes up to 1,500 km. **Expeditions** are longer. You can walk **two challenges and two expeditions at once.**
- **Setting down and picking up** works for both. Progress is kept, steps while it's down don't count, and a set-down route frees its place. Nothing ever fails.
- **The first expedition:** Xuanzang's road, the full round trip, ready on launch day.
- **"Choose for me"** suggests the next route from what you've pinned and finished.

### The life of a route

1. **The shelf:** grouped by kind (Indian history, World history, Books and films, Strange and wild), each a map card with length, time at your pace, era and hook. Book routes add a spoiler-free synopsis. A route's sheet has "Join this walk" and "See its page".
2. **Joining:** a full-screen moment in the route's character:
   - its whole road draws itself faintly across its land, in its ink;
   - a visa in the shape of its kind (a hexagon for a challenge, a double-ringed seal with "EXPEDITION VISA" round its rim for an expedition, an admission slip with the author for a book route), carrying its signature mark;
   - the title ("You've joined…" or "Your expedition begins…"), the length, the time at your pace, "with no deadline";
   - chips: kind of record, era, the place it takes ("Challenge 2 of 2");
   - its collection waiting empty ("0 of 20");
   - book routes ask, once, "With the story" or "Places only";
   - "Start walking" (or "Set out"), and "Add a target date" for challenges.
3. **Walking:** the card or slim line on the Walk tab, and the **route page**.
4. **Finishing:** a full-screen moment, the route drawn whole, the exit stamp landing on its visa (gold, because it was earned).

### The route page (one template, from data)

Modelled on the approved Xuanzang page:

1. **Header:** the kind with its mark ("Expedition · 629–645"), the name, "Chang'an to Nalanda · Recorded place by place".
2. **The route map:** the land, the whole route (out and home drawn differently where it turns), the labelled places, your dot.
3. **The number:** km walked, large, "of about 10,000 km · 26% · your day 261".
4. **Then and you,** only where a record exists: their days or years beside yours, at your pace.
5. **On the road:** today's page, in three layers: a line, a page of short paragraphs, and a long "go deeper" read on politics, economics and the historians' arguments.
6. **The signature collection:** the thing you collect on this road and nowhere else (Dandi's 24 grains of salt, the Tōkaidō's 53 stations, Hadrian's 80 milecastles, Hannibal's 37 elephants, Sigeric's 79 stages, Harold's postcards, Xuanzang's 24 seals). Routes without one get a default from their kind of record, about one mark per 50 km.
7. **The chronicle:** dated entries where the record has them.
8. **Milestones** of its own kind, named in order.
9. **Target date,** if set: "aiming for 14 March", never "behind". A missed target disappears quietly.
10. **Actions:** "Set it down" / "Pick it up". Book routes add "Pause the story here" / "Resume".

### News from the road

- **A banner on Today or the Walk tab** when something happens on a challenge or expedition: the route's ink, its thumbnail with you on it, its mark, what happened, and one action ("Read what happened").
- **At most one expedition banner a day.** Several events gather into one banner ("2 things happened on the road", "See both").
- **A day's budget:** one full-screen moment (a finish, or else an arrival, or else a state line). Anything else that day becomes a banner.

### How history is told

- **Then vs you** only where a record exists, tagged by kind of record: dated day by day, recorded place by place, dated by the story, estimated by historians, no record. Where there's no record, the app says nothing rather than invent.
- **All sides, critically:** conquest, colonialism, state myth and Partition are told plainly and from every side. Pilgrim routes are told culture first, with religion only where it shaped the history.
- **Book and film routes:** "with the story" or "places only" when joining; "Pause the story here" bookmarks the plot so you can go and read it, and "Resume" catches you up. Full synopsis behind a warning, unlocked at the finish. A "Books on the road" reading list. Written in our own words: no quotations, no copied maps.

### The catalogue: 50 routes

| | Challenges (up to 1,500 km) | Expeditions (over 1,500 km) |
|---|---|---|
| **Indian history** | Shivaji's escape, the Dandi March, the kos minars, the Rani's last campaign, the night ride from Meerut, the Maratha forts, the Deccan sultanates, the Indus cities, the spice coast | Xuanzang (round trip), the Grand Trunk Road (+ Kim), the Great Arc, Humayun's flight, Bose's escape, the Great Hedge |
| **World history** | Hadrian's Wall, Athens to Sparta, Shackleton's crossing, the Kokoda Track, Cortés to Tenochtitlan, the Tōkaidō, the Camino (+ The Way), Napoleon's retreat, the Silk Road leg, Hannibal, the Ten Thousand | Sigeric's road, Livingstone's last journey, Mansa Musa, Burke and Wills, the Inca road, the Long March, the Long Walk |
| **Strange and wild** | the Rann of Kutch, Spiti | the Tropic of Cancer |
| **Books and films** | Three Men in a Boat, The Hobbit to Rivendell, Harold Fry, Piku | The Lord of the Rings, Fogg's India crossing, Wild, A Walk in the Woods, Bashō's Narrow Road, Seven Years in Tibet, The Grapes of Wrath, The Motorcycle Diaries, Zindagi Na Milegi Dobara, Chasing the Monsoon |

Every route ships with its line, its places, its signature and its written pages, each fact with a source. A route without its writing done does not appear on the shelf.

## Stories across days

- **Monday:** one Monday story on Today, with the walk's cards inside it (replaces the Walk tab's own Monday report).
- **Films:** Today's monthly film carries the month's trail drawing; the chapter film (about 15 seconds, tap to skip) plays at a chapter's end; Wrapped holds the full replay and **the road so far** timeline.
- **Close the day:** the walker walks the day's kilometres and the next stop is named.
- **Rest at camp** on sick, injured and break days; travel days say so.

## Data

### Route catalogue (code, not the database)

Every route is one file, `src/walk/catalogue/routes/<id>.ts`, exporting a `RouteDef`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | stable, kebab-case |
| `name`, `era`, `hook` | string | `hook` is one line |
| `group` | `'india' \| 'world' \| 'books' \| 'wild'` | shelf group |
| `km` | number | the route's length; over 1,500 makes it an expedition |
| `record` | `'dated' \| 'place' \| 'story' \| 'estimated' \| 'none'` | kind of record |
| `region` | region id | which drawn land it sits on |
| `ink` | CSS colour | never a gold |
| `places` | `{ name, km, at, label?: boolean }[]` | along the route, in order: km from its start, `at` its index in the drawn line |
| `turn` | number? | km where an out-and-home route turns back |
| `signature` | `{ title, note, mark, marks: { km, name? }[] }` | optional; defaults from `record` |
| `book` | `{ by, synopsis, fullSynopsis, chapters: { km, text }[] }`? | book and film routes |
| `then` | `{ who, totalDays, places: { name, theirDay }[], source }`? | only where a record exists |
| `years` | `{ theirs, note }`? | expeditions |
| `pages` | `{ km, title, line, page: string[], deeper?: { title, text } }[]` | today's page is the last one at or before your km |
| `chronicle` | `{ when, place, text }[]`? | |
| `sources` | `{ title, url? }[]` | at least one |
| `ready` | boolean | false until its writing is done and reviewed; only ready routes appear on the shelf |

Route lines are drawn from the region's projection: each route's waypoints are kept as longitude and latitude in `scripts/geo/routes.json` and projected by `scripts/make-geo.py` into the generated `src/walk/geo/routes.ts`. Regions' land, India's states and their areas are generated into `src/walk/geo/regions.ts`. Generated files are never edited by hand.

### Walking a route (database)

A new table `routes` in database version 4, one row per route ever joined:

| Field | Type | Notes |
|---|---|---|
| `id` | string | the route's `id` |
| `spans` | `{ from: DayKey; to?: DayKey }[]` | days it was walked; `from` counts, `to` (the day it was set down) doesn't |
| `story` | `'story' \| 'places'`? | book routes |
| `storyPauseKm` | number? | set by "Pause the story here" |
| `target` | DayKey? | optional target date |
| `doneOn` | DayKey? | set when the finish moment is shown; once set, a route stays finished |

Seen moments, arrivals played and banners dismissed use the existing `seen` table with prefixed ids (`walk-arrival:<place>:<km>`, `walk-moment:<day>`, `walk-news:<route>:<km>`, `walk-stretch:<id>`).

The backup and the workbook export include `routes`. Older backups without it import unchanged.

### Derived numbers

- **The one kilometre figure:** `kmFromSteps(steps) = steps × stride / 1000`, stride from Settings (default 0.74 m, accepted 0.3–1.5 m). Every screen uses it.
- **A route's km:** the sum of `kmFromSteps` over the days inside its spans, capped at its length. Days with no steps saved add nothing.
- **A route is finished** when its km reaches its length, or `doneOn` is set.
- **Places taken:** active challenges (not set down, not finished) and active expeditions, two of each at most. "Join" is offered only when a place of that kind is free.
- **Time at your pace:** route km ÷ your usual daily km (the median of the last 28 days with steps; 10 km if fewer than 7 such days), said as days, weeks, months or years.
- **Signature marks reached:** the marks at or before your km; without `marks`, `count = max(6, round(km / 50))` marks spaced evenly.
- **"Near X":** within 20 km of a place; otherwise "Between X and Y".
- **Usual and big day** (Tomorrow's line): the median and the 90th percentile of the last 28 days with steps.
- **Share of India's area:** the sum of reached states' areas over India's total, from the generated areas.

## Removed or retired

- Everything in the debloat spec, already built on `debloat/walk`.
- Today's full-screen walk sheet (`WalkFull`); Today's walk opens the Walk tab.
- The Walk tab's Monday report (folded into Today's Monday story).
- The current map page and arrival card layouts (replaced).

## Out of scope for this build (later list)

- The next country after India, and its route.
- Routes after the catalogue: the Ottomans, the Mongols, revolutionary France, Southeast Asia.
- Elevation profile, land mix, Samsung Health import, choosing where steps go, souvenirs as objects.

## Build order

Each part ships on its own, behind no flag, with its tests.

0. **Groundwork:** merge `debloat/walk` and the prototype onto the current base; retire `WalkFull`; Today's walk opens the Walk tab; replace the landmarks the owner chooses (open question 2).
1. **Geography and the route engine:** the geo generator and generated data, `RouteDef`, the `routes` table, route km, places, spans, the drawn map card and route map components.
2. **The Walk tab page:** scene with stone and strip, title, status lines, tomorrow, rest days, challenge cards and expedition lines, doors, living colour.
3. **Stretches and small stops,** with chapter 1's writing.
4. **Arrivals and the passport:** the five beats for any city, state lines, the stamp template, the booklet, visas, replay, places I've been, landmark art for every city.
5. **The map:** the night survey map, three levels, India's states, the flyover.
6. **Challenges and expeditions:** the shelf, joining, the route page, signatures, milestones, target dates, setting down, news banners, the day's moment budget, book routes and spoilers, finishing.
7. **The catalogue,** in batches of about ten routes with sources, alongside parts 3–6. Xuanzang ships with part 6.
8. **Stories:** the Monday join, films, Wrapped and the road so far, Close the day, festivals and sky in the scene.

## Testing

- Pure rules test-first in `tests/walk-*.test.ts`: route km over spans, places taken, finished, marks reached, near/between, usual and big day, time at your pace, which arrivals play and which are quiet, the day's moment budget, banner gathering.
- **Catalogue checks** for every route: places in order and within its length, at least one source, ink not gold, a line with at least two points, `then` only when `record` is not `none`, pages sorted by km.
- Static render tests (`react-dom/server`) for the route page, joining page, banner and stamp against routes with and without content, including the longest name.
- Browser checks at 360 px on the restored dev data for each part, with reduced motion and battery saver on and off.
- Tests run under `TZ=UTC`.

## Open questions for the owner

1. **Tōkaidō's macrons:** on the S23, does "Tōkaidō" show its ō correctly? (It renders wrongly in the desktop preview only.)
2. **Landmarks that are places of worship.** Not only Bhopal: 11 of today's 46 city landmarks are religious buildings, and the church drawing carries a cross. I propose replacing all 11 with the city's best-known secular landmark, so the passport stays free of religious emblems:

   | City | Today | Proposed |
   |---|---|---|
   | Bhopal | Taj-ul-Masajid | the Upper Lake, with boats |
   | Madurai | the temple towers | Thirumalai Nayak Palace |
   | Nellore | the Ranganatha temple | the bridge over the Penna |
   | Bhubaneswar | the Lingaraj temple | Dhauli hill above the Daya river (the Kalinga battlefield) |
   | Hubballi | the Chandramouleshwara temple | Unkal Lake |
   | Puducherry | the Basilica | the promenade's old lighthouse |
   | Thiruvananthapuram | the Padmanabhaswamy temple | the Napier Museum |
   | Panaji | the Church of Our Lady | the Fontainhas houses |
   | Shimla | Christ Church | the toy train's arched viaduct |
   | Amritsar | the Golden Temple | the Town Hall (the Partition Museum) |
   | Leh | Shanti Stupa | Leh Palace |

   Replace all of them, only some, or keep them as architecture with the symbols removed?
3. **Writing the content:** I draft every stretch, stop and route page with sources, and you review each batch before it ships. Is that the split you want, and do you want to read every batch or spot-check?
4. **The Today branch** (`feat/today-page`) isn't merged into main yet, and part 0 builds on it. Merge it first, or build the walk on top and merge both together?
5. **Re-walking a finished route:** allowed (a second run with its own visa), or a finished route stays finished?
6. **The flyover** at 15 seconds: right length, or shorter?
