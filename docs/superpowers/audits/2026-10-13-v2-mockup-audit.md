# Health v2: app against the approved mockups

Audit of 13 Oct 2026, after v2 shipped. Each screen of the Health v2 Screens board (s1–s47, t1–t12) was set beside the running app with real data. "Gap" is something in the mockup (or its round notes) that the app lacks or does differently. "Bug" is something wrong regardless of the mockup.

## Global

| # | Gap | Fix |
|---|---|---|
| G1 | Labels are uppercase with wide tracking ("CALORIES", "TODAY'S LOG"). The mockups use sentence-case DM Sans 12px semibold labels in the quiet colour; round 2 ruled out kickers and mono labels. | Restyle `.lbl` to the mockup style everywhere. |
| G2 | Times and some numbers are set in mono (timeline, departures header aside). Round 2: no mono labels. | Use DM Sans with tabular figures; keep mono only for the departures board and receipt. |
| G3 | Group titles in Settings and elsewhere are uppercase. | Same as G1. |

## Screens

| Screen | Gap or bug | Fix |
|---|---|---|
| s1 Today | Extra blocks the mockup dropped: checklist and morning-log tiles, the Today's log timeline (cut in round 3: "timeline → Close the day list"), the joint outlook card and the week dots. Ring legend uses kicker labels instead of "● 1,240 kcal  1,700–2,050" rows. No readiness card with its top reasons. Next session shown as "Done today" only, without "2 reps from a record". | Rebuild to s1's order: scene, voice line, next-dose banner, rings with value rows, next session card with record shot, readiness card with three reasons, protein gap card, Close the day. |
| s2 + sheet | Morning log and session are wide rows; 4 tiles; no date chip; no search. | Six drawn tiles in a 3 × 2 grid (Food, Morning log, Checklist, Steps, Session, Close the day), each tinted by its metric; a "More" row; the date chip; "Log anything" search. |
| s3 Close the day | Meals as separate uppercase sections; plain button. | One grouped meal panel with time · kcal · g per meal; checklist rows with times; a warm gold Close the day button; "runs until 4 am" under the title. |
| s5 Morning log | Five equal place chips; weight is a text box; sleep is two "Set" tiles; energy, stomach and soreness always open. | Home and Office as two big buttons (sage and apricot when chosen), Delhi/Trip/Friends as an even row of chips, "change any time"; weight dial; sleep wheels; "Energy, stomach, soreness · 3 quick taps" folded. |
| s6 Checklist | "+ time / − time" editing chips inline on every item; no lantern line; no link to Medicines. | Grouped rows per item with "taken 8:05" / "due 11:00 pm"; editing moves to Medicines; "On time lights a lantern at tonight's camp · N lit"; "Schedule in You › Medicines". |
| s7 Train | Week as a 7-day strip; long "Ready to go heavier" card; the whole plan listed. Muscle map and records with songs missing from the tab. | Week as four dots; next session card with its first exercises, record shot and "Start · 45 min / 30 min"; this week by muscle (front/back figure + bars); records as gold/silver/bronze with the song; heavier offers stay in the session. |
| s11 Walk | Scene lacks the trail line, "You · N km to the fort" marker and the built structure label; forecast line missing from the journal. | Add the trail, marker and structure label to the scene; forecast with its track record under the journal. |
| s13 You | Eight doors; the benchmark has no forecast range. | Benchmark with "reveal day: a–b" range; doors to Tracks, Medicines, Night sky and Diary first. |
| s28 Medicines | No way to set a medicine's dose, form, times, course change or stock in the app; the owner's items are not marked as medicines. | A medicine editor (form, dose, times, course from a date, stock); the private repair marks the owner's three items. |
| s36 Achievements | "Voice of reason: try all four voices" is still active (Gremlin only now). | Retire it. |
| s38 Diary | A month list of food. The mockup is one day at a time: a day strip, then Food, Steps, Sleep, Weight, Checklist, Place and Drinks rows, each editable, with undo. | Rebuild as the day view. |
| s39 Departures | Short uppercase destinations ("AGRA"), "HL" flight numbers, no category. | Full destination names on two lines, "HW 006 · WALK" style numbers, the board clock in the header. |
| s41 Monthly film | The opening frame shows only the month. | "October, scored by <song>"; the big numbers with a plain comparison ("Delhi to Agra and back, with change"); a "Next:" line. |
| s42 Reveal day | A lock and a sentence. | Countdown, then the list of what is waiting: timelapse (N check-ins), first and last photo, sealed lines, the benchmark forecast; "Nothing here opens early." |
| s43 Settings | Every section expanded on one long page. | Setup check, then three groups of one-line summary rows (Targets, Places, Medicines, Training plan · Backup, Audit pack, Claude review, Last.fm · Battery saver, Moments and themes, Ticker) that open their section. |
| s44 More and status | More expands in place; status is a separate sheet. | A More sheet with Drinks, Night out, Free meal (left this week), Waist, Check-in (when due), and Status as one row of choices with its explanation. |
| s46 Short session | No "Full" option, skipped exercises not listed, no readiness line. | Time chips 20 / 30 / 45 / Full; every exercise listed, the dropped ones as "skip tonight" (tickable); "N exercises · about M min"; readiness line. |

## Bugs found on the way

| Where | Bug |
|---|---|
| Map | "Kanyakumari around 18 Oct at your pace": the chapter ETA is wrong. |
| Journey | October challenge is "Water across the day", but water is gone. |
| Reveal day | The forecast draws a straight line 230 days out (0.40); it should not go past the goal's realistic range. |

Screens that already match their mockups closely: s9 going heavier, s10 finale, s12/s29 arrival cards, s14 weekly review, s16 plan editor, s17 readiness, s20–s27 Tracks, s32 character, s33–s35 check-in and compare, s37 journey clock, s40 souvenirs, s45 guide, s47 map.
