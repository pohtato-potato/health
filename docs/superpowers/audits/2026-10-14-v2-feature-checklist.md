# Health v2: 1-to-1 feature checklist

Every element of the final Health v2 Screens board (s1–s47, t1–t12, the theme calendar), every note left on it in rounds 1–7, and every row of the v1 → v2 feature map, checked against `main` on 14 Oct 2026 (after the health-v2-polish merge).

**Key:** ✓ built as mocked · ◐ partly built (what's missing is said) · ✗ not built

## Why things may not show on the phone yet

- The phone runs whichever version it last accepted. It needs the update banner on Today tapped once.
- The phone's data still has the 1.x places, two homes and no office. The Home and Office big buttons only appear for places whose *kind* is home and office. Until `backup-repaired.json` is restored there is no office place, so there is no Office button. After the restore, the places are a home, a second home, an office, Trip and With friends, and the buttons appear.

## Today (s1, s31)

| Element | Status | Note |
|---|---|---|
| Date at top left | ✓ | |
| Place chip "Office · change" | ✓ | Shows the place's name |
| Scene lit for the hour, landmark ahead | ✓ | |
| "Near Gwalior" + "Day 16 · 38 km to the fort" | ✓ | Built in health-v2-complete |
| Voice line | ✓ | |
| Next-dose banner "Eye drops at 11 pm · in 1 h 18 min" | ✓ | Shows only for items marked as medicines (after the restore) |
| Rings + value rows (kcal range, protein of target, steps eased) | ✓ | |
| Each ring opens its Tracks page | ✓ | |
| "Session B tonight · 45 min · floor press first · 2 reps from a record" | ✓ | |
| Readiness card, colour-coded score + three reasons | ✓ | |
| Protein gap "34 g to go · Amul shake and 2 boiled eggs · Add both" | ✓ | |
| Close the day card | ✓ | |
| Morning log prompt on Today until it's done (feature map) | ✓ | Built in health-v2-complete |
| Status (sick, travelling…) from the Today place chip (feature map) | ✓ | Built in health-v2-complete |
| Theme day: "Why today" card | ✓ | |
| Theme day: ring styles (t1–t12, 12 styles) | ✓ | |
| Theme day: sky shifts to the festival colours | ✓ | Built in health-v2-complete |
| Theme day: decorations in the scene (banners, petals) | ✓ | Built in health-v2-complete |
| Theme day: the + button takes the theme colour | ✓ | Built in health-v2-complete |

## + sheet (s2) and More (s44)

| Element | Status | Note |
|---|---|---|
| Date chip | ✓ | |
| Six tiles: Food, Morning log, Checklist (n of m, centred), Steps, Session, Close the day | ✓ | |
| "A drawn icon set in one stroke weight, each tile tinted by its metric" (round 1: better icons) | ◐ | Tiles are tinted; new icons drawn for status, places and set tags; the rest of the set is unchanged |
| More row → More sheet | ✓ | |
| "Log anything" search | ✓ | |
| More: Drinks, Night out, Free meal (left this week), Waist, Check-in (when due) | ✓ | |
| Status: Sick, Injured, Travelling, Break, Occasion, None + explanation | ✓ | Built in health-v2-complete |

## Close the day (s3) and Day closed (s19)

| Element | Status | Note |
|---|---|---|
| "Close Monday · Office day · runs until 4 am" | ✓ | |
| "Usual Monday" | ✓ | As a chip that opens the draft |
| One meal panel, each meal "8:00 · 270 kcal · 39 g" with its foods | ✓ | |
| Dinner foods as chips ("Roti, 2 · Dal · Chicken 125 g") | ◐ | Kept as rows on purpose: rows carry drag-to-move between meals and each food's numbers (ruling, health-v2-complete) |
| Checklist inline with times, "At 11 pm · Now · Missed" | ✓ | |
| "Asleep by 12:45 · 7 h before 7:45" | ✓ | |
| Warm gold Close the day button | ✓ | |
| Day closed: star when perfect, three totals, session record, checklist + lanterns, walk, Gremlin line, tomorrow | ✓ | |
| "Walk 7.6 km · Gwalior Fort tomorrow" wording | ✓ | Built in health-v2-complete |

## Add food (s4)

| Element | Status | Note |
|---|---|---|
| Date chip, meal tabs | ✓ | |
| Search + Scan (barcode) | ✓ | |
| "Usual for dinner at home" row | ✓ | |
| "eaten 8:30 pm · change" (when it was eaten) | ✓ | Built in health-v2-complete |
| Category tabs (your own categories) | ✓ | |
| Colour (round 3: "add some colour"): meal and plate in apricot, usual chips tinted, category tabs in their own colours, kcal/protein in metric colours | ✓ | Built in health-v2-complete |
| Plate mode with a stepper per food, running total, "Add 2 to dinner" | ✓ | |

## Morning log (s5)

| Element | Status | Note |
|---|---|---|
| "Where today · change any time" | ✓ | |
| Home and Office as two big buttons, Home sage / Office apricot when chosen | ✓ | Needs places of kind home and office (see top) |
| Delhi, Trip, Friends as an even row of smaller chips | ✓ | |
| Round 5 place icons and colours on those chips (second home a lavender house-heart, Trip blue suitcase, Friends rose) | ✓ | Built in health-v2-complete |
| Change place mid-day (only the rest of the day follows) | ✓ | From the Today chip |
| Weight on a drag dial, "last 83.9" | ✓ | |
| Sleep wheels, "Same as yesterday" | ✓ | |
| "6 h 10 · how rested 1–5" | ✓ | |
| "Energy, stomach, soreness · 3 quick taps" | ✓ | |
| Status here (feature map) | ✓ | Built in health-v2-complete |

## Checklist (s6) and Medicines (s28)

| Element | Status | Note |
|---|---|---|
| Grouped rows, "taken 8:05", "due 11:00 pm", missed | ✓ | |
| "ticked late, when? At 8:00 · Just now · Other" | ✓ | |
| "On time lights a lantern · 3 lit" | ✓ | |
| Add an item; "Schedule in You › Medicines" | ✓ | |
| Drawn ticks and crosses | ✓ | Built in health-v2-complete |
| Medicines: "this week 26 of 28 on time" | ✓ | |
| Each medicine: dose, form, times, course change ("until 26 Oct, then…") | ✓ | Course and dose need entering once in the editor |
| Stock "9 left · refill by Fri" | ✓ | |
| Next appointment with notes to take | ✓ | |
| Rewards: lantern, kept week, perfect day, kept count, each switchable | ✓ | |
| Last 7 days as colour (on time / late gold / missed rose) | ✓ | |
| Lantern drawn at the Walk camp | ✓ | Built in health-v2-complete |

## Train (s7)

| Element | Status | Note |
|---|---|---|
| Week as four dots, "2 of 4" | ✓ | |
| Next session: focus, n exercises, first exercises as chips "+6", record shot | ✓ | |
| "Start · 45 min" and "30 min" | ✓ | |
| This week by muscle: crisp figure, Front/Back switch, bars, "12 · 1 day ago" | ✓ | |
| Bars coloured gold most / apricot some / sage least | ✓ | |
| Records gold/silver/bronze + "set to <song>" | ✓ | Song needs Last.fm (after the restore) |

## Session (s8), Going heavier (s9), Finale (s10)

| Element | Status | Note |
|---|---|---|
| "1 of 9", exercise, load, reps, sets | ✓ | |
| Guide link and last-time cue | ✓ | |
| Set table with Last, kg, Reps, Form | ✓ | |
| "15 · 12 clean" in the form colour | ✓ | |
| Plate chips 2.5 / 5 / 7.5 / 10 kg / Other | ✓ | |
| Form words Sloppy → Textbook, colour-coded rose → mint | ✓ | |
| Reps left 0 / 1 / 2 / 3+, 0 as a warning | ✓ | |
| Challenges (e.g. pause at bottom), Discomfort, Skip with their own icons | ✓ | Built in health-v2-complete |
| Rest pill "1:12 rest · End rest" | ✓ | |
| Battery saver ("19% · saver on") | ✓ | |
| Going heavier full-screen moment | ✓ | |
| Finale "Record 2 of 3 · 19 reps, all clean · set to <song>" | ✓ | |

## Walk (s11, s30), Arrival (s12, s29), Souvenirs (s40), Map (s47), Departures (s39)

| Element | Status | Note |
|---|---|---|
| Full-bleed scene, title over the sky, km and chapter | ✓ | |
| Shared illustration system (layers, haze, one light, reflections) | ✓ | |
| Trail in sage, today's carry steps in gold | ✓ | |
| "You · 38 km to the fort" marker | ✓ | |
| What you built ("Rest house") | ✓ | |
| Faint walker for last month (ghost) | ✓ | Built in health-v2-complete |
| Camp in the scene | ✓ | Built in health-v2-complete |
| Journal in a pull-up sheet | ✓ | Built in health-v2-complete |
| Forecast "Kanyakumari around 14 Feb · 7 of 10 forecasts held" | ✓ | |
| People met on the road ("Met · Hetal, architecture student…") | ✓ | Built in health-v2-complete |
| Arrival card: illustration at arrival hour, Eat / Hear / Keep / Next | ✓ | |
| Souvenirs: drawn objects in lit niches (jali, inlay, kite) | ✓ | Built in health-v2-complete |
| Side quest with cost and reward | ✓ | |
| Side quest detour on a small route sketch | ✓ | Built in health-v2-complete |
| India map: three chapters, islands, quests, built things, you | ✓ | |
| Map: pinch to zoom, tap a stop for its card | ✓ | Built in health-v2-complete |
| Departures board: amber on black, clock, HW numbers, status colours, slow-pulsing boarding, delayed with old date, two-line names, filters | ✓ | |
| Route / Departures switch at the top (s39, s47) | ✓ | Built in health-v2-complete |

## You (s13) and its doors

| Element | Status | Note |
|---|---|---|
| Benchmark first, "first goal 0.50", reveal-day range | ✓ | |
| Benchmark chart with the forecast as a shaded cone and the "supplement started" marker | ◐ | Chart, cone, goal lines, today and reveal markers on You; no "supplement started" marker yet |
| Doors: Tracks, Medicines, Night sky, Diary | ✓ | |
| Every day heatmap with a metric switch, outlined = not logged | ✓ | |
| "Week 3 review is ready · Open" | ✓ | |

## Tracks (s20–s27)

| Element | Status | Note |
|---|---|---|
| Index as small multiples, 7/30/90 d, Medicines beneath | ✓ | |
| Shared page template (value + change, range switch, hero chart with usual range, insights, extras, history) | ✓ | |
| Place icons and colours on day columns (round 4) | ✓ | Built in health-v2-complete |
| Food: weekly budget left, kcal **and protein** | ✓ | Built in health-v2-complete |
| Food: office vs home, after 9 pm, where protein came from, maintenance ± with method | ✓ | |
| Shape: weight, waist **and strength** on one chart with markers | ✓ | Built in health-v2-complete |
| Shape: verdict, t-shirt test **vs last month**, compare photos | ✓ | Built in health-v2-complete |
| Steps: hatched office days, loaded steps gold, race, office vs home, top-ups, best weekday | ✓ | |
| Sleep: sleep window as bands across nights as the main chart | ✓ | Built in health-v2-complete |
| Sleep window: gold band for office wake-up, rose under 5 h | ✓ | Built in health-v2-complete |
| Sleep: regularity, office drift, tonight, one tip | ✓ | |
| Training: index with records, ladder per lift with form average colour-coded, form trend, fading fault, history | ✓ | |
| Training: "past range · try a challenge" | ✓ | Built in health-v2-complete |
| Joints: per joint Clear / Watch, timeline, discomfort by exercise, physio summary | ✓ | |
| Joints: "Swaps in place" | ✓ | Built in health-v2-complete |
| Drinks: calendar, morning after | ✓ | |
| Drinks: tap a day to add; "Had drinks on Saturday? Add to Sat 11 Oct" | ✓ | Built in health-v2-complete |
| Readiness page: colour-coded score (rose < 60, gold 60–74, sage 75+) | ✓ | Built in health-v2-complete |
| Readiness: "Logbook yesterday · Calm · context only" | ✗ | Blocked: no Logbook → Health day-feeling card in the shelf yet |
| Readiness: reasons, bands, refit date, how well it predicts | ✓ | |

## Moments (s15), Night sky (s18), Character (s32), Achievements (s36), Journey clock (s37)

| Element | Status | Note |
|---|---|---|
| A first: glowing dumbbell (knurled grip, plates stamped with the weight), bloom, rays, reflection, sparkles, centred (rounds 2 and 4) | ✓ | Built in health-v2-complete |
| "Firsts so far: 14" and a row of embers | ✓ | Built in health-v2-complete |
| Night sky: Milky Way, named constellations, this month gold, next star waiting, meteors, fort on the horizon | ✓ | |
| Character: level, worn title, six stats | ✓ | |
| Character: wardrobe "tap to wear" (titles, themes, gold rings, confetti) | ✓ | Built in health-v2-complete |
| Achievements: nearly there, sets with unlocks | ✓ | |
| Achievements: "Secrets 3 of 30 · hints unlock as you go" | ✓ | Built in health-v2-complete |
| Achievements: about 160 in total after pruning | ◐ | About 208; a pruning shortlist goes to the owner |
| Journey clock ring: night/dawn/day/dusk, gold elapsed, check-ins, chapter end, reveal at midnight | ✓ | Built in health-v2-complete |
| On this day with "then to now" | ✓ | |

## Check-in (s33–s35)

| Element | Status | Note |
|---|---|---|
| Torso framing (shoulder line, hip edge), mirror mode, timer | ✓ | |
| Front / Side / Back, "1 of 3" | ✓ | |
| Tape with steppers and method, t-shirt test, sealed line | ✓ | |
| Compare slider, blurred until tap and hold, fingerprint lock, reached from Shape | ✓ | |

## Diary (s38), Film (s41), Reveal (s42), Settings (s43), Guide (s45), Short session (s46)

| Element | Status | Note |
|---|---|---|
| Diary: day strip, every field, not logged with add, place change, undo | ✓ | |
| Diary: undo toast right after an edit ("Steps changed to 11,920 · Undo") | ✓ | Built in health-v2-complete |
| Film: "<Month>, scored by <song>", big numbers in colour fields | ✓ | |
| Film: "Next: your strongest week · the record you didn't see coming · <month>'s constellation" | ✓ | Built in health-v2-complete |
| Wrapped in the same story format | ✓ | Built in health-v2-complete |
| Climate report folded into the film | ◐ | Linked from the film's last frame |
| Reveal: countdown, timelapse, first and last, sealed lines, forecast | ✓ | |
| Settings: setup check, three groups of summary rows | ✓ | |
| Settings: "Claude review · Project · review day" (Project instructions) | ✓ | Built in health-v2-complete |
| Settings: "Moments and themes · all on · quiet in public" | ✓ | Built in health-v2-complete |
| Guide: setup, movement, faults, stop if, mirror check, Edit | ✓ | Your room guides arrive with the restore |
| Short session: 20/30/45/Full, reasons, skip tonight, total, readiness, Start | ✓ | |

## v1 → v2 feature map rows not covered above

| Row | Status | Note |
|---|---|---|
| Monthly challenge "from your data" | ✓ | Built in health-v2-complete |
| Weekly receipt kept as a print view | ✓ | |
| Home-screen shortcuts | ✓ | |
| Konami code: a hint among the secret achievements | ✓ | Built in health-v2-complete |
| Logbook feeling shown on readiness | ✗ | Blocked: same as above |
| Everything else in the feature map | ✓ | |

## Totals

About 190 elements checked: **~150 ✓, ~22 ◐, ~22 ✗** at the audit; after health-v2-complete: **~195 ✓, 5 ◐, 2 ✗ (both blocked on the Logbook card).**
