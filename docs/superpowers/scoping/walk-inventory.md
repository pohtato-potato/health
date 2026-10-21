# Walk tab inventory

Date: 21 Oct 2026 · Branch: `scope/walk` · Status: survey from the code, no changes made

This lists everything the Walk tab (`#/walk`) and its side pages contain today, how the walk is computed, and what looks unused, duplicated or bloated. It is the groundwork for the walk pinboard and the scoping questions. **The repo is public:** no personal values here. Example numbers assume 10,000 steps a day.

## 1. Where the walk shows up

| Place | Route / file | What it shows |
|---|---|---|
| **Walk tab** | `#/walk`, `src/screens/WalkTab.tsx` | Hero scene, title, a stack of status lines, and four sub-tabs: Journal, Route, Souvenirs, Quests |
| Route map | `#/map`, `src/screens/MapPage.tsx` | Zoomable India map, chapter card, chapter list, states chips, postcard strip, laps line |
| Departures | `#/departures`, `src/screens/Departures.tsx` | Split-flap board of milestones (walk, steps, training, shape), boarding passes, list of past arrivals |
| Arrival card | `#/arrival?city=`, `src/screens/ArrivalCard.tsx` | A stop's scene, fact, Eat / Hear / Keep / Land / Next |
| Postcard | `#/postcard?c=`, `src/screens/Postcard.tsx` | Paper postcard with a stamp, postmark, the same city text, day of the walk, that day's steps |
| Journey hub | `#/journey`, `src/screens/Journey.tsx` | Journey clock, phase card, On this day, a walk mini-map card, Departures card, Challenge, Achievements, Reports, every-day heatmap, Streaks, Reveal card |
| Night sky | `#/sky`, `src/screens/NightSky.tsx` | A star per perfect day, monthly constellations, the fort on the horizon. Linked from **You**, not Walk; its back link goes to You |
| Today | `src/screens/Today.tsx` | The walk band (same `WalkScene`, caption "Near X · n km to Y", day number, festive decor) |
| Day closed | `src/screens/DayClosed.tsx` | "Walk · 6.2 km · Agra tomorrow" |
| Ticker, You, Film, Wrapped, Shake stats, Achievements, Logbook shelf card | various | Walk km, place and pace used as one line each |

### The Walk tab, top to bottom

1. **Hero scene** (`WalkScene` with `hero`): the region's four-ink land lit for the hour, the next landmark growing as you near it (from 60 km out), your trail in sage, today's loaded (farmer-carry) steps in gold, a dashed road ahead, a faint "a month ago" walker, a tent with up to four **lanterns** (medicine doses on time), and the last thing you **built** (from training).
2. **Title:** "Near Bhopal" and "1,204 km · Chapter 1".
3. **Status stack** (up to six lines): km to the next stop; "You've walked Delhi to Mumbai" (distance in terms); **waiting at a pass** (gold); "You passed something you built" (gold, one line per structure); "A month ago you were 210 km back".
4. **Sub-tabs** (`Seg`): Journal · Route · Souvenirs · Quests.
   - **Journal:** a pull-up sheet, four days shown, up to 60 when raised. Each day: "Day 16 · 15,820 steps · crossed into Rajasthan near Bharatpur", a land line or "Camp near X", "Built a well by the road", "A lantern burned at camp", and **Met ·** a person on the road every 3–5 walking days. The chapter forecast sits at the foot with its track record.
   - **Route:** the forecast card again ("Kanyakumari around 14 Feb, between … and …"), a chip per **arrival card** reached, and three links: Route (map), Departures, Overview (the Journey hub).
   - **Souvenirs:** a shelf of 36 niches, one per state and territory; reached ones show a 36 px line drawing, a name and a note; the rest say "Waiting".
   - **Quests:** a side quest offered after a week above your step average (a detour to Sanchi, Hampi, Pangong…), "Take the detour" or "Stay on route", and a list of the ones taken.

## 2. How the walk is computed

- **Steps to km:** `kmFromSteps = steps × 0.74 m / 1000` (`src/domain/walk.ts`). One fixed stride; no height, no pace. 10,000 steps = 7.4 km.
- **Total:** the sum of every logged day's steps. A day not logged adds nothing (it is not counted as zero, it simply isn't there).
- **The route:** 94 stops and state marks in three chapters, positions on a 300 × 322 board from lon/lat.

  | Chapter | Route | Length | At 7.4 km a day |
  |---|---|---|---|
  | 1 | Delhi to Kanyakumari, 9 stops, 10 states | 2,870 km | about 13 months |
  | 2 | The Golden Quadrilateral and back to Chennai, 22 stops | 6,550 km | about 2 years 5 months |
  | 3 | Every remaining state and territory, ending in Leh | 14,060 km | about 5 years 2 months |
  | All | 46 distinct cities, 36 states and territories | 23,480 km | about 8 years 8 months |

- **Position:** `positionAt(km)` interpolates between the last stop and the next.
- **Regions:** `regionAt(km)` picks one of nine regions (plains, desert, ravines, deccan, ghats, coast, east, northeast, himalaya), which set the scene's inks, its skyline roughness and the journal's land lines.
- **Arrivals:** `arrivals()` replays the steps day by day and records the date each stop is passed. `Celebrations.tsx` fires a gold **Postcard** toast for a new city, a full **moment** at chapter ends, and moments at 17 km milestones (100 to 20,000). Seen keys live in `db.seen` (`city:`, `km:`, `chapter:`).
- **Forecast:** the end of the current chapter at the two-week average, with a ±20 % range; saved daily to `db.forecasts` so a track record ("3 of 4 forecasts landed") can be shown.
- **Training on the walk:**
  - **Built by the road:** each done session builds a lamp post, well, footbridge, shelter or rest house by quality (a record bumps it up a step), placed where the walk was that day.
  - **Passes (chapter 3):** Banihal, Zoji La and Fotu La open at a strength index of +10 %, +20 %, +30 % (best e1RM against the first month). Until then the walk **stops** at the pass's foot.
- **Medicines:** a lantern per dose taken on time today.
- **Farmer carries:** steps logged on carry sets show as a gold piece of trail.
- **Quests:** a taken detour **subtracts** twice its length from your km ("the detour doesn't move you along the route").
- **People on the road:** someone from the current region every 3–5 walking days, picked by a hash of the date (39 people, 4–5 per region).
- **Themes:** the scene takes the hour (dawn, day, dusk, night) and, on Today only, festive decor (Diwali, Holi, birthday). The region also feeds `themeDayOn` for Today.

## 3. Content on hand

- 46 cities, each with a postcard text (`POSTCARDS`), food and language (`cards.ts`), and a landmark silhouette (46 landmarks drawn from 22 shapes).
- 36 souvenirs, each a name and a note, drawn with **12 line icons** (so Delhi, Karnataka, Nagaland and Ladakh are all a bell; six states are a "textile" grid).
- 10 side quests, 39 people, 27 land lines (3 per region).

## 4. Problems found

### Honesty bugs (the numbers disagree)

1. **Two different kilometres.** Only the Walk tab and the map apply passes and detours (`effectiveKm`, `detourKm`). Everything else uses the raw total: Today's walk band, the Journey walk card, Postcard, the arrival toasts and chapter moments, km milestones, Departures, the Ticker, Day closed, You, the Film, Wrapped, shake stats, achievements, the workbook export and the Logbook shelf card. After a detour, or at a closed pass, Today and the Walk tab name different places.
2. **Postcards beyond a closed pass.** Arrivals use raw km, so the walk can "wait at the foot of Zoji La" while a postcard toast arrives from Leh.
3. **The journal and the builds ignore detours and passes** too (`journal`, `structuresFrom`, `peopleMet`), so "Camp near X" and "built a well near X" can name a place the Walk tab says you haven't reached.
4. **Two forecasts on one screen.** The one saved for the track record uses raw km; the one shown uses effective km. The track record can grade a forecast nobody saw.
5. **Quest rewards that never arrive.** Quests promise "a carved-gateway souvenir" or "a gharial postcard"; taking one only adds a text line. No souvenir or postcard appears anywhere.
6. **A detour costs you progress.** Taking a reward for a good week moves you backwards on the route by up to 560 km. That reads as a penalty.
7. **Training can stall the walk.** At a closed pass, steps keep being logged but the walker stops, possibly for months. That ties a walking feature to lifting numbers and can stop the favourite feature dead.
8. **One stride for everyone and every pace** (0.74 m). Fine as a convention, but it isn't stated on screen.

### Unused or unreachable

- `Flyover` in `ArrivalCard.tsx`: opens only with `?fly=1`, which nothing passes.
- `nightCamp` (camp weather from sleep), `trailSegments` (a coloured trail by day), `terrainAt`, `stateEntries`, `QUAD` (a chapter-1 teaser), `CARD_CITIES`, `CHAPTER_COUNT`, `SOUVENIR_SHAPES`: written and some tested, never drawn.
- `WalkTab`'s `extraTabs` prop: no caller.
- Night sky is walk-flavoured (the fort) but lives under You.

### Duplicated

- **Arrival card and postcard** are two pages per city with the same text (`fact` is the postcard text cut at "Next stop"). Route tab chips open arrival cards; the map's postcard strip opens postcards; the map's dots open arrival cards.
- **The forecast** appears in the Journal foot, the Route tab card, the map's chapter card, the Journey clock rim, Departures and the You "what if" slider.
- **"Next stop, km, ETA"** is on the Walk title stack, the map list, the map chapter card (twice there), the scene's label and Today's band.
- **Route and Departures** are joined by a switch (`RouteSwitch`) but also linked separately from the Route sub-tab and the Journey hub.
- **The Journey hub** (reached as "Overview") repeats a walk mini-map, Departures and Achievements, and carries non-walk things (Reports, heatmap, streaks, reveal day).
- **The scene** is the same on Today and the Walk tab.

### Bloat, and why the tab feels heavy

- Six layers of mechanics on one walk: steps, carries, builds, lanterns, passes, quests, people, souvenirs, plus a ghost walker. Each adds a line of text; none has its own moment.
- Up to six status lines between the title and the tabs before anything can be tapped.
- Four sub-tabs plus four side pages plus a hub: about nine surfaces for one feature.
- **Long dead stretches.** Chapter 1 has 8 arrivals in about 13 months: one every seven weeks. Bengaluru to Madurai is 435 km, about two months with nothing new to unlock. Most days the tab has nothing new to say beyond a land line.
- **The souvenir shelf is a grid of 36 small icons**, 12 shapes reused, no colour, no story, with three reached in the first year. It is no wonder it goes unused.
- **The walk outlasts its reason.** Reveal day is months away; the whole route takes about nine years at 10,000 steps a day.

### Accessibility notes (for the later design pass)

- Map labels are SVG text at 5.6–6.5 units on a 300-wide board: tiny without zoom. The map dots' tap circles are 11 units, below 44 px at 1× zoom.
- The states chips are 32 px tall (below 44 px). Zoom buttons rely on "+", "−" and "⤢" glyphs.
- The map's chapter key uses colour dots with words (good); the route lines differ by colour and dash pattern (good), but "walked" in sage vs gold for the reward relies on colour.
- The journal's pull handle is a drag gesture with a tap fallback (good).

## 5. Links to the rest of the app today

- **Today:** the walk band, festive decor, the region feeding theme days.
- **Train:** builds by the road, strength-gated passes, farmer-carry steps, "if every rep were a step" (shake stats).
- **Medicines:** lanterns.
- **Logbook shelf:** the daily `health.day` card carries `walk: { km, place, next }` (raw km).
- **Departures:** walk milestones beside step, training and shape milestones.

## 6. Samsung Health, as it bears on the walk

Steps are typed in by hand from Samsung Health (the Steps sheet, the morning log's "yesterday's final steps", and a setting to confirm yesterday each morning, because Samsung's day resets at midnight). An installed web app cannot read Samsung Health or Health Connect directly. The realistic routes are an occasional **file import** of Samsung's personal-data export (a zip of CSVs with daily step totals), or a share-sheet import of a screenshot. Either works as a back-fill and correction tool, not a daily feed.
