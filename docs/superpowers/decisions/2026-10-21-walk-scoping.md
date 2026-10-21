# Walk scoping decisions

Date: 21 Oct 2026 · Branch: `scope/walk` · Status: scoping done; debloat built on `debloat/walk` (not merged)

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

1. The Walk tab gets a **debloat** that removes and rearranges; the visual redesign comes later. The full list is `docs/superpowers/specs/2026-10-21-walk-debloat.md`. It is written up now and built later.
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

## Debloat answers (21 Oct 2026)

12. Side quests are removed.
13. The strength lock on the passes is removed; the passes stay as named places.
14. Things built by training are removed.
15. The farmer-carry gold trail is removed.
16. Lanterns for doses are removed.
17. The "a month ago" ghost walker and the "you've walked Delhi to Mumbai" line are removed, including from the film.
18. People met on the road stay, shown on the Walk page on the days you meet someone.
19. Stride becomes a setting. The owner's eighth answer, "add as setting", is read as the stride question, because a setting fits it and not the journal question.
20. The forecast's track record is removed with the forecast.

## Round 2 verdicts (21 Oct 2026)

All 66 answered on the second pinboard. The owner's notes are paraphrased.

- **More routes:** pinned another country, a themed route, short walks from a list, and every route moving with the same steps. Dropped a route through personal places, choosing where each day's steps go, and walking India again. "After India, another country begins" is a maybe. New idea from the notes: **opt-in challenges** running alongside the main walk, perhaps two side routes at once, and not only in India.
- **Small stops:** pinned all six kinds (rivers, state borders, food, forts and temples, wildlife, strange true facts; "can have multiple, I love stuff like this"). Pinned both "every two or three days" and "about once a week". Dropped small postcards; one line on the Walk page is a maybe.
- **Named stretches:** pinned both a week and two weeks, and a small moment at the end of each. Tomorrow's line: pinned on Walk, maybe on Today, dropped at Close the day.
- **Status and places:** pinned a kind line on status days and a count of place types per stretch. The resting walker, travel notes, place marks on the trail and office-only marks are maybes.
- **Arrivals:** full screen for every city and for every state line. Playing at Close the day is dropped; playing at the next open is a maybe.
- **Chapter film:** the trail drawing and the steps and days. Postcards, people and the best day are dropped.
- **Passport and places:** a stamp for every city and every state, not small stops. The passport replaces the postcard strip. States and cities filled in on the main map, and a separate "places I've been" page.
- **Evenings and themes:** at Close the day the walker moves the day's kilometres and the next stop is named. Festivals, sky events and personal dates all reach the walk scene.
- **Reports and Wrapped:** a weekly report from the road, not cut to two or three sentences; "only when something happened" is a maybe. Wrapped yearly or on reveal day are maybes; at chapter ends is dropped; training, food and sleep are dropped from it, so Wrapped is about the walk.
- **Journal:** keep three lines and remove are both maybes.
- **Stride:** typed in as a length. Height and the home loop are dropped.

## Decisions from round 2

21. Every route moves with the same steps; there is no choosing where steps go.
22. More routes are wanted: another country, a themed route, and short walks from a list, run as opt-in challenges beside the main walk.
23. Small stops come in all six kinds.
24. Small stops are not postcards.
25. Named stretches each end with a small moment.
26. Tomorrow's line appears on the Walk tab, not at Close the day.
27. Status days get a kind line; each stretch counts its home, office, travel and out days.
28. Every city and every state line gets a full-screen arrival. It does not play at Close the day.
29. A chapter's film shows the trail drawing and the steps and days.
30. The passport has a stamp for every city and state and replaces the postcard strip. States and cities are filled in on the map, and a "places I've been" page is added.
31. At Close the day the walker moves the day's kilometres and the next stop is named.
32. Festivals, sky events and personal dates all reach the walk scene.
33. A weekly report from the road. Wrapped, when it comes, is about the walk only.
34. Stride is typed in as a length in Settings (default 0.74 m).

## Round 3 verdicts (21 Oct 2026)

Answered on the third pinboard. The owner's notes are paraphrased.

- **Challenges:** pinned up to two at once, challenges of a few weeks, a mix of lengths, famous walks of the world, themed routes in India, wild routes, routes from books and films, counting from the day you join, no deadlines, an optional target date that is never a penalty, a stamp and a full-screen moment on finishing, and cards under the main walk. Notes: any challenge over 500 km may be added as a third, optional slot (main walk plus two plus one long one). The famous walks are the heart of it: historically and culturally important routes, with a piece of their history shared each day on the track, and a comparison of the owner's walk with the original walkers' (where the history records it).
- **Pace:** pinned both "stops follow the land" and "a stop every two or three days, always"; stretches of one to two weeks set by the land; a small stop shown as a line under the title; several facts per stop, one tap for the next; the week's stops in the weekly report. Stops in the scene and on the map are maybes.
- **Arrivals:** play right after the steps are logged, whenever a place is reached. Replay from the passport.
- **Weekly report:** on the Walk tab on Mondays (on Today is a maybe), as a few tap-through cards, covering places, stops and people and the numbers, with no report for an empty week. A paragraph is dropped.
- **Wrapped:** only a "so far" version you can open any time. A December, anniversary or reveal-day Wrapped is dropped.
- **Journal:** the owner asked what it does now before deciding.
- **After India:** a new country becomes the main walk, and the owner picks which. "Only challenges" is dropped.
- **Last maybes:** the walker rests at camp on status days; travel days say you travelled; tomorrow's line on Today as well. Place marks on the trail are dropped.

## Decisions from round 3

35. Challenges run beside the main walk: up to two at once, plus a third slot for one challenge over 500 km.
36. Challenges come in all four kinds: famous historical walks, themed routes in India, wild routes, and routes from books and films. Lengths range from a few weeks to long ones.
37. Each famous walk shares a piece of its history each day, and compares the owner's pace with the original walkers' where that is recorded.
38. A challenge counts from the day you join, has no deadline, may carry an optional target date that is never a penalty, and ends with a passport stamp and a full-screen moment.
39. Active challenges show as cards under the main walk.
40. Small stops follow the land but never leave more than about three days without one. Each has several facts, one tap for the next, and shows as a line under the title on the day you reach it.
41. Named stretches run one to two weeks, ending where the land changes.
42. An arrival plays right after the steps that reach it are logged, and can be replayed from the passport.
43. The weekly report is a few tap-through cards on the Walk tab on Mondays, covering places, stops, people and the numbers, and is skipped for an empty week.
44. Wrapped is a "so far" view of the walk, open any time.
45. When India is finished, the owner picks a new country as the main walk.
46. On sick, injured and break days the walker rests at camp; travel days say so. Tomorrow's line appears on the Walk tab and on Today.

## Round 4 (21 Oct 2026)

47. The journal is removed: never used, never seen. Other ways to show the same information may come up later.

## Open questions

- Smaller maybes for the design pass: the weekly report on Today, small stops in the scene and on the map, map targets and labels.
