# Health v2 completion plan

Builds every ✗ and ◐ item in `docs/superpowers/audits/2026-10-14-v2-feature-checklist.md`, plus the owner's two reports of 14 Oct:

1. There is no Office button in the Morning log.
2. Tapping the calorie or protein ring, or their labels, used to open meal logging, and steps opened steps logging. Both are gone.

**Branch:** `health-v2-complete`, from `main`.
**Method:**
- Write a test first for anything with logic in it (domain functions, rules).
- Check screens in the browser with the owner's data.
- Commit each package.
- At the end: suite, build, detector, push the branch. The owner merges.

## Defaults taken (the owner said "go ahead" without answering the open questions)

- **Everything ✗ and ◐ is built,** except the two items below.
- **Status lives in three places:** the Today place chip, the Morning log and + › More. A tap switches it on (open-ended, until switched off). The status sheet stays for date ranges and naming an occasion.
- **Places use the round-5 icons and colours everywhere they appear:** home sage house, office apricot building, a second home lavender house-heart, trip blue suitcase, friends rose, night out a gold glass. That covers the Morning log, the Today chip, Tracks day columns and the Diary.
- **The Morning log comes back as a Today banner** until it's done, and only before 2 pm.
- **People met on the road:** a journal line every few days, specific and not cliché. Arrival cards stay as they are.
- **Not built:**
  - *The Logbook feeling on readiness.* Logbook's shelf has no card that hands a day's feeling to Health; it needs a Logbook-side card format first. Recorded as blocked.
  - *Pruning achievements to about 160.* Which ones go is a taste call for the owner. A shortlist is proposed in the final report instead.

## Package 1: Today and logging (the owner's reports first)

1. **Ring taps:**
   - The ring graphic and the calorie and protein rows open the meal page (`/food`), as in v1.
   - The steps row opens the steps sheet.
   - Tracks pages stay reachable from You › Tracks.
2. **Office button always there.** The Morning log shows Home and Office as the two big buttons whatever places exist. Tapping Office when there is no office place creates one ("Office", eased, office meal times) and picks it. The same applies to Home. Test: a settings shape with only homes still yields an office option.
3. **Status in one tap:**
   - `setStatusFrom(today, status)` starts an open-ended status; `endStatus(today)` ends it. Tests: it starts today, carries on day to day, ends cleanly, and undo restores.
   - Chips: in the Today place chip's menu, a row in the Morning log, and the More sheet (a one-tap switch instead of opening the sheet).
4. **Morning log banner on Today** until the log is done, before 2 pm. It goes through the banner picker, so only one banner shows at a time.
5. **Scene caption on Today:** "Near Delhi · Day 17 · 71 km to the Taj Mahal".

## Package 2: Places, drawn

1. A shared `PlaceIcon` and `placeInk(place)` in the round-5 shapes and colours (house, building, house-heart, suitcase, two figures, glass).
2. Used in the Morning log chips and big buttons, the Today chip, the Tracks hero chart day columns (with legend), and Diary rows.
3. Test: `placeMark` gives home2 for a second home and the right ink for each kind.

## Package 3: Food

1. **"eaten 8:30 pm · change" in Add food.** The planned time for the meal and place, with a time tile to change it. Logged entries take that `eatenAt`.
2. **Colour in Add food:**
   - meal tabs and the plate in apricot;
   - usual chips tinted by what they are (protein-heavy in lavender, others in apricot);
   - each category tab in its own colour.
3. **Weekly budget, calories and protein:**
   - `weekBudget(entries, targets, today)` returns what is left this week for both.
   - Shown on Tracks › Food, replacing the calorie-only card's headline.
   - Test first.
4. **Dinner foods as chips** in Close the day's meal panel ("Roti, 2 · Dal · Chicken 125 g"), each opening its entry.

## Package 4: Session, checklist, diary

1. **Icons** for challenge (a bolt), discomfort (a joint dot) and skip (a skip arrow) on their chips and on logged sets.
2. **A drawn cross for a missed dose** in the checklist and Close the day.
3. **Undo toast right after any edit or delete.** `updateEntry`, `deleteEntry`, set edits and day edits (steps, weight, sleep) show "Changed … · Undo". Day edits get recorded in the edit history so they can be undone. Test: a steps edit is recorded and undone.

## Package 5: Tracks

1. **Sleep:**
   - The main chart becomes the sleep window as bands across nights, with no stages.
   - A gold band for the office wake-up time, dashed for not logged, rose for nights under 5 h.
   - The hours chart moves below.
2. **Training:** each lift's ladder line says "past range · try a challenge" when it has gone past its range with no heavier load to go to (`ladderStatus`, test first).
3. **Joints:** "Swaps in place": exercises swapped out by an active flag, or "none right now".
4. **Drinks:**
   - tap a day on the calendar to add drinks to that day;
   - in the empty state, "Had drinks on Saturday night? Add to Sat 11 Oct" (the last Friday or Saturday);
   - the morning-after preview lines.
5. **Shape:**
   - the strength index joins the chart as a third series on its own scale;
   - the t-shirt test compares with last month's check-in (`tshirtVsLast`, test first).
6. **Readiness page:** the score is colour-coded (rose under 60, gold 60–74, sage 75 and up) on the number and the ring.

## Package 6: Walk

1. **Camp drawn in the scene** at the trail's last stop: a tent and fire glow. Lanterns from on-time doses hang there, one per dose lit today.
2. **Last month's walker** drawn as a faint figure on the trail, at the ghost position.
3. **People met on the road:**
   - `peopleMet(days)` places a meeting every 3–5 walking days, seeded by the date.
   - Each person is a specific character from the region's set ("Hetal, architecture student, sketching pol doorways…"): about 40 people across the regions, written plainly.
   - Shown as a "Met ·" line in the journal.
   - Test: stable by date, one per few days, from the right region.
4. **Side quest detour on a route sketch:** a small SVG of the route with the detour spur, its km and the stop.
5. **Drawn souvenirs in lit niches:**
   - each souvenir gets a small SVG object from a set of about 12 shapes (jali, inlay tile, kite, shell, lamp, textile, pottery, mask, boat, flower, tea leaf, bell), chosen per state;
   - unreached states are dashed spaces.
6. **Map:**
   - pinch and drag to zoom and pan, with buttons as a fallback;
   - tap a stop to open its arrival card (reached stops) or see its name and distance (stops ahead).
7. **Route / Departures switch** at the top of both pages.
8. **Journal as a pull-up sheet** over the scene: the tabs stay, and the journal tab opens as a sheet that can be dragged up.

## Package 7: You, moments and the rest

1. **Benchmark on You with a chart:** waist ÷ height dots, the trend, a shaded cone to reveal day, and markers.
2. **The "first" moment drawn:**
   - a dumbbell with knurled grip, collars and plates stamped with the weight;
   - a bloom with slow rays, a soft reflection and four-point sparkles, centred;
   - the firsts so far as a row of embers.
3. **Character wardrobe:** one "Wardrobe · tap to wear" row of chips (titles, themes, gold rings, confetti) with the locked count.
4. **Achievements:**
   - "Secrets n of N · hints unlock as you go", with one hint showing per 5 achievements unlocked;
   - the Konami hint is among the secret hints.
5. **Journey clock:** the chapter end is marked on the rim, using the walk forecast date.
6. **Theme days:**
   - the Today scene's sky takes the festival's colours;
   - decorations per theme kind over the scene (cut-paper banners, drifting petals, lanterns, kites, sparks);
   - the + button takes the theme accent;
   - data colours never change.
7. **Settings:**
   - "Moments and themes" row: moments on/off, themes on/off, and quiet in public (no confetti or sound while a session is minimised or from 10 pm to 7 am);
   - Claude review Project instructions as copyable text.
8. **Monthly film frames:**
   - your strongest week;
   - the record you didn't see coming (the biggest jump over a previous best);
   - the month's constellation.

   Tests for `strongestWeek` and `surpriseRecord`.
9. **Wrapped in the same story format** as the film, for the whole journey so far.
10. **Monthly challenge from your data:**
    - `pickChallenge(month, history)` chooses the weakest of protein days, sleep nights, morning logs and checklist completion over the last 30 days, and sets a goal a little above it;
    - Diwali still takes over its month.
    - Test first.
11. **Day closed:**
    - the walk line says "<stop> tomorrow" when the next stop is within a typical day's walk, otherwise "<stop> in N km".

## Finish

- Run `npm test`, `npm run build` and `impeccable detect`.
- Walk every changed screen in the browser with the owner's data.
- Update the checklist's statuses.
- Push `health-v2-complete`, then hand over the PR link and description.
