# The week-forward check

A repeatable check that plays a week forward on a real save, through the real screens, and photographs every page every day. It exists because the faults that break trust (a fixture shown with no match, a chance stuck at 1%, a signing with no moment, a trend word against its own numbers) are found by a person opening pages on one day, not by unit tests.

## Running it

```bash
npm run check:week -- --backup <path to a backup .json> --days 7 --out <folder outside the repo>
```

Options: `--start YYYY-MM-DD` (default: the backup's own day, at the time it was exported), `--port 5199`.

It needs Google Chrome installed (it drives it through `playwright-core`; no browser download) and no network: every request that is not the local app is blocked. A seven-day run takes about 18 minutes; most of it is photographing every route each day.

**Privacy.** The backup, the pictures and the text it saves are personal. `--out` must be outside the repository (the command refuses otherwise). Never commit a backup or anything from `--out`.

## What it does

1. Starts the app (Vite dev server, local) and Chrome at 360 × 745, dark, India time, touch on.
2. Restores the backup with the app's own `restoreData`.
3. **Finds every route.** Doors in this app are buttons that call `go()` or `openSheet()`, so it clicks every control on every page once (one of each kind of row), starting from the five tabs, with **writes blocked** (IndexedDB read-write transactions and localStorage writes throw), so a click can only show where it leads. Routes are keyed by page (`/football/club?view=money`), not by record ids. Overlays that open in place ("?", popovers, confirm dialogs) are listed too. The list is in `routes.json`; router pages and sheets from `src/App.tsx` never reached are reported.
4. **Plays each day** by moving the browser's clock (Playwright's `clock`; no app hook) through the day: 07:30 the parcel and last night's match (watched once, skipped otherwise), the morning log; 10:00 once-off actions; 13:30 meals ("Same as yesterday"); 18:30 a session on training days (every set at its prefilled numbers); 21:00 steps typed, the checklist; 22:30 every route photographed; 22:45 the day closed (01:30 the next morning on the "closed late" day). The plan varies the days on purpose: a usual day, a record step day, a rest day with nothing logged, a day closed late, a day with only sleep, a perfect day, a missed day caught up the next morning. Step counts come from the save's own goal and best day (`scripts/week-forward/plan.mjs`).
5. **Once-off actions** in mid-week (`actions.mjs`): sign a sponsor, start a building, research a tech, pick a kit, wear a title, change theme, tie a trialist, spend dice on the desk, a cup run stop, change the plan and tempo. Each is a short series of taps; if a tap is not on screen it is noted, never forced.
6. **Saves per day** (`<out>/days/<date>/`): a full-page picture and the text of every route (`pages/`), every step of the owner's path with what the app said back (toasts and moments) and a picture (`path/`), and the stored state's key numbers morning and night (`state-*.json`: season, day, table, budget, sponsors, staff, projects, research, dice, trend rows, rings).
7. **Checks** (`checks.mjs`, tested in `tests/week-forward-checks.test.ts` on made-up days): pages with errors, empty bodies, "undefined", "NaN", "null", raw ids or engine wording; a figure stated two ways on one day (budget, place, matchday, record, rating); pages against the stored state; a trend word against its two figures; "built" beside 0 of N; a fixture shown with no match played, or a match played and not shown; counters that should have moved (season day, research, season track, buildings); state changes with nothing said that day (money, staff, sponsors, buildings, titles, divisions, trialists, step records); a door's figure missing from the page it opens; text cut to an ellipsis, targets under 44 px, text under 14 px, sideways scroll, something fixed covering content at the end of a page; routes with no door. Each flag has the day, the route, the evidence and the picture.
8. Writes `report.md`, `flags.json` and `week.json` in `--out`.

## Reading it

The automatic pass finds contradictions; it does not find things that make no sense, pages that say nothing useful, or moments that should have happened. After a run, go through each day's pictures as the owner would and write those down separately.

## Limits

- The match is skipped on most mornings and watched once; live calls get the first choice.
- The survey clicks one control of each label shape per page, so a door that only appears for some records may be missed. Doors reached only through a sheet opened by a long press are not found.
- Writes are blocked while photographing, so "seen" markers set by opening a page are not set by the survey; the owner's path sets them on the pages it visits.
