# Building the redesign, one screen at a time: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every pinned screen from the redesign boards into the app, one pull request per tab (every screen in that tab), then run one last `impeccable` design round for the pages no board pinned.

**Where the work runs:** each part is one tab and one pull request, built in its own forked Claude session, one screen (one commit) at a time; this session keeps the plan.

**Architecture:** Each part is one tab and one PR on branch `redesign/<tab>`. Each screen is its own task and its own commit on that branch: a static-render test that pins the screen's structure and copy, the component change in the screen's existing file, the CSS ported from the mock builder into that area's stylesheet, a check at three widths, finished before the next screen starts. The tab's PR merges once its last screen is in. Shared pieces are built inside the first screen that needs them and reused after. The last design round is a pinboard, not code; its screens join this queue only once pinned.

**Tech Stack:** Vite, React 19, TypeScript, Dexie (`dexie-react-hooks`), Vitest with `react-dom/server` static-render tests.

**Spec:** `docs/superpowers/specs/2026-11-19-redesign-build-design.md`. Reference boards: the picked board and board 23 (links in the spec, section 2). Mock sources: `Review shared/mockups/` outside the repo.

## Global Constraints

- **This repo is public:** no names, places, foods, medicines, body numbers or plans in code, tests or comments. Test values are invented; never copy a sample from a board.
- "Nothing that carries meaning is under 14 px." "Every target is at least 44 px." "Never colour alone."
- No marquee or moving text for anything essential.
- One-shot animations follow O44: "Every animation here plays once and ends still." Pinned loops keep looping (owner, 19 Nov); only decoration loops, never text or numbers. No reduced-motion variants (PRODUCT.md: the owner does not want them).
- Design bans: no eyebrows or kickers, no gradient text, no emoji icons, no glass decoration, no coloured left border wider than 1 px.
- Colours come from CSS tokens, so `html.contrast` reaches them.
- A component that imports the router (`window.location`) can't be rendered with `renderToStaticMarkup`. Keep pure view parts in files that don't import the router, and pass actions in as props.
- Tests run under `TZ=UTC`. A test that reads a git-ignored fixture skips cleanly when the file is absent.
- The latest board wins (spec section 4 lists the replacements).
- The app shows only what it stores. Anything a mock shows that the app does not store is left out and named in the PR description, or the screen moves to the last round (Task Z).

## Review Focus

1. **Empty and first-day states.** A new save, a day with nothing logged, a club with no matches played: no crash, no 0 standing in for "not logged" (show "—"), no empty card. Each screen task's test file includes one `renders with no data` case.
2. **Long names at 340 × 700.** Club, exercise, route and food names at their longest real length truncate with an ellipsis or wrap. They never push a number off the screen. Each screen task's width check covers it; the test case `keeps the number when the name is long` goes in every task whose screen has a name beside a number (tables, rows, cards).
3. **The real screen, 360 × 745.** A moment that fits a 660-tall board phone can still leave a band of page colour below it, or push its button under the edge, on the owner's phone. Every full-screen moment fills 745 with its main button ≥ 16 px above the bottom; every tab page shows its point above the 669 fold. Checked in Step 8 against board 24.
4. **The centred ring.** The ring-and-rays moment's centre piece sits in the exact centre at every size (owner's board 23 note). Pinned in Task 2.15 and reused by 2.16–2.19.
5. **Contrast mode.** `html.contrast` must still reach every new colour. Each task's width check is repeated once with `html.contrast` set.

---

## The screen loop

Every screen task below follows these steps; one part is one tab and one PR. A row in a part's table supplies the screen id, its board, the file, and what the test pins.

- [ ] **Step 1: Branch (first screen of a part only).** `git checkout main && git pull --ff-only && git checkout -b redesign/<tab>` with `<tab>` one of `home`, `football`, `train`, `walk`, `you`. Later screens in the part stay on that branch.
- [ ] **Step 2: Find the code.** Open the file in the row. Confirm it renders the screen by finding a line of the screen's current copy in it (`grep -rn "<copy>" src/screens`). If the row's file is wrong, use the one the grep finds and correct the row in this plan in the same PR.
- [ ] **Step 3: Read the mock.** Open the screen on its board, and find its builder string by id in `Review shared/mockups/` (`grep -n "'<screen-id>'" build_*.py`). List what the screen shows. Mark anything the app does not store; that part is left out (Global Constraints, last line).
- [ ] **Step 4: Write the failing test** in `tests/redesign/<screen-id>.test.tsx`: render the view with invented props through `renderToStaticMarkup` and assert the row's "Test pins", plus `renders with no data` (Review Focus 1).
- [ ] **Step 5: Run it and see it fail.** `npx vitest run tests/redesign/<screen-id>.test.tsx`. Expected: FAIL on the new pins.
- [ ] **Step 6: Build the screen.** Change the component to the mock's structure. Port its CSS into the area's stylesheet with the app's prefixes and tokens. Keep pinned loops looping.
- [ ] **Step 7: Run the tests.** `npx vitest run` then `npm run typecheck`. Expected: all pass, no type errors.
- [ ] **Step 8: Check it by eye.** Start the dev server, open the screen with dev seed data, and check at **360 × 745 and 340 × 700** (the owner's phone; tab pages have 669 above the tab bar), once with `html.contrast`. Moments fill the screen with the main button ≥ 16 px clear of the bottom; nothing fixed to the bottom covers content; compare with the screen on board 24. In the browser console, the overflow scan (no element past the phone's right edge outside a clipping parent) and the small-text scan (no text node under 14 px) both return empty. Freeze animations at the end (`document.getAnimations().forEach(a => a.finish())`) and compare with the mock side by side.
- [ ] **Step 9: Commit and push.** `git add` the test, the component and the stylesheet. Commit as `redesign(<tab>): <screen title>` and push. After the part's first screen, open the tab's PR as a draft titled `Redesign: <Tab> tab`, with the board links. Each later screen adds a line to the PR description: its id, a screenshot at 340 px, and its "Left out" list (Step 3).
- [ ] **Step 10 (last screen of a part only): Ship the tab.** Run `npx vitest run`, `npm run typecheck` and `npm run build` on the branch, mark the PR ready, and merge once CI passes, before the next part starts.

---

## Part 1 · Home (PR `redesign/home`)

| Task | Screen | Board | File | Test pins |
|---|---|---|---|---|
| 1.1 | `h6-c` Home C, aurora with the desk bars | 6 | `src/screens/today/TodayLayout.tsx`, `src/styles/today.css` | the desk header bars render in order; the aurora layer is `aria-hidden` |
| 1.2 | `t7-themes` Twelve themes | 7 | `src/screens/Settings.tsx`, `src/styles/tokens.css` | 12 themes listed; the paid two are marked locked by text, not colour alone |
| 1.3 | `h22-food` + `f4-bar` Food, the meal bar | 22 / 4 | `src/screens/FoodToday.tsx` | one bar segment per logged meal with its letter; the aim band present; no "to the aim" words |
| 1.4 | `f4-half` The half stack, Quick kcal | 4 | `src/sheets/LogSheet.tsx`, `src/sheets/QuickSheets.tsx` | order: search, Same as yesterday, saved meals, Quick kcal |
| 1.5 | `s5-a` Sleep, the night dial | 5 | `src/sheets/MorningLog.tsx` | both handles are buttons with labels and the times as text |
| 1.6 | `m6-full` + `m6-also` Good morning, whole page | 6 | `src/sheets/MorningLog.tsx` | dial, rested, weigh-in, soreness, then "Also this morning"; each place chip has a label |
| 1.7 | `s5-saved` After you save the morning | 5 | `src/sheets/MorningLog.tsx` | "Morning logged" lists each saved part |
| 1.8 | `k7-live` + `k7-frames` Checklist, hold to tick | 7 | `src/screens/today/DueCard.tsx` | each item has a button alternative to the hold; the ring loops as drawn |
| 1.9 | `k7-all` The last tick of the day | 7 | `src/screens/today/DueCard.tsx` | all done: the done chip text shows; gold only on this state |
| 1.10 | `c6-a` Close, reveal A | 6 | `src/screens/CloseDay.tsx` | the two buttons on one row, each ≥ 44 px |
| 1.11 | `c6-tiers` Close, the four tiers | 6 | `src/screens/CloseDay.tsx` | each tier names itself in text |
| 1.12 | `c5-break` Breakouts as a ribbon | 5 | `src/screens/CloseDay.tsx` | a breakout card carries the ribbon with its words |
| 1.13 | `c5-binder` Close, the month | 5 | `src/screens/DayClosed.tsx` | one small card per closed day; days not closed are empty, not 0 |
| 1.14 | `c6-week` Close, Sunday | 6 | `src/screens/CloseDay.tsx` | the stacked depth is decoration only (`aria-hidden`) |
| 1.15 | `s8-record` A record night | 8 | `src/screens/today/MomentCard.tsx` | the records card sits after NEXT; each lift names its record |
| 1.16 | `h7-perfect` A perfect day, without gold | 7 | `src/screens/today/RingMomentFx.tsx` | all four closed: the glow class is set; no gold text |
| 1.17 | `s8-win` The morning after a win | 8 | `src/screens/today/MatchToday.tsx` | the result card sits between NEXT and MEALS |
| 1.18 | `h12-log` Logging, each bucket its own fill | 12 | `src/screens/today/LogBelow.tsx` | one fill style per bucket; each has its number as text |
| 1.19 | `h12-more` The + sheet | 12 | `src/sheets/LogSheet.tsx` | every entry has an icon badge and a label |
| 1.20 | `h11-night` Night out, all neon | 11 | `src/sheets/NightOut.tsx` | the neon page renders its fields; no text under the moving sign |
| ~~1.21~~ | ~~`h10-left` What's left~~ | 10 | — | Dropped: the sheet stays removed (removed in edd6639; owner, 19 Nov) |
| 1.22 | `h10-status` Status, for an occasion | 10 | `src/screens/today/StatusChip.tsx` | occasions come from the app's list; lanterns `aria-hidden` |
| 1.23 | `h10-onthis` On this day | 10 | `src/screens/OnThisDay.tsx` | renders only on a memory date; the day's line is text |
| 1.24 | `o23-dawn` The morning reveal | 23 | `src/screens/Dawn.tsx` | one card at a time; "Tap to go on" and "Skip" are buttons |

## Part 2 · Football (PR `redesign/football`)

| Task | Screen | Board | File | Test pins |
|---|---|---|---|---|
| 2.1 | `f14-stadium` Tonight, Stadium | 14 | `src/screens/football/Tonight.tsx`, `src/styles/look-tonight.css` | most matches use Stadium; both crests and kick-off as text |
| 2.2 | `f14-poster` Tonight, Poster | 14 | `src/screens/football/Tonight.tsx` | big matches and cups pick Poster; crests whole |
| 2.3 | `f14-split` Tonight, Split | 14 | `src/screens/football/Tonight.tsx` | rivalries pick Split |
| 2.4 | `m15-pitch` The floodlit pitch | 15 | `src/screens/football/match/Pitch.tsx` | the score bug renders score and minute as text |
| 2.5 | `m16-cam` Broadcast camera | 16 | `src/screens/football/match/Live.tsx` | the camera view keeps the score bug |
| 2.6 | `n19-conc` + `n19-run` Opponents by number | 19 | `src/screens/football/match/Live.tsx` | opponent tokens carry squad numbers from the club's squad, not invented ones |
| 2.7 | `m17-tap`, `m17-scream`, `m17-clear` Event camera | 17 | `src/screens/football/match/Live.tsx` | each event kind picks its camera; the line under it is text |
| 2.8 | `m17-save` + `t17-save` Wonder save | 17 | `src/screens/football/match/Save.tsx` | the saver's card and minute; end frame shows the stopped ball |
| 2.9 | `g23-tap` Goal, the tap-in scene | 23 | `src/screens/football/match/Takeover.tsx` | scorer's card, the chance %, the score; the line changes with each goal (carries `m15-goal`'s note); no radar |
| 2.10 | `g23-scr` Screamer scene | 23 | `src/screens/football/match/Takeover.tsx` | long-shot kind picks the screamer scene; no radar |
| 2.11 | `g23-run` Breakaway scene | 23 | `src/screens/football/match/Takeover.tsx` | counter kind picks the breakaway scene; the ghost cards `aria-hidden` |
| 2.12 | `t17-bloom` Hat-trick (as it is) | 17 | `src/screens/football/match/Takeover.tsx` | unchanged look; third goal by one player picks it |
| 2.13 | `f23-ft` Full time, what played | 23 | `src/screens/football/FullTime.tsx` | one row per ability that played; the opponent's hidden ability card says whether it woke |
| 2.14 | `c19-dusk` Club, the night slate | 19 | `src/screens/football/club/ClubHome.tsx` | the doors in order; the dusk footer `aria-hidden` |
| 2.15 | `m23-rival` A rival is born | 23 | `src/screens/football/moments/RivalBorn.tsx`; new shared `src/screens/football/moments/Orb.tsx` | builds `Orb({ colour, children })`; the centre piece is a grid child with `place-items:center` and no offset transform; the modifier as text |
| 2.16 | `m23-level` Club level up | 23 | `src/screens/football/moments/LevelUp.tsx` | uses `Orb`; Keep and the new step are buttons |
| 2.17 | `m23-sign` A sponsor signs | 23 | `src/screens/football/moments/Signing.tsx` | the four rows: what, paid, clause, risk; no invented sums |
| 2.18 | `m23-open` Opening night | 23 | `src/screens/football/moments/OpeningNight.tsx` | uses `Orb`; icon centred (owner's note) |
| 2.19 | `m23-awake` Awakening | 23 | `src/screens/football/moments/Awakening.tsx` | uses `Orb`; card centred (owner's note); the new trait as text |
| 2.20 | `s23-change` Up three divisions | 23 | `src/screens/football/moments/SeasonChange.tsx` | the step count and target tier as text; real before/after numbers only if stored |
| 2.21 | `s23-wr1`–`s23-wr3` Wrapped | 23 | `src/screens/football/moments/Wrapped.tsx` | the season, best axis from match values, moments and verdict; one slide at a time |
| 2.22 | `f21-card` A player, crowns side by side | 21 | `src/screens/football/players/Card.tsx` | history row with each card's step crowns |
| 2.23 | `c22-binder` Squad, the binder | 22 | `src/screens/football/club/Squad.tsx` | three equipped abilities at the top |
| 2.24 | `c23-trials` Trials, players as cards | 23 | `src/screens/football/players/Screens.tsx` | each trialist as their card with stars and outcome; no letter boxes |
| 2.25 | `c23-academy` Academy, growth as rings | 23 | `src/screens/football/players/Screens.tsx` | sessions and growth rings with the numbers as text; free places say so (graduation page is Task Z) |
| 2.26 | `u19-power` A unit | 19 | `src/screens/football/players/Rotation.tsx` | players best first; tonight's starter first and lit |
| 2.27 | `g21-ground` The ground at night | 21 | `src/screens/football/club/Ground.tsx` | the built share as text beside the drawing |
| 2.28 | `b21-list` Staff, the bonds | 21 | `src/screens/football/club/Bits.tsx` | one plate per bond; no red slash |
| 2.29 | `b21-nadia` A bond | 21 | `src/screens/football/club/Bits.tsx` | the rank-up shows old and new rank as text |
| 2.30 | `m19-ledger` Money, the ledger | 19 | `src/screens/football/club/Money.tsx` | the balance rolls once, then rests; offers as letters |
| 2.31 | `d20-board` The board | 20 | `src/screens/football/desk/Desk.tsx` | the season's asks and how you stand on each |
| 2.32 | `d20-packs` Packs and the album | 20 | `src/screens/football/tree/PackScreens.tsx` | album cards fan out |
| 2.33 | `c23-congress` Congress, the tactics board | 23 | `src/screens/football/desk/Congress.tsx` | per motion: for, against and abstain counts as numbers; Passing or Falling as words |
| 2.34 | `l19-home` League, current page | 19 | `src/screens/football/league/LeagueHome.tsx` | your crest beside your position; the ladder of crests in table order |
| 2.35 | `l19-full` League, the full table | 19 | `src/screens/football/league/Table.tsx` | every club with crest, form, GD, points; long names truncate, numbers stay |
| 2.36 | `s23-final` The final table | 23 | `src/screens/football/league/Table.tsx` | the season-end variant: champions row, top eight, "All N clubs"; P hidden at 340 px |
| 2.37 | `c21-cal` Calendar | 21 | `src/screens/football/league/Calendar.tsx` | tonight leads; the season's days in order |
| 2.38 | `n21-news` The news | 21 | `src/screens/football/league/News.tsx` | filters per kind; the feed by day |
| 2.39 | `u23-big` The Big Cup | 23 | `src/screens/football/league/Cups.tsx` | tonight's tie, the road of rounds with the current one marked by text |
| 2.40 | `u23-pair` The Pair Cup | 23 | `src/screens/football/league/Cups.tsx` | same component, its own colour |
| 2.41 | `c20-cups` The cups (Story) | 20 | `src/screens/football/cup/CupScreens.tsx` | the won trophies and the record |
| 2.42 | `u23-cab` Cups, the cabinet | 23 | `src/screens/football/cup/CupScreens.tsx` | twelve slots: won, next and locked each named in text |
| 2.43 | `u23-one` One won cup | 23 | `src/screens/football/cup/CupScreens.tsx` | W tiles, score, biggest win, goals by move |
| 2.44 | `k23-liv` Club page, not met | 23 | `src/screens/football/league/ClubPage.tsx` | after Task Z settles opinion: build with it; hidden trait blurred with its label in text |
| 2.45 | `k23-wiki` Wiki | 23 | `src/screens/football/league/Wiki.tsx` | info box as a `dl`; the rival flag only for your rival |
| 2.46 | `k23-pyr` The pyramid | 23 | `src/screens/football/league/Pyramid.tsx` | tiers from the app's tier list (not a fixed count); "You" on your tier |
| 2.47 | `m23-events` Event nights | 23 | `src/screens/football/league/Events.tsx` | nights from the app's event list, in its order |
| 2.48 | `m23-set` Football settings | 23 | `src/screens/football/story/Settings.tsx` | switches are real `role="switch"` with labels |
| 2.49 | `s19-book` Story, the scrapbook | 19 | `src/screens/football/story/Moments.tsx` | filters for All, Screamers, Saves, Giants, Runs |
| 2.50 | `s19-giant` Giant beaten | 19 | `src/screens/football/story/Moments.tsx` | both crests and the score as text |
| 2.51 | `s21-seasons` Seasons, a carousel | 21 | `src/screens/football/story/Seasons.tsx` | pennants newest first; each reachable without swiping (buttons) |
| 2.52 | `s20-rival` The rival | 20 | `src/screens/football/story/Rivalry.tsx` | both crests and the rivalry modifier |
| 2.53 | `s20-bounty` Bounties | 20 | find with `grep -rln "ount" src/screens/football` | this week's bounties with reward text |

## Part 3 · Train and the live session (PR `redesign/train`)

| Task | Screen | Board | File | Test pins |
|---|---|---|---|---|
| 3.1 | `t4-g1` + `t4-h1` The exercise list, gym and home | 4 | `src/screens/Train.tsx`, `src/screens/train/ExerciseCard.tsx` | GYM or HOME tag per card; "find your load" where no weight is known |
| 3.2 | `t3-body` The body chart | 3 | `src/screens/MuscleMap.tsx` | after Task Z settles `o23-mus`; front and back with the key |
| 3.3 | `t10-guide` Exercise guide | 10 | `src/screens/ExerciseGuide.tsx` | the mirror cue first; the glint `aria-hidden` |
| 3.4 | `t10-plan` The plan editor | 10 | `src/screens/PlanEditor.tsx` | sessions as tabs; each drag handle has a move-up and move-down button |
| 3.5 | `t10-short` Short on time | 10 | `src/sheets/ShortSession.tsx` | 20, 30, 40 minutes; each kept exercise says why |
| 3.6 | `t12-records` Records, centred medals | 12 | `src/screens/RecordsWall.tsx` | the 1, 2, 3 centred (same check as `Orb`) |
| 3.7 | `l11-before-a` + `l11-before-b` Before | 11 | `src/screens/live/BeforeScreen.tsx` | road and set list views of the same blocks |
| 3.8 | `l11-guide-a` Guide, the figure | 11 | `src/screens/live/GuideScreen.tsx` | the key instructions stay as text beside the figure (its open note) |
| 3.9 | `l11-plates` Plates change | 11 | `src/screens/live/PlatesScreen.tsx` | old and new plates as text; the swap loops as drawn |
| 3.10 | `s12-ladder` The set, the ladder | 12 | `src/screens/live/SetScreen.tsx` | the rep count as text; the +1 float `aria-hidden` |
| 3.11 | `l11-check` Check, with fixes | 11 | `src/screens/live/CheckScreen.tsx` | − and + fix the count; the change line says what changed |
| 3.12 | `l13-rest` Rest | 13 | `src/screens/live/RestLive.tsx` | the time left as text; the ring not cropped |
| 3.13 | `l11-record` A new record | 11 | `src/screens/live/RecordScreen.tsx` | Keep going is cream with dark ink |
| 3.14 | `l11-look-b` Quick look, the scoreboard | 11 | `src/screens/live/QuickLooks.tsx` | flip digits carry the numbers as text |
| 3.15 | `q13-seal` + `l10-finale` The finale and quality seal | 13 / 10 | `src/screens/live/LiveFinale.tsx` | flags first; seven pages in order; the seal's bar colours |

## Part 4 · Walk (PR `redesign/walk`)

| Task | Screen | Board | File | Test pins |
|---|---|---|---|---|
| 4.1 | `w5-region` + `w5-today` + `w5-zooms` The flight board and zooms | W5 | `src/screens/WalkTab.tsx`, `src/screens/walk/WalkTop.tsx` | short days open on Today, long ones on Region; the three zooms are buttons |
| 4.2 | `p5-map` The map | W5 | `src/screens/MapPage.tsx` | full-height map with the three zooms |
| 4.3 | `p5-stop` A small stop | W5 | `src/screens/walk/StopView.tsx` | the scene `aria-hidden`; the place facts as text |
| 4.4 | `p6-stretch` A stretch | W6 | `src/screens/walk/StretchView.tsx` | the stretch name on the board as text |
| 4.5 | `w8-choose-a` + `w22-routes-b` Choose a walk | W8 / 22 | `src/screens/walk/RouteCards.tsx` | the departures-board list; each route's ticket view |
| 4.6 | `w8-join-a` Joining, the route poster | W8 | `src/screens/walk/JoinPage.tsx` | the route draws once; the join button stays in reach at 745 |
| 4.7 | `w8-arrive` Arriving | W8 | `src/screens/walk/ArrivalPage.tsx` | one map only, behind the seal |
| 4.8 | `w9-dep` Departures | W9 | `src/screens/walk/RoadPages.tsx` | every milestone ahead: when, where, status in words |
| 4.9 | `w9-postcard` A postcard | W9 | `src/screens/Postcard.tsx` | one per town reached |
| 4.10 | `w9-receipt` The week's receipt | W9 | find with `grep -rln "receipt" src` | the week's totals as text |
| 4.11 | `w9-week` Week recap | W9 | `src/screens/reports/WeeklyStory.tsx` | Yes and No buttons; plainer than the month (its open note) |
| 4.12 | `o23-road` The road so far | 23 | `src/screens/walk/RoadSoFar.tsx` | each kind of place keeps its shape and a text label |
| 4.13 | `o23-finish` A walk finished | 23 | `src/screens/walk/FinishPage.tsx` | the road draws once; the exit stamp as text |

## Part 5 · You and Reports (PR `redesign/you`)

| Task | Screen | Board | File | Test pins |
|---|---|---|---|---|
| 5.1 | `y6-deck` Today's lift | W6 | `src/screens/you/TodaysLift.tsx` | nine cards; each reachable by a button, not only a swipe |
| 5.2 | `y7-insights` Insights | W7 | `src/screens/Insights.tsx`, `src/screens/insights/Ask.tsx` | the answer leads with the plain sentence |
| 5.3 | `y8-story` The month's story | W8 | `src/screens/MonthlyFilm.tsx` | nine slides you tap through |
| 5.4 | `y8-body` Body check-in | W8 | `src/screens/BodyLog.tsx` | four steps in order |
| 5.5 | `y9-char` Character | W9 | `src/screens/Character.tsx` | the worn title as text; each reward works once unlocked (its open note) |
| 5.6 | `y9-diary` Diary | W9 | find with `grep -rln "Diary" src/screens` | the run strip, then each day |
| 5.7 | `y9-exp` Experiments | W9 | find with `grep -rln "xperiment" src/screens` | a running experiment in its card |
| 5.8 | `y9-meds` Medicines | W9 | `src/screens/Medicines.tsx` | the last seven days per medicine as text, not colour alone |
| 5.9 | `y9-reveal-s` Reveal, sealed | W9 | `src/screens/Reveal.tsx` | before reveal day: the sealed state and the date |
| 5.10 | `y9-settings` Settings | W9 | `src/screens/Settings.tsx` | grouped lists; each row icon has a label |
| 5.11 | `p5-reports` Reports, a living month | W5 | `src/screens/reports/ReportsHome.tsx`, `MonthPage.tsx` | the week poster, then the month calendar |
| 5.12 | `p5-earned` Earned, the case | W5 | `src/screens/Earned.tsx`, `src/screens/earned/TrophyShelf.tsx` | each trophy named |
| 5.13 | `w7-wrapped` Wrapped | W7 | find with `grep -rln "Wrapped" src/screens --include=*.tsx` (outside football) | progress bars on top; one slide at a time |
| 5.14 | `o23-year` The year | 23 | `src/screens/Year.tsx` | months as tiles; empty months show "·" not 0 |
| 5.15 | `o23-ach` Achievements wall | 23 | `src/screens/AchievementsPage.tsx` | one cell per achievement; the earned count as text |
| 5.16 | `o23-check` Checkup | 23 | `src/screens/DataPages.tsx` | all clear: the line says what was checked |
| 5.17 | `o23-hist` Edit history | 23 | `src/screens/DataPages.tsx` | changes by day, Undo on each |
| 5.18 | `o23-snap` Snapshots | 23 | `src/screens/DataPages.tsx` | seven kept plus the one before the last big change |
| 5.19 | `o23-arch` Reports archive | 23 | `src/screens/reports/Archive.tsx` | months and weeks as tiles |
| 5.20 | `o23-corr` Corrections | 23 | `src/screens/reports/Corrections.tsx` | the form and the ledger; empty ledger says so |

## Task Z · The last design round

Not code. It runs once all of Parts 1–5 that do not wait on it are merged, or sooner if the owner asks.

**Files:**
- Create (outside the repo): `Review shared/mockups/build_final_round.py`, writing `Review shared/final-round.html`.
- Modify: this plan. Add each pinned screen as a task in its part, and fill in Tasks 2.44 and 3.2.

- [ ] **Step 1: Triage.** For every page in spec section 6, items 5 and 6, open it in the app with dev seed data and mark it *keep* or *redesign*. Add any page found during Parts 1–5 that needs a redesign and was not pinned.
- [ ] **Step 2: Run `impeccable`** on the redesign list together with items 1–4 of spec section 6: the graduation transition, club pages with that club's opinion of you, the market with named players, and one muscle page. Same rules as the boards. Real numbers come from the backup, read locally only. Hypotheticals are labelled.
- [ ] **Step 3: Publish the board** and ask the owner, in one numbered list, the open questions: readiness, "km" on departures, plus any the round raises.
- [ ] **Step 4: Fold the pins into this plan** as new rows, one screen per task, and commit with `docs: final round pins`.
