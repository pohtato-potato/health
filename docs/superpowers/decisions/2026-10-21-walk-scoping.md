# Walk scoping decisions

Date: 21 Oct 2026 · Branch: `scope/walk` · Status: pinboard answered; round 1 questions folded into the debloat round

Scoping for the Walk tab (`#/walk`). No visual design here: design happens later, outside this repo. **The repo is public:** personal values stay out.

## Sources

- The survey: `docs/superpowers/scoping/walk-inventory.md`.
- The Walk pinboard (a private claude.ai page, 72 pins in eight lanes: fixes, cuts and merges, story, arrivals, souvenirs, links, the later list, and 23 features from other apps). Verdicts and notes are kept there, outside the repo.
- `PRODUCT.md`, `DESIGN.md`, and the later list in `docs/superpowers/specs/2026-10-21-training-redesign-design.md`.

## Settled before round 1

From the owner's brief and the standing rules, not yet from answers:

- The walk across India, made of the owner's own steps, stays, and keeps its own tab.
- The goal of this round is a leaner tab. The souvenir shelf, as drawn now, goes unused.
- Samsung Health import is in scope only if it is little hassle. Samsung's day resets at midnight and logging happens late, so any import must handle finished days, not live counts.
- Standing rules: standard text size for the magnifier, never colour alone, 44 px targets, gold only for what was earned, no logging streak, nothing rewards eating less, no notifications, references are features and the look stays the app's own.

## Round 1 questions

1. In one or two sentences, what is the walk for, to you? (A reason to walk more, a story to follow, a picture of how far you've come, something else?)
2. When you open the Walk tab, what do you look at first, and what do you do next?
3. Which of these have you never used or never noticed: the Journal, the Route sub-tab, the map, Departures, arrival cards, postcards, the Souvenirs shelf, Quests, the Journey overview?
4. The walk carries nine extras: farmer-carry gold trail, things built by training, lanterns for doses, strength-locked mountain passes, side quests, people met on the road, souvenirs, the "a month ago" ghost walker, and distance comparisons ("Delhi to Mumbai"). Which ones would you keep?
5. The kilometres differ between Today and the Walk tab after a detour or at a closed pass. Should one number rule everywhere? If so, should detours and passes be allowed to hold you back at all?
6. Should training ever be able to stop the walker (the strength-locked passes), or should training only add things?
7. The full route is about nine years at 10,000 steps a day, and chapter 1 has an arrival about every seven weeks. Would you rather have more small stops on the same route, a shorter route that ends near reveal day, or keep it as it is?
8. What happens when you arrive somewhere today (a toast and a postcard)? Is that enough, or should arriving be a full-screen moment?
9. The souvenir art doesn't interest you. What would: detailed drawn objects in colour, a passport of stamps, a room that fills up, souvenirs earned from moments rather than states, or none at all?
10. Arrival card and postcard are two pages with the same text. Merge them into one?
11. Should the Journey overview (clock, reports, heatmap, streaks, reveal day) move off the Walk tab, to You?
12. Departures (the airport board): keep it on Walk, fold it into the map, move it to You, or drop it?
13. What would make you open the Walk tab more often? Something new every few days, a daily diary page, a "tomorrow's steps reach X" line, a link from Today's scene, or something else?
14. Samsung Health import: would you use an occasional import of Samsung's export file (a few taps a month) to fix missed or wrong days, a screenshot import, or neither? Do you ever forget to log steps for a day?
15. Health Wrapped: should it exist, when (yearly, reveal day, end of a chapter), and should the walk be at its centre?
16. Should postcards also go to Logbook's shelf?
17. Is there anything about the walk you love and are afraid a leaner version would lose?

## Pinboard verdicts (21 Oct 2026)

71 of 72 pins answered. The owner's notes are paraphrased.

### Pinned

- **Fixes:** one kilometre figure everywhere; no postcard from beyond a closed pass; a detour never sends you backwards; training never stops the walk; say how steps become kilometres (the owner has been thinking about stride for a while).
- **Cuts:** one page per city; the four sub-tabs become one scroll; one line under the title, not six; fewer mechanics on the walk ("a major goal here is to debloat"); move the Journey hub off the Walk tab; remove what's never shown ("very bloated currently").
- **Story:** something every few days; what tomorrow's steps would reach; named stretches of road; a walk that waits kindly (sick, injured, travel, a break); office days on the map.
- **Arrivals:** a full-screen arrival; crossing a state line; a chapter ends with a film; the landmark rises on approach (loved).
- **Souvenirs:** a passport of stamps.
- **Links:** closing the day walks you on; themes on the road.
- **Later list:** skip Samsung Health import; Health Wrapped with the walk at its heart.
- **References:** The Conqueror (postcards along the route), World Walking (many short walks to choose from), Finch (an adventure report), Been (places filled in on a map), Atlas Obscura (one strange true fact per place).

### Maybe

Journal, camps and people on the same road; grade the forecast you were shown; map targets and labels; people who come back (no person has ever been seen); drop souvenirs altogether; Today's scene opens the walk; Polarsteps (animated map replay), Walkr, Duolingo (chests between stops), Strava (heatmap), Apple Fitness (animated awards), Google Maps Timeline, Spotify Wrapped.

### Dropped

Quest rewards that arrive (no quest has ever been noticed, so no point); the forecast (never seen once, so it can go); the day as a travel diary page; the road's weather from sleep; postcards to Logbook's shelf; early and late arrivals; souvenirs as detailed objects, with stories, for moments, or as a room; what training builds, made visible; farmer carries as loaded steps; Logbook sees where you were; Samsung import by file or screenshot; Alto's Odyssey, Pokémon GO, Flighty, Zombies Run!, Pikmin Bloom, Animal Crossing, Journey, Geocaching, Monument Valley, Forest, Slow Roads.

### No verdict, with notes

- **Departures:** keep as is; it is liked because it gathers everything in one place.
- **A route that fits the year:** no need. The app is for the long term, well past the goal date. Open to several walking routes running side by side, or similar ideas, to brainstorm.

## Decisions

1. The next step is a **debloat** of the Walk tab, done before more scoping rounds. It removes and rearranges; the visual redesign comes later.
2. One kilometre figure for the walk, used on every screen.
3. Training never stops the walker, and nothing sends the walker backwards.
4. The arrival card and postcard become one page per city.
5. The Walk tab is one scroll, with one status line under the title.
6. The Journey hub leaves the Walk tab. Departures stays as it is.
7. The chapter forecast is removed.
8. Code nothing shows is removed.
9. The souvenir shelf as drawn goes; a passport of stamps is the direction for later.
10. No Samsung Health import.
11. The route stays as long as it is. Several routes at once is an idea for a later round.

## Open questions

- Which mechanics stay (sent to the owner as the debloat questions).
- Where code changes live and whether that branch may be pushed.
- For later rounds: parallel routes, something every few days, named stretches, the passport, full-screen arrivals, Wrapped.
