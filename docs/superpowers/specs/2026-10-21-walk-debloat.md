# Walk debloat: what goes and what changes

Date: 21 Oct 2026 · Branch: `scope/walk` · Status: agreed list, not yet built

The owner's decisions from the Walk pinboard and the debloat questions (`docs/superpowers/decisions/2026-10-21-walk-scoping.md`), turned into one list of removals and changes. The debloat **removes and rearranges**. It adds no new look; the visual redesign comes later. **This repo is public:** no personal values here.

## Removed

| What | Where it lives now | Notes |
|---|---|---|
| **Side quests** | `src/walk/quests.ts`, `QuestPanel` and `QuestSketch` in `src/walk/WalkExtras.tsx`, `useQuestState`, the Quests sub-tab, the quest spurs and the key entry on the map (`routeMap.ts`, `MapPage.tsx`), `detourKm` in `WalkTab.tsx` and `MapPage.tsx` | Old `quest:` rows in `db.walk` are left alone and simply no longer read |
| **The strength lock on the passes** | `effectiveKm`, `passOpen`, `strengthIndex`, `bestStrengthIndex` in `src/walk/passes.ts`; the "Waiting at the foot of…" line in `WalkTab.tsx` | The three passes stay as named places on the road (see Changed) |
| **Things built by training** | `src/walk/camps.ts` (`buildFor`, `structuresFrom`, `meetBuilt`); the built marker in `WalkScene.tsx`; "Built a … by the road" in the journal; "You passed something you built"; built-by-you marks and key on the map | |
| **Farmer-carry gold trail** | `loadedSteps` in `src/walk/journal.ts`; `carryFrac` in `WalkScene.tsx`; "loaded steps" in the journal head | Carry sets themselves stay in training |
| **Lanterns for doses** | the `lanterns` prop and drawing in `WalkScene.tsx`; "A lantern burned at camp" in the journal; `lanternOn` / `dayDoses` use in `WalkTab.tsx` | Medicine logic elsewhere is untouched |
| **The "a month ago" ghost walker** | `ghostLastMonth`, `ghostX` and the ghost drawing; the "A month ago you were…" line | |
| **"You've walked Delhi to Mumbai"** | `distanceInTerms` in `src/walk/journal.ts`; its uses in `WalkTab.tsx` and `src/domain/film.ts` | Removed from the film too, as the owner chose "remove" over "keep in the film" |
| **The chapter forecast and its track record** | `walkForecast` in `src/walk/cards.ts`; the saved `walk:` forecasts and `recordLine` use in `WalkTab.tsx`; the forecast in the journal foot, the Route sub-tab and the map's chapter card; the chapter mark on the Journey clock rim (`chapterEndOn`) | Departures keeps its own ETAs. Old `walk:` rows in `db.forecasts` are left alone |
| **The souvenir shelf** | `SouvenirShelf` in `WalkExtras.tsx`, `src/walk/SouvenirArt.tsx`, the shapes in `src/walk/souvenirs.ts`, the Souvenirs sub-tab, "Keep" on the city page | The souvenir names may come back in the passport; keep `SOUVENIRS` data until that round decides |
| **The four sub-tabs** | the `Seg` and `extraTabs` prop in `WalkTab.tsx` | Replaced by one scroll (see Changed) |
| **The Journey hub link on Walk** | the "Overview" row in the Route sub-tab | The hub stays reachable from You ("Journey clock") |
| **The second page per city** | `src/screens/ArrivalCard.tsx` and its route `#/arrival` | Merged into the postcard (see Changed). Old `#/arrival?city=` links redirect to `#/postcard?c=` |
| **Code nothing shows** | `Flyover` (never opened), `nightCamp`, `trailSegments`, `terrainAt`, `stateEntries`, `QUAD`, `CARD_CITIES`, `CHAPTER_COUNT`, `SOUVENIR_SHAPES`, and their tests | Git keeps them if a later round wants one back |

## Changed

1. **One kilometre figure.** A single function gives the walk's distance from the step total, and every screen uses it: the Walk tab, Today's band, the map, postcards, arrival toasts and chapter moments, km milestones, Departures, Day closed, the Ticker, You, the film, Wrapped, shake stats, achievements, the workbook export and the Logbook day card. With quests and the pass lock gone, it is the plain step total in kilometres. This fixes the mismatches listed in the inventory (postcards from beyond a closed pass, journal places, two forecasts).
2. **Passes as places.** Banihal, Zoji La and Fotu La stay on the route as named points with their heights, reached by steps like any other place.
3. **One scroll.** The Walk tab reads top to bottom: the scene and title; one status line; the last few journal days with any person met; then links to the map and Departures.
4. **One status line.** It shows the km to the next stop. It names a person met when there is one today.
5. **People met on the road stay**, shown on the page itself on the days you meet someone, not only inside the pulled-up journal.
6. **One page per city.** The postcard carries what the arrival card had: the scene at the hour, the fact, eat, hear, the landmark on the way in, and the next stop. Map dots and the city chips open it.
7. **Stride as a setting.** Settings gets a stride length typed in metres (default 0.74 m), used by the one kilometre function. The map says in one line how steps become kilometres. Changing it changes the whole walk at once, so the setting says that before saving.
8. **Departures stays as it is.**

## Not touched in the debloat

The scene art and landmarks, the route itself, the postcard text, Departures, the Journey hub's contents, Night sky, and the training and medicine features that fed the removed walk extras.

## Still open

- **The journal:** the owner's numbered answers skipped this question (keep three plain lines, or remove). The plan above keeps a short journal; confirm in round 2.
- **Map targets and labels** at 44 px and readable sizes: a maybe, for the redesign.
