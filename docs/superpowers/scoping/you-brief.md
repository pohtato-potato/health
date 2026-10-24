# You redesign: brief for the design pass

24 Oct 2026 · Branch `scope/you` · Status: scoping done after four pinboard rounds. No design yet: design happens next, with impeccable, on the owner's machine.

This brief gathers the final state of every decision about the You tab (`#/you`) and everything under it. Where a later round changed an earlier one, only the later answer is written here. Sources: the survey (`docs/superpowers/scoping/you-inventory.md`), the decisions log with every verdict (`docs/superpowers/decisions/2026-10-21-you-scoping.md`, decisions 1–56), `PRODUCT.md`, `DESIGN.md`, the Train redesign spec, and the Walk and Today scoping decisions on their own branches.

## 1. What You is for

In the owner's words: time pass; sometimes stats and trends; and motivation on a slow day, to see everything that has improved. So You's first screen lifts a slow day and invites browsing. It is not a logging page (that's Today) or a settings page.

## 2. Rules

Kept:
- Standard text size for the Android magnifier: clear hierarchy, steady positions, no oversized type.
- Honest data: never show "not logged" as zero, never change a number silently.
- Data stays on the phone. No notifications; banners inside the app only.
- Gold only for something earned. No logging streak. Nothing rewards eating less.
- References are features from other apps; the look stays Health's own.

Changed in this scoping:
- **"Never colour alone" is retired app-wide.** Colour may carry meaning by itself. `DESIGN.md` and `PRODUCT.md` change when this is built.
- **44 px tap areas without changing the look.** Small controls grow their tap area invisibly, as Today did.
- **Larger text, High contrast and Big dials are removed.** `PRODUCT.md`'s accessibility section changes with them.
- **One exception to "never pre-fill":** tape readings at the check-in start at last time's value, with Skip on each. A reading left untouched is saved as "not re-measured", not as a new number.
- **Gremlin is the only voice.** It may carry the weekly and monthly lines and good-news headlines, with a switch to turn it down. Prompts, confirmations, joint flags and anything about the body or food stay plain.

## 3. The new map

```
You (#/you)
├── Header: the journey clock, prominent, outside the grid · day count · one earned title
├── Due line (goes when nothing is due)
├── Slow-day lift: what's better · day one against today · progress since day one · the nearest win today
├── Trophy case (fills itself until you choose up to six)
├── Fixed grid, never reorders
│   ├── Reports ── weekly story · month report · year page · every past week and month
│   ├── Earned ─── trophy case · monthly shelves · firsts · milestones · night sky · records wall · achievements · quiet streaks
│   ├── Body ───── check-in ritual · photos · tape history · reveal day
│   ├── Tracks ─── Food · Shape · Steps · Sleep · Training · Readiness · Joints (→ physio summary) · Drinks · Medicines · your own tracks
│   ├── Diary ──── any day since the start · month view · search
│   ├── Insights ─ ask your own data · kept cards · every trend · heatmap · record book · stat of the week · track record
│   ├── Journey ── the journey page (what is left after Reports and Earned moved out)
│   └── Settings
├── Browse: did you know · On This Day · three saved questions · jar of wins · league table · this week against your best · highlight reel · a random good day
├── Go to box (any page, month or setting)
└── A–Z index of every page
```

The order of the browse cards, and whether the Go to box sits at the top or the bottom, is for the design pass. Every page has one name, used on every door, link, banner and back link.

## 4. Page by page

### You
- **Header:** the journey clock (the whole journey as one day) gets a prominent place of its own, outside the grid, with the day count and one earned title.
- **Due line**, in plain words, one tap each: check-in due; weekly story ready; month report ready; backup days not saved; data check-up items; the year page; a milestone within reach. No appointments or refills. With nothing due, the line goes.
- **Slow-day lift:** "what's better" against four weeks ago and day one, each with its number; day one against today; progress bars since day one (km, sessions, check-ins, days logged, perfect days); the nearest win today ("1,400 steps beats your usual Tuesday"); Gremlin noticing a slow day and pointing at something that went well.
- **Browse cards:** a "did you know" fact from the shake deck; On This Day (a month and a year ago); three saved questions with live answers; a jar of wins (records, firsts, milestones and best days, one at random); your months as a league table (the owner is a big football fan); this week against your best week; the month's highlight reel; a random good day opening its Diary page.
- **Removed from You:** "A stat from your data" row (shaking stays), What if as it was, the Experiments row, the Character row.

### Reports
- **One weekly story for the whole app.** It replaces Today's Monday story, the Walk's Monday road cards and You's weekly review, recap and receipt. It is offered on Today on Monday and kept in Reports. Cards in order: the tally; the swing from last week; food (the week's statement); sleep (the balance); training (sessions, records, status word); the walk chapter (places, small stops, people, km); the best day; record lines; the week as a cricket scorecard; next week's odds; the last card, with backup and the weekly coach export. Lines carry some character.
- **Month report**, opened on the 1st: the monthly film with closing credits ("starring" top foods, songs, places, exercises); the assessment (what changed, what drove it, one or two things to try) with a report card per area; the lab report rows (value, usual range, a flag word); top fives; the month's sleep profile; with a year of data, the same month last year beside it.
- **The monthly ritual**, in one sitting and in order: photos, tape, t-shirt test, your sealed line, the month report, the Claude review step (workbook and prompt), a full backup.
- **Year page**, on the journey's anniversary: almanac tables by month; most-of lists; the replay; day one against today; the year as a temperature blanket.
- **Archive:** every past week and month, opened as it was.
- **Removed:** the climate report, the month and journey Wrapped, the separate weekly recap and receipt pages (their best parts go into the weekly story). The Walk round keeps its own walk-only "so far" Wrapped.

### Earned
In this order: the trophy case; this month's shelf; earlier months' shelves; firsts as a dated timeline; named milestones ("Century: 100 sessions"); the night sky (a star per perfect day); the records wall and achievements as doors at the foot. Today's gallery of moments lives in the monthly shelves, each moment replayable.
- Achievements that can repeat level up (perfect weeks, sessions in a month, km, check-ins on time, and any others that make sense). One-off firsts stay one-off.
- The character sheet goes. Its titles become trophies; the themes it unlocked move to the theme picker.
- **Streaks stay tracked, quietly:** steps, training weeks and perfect days are counted and shown somewhere low-key here or on Insights, never prominently.
- Each record has its story: the session, the step before it, how long it took, the song that was playing.
- The achievement wall keeps its current look.

### Body
- The door shows the next check-in date, the latest waist ÷ height, the number of check-ins, and sealed lines waiting for reveal day.
- The check-in itself is the monthly ritual above. Photos compare as now. The tape history is one strip: every check-in's readings, the posture gap, shoulder-to-waist and t-shirt scores.

### Tracks
Every page shares one shape: (1) a sentence headline ("Steps up 900 on October, mostly office days"), lightly cheeky only on good news; (2) what changed, why, what next; (3) the chart with your usual band in words; (4) the page's own views; (5) insights with their working and confidence, as many as are useful; (6) compare with another measure; (7) day-by-day history. Tracks home shows each page's headline sentence and a small chart per tile, in a fixed order. The app spots natural experiments (a trip, a sick week, a new plan) and shows what moved. You can add your own tracks (a number, a 1-to-5 scale or yes / no), starting from a short list of ideas.

Each page's own views, top to bottom:
- **Food:** the week as a bank statement (opening budget, each day, the save-up, closing balance); a protein clock, office against home; the chart; the food compendium (every food ever logged, how often, first eaten, usual portion, protein per 100 kcal).
- **Shape:** a forecast cone for waist ÷ height on reveal day; the weight trend with reasons written on it; the tape strip; the photo door.
- **Steps:** habit strength (leads the page); every day sorted low to high with the target marked; what a good week looks like beside this week; the chart with office days marked.
- **Sleep:** the sleep balance in hours; the sleep-lab chart (each night a bar across the clock); social jet lag in minutes; the month's sleep profile. The fixed tip line goes.
- **Training:** a status word (building, holding, easing off, back from a break); strength per exercise over months with plan versions marked (replacing the "+0%" figure, saying "not enough sessions yet" until it can speak); did readiness call it; form over months. Train keeps tonight; this page keeps the months.
- **Readiness:** what fed each day's score, written out; readiness against how sessions went; fitness and freshness over months.
- **Joints:** a calendar per joint with flags and swaps, what came before each flag, swaps in place, the physio summary door.
- **Drinks:** nights this month, with "No drinks" as an answer; the morning after (steps, sleep, readiness) with the nights it rests on.
- **Medicines** (its only home): each medicine with stock and refill date, the last weeks of doses, appointments, reward switches. One editor for everything; Settings' separate checklist editor goes.
- **Your own tracks:** the same shape.
- **Removed:** the Water page and tile.

### Insights
A door in the grid for: "ask your own data" (pick a measure, add filters, see the answer and every day it used; with ready-made examples and saved questions); answers kept as cards that update themselves; every trend as small multiples on one page; the one heatmap (zooming from eight weeks to the whole journey, one rule for "logged"); the record book beyond lifts; the stat of the week and its archive; the track record of every forecast.

Insights everywhere follow the same rules: "how this was worked out" under each; a count of the data still needed before one can speak; confidence in words ("sure", "fairly sure", "a hunch"); life events marked on charts in words; "why did this change?" on a long press of any number; big numbers compared with your usual ("usual for a Tuesday"); record lines in commentary style; odds with their track record; the week's swing; "what would it take" (start from a goal, show the sum), which replaces What if; one finding a day on You; keep or dismiss.

### Diary
Every day since the start, with a month view (a mark per kind of thing logged) and search ("when did I last…"). Every field of a day, with "not logged" in words. An audit note can be left from any page by long-pressing its title.

### Settings
Folding groups stay, in this order: About you · Targets · Places and the walk (with stride, from the Walk round) · Checklist (linking to Medicines) · Food categories · Moments and themes · Privacy · Data and backups · Connections (Last.fm). Session settings (ding, screen on, buzz on records, tempo coach, battery saver) and the plan move to a Settings sheet on Train, with plan history. Search finds settings and pages. Recently changed sits at the top with undo. Each setting says where it shows. Settings opens on the last group used. Targets keep a history of changes. Removed: the setup card, the Voice row, Larger text, High contrast, Big dials, Home screen and ticker, the Units row, the water target.

### Data and backups
- Backup status in words: "Safe up to Tue · 3 days of logs and 1 check-in not backed up". It shows on the Due line, in the weekly story's last card and in Settings.
- The date is stamped only once a backup is confirmed safe.
- A backup file can be checked (read back and counted) without restoring.
- Seven daily snapshots are kept on the phone, plus one before every big change (a restore, a plan import, removing a feature's data). The app says plainly that snapshots don't protect against losing the phone.
- A data check-up looks for empty days, double entries, a weight far off the trend, unfinished sessions, steps far above usual, and doses ticked twice, each with a fix.
- The full edit history by day, with undo.
- Retired features (water, Experiments, the other voices) keep their old data in backup files, and the workbook notes they were retired.
- The weekly coach export stays, as the Train spec describes it.

## 5. Fixes to make

From the survey, confirmed by the owner:
1. Training's "+0%": `strengthIndex` returns 0 until four weeks after the first set and ignores exercises added later. Replace it with strength per exercise (above). The Walk debloat removes the function anyway.
2. "Last backup" is stamped when the share sheet closes; stamp it only once the file is confirmed safe.
3. Restore replaces everything with no safety copy; take a snapshot first.
4. Medicines' "+ Add" creates a live "New medicine" before anything is typed; open an empty form and save nothing until Save.
5. Drinks show "None" for nights not logged; add "No drinks" as an answer and show "not logged" until it's given.
6. Back links fall back to the wrong parent when a page is opened directly; point them at the new homes.
7. Chart labels are 10 px; raise them to the app's smallest readable size.
8. The climate report's water tile reads "0 days" with water off; it goes with the climate report and water.

## 6. Removed

Experiments; water tracking; every voice but Gremlin; Larger text, High contrast and Big dials; the climate report; the month and journey Wrapped; the character sheet (titles become trophies); "A stat from your data" on You; Home screen and ticker; the Units row; the setup card.

## 7. Not doing

Health Wrapped and Training Wrapped; Samsung Health import; a doctor summary; escalating backup banners; a redrawn achievement wall or medal words; record certificates; an album with empty slots; the form guide; exercise cards on Earned's shelves; the transit map; the tide table; museum labels; a note to next month; keeping Claude's reply; the newspaper front page; the bookshelf archive; the month report as one long scroll; the ritual spread over days; the deposit slip; "What's new"; the photo flipbook; past appointments kept; appointments and refills on the Due line; the learned-maintenance page; the month by food category; trip meters; your own top four; You arranged by question. Gremlin's footnotes are optional and the first to cut.

## 8. Where this meets other rounds

- **Today:** the weekly story replaces Today's separate Monday story; Today offers it on Monday. Today's gallery of moments and milestones live in Earned. The best record line of the week can show on Today. A perfect day is gold (Today round).
- **Walk:** the Journey hub left the Walk tab (Walk decision 6); its reports, achievements and streaks now live in Reports and Earned, and the journey clock heads You. The weekly story carries the Walk's Monday chapter. Wrapped stays walk-only and lives with the walk. Stride is a setting in Places and the walk.
- **Train:** records' full wall moves inside Earned; Train keeps its latest three and an "All" link. Session settings and plan history live on Train. The coach export stays in the Train spec.
- **Not yet seen:** the owner has reworked the Walk page and other pages locally; those changes are not on any branch. Check this brief against them once they are pushed.

## 9. For the design pass

- Design You's first screen around a slow day: the clock, the Due line and "what's better" must read well with the magnifier at the standard text size, in fixed positions.
- The grid never reorders; tiles may carry a live number or word.
- Check each page in Dusk and one theme day, in battery saver and with reduced motion. High contrast no longer needs checking.
- Small controls get 44 px tap areas without a visual change.
- Still useful to ask the owner, not blocking: how backups are done today and how often, and which settings actually change.
