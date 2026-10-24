# You tab scoping: decisions

Started 21 Oct 2026. Scope: the You tab (`#/you`) and everything it links to: Settings, Tracks and its pages, Medicines, Diary, Photos and the check-in, Records, Achievements, Character, Night sky, Reveal, Experiments, Physio, the reports, exports and backup.

- Survey and map: `docs/superpowers/scoping/you-inventory.md`
- Pinboard (private claude.ai Artifact, answers saved to its `pins` collection): https://claude.ai/artifact/AQAY6Yk5sZw8Y6yCBdVASA

No design here. Design happens later with impeccable.

## Standing rules (carried in, not up for a vote)

1. Text stays at the standard size for the magnifier; colour never works alone; every tap target is at least 44 px; charts keep words beside colour.
2. Honest data: never pre-fill an answer, never show "not logged" as zero, never change a number silently.
3. Settings is mostly a restyle: every control keeps working, at 44 px.
4. References are features pulled from real apps; the look stays Health's own.
5. From the Train redesign spec: plan history and the monthly training report live on Train; the coach export goes on the export screen.

## Round 1: questions sent (21 Oct)

1. When you open You, what are you usually going there to do? Name the last three things you opened it for.
2. Which pages under You have you never opened, or opened once and not again? Some candidates: Character, Night sky, Experiments, Journey clock, What if, "A stat from your data", the climate report.
3. What do you wish you could see on You that isn't there now?
4. Did you know the weekly receipt, the climate report and both Wrapped live inside "Journey clock"? Where would you look for them?
5. Should the records wall live on You, on Train, or both?
6. Medicines has four doors today. Where do you go to it from, and where should its one home be: a door on You, inside Tracks, or both?
7. Is the monthly check-in something you'd like as one guided ritual (photos, tape, line, month report, Claude review, backup), or do you prefer separate pieces you can do on different days?
8. The check-in pre-fills last month's tape readings. Should every reading start empty, with a "Skip this one" choice?
9. How do you back up today, and how often? Has a backup ever failed to reach Drive without you knowing?
10. Which settings do you change, and how often? Do you ever go into Settings only to find one switch?
11. Would you rather Settings open as one long flat list (everything always in the same spot) or keep the folding groups?
12. Should the session settings (ding, screen on, buzz on records, tempo coach, battery saver) move to Train?
13. Of the seven reports (weekly review story, weekly recap, receipt, climate report, month wrapped, journey wrapped, monthly film), which do you actually look at? Which could merge?
14. Health Wrapped: for reveal day only, every year, or both? Should training have its own Wrapped?
15. Insights: how much working do you want to see? A one-line method, a full breakdown of the days used, or a choice?
16. Samsung Health import: would you export a file from Samsung Health now and then, so the app can fill your steps and sleep after you check them day by day?
17. Do you use Experiments? If not, would a chart, a noise band and some starter questions change that?
18. Should the Diary show every field of a day (training, water, notes, the check-in) and reach back to the very first day?
19. Is a step streak (with shields) on Steps and on Journey something you want to keep? It is a streak of steps, not of logging.
20. Is there anything under You that you avoid because it is hard to read or tap with the magnifier?

## Round 1 pinboard verdicts (answered by 24 Oct)

91 of 97 pins answered: 63 pinned, 23 dropped, 5 with notes only. The owner answered on the pinboard, not the numbered list; the numbered questions those pins settle are marked in "Open questions" below. Notes are paraphrased.

### Pinned

- **Where things live:** a "Due" line at the top of You; a Reports door holding every report; the records wall on You (Train keeps its latest three); one Body door for the check-in, photos, tape and reveal day; Medicines with one home and one editor; one heatmap; Tracks holds measures only; the Diary reaches any day and shows every field; an audit note from any screen.
- **Faults to fix:** "last backup" stamped only once the file is safe; "No drinks" as an answer, "not logged" until given; + Add opens an empty medicine form and saves nothing until Save; a safety copy before a restore; back links go to where a page now lives; chart labels no smaller than the app's smallest readable size.
- **Insights:** "how this was worked out" under every insight; insights say how much more data they need; a track record for forecasts; what moves with what; life events on charts, in words.
- **Earned:** one Earned page; each record with its story; a list of firsts; milestones.
- **Reports:** one week report; one month report, with the film as its opening and in one place; the monthly check-in as one guided ritual; every past report kept; the year on one dense page.
- **Backups:** status in words; check a backup file without restoring; backup as the last card of the week.
- **Settings:** regrouped by task; search; a history of target changes; session settings move to Train.
- **Later list:** plan history, reachable from You.
- **Cuts:** drop "A stat from your data" from You; drop "Home screen and ticker"; drop the Units row; rename or move "Journey clock"; the monthly film in one place.
- **References:** Apple Health Highlights, Oura trends, Gyroscope's report, Exist.io correlations, Bearable factors, Strava's trophy case (also as the character sheet's replacement), Feltron, iOS Settings search, MacroFactor's method, Whoop's monthly assessment, Garmin records, Apple Fitness awards, Steam's showcase, Day One, Daylio, the GitHub key, Hevy's calendar, Gentler Streak's year.

### Dropped

The colour-alone fixes ("I like the colour and the meaning it gives; not an issue"); the 44 px sweep; a voice picker and the Voice row; the accessibility group, preview, flat list and tappable setup card; medal words and a redrawn achievement wall; planned experiments and their chart; backup banners that outrank or escalate; Health Wrapped, Training Wrapped, the doctor summary, Samsung Health import and the coach export; Google Photos, iOS per-app settings, Kindle, Medisafe and Takeout.

### Notes without a verdict

- **Four rooms:** fine as an internal split, but not how the owner would remember where things are. Brainstorm other ways.
- **Journey:** keep the journey clock in view; the rest can move. The owner has reworked the Walk page and others, not yet committed.
- **Tracks:** look again at what each Track page does. The analysis used to feel exceptional; the owner stopped using it.
- **What if:** fine to keep, but useless as it is. Improve it or drop it.
- **Character:** drop it, unless it can be streamlined to overlap with Earned and the trophy case.
- **Experiments:** drop the whole feature; it would not be used.
- **Voices:** only Gremlin is kept; remove the rest and spend the effort on Gremlin.
- **Tape readings:** keep them pre-filled, so a reading is a few nudges rather than many taps, and add a Skip button.
- **High contrast and the accessibility settings:** never used; drop them.
- **Water:** drop it as a feature (asked before). The climate report has not been used.
- **Training "+0%":** confusing, since the numbers have moved many times.

Unanswered: a safety copy before anything big (covered by the restore fix), Spotify, Things, 1Password, Last.fm, Withings.

## Decisions from round 1

1. You gets a "Due" line at the top: what is due, in words, one tap each.
2. A Reports door on You holds every report, newest first, with every past week and month kept.
3. The records wall moves to You. Train keeps its latest three and an "All" link to the same wall.
4. One Body door holds the check-in, photos, tape history and reveal day.
5. Medicines has one home and one editor. The Settings row and Settings' separate checklist editor go.
6. One heatmap, zooming from eight weeks to the whole journey, with one rule for "logged".
7. Tracks holds measures only, and each Track page gets a second look in round 2.
8. The Diary reaches every day since the start and shows every field.
9. An audit note can be left from any screen.
10. The journey clock stays in view on You. The rest of the Journey hub moves to where round 2 puts it.
11. Insights show their working, say how much data they still need, keep a track record, mark life events in words, and include "what moves with what".
12. One Earned page with record stories, firsts and milestones. Character goes unless it folds into the trophy case.
13. One week report and one month report. The monthly film opens the month report and lives only there. The climate report merges into the month report.
14. The monthly check-in becomes one guided ritual.
15. The year on one dense page.
16. Backup status in words; a backup file can be checked without restoring; the weekly report ends with a backup; a safety copy is saved before a restore.
17. The backup date is stamped only once the file is confirmed safe.
18. Settings is regrouped by task and gets search and a history of target changes. Session settings move to Train. Folding groups stay.
19. Fixes: "No drinks" as an answer; an empty form for a new medicine; back links follow the new homes; chart labels at a readable minimum.
20. Removed: Experiments; water tracking; every voice except Gremlin and the Voice row; "A stat from your data" on You; "Home screen and ticker"; the Units row.
21. Tape readings stay pre-filled from last time, with a Skip on each. This is the owner's own exception to "never pre-fill".
22. Not doing: colour-alone fixes, Health Wrapped, Training Wrapped, Samsung Health import, the coach export, a doctor summary, escalating backup banners.

### Found while reading the answers

- **Why Training shows "+0%".** The strength figure (`strengthIndex`) compares the best sets of your first four weeks with the last two weeks, for exercises present in both. Until four weeks have passed since the first logged set, nothing qualifies and it returns 0, shown as "+0%". Exercises added by a later plan never count. The Walk debloat also removes this function from `src/walk/passes.ts`, so Tracks needs a replacement anyway.
- **Conflicts to settle in round 2:** the coach export is part 6 of the Train redesign spec; Larger text, High contrast and Big dials are in `PRODUCT.md`; "never colour alone" is in `DESIGN.md` and was kept by the Walk and Today rounds; Today grew its tap areas to 44 px without changing the look.
- **Overlaps with other rounds:** Today has a Monday story, a gallery of moments and milestones; Walk has a Monday report from the road and a walk-only "so far" Wrapped. Round 2 asks how these meet You's week report and Earned page.

## Round 2

Sent 24 Oct as a second pinboard (private claude.ai Artifact, answers saved to its `pins` collection): https://claude.ai/artifact/AcC7wiqL8TG4AH1eVFBb5g

129 pins in ten lanes: confirm what goes (12), finding your way on You (13), every Track looked at again (27), insights that show their working (10), Earned (11), reports and the monthly ritual (12), backups and data (6), Settings (7), Body, Medicines and the Diary (9), and features from unexpected places (22). Verdicts go here once answered.

## Open questions

From round 1's numbered list, still open: 1 (what You is opened for), 2 (pages never opened, partly answered), 3 (what's missing), 6 (where Medicines lives), 7 (the ritual in one sitting or over days), 9 (backup habits), 10 (settings changed), 15 (how much working), 19 (the step streak). The rest were settled by pins.
