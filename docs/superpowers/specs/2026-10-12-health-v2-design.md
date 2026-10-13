# Health v2: design spec

Date: 12 Oct 2026 · Branch: `health-v2` (built on `shelf-v2`) · Status: draft for the owner's review

v2 is one complete overhaul, released once. It folds in the 1.1 "honest data" spec (`2026-10-12-health-1-1-honest-data-design.md`) and adds everything the owner chose over six rating rounds (boards 1–6, 12 Oct 2026). The visual look is decided separately, after this spec, through a reference board. This document covers features, behaviour and data. It does not cover styling.

**This repo is public.** Personal values stay in `private/`:
- the owner's places and their meal times
- the checklist items
- the training setup, the exercise guides and the plan
- the birth year and body numbers
- the Last.fm key and username

This spec names those values only as kinds of setting.

## 1. What v2 is for

The owner uses Health every evening, usually after 9 pm, and trains at home with adjustable dumbbells on a bed-as-bench setup. Two weeks of real data and six rounds of ratings point to six principles:

1. **Honest data first.** What's saved matches what happened. "Not logged" is never zero, defaults never pretend to be answers, and nothing is silently changed.
2. **Moments keep the habit.** In the owner's words, celebrations and the walk across India are the reason the habit stuck. v2 invests heavily in them, with awe-worthy rather than skeuomorphic moments.
3. **Evening-first, context-aware logging.** The app expects late logging and knows the day's place (home, office, trip, friends) and status (sick, injured, travelling).
4. **Training quality, not just numbers.** Form, clean reps, effort and challenges decide progress. Going heavier is always earned and announced.
5. **A model that learns you, scientifically.** Maintenance, targets and forecasts adapt from your own data using published methods, and show their working and their track record.
6. **Built for monthly audits.** The app records how it is used and what gets corrected, so each audit learns more.

Ground rules from the brief still hold:
- No server and no account; data stays on the phone.
- No logging streak and no notifications. Banners are shown in the app only.
- Nothing rewards eating less, and humour never targets body or food.
- Any joint flag switches the voice to plain speech.
- Four sessions a week, with no extra credit for more.

## 1a. The day boundary
A day runs from 4 am to 4 am, not midnight to midnight. Anything logged before 4 am (food, ticks, steps, sleep, Close the day) belongs to the previous day by default; the date chip can still choose any day. Every rule that says "today" uses this boundary.

## 2. Navigation

Tabs: **Today · Train · [+ Log] · Walk · You**

| Tab | Holds |
|---|---|
| Today | The day: rings, one banner slot, protein gap helper, next session, place and status, Close the day. |
| Train | Plan, sessions, records wall, muscle map, form trends, plan editor and exercise guides. |
| + Log | Six common tiles plus More. Each sheet has a date chip so you can log any day. |
| Walk | The walk across India, as its own world (§9). |
| You | The athletic benchmark, **Tracks** (one list of every measure page: Food, Shape, Steps, Sleep, Training, Joints, Readiness, Drinks), **Medicines**, Journey clock, heatmap, weekly reviews, monthly film and Wrapped, achievements, character, night sky, reveal day, Diary and Settings. |

Banners are in-app only. There is one banner slot on Today, and it shows banners around the owner's usual logging hour (learned from the usage log).

## 3. Today and logging

### 3.1 Today
- **Order:**
  1. The three rings (calories in range, protein, steps).
  2. One banner.
  3. The protein gap helper.
  4. Next session.
  5. Place and status.
  6. "Close the day".
- **The headline is fixed for the day.** The Gremlin line and the season of the day stay put. They no longer change on reload.
- **Place-aware ordering.** On office days the protein gap and the evening step top-up rise to the top. On Trip days the trip workout leads.
- **Evening step top-up.** From 6 pm on eased days, if the goal is still reachable: "3,200 to go, about a 30-minute walk."
- **Protein gap helper.** This replaces "What can I still eat".
  - It shows which of your usual foods close today's protein gap, ranked by protein per calorie and by how often you eat them.
  - It suggests adding food, never cutting it.
  - After 10 pm it switches to "Close the day".

### 3.2 Log sheet (+)
- **Six tiles:** Food, Morning log, Checklist, Steps, Session, Close the day. **More** holds Drinks, Night out, Free meal, Waist, Status and Check-in.
- **Tap guard.** The sheet ignores taps until it has finished opening.
- **Date chip on every sheet:** "Today ▾" offers yesterday or a date picker. Entries for past days get sensible eaten-at times (§3.4).

### 3.3 Close the day
A single screen for the whole day: the owner's "quick capture". It works for any date.
- **Meals:** Breakfast, Lunch, Snacks and Dinner side by side.
  - Each section has a "usual for this meal" row: learned from the same place, the same meal and recent weeks, two taps per food.
  - It also has the owner's own food categories as tabs.
  - **Plate mode:** tap several foods, adjust each one's quantity in its own unit (pieces, katoris, grams) with a stepper on the plate, see the running total, confirm once.
  - Entries can be dragged between meals, and their eaten-at time follows.
- **Start from a usual day:** prefill a draft from a typical day for that place and weekday, then edit it.
- **Checklist with times,** steps, and a sleep check if the morning log was missed.
- **Day complete:** a toggle that marks food as complete for averages (§3.7).
- **Tonight's target:** "Asleep by 12:45 keeps 7 h before tomorrow's wake time." It uses tomorrow's place and your wake time (§6.3).
- **Banner at your hour:** "Close the day" appears as the Today banner around your usual logging hour.
- **Day closed summary:** closing the day shows a conclusion screen: the day's totals against targets, training and walk highlights, checklist completeness, a Gremlin line, tomorrow's place and session, and, on a perfect day, its new star in the night sky.

### 3.4 Food entries
- **Two times per entry:** `eatenAt`, kept separate from `at` (when it was logged).
  - It defaults to the meal's usual time for the day's place.
  - Live logging within ±90 minutes of that time uses "now".
  - Logging after midnight for the previous day stays on that day.
- **Meal switch** with four segments, replacing the chip that cycles.
- **Saving a food:**
  - **Large-portion check** above 800 kcal.
  - **Impossible-value check** above 900 kcal per 100 g or 100 ml.
  - **Duplicate check:** a near-identical name prompts "You already have …".
- **Quick add:**
  - A name is required.
  - Protein chips: 0, 5, 10, 20, 30 g and "Not sure" (`proteinUnknown`).
  - Spellcheck is on.
- **Outside-food sizes:** a short list of the owner's usual outside dishes in small, regular and large.
- **Barcode scan** (needs the internet).
  - The camera reads the barcode with the `BarcodeDetector` API, and the product is looked up in Open Food Facts.
  - If nothing is found, the app falls back to typing the label.
  - The scan is offered only when online.
- **Weekly budgets.** Calories and protein each get a weekly total alongside the daily range, so a big Saturday and a lighter Monday balance out.
- **Protein spread:** a strip showing protein by meal. A gentle note appears when most of it lands after 9 pm.

### 3.5 Morning log
- **No carried-over answers.**
  - Weight and sleep start empty, with the last values shown as hints.
  - "Same as yesterday" saves the sleep with `carried: true`.
  - Untouched fields are not saved.
  - No speed records.
- **Time tiles you can hit.**
  - A visible clock; one tap opens the picker.
  - −15 and +15 minute buttons, wrapping across midnight.
- **Other fields:** how rested you feel (1–5), yesterday's final steps, and today's **place** chip and **status**.
- **Readiness questions** come straight after (§5.6): energy, stomach and soreness.

### 3.6 Checklist
- **Edit in place:** rename items, add or remove slots, add new items.
- **Each slot has a planned time:**
  - Parsed from the slot label.
  - "Morning" means the place's breakfast time; "Night" means 23:00.
- **Recording the time:**
  - A tick within 2 hours of the planned time saves "now".
  - A later tick asks **At [planned time] · Just now · Other**.
- **Missed** is its own state. Each slot reads as taken (with its time), missed, or not logged.
- **The record you can show a doctor** is in the workbook and audit pack, with the time, "missed" or "not logged" for every slot.

### 3.7 Not logged and averages
- **Not logged is not zero.**
  - A day with no food shows "Not logged" everywhere.
  - Averages count complete days when the period has any; otherwise they count logged days.
  - They always say which ("avg of 5 logged days").
- **One definition per number.**
  - Step averages divide by the days that have steps.
  - Perfect days come from one function.
  - The training line reads "This week 2 of 4 · best run N weeks".

### 3.8 Places and status
- **Places** replace the old home picker. Home and Office are the two large choices; the others are smaller chips. The place can change during the day ("With friends from 7 pm"): the change applies from that time on, so meal times, the step goal and the foods shown follow the new place for the rest of the day. The owner's places are stored in settings, and each carries:
  - meal times
  - whether the step goal is eased
  - which foods come first (home foods or outside food)
  - an office-day flag

  | Place type | Steps | Meal times | Foods first |
  |---|---|---|---|
  | Office | eased (`stepsGoal(t, true)`) | office | normal |
  | Trip | eased | home | outside food |
  | With friends | normal | home | outside food |
  | Home places | normal | home | home foods |

- **Status: Sick · Injured · Travelling · Break.** This replaces the hidden Occasion mode and is reachable from the morning log and from Today.
  - While a status is on, targets relax to maintenance and streaks and training weeks pause.
  - "Held steady" is reported afterwards.
  - Festivals and weddings stay as an "Occasion" status option.
- **Rest that counts.** A rest day that readiness recommended keeps the training week intact.

### 3.9 Edit anything, any day
- Diary becomes the place to fix any past entry, set, tick, sleep or step count.
- Every change is kept in the edit history (§11.2) and can be undone.

## 3.10 Medicines (You › Medicines)
- **What it holds:**
  - Each medicine or supplement with its dose, form (drops, tablet, powder) and times.
  - Courses that end or change ("4× a day until 26 Oct, then 2×").
  - Pills or bottles left, with a refill alert drawn from the schedule.
  - Doctor appointments, with notes to take along.
- **Daily ticks** stay in the Checklist (name unchanged).
- **Reminders are in-app only.** No phone notifications. The next dose due within 2 hours shows as Today's banner; a missed dose shows on Today and in Close the day.
- **On time** means ticked within 60 minutes of the planned time. An on-time dose can earn any of these, each switchable in Medicines settings:
  - a lantern lit at that night's camp on the Walk;
  - a "kept week" moment when every dose of the week was on time;
  - counting toward a perfect day, and so toward the night sky;
  - a per-medicine "kept" count that pauses rather than resets on a miss.

## 4. Body

### 4.1 Maintenance that learns (energy balance)
The owner asked for a scientifically backed method. v2 uses the energy-balance approach behind the NIH Body Weight Planner and MacroFactor's expenditure estimate: energy expenditure equals intake minus the change in stored body energy.

- **Trend weight.**
  - An exponentially weighted moving average of daily weigh-ins, more responsive to recent values.
  - Missing days are filled by linear interpolation.
  - Days flagged as likely water-weight swings are down-weighted: the first two weeks of a supplement known to hold water, the morning after a night out, high-sodium outside meals.
- **Stored-energy change.**
  - The change in trend weight over a 14–28-day window is converted to energy using tissue energy densities from Hall et al. (*Lancet* 2011): fat about 9,440 kcal/kg (39.5 MJ/kg) and lean about 1,820 kcal/kg (7.6 MJ/kg).
  - The split between fat and lean uses Forbes partitioning as in Hall's model: lean fraction p = C / (C + F), with C ≈ 2 kg and F the estimated fat mass. F is estimated from height, weight, age and the waist-to-height ratio.
  - When waist shrinks while weight holds, the split shifts toward fat loss and lean gain. This is the "recomposition" signal.
- **Intake** is the average over complete or logged days only (§3.7). Days marked `proteinUnknown` count for kcal.
- **Estimate:** maintenance = average intake − stored-energy change per day.
  - It is shown with a confidence band that depends on the number of logged days and the variance of the weigh-ins.
  - It is "holding" (not updating) when there are fewer than 10 logged days or fewer than 4 weigh-ins in the window.
- **Showing its working.** A "How this is worked out" page shows the formula, today's numbers and the sources.
- **Owner's data.** The birth year and height live in the private starter.
- **Weekly check-in** (in-app banner, weekly): "Maintenance moved to 2,640 (±120). Keep your targets, or adjust?" Calories and protein are offered with the reason, and the owner chooses.

### 4.2 Athletic benchmark and recomposition
- **Main body goal: waist-to-height ratio,** first below 0.5, then 0.45. Weight is context.
- **Projected date** from the trend, with a range.
- **Recomposition view:** weight trend, waist and a strength index on one time axis.
- **Weekly waist** on a fixed day, with the measuring method recorded. Readings from different methods are never compared directly, and the chart marks where the method changed. Inches are stored, and the unit is shown.

### 4.3 Weight with reasons, and notes on charts
- **Markers** on every trend chart: "started a supplement", "new waist method", "office week", "status: sick".
- **Automatic markers** come from data (status changes, a night out, the start of a supplement on the checklist). Manual markers can be added by long-pressing a chart.
- **Water-weight days** are marked, so spikes read as explained.

### 4.4 Sleep
- **Sleep regularity score:** how similar sleep and wake times are from day to day, shown next to duration. A simplified Sleep Regularity Index from the twice-daily sleep and wake times. It is labelled as an approximation of the SRI.
- **Tonight's target** (§3.3).
- **Night camps** on the Walk (§9).

### 4.5 Monthly check-in
- **On a fixed date each month, with a banner:** front, side and back photos lined up with last month's outline, tape measurements, the t-shirt test and the sealed line.
- **Photo privacy** (blur and fingerprint) stays.
- **Photo compare:** a slider between any two check-ins, plus a monthly grid.

## 5. Training

### 5.1 Plan editor
- **Edit the plan in the app:**
  - Add, remove and reorder exercises.
  - Change sets, rep ranges, rest, loads, per-side and lead side, supersets and drop sets.
  - Set challenges, the form cue and the guide.
- **Plan import** stays as a file option.
- **The owner's plan changes:**
  - Dead bug removed.
  - Band face pull replaced by a Bent-over Y-raise.
  - Band moves swap out automatically when `equipment.band` is false, using an optional `noBand` substitute.

### 5.2 Exercise guides
- **Each exercise has a full guide written for the owner's setup:**
  - Setup, the movement, breathing, common faults, what you should feel, when to stop, and how to progress at home.
- **The setup they cover:**
  - The bed as the bench.
  - Stacked mattresses for the incline.
  - The mattress pad for pullovers.
  - The wall for lean-away raises.
  - The mirror check.
  - The wooden floor, and when to wear shoes.
- **Where guides live:** in the plan file (private), and are editable in the plan editor.

### 5.3 The session screen
- **Going heavier is never silent.**
  - When progression suggests a heavier weight, a full-screen moment appears before the set: "Ready for 7.5 kg?" It shows the case (last session's reps, form and reps left).
  - **Go heavier** or **Stay at 5 kg**.
  - Nothing is pre-filled without that choice.
- **Weight chips** for the loads you can build from your equipment, plus **Other** to type a weight.
- **Editing a ticked set.**
  - A ticked set shows a visible **Edit** button.
  - Editing can change weight, reps, form, clean reps and challenges.
- **Skip a set.**
  - Skipped sets count as done for the session's flow but are left out of every stat.
  - Saving 1 rep with no weight asks "Skip this set instead?"
- **Pick your first side.** On per-side sets, tap L or R to start. The other side follows, and the app remembers what you did first.
- **Superset flow.** For 3a/3b pairs the screen moves between the two exercises with a short transition, then the full rest after the round.
- **Farmer carry in steps.** Carries log steps, with a turns helper (the room's turn count goes in the private setup).
- **Tired-hands mode.**
  - After grip- or forearm-heavy exercises (flagged in the plan), inputs become large steppers and chips instead of a keyboard.
  - It can also be turned on by hand.

### 5.4 Set quality
- **Form score** after each set: 1 sloppy · 2 shaky · 3 okay · 4 solid · 5 textbook. One tap, beside the effort mark.
- **Clean reps.** Below a 5, the app asks how many reps were clean before form slipped. Shown as "12 · 9 clean".
- **Records count clean reps** (a setting, on by default).
- **Reps in reserve:** one tap, 0 · 1 · 2 · 3+.
- **Fault chips** (optional): rushed lowering · partial range · elbows flared · hips shifted · back rounded · knee caved · lost balance.
- **Your one cue.** Before each set, a cue aimed at your most common fault on that exercise.
- **Discomfort tag** (knee or wrist) on any set. It feeds joint flags and readiness.
- **Form trend** per exercise: form over time, clean versus total reps, and which faults are fading.
- **Form gate on going heavier.** Heavier is offered only when the previous session's working sets were 4–5 on form with at least 1 rep in reserve.

### 5.5 Challenges
- **Each exercise has a challenge list,** editable in the plan editor:
  - shorter rest
  - deeper incline
  - pause at the bottom
  - pause at the top
  - slower lowering (3 s)
  - 1½ reps
  - harder version
  - one-arm version
  - longer range
  - added hold
  - shorter rest between superset pairs
  - slower last set
- **Applying them.** Tick a challenge on a set. "Shorter rest" sets that rest timer.
- **Challenges as progress.** A set with a challenge counts as progress ("!") even at the same reps and weight. The challenge is recorded on the set.
- **Tempo** sets and the tempo coach become the "slower lowering" challenge.

### 5.6 Readiness
- **Inputs:**
  - sleep against need
  - how rested you feel
  - office day
  - stomach settled
  - soreness, by tapping body areas
  - joint flags
  - energy (1–5)
  - effort in the last session (RIR and marks)
  - days since each muscle was trained
  - steps yesterday
  - time of day
- **Logbook context.** Yesterday's Logbook feeling family is shown as context only, through the shared shelf.
- **Output:** a score with its reasons listed ("−8 short sleep, −5 legs sore, +4 two rest days").
- **How the score is worked out.** The weights start as documented defaults and are re-fitted monthly against how sessions actually went (session quality, §5.8). Each refit is shown on the readiness page.

### 5.7 Rest timer and battery
- **The rest timer ends on its own.** At zero it says "Rest ended 3:40 ago" and never runs on until the next set.
- **End rest** is always available.
- **Session time** is split into lifting and rest ("Where the hour went", §5.8).
- **Rest screen.** A true-black screen keeps the screen on (wake lock) at minimal brightness with a large countdown. Chrome can't ding reliably with the screen off, so the screen stays on.
- **Battery saver for sessions:**
  - true black
  - no animations
  - the dimmed rest screen
  - vibration plus ding when rest ends
- **Switching it on.** It turns on automatically below 30% when the browser reports the battery level (`navigator.getBattery`). Otherwise it's a manual switch. On first use the app checks that the battery reading works.

### 5.8 After a session
- **Session finale,** a sequence:
  1. Records revealed one by one.
  2. The session soundtrack (Last.fm, §10.1).
  3. Where the hour went: lifting, rest, longest rest, pauses.
  4. The form summary.
  5. Session quality: one score from form, effort and completion. It is a summary, not a target.
- **Records wall:** each record as a card showing lift, weight × clean reps, date and the song playing.
- **Muscle map:** a body outline coloured by this week's hard sets per muscle, plus the days since each was trained.
- **Fair comparisons.** Last-time and pace comparisons only compare like with like, using automatic context tags: post-office, morning, weekend, short session, place, after a night out.
- **Rep ladder.** Each exercise shows the climb to the top of the range, then the weight step (double progression), so going heavier is never a surprise.
- **Lighter week, with its case.**
  - Offered every 6 weeks, or when readiness is low for two sessions running, or when form drops or lifts stall.
  - It shows the evidence first. The owner decides.
  - A lighter week means fewer sets at the same weights.
- **Short session by time.** "I have 30 min": the app proposes exercises with reasons (main lift, behind on progress, ready to go heavier). The owner can untick any before starting.
- **Trip workout.** On Trip days Train offers a bodyweight version of the session, built from the plan's movement patterns.
- **Strength forecasts** per lift, with a range: "Row 15 kg × 12 around 2 Dec."
- **Tonight's shot at a record.** Before a session: "2 reps from a floor press record." The record set gets a gold row.

## 5.9 Tracks pages (You › Tracks)
- **Pages:** Food (calories and protein together), Shape (weight, waist and waist ÷ height, recomposition, t-shirt test, photo compare), Steps, Sleep (minimal), Training, Joints, Readiness, Drinks.
- **One template for every page:**
  1. Today's value and the change against last week.
  2. A range switch: 7, 30 or 90 days.
  3. One hero chart: trend over daily dots, the usual range shaded, chart markers.
  4. Two or three plain insights from the data, including office against home.
  5. The page's extras.
  6. A history list.
- **Kept v1 extras:** race your past self, weekday patterns, sleep window, what good sleep does (as one tip line), t-shirt test, where food came from, drinks calendar, the morning after, strength scores, the physio summary.
- **Cut:** walking energy, posture gap.
- **Added extras:**
  - Food: office against home, protein by meal, the maintenance estimate with its method.
  - Steps: loaded steps, evening top-up success.
  - Sleep: regularity, bedtime drift on office days.
  - Training: rep ladder status, form trend, records with songs.
  - Joints: discomfort tags by exercise.
  - Readiness: how well the score predicted session quality.
  - Drinks: effect on next-day steps, sleep and readiness.

## 6. You tab

### 6.1 Contents
Body charts (§4), recomposition, maintenance, sleep regularity, Journey clock, heatmap, weekly reviews, monthly film and Wrapped, achievements and sets, night sky, reveal day, and Settings.

### 6.2 Heatmap
- It switches between steps, protein, sleep, training, readiness and form.
- Each metric has its own colour scale. Office days and status days carry a mark.

### 6.3 Forecasts
- **Reveal-day forecast:** waist-to-height, waist and weight on reveal day, with a range.
- **Walk forecast:** "Kanyakumari around 14 Feb, or 2 Feb if you beat your average."
- **Strength forecasts** (§5.8).
- **What-if sliders:** drag average steps, protein or sessions a week and watch the forecasts move.
- **Forecast honesty.** Each forecast is stored when it is made. Every forecast shows how often similar past forecasts came true ("8 of 10 within range").

### 6.4 Weekly review
- **Replaces the receipt as the main view,** with a banner on Monday.
- **Contents:**
  - a chapter title written by the Gremlin from real numbers
  - what moved
  - office vs home days
  - weekend vs weekday
  - best lift and form progress
  - weekly calorie and protein budgets
  - sleep regularity
  - the maintenance check-in
  - one suggestion
- **The receipt** stays as an optional "print" view.

### 6.5 Experiments
- Pick one change for two weeks: asleep before 1 am, protein at breakfast, a walk after office, and so on.
- The app compares the two weeks before with the two weeks during, on the relevant measures.

## 7. Moments

Celebrations are the core of the habit. Moments are awe-worthy, not skeuomorphic. They stay full screen, with confetti and the rare golden moments kept.

**Moment styles, by kind of moment:**

| Style | Used for |
|---|---|
| Shooting stars | perfect days and regular-sleep weeks; one star settles into the night sky |
| Polaroid develop | firsts |
| Paper confetti, seasonal shapes | everyday wins |
| Fireworks over the skyline of your current walk location | monthly goals and chapter ends |
| Rangoli bloom | seasonal days |
| Gold coins | step-total milestones (lakhs) |
| Level-up chime | strength-score jumps |
| Train arrival scene | walk arrivals |

**What triggers a moment:**
- **Firsts:** the first of anything. First 7.5 kg, first 20-rep set, first clean set at a new weight, first regular-sleep week, first perfect office day.
- **Achievements:** fewer and rarer, grouped into themed **sets** with hints for the secret ones. Each shows its progress ("nearly there" cards). Finishing a set unlocks a theme or a moment style.
- **Achievements retired:** the ones that rewarded bad data (morning-log speed, identical values), the water achievements and the Passport achievements.
- **Night sky:** a star for every perfect day; a full month draws a constellation you can name.
- **Monthly film** on the 1st: story cards about last month, with the top workout song as its title track.
- **Wrapped** for each month and the whole journey (includes Last.fm top workout artists).

**Open:** the "quiet mode" for moments was not rated, so it stays out unless the owner asks for it.

## 8. Seasons and surprises

- **Themes are unannounced.** You find out on opening the app.
- **Every theme day comes with a short "why today" card** (the owner's request).
- **Sources of theme days:**
  - festivals from around the world (Hanami, Songkran, Día de Muertos, Nowruz, Tanabata, Lunar New Year, Eid, Christmas, Onam, Bihu, Hornbill, Holi, Diwali and others)
  - the sky calendar (meteor showers, eclipses, supermoons, solstices and equinoxes), which the night sky reacts to
  - strange and nerdy days (Pi Day, Towel Day, May the Fourth, Square Root Day and others)
  - nature's seasons (first monsoon rain, mango season, winter fog, flamingo season)
  - the owner's own dates (app anniversary, birthday, first record, entering a new state)
  - festivals of wherever you are on the walk
- **Diversity rule:** no single kind of day may hold more than a third of the year's theme days.
- **Ring styles on theme days.** On a theme day the rings themselves change, either their shape or what they are made of. The data reading never changes: the same three rings, in the same order and metric colours, each filled to its true amount, with the unfilled part dimmed.
  - Shape styles: rangoli scallops (Diwali), nested kites (Uttarayan), lanterns (Lunar New Year), thrown colour (Holi), five-petal blossoms (Hanami), ripples (first monsoon rain).
  - Material styles: star trails (meteor showers), marigold beads (Día de Muertos), candy-cane stripes on the filled arc (Christmas), sparkler sparks (New Year), digits of π (Pi Day), lit candles (birthday).
  - Every calendar entry names one ring style. A new festival reuses a style from the library or adds one; the theme also tints the scene, the + button and the "why today" card.
- **The theme calendar** is a data file (dates, the "why today" text and palette hints), covering 2026–2028 at launch.

## 9. The Walk tab

The owner's favourite feature becomes a world of its own. The walk stays a walk: steps move you. Training, sleep and carries leave marks in other ways.

- **Map, full screen.**
  - Your position and the road ahead.
  - A trail behind you coloured by each day's steps.
  - Tap any stretch to see that day.
- **The route:** Chapter 1 Delhi to Kanyakumari, Chapter 2 the Golden Quadrilateral, Chapter 3 every state and union territory, ending in Leh.
- **Illustrated arrival cards** for every stop (about 46), every side quest and every person.
  - All are drawn for v2 in one consistent flat style, which is set by the visual round.
  - Each card has a place-specific scene, a real fact, the food, the language, the landscape and the distance to the next stop.
  - Stops already reached get their cards too.
- **Road journal:** each day writes one line ("Day 16 · 15,820 steps · crossed into Rajasthan near Bharatpur").
- **Terrain:** the route knows its land (desert, ghats, coast, plains, passes). Elevation and climate show on the map, and the trail's look changes with the terrain.
- **People on the road.** Recurring characters along the route, written to avoid cliché: specific, contemporary and individual, not stereotypes. They appear in postcards and remember you.
- **Souvenirs:** each state gives a souvenir for a collection shelf.
- **Side quests:** optional detours (a hill station, a beach, a desert fort) for weeks that beat your step average. They cost extra km and give special postcards.
- **Mountain passes:** Chapter 3's high passes open only at certain strength levels. Training is what gets you over the mountains.
- **Camps and landmarks:**
  - Each session pitches a camp on the map at that day's position.
  - A record raises a landmark named after the lift.
- **Night camps from sleep.** A regular, full night gives a calm, starry camp; a short one gives a rainy, restless one. It's a picture, never a penalty.
- **Loaded steps:** farmer-carry steps are drawn as gold stretches of the trail.
- **Distance in your terms:** "You've walked Delhi to Mumbai, twice."
- **Walk with last month:** a faint walker marks where you were this time last month.
- **Walk forecast** (§6.3).
- **Trail building:** each finished session adds a piece of trail infrastructure at that day's position: a footbridge, a rest house, a well, a lamp post, a shelter. When a later chapter's route passes the same place (the Golden Quadrilateral and Chapter 3 cross Chapter 1), you meet what you built, named after the session ("Rest house · Session B · 10 Oct"). Bigger sessions and records build bigger things. "Your pack" (gear) was dropped in favour of this.

## 10. Connections

### 10.1 Last.fm (needs the internet)
- **Settings.** The key and username are in settings (from the private starter; the owner already uses them in Logbook).
- **What it fetches.** After a session, `user.getRecentTracks` between the session's start and end, cached on the phone.
- **Where it shows:**
  - the session soundtrack in the finale
  - "Record set to [song]", matching the set's time to the playing track
  - the monthly film's title track
  - Wrapped's top workout artists
- **Offline,** it retries later and nothing breaks.

### 10.2 Logbook
- The existing daily postcard stays.
- Readiness shows yesterday's Logbook feeling family as context.
- **Logbook × Health patterns:** how feeling families line up with sleep, training and steps. Shown as patterns, never as advice.

### 10.3 Claude review as a Claude Project
- **Settings** has a "Claude Project" section with the standing instructions to paste once.
- **Review day:** on a day you choose, the banner reads "Review day". One tap saves the audit pack and copies a short prompt to paste into the Project.

## 11. Data, audits and safety

### 11.1 Usage log (on the phone only)
- Time-stamped events: app open, screen, sheet, main actions (log, edit, skip, tick, finish) and banner shown, tapped or dismissed.
- Kept for 400 days.
- This is what drives "nudges at your hour".

### 11.2 Edit history
Every change to an entry, set, tick, sleep, step count or setting keeps its before and after. This powers undo.

### 11.3 Audit notes and "was this useful"
- **Note for the next audit:** long-press anywhere to save a typed note with the screen and the time.
- **Was this useful?** For two weeks after a feature first appears, an occasional one-tap useful / not.

### 11.4 Audit pack
One export (shared through the share sheet) containing:
- the workbook
- the usage log
- the edit history
- the audit notes
- settings with secrets removed
- a README sheet that explains every column

### 11.5 Backups
- **Backup Sunday:** a weekly banner that shares the full backup to Google Drive through Android's share sheet.
- **Protected storage:** a one-time prompt to turn on persistent storage.
- **The backup nudge gets firmer** after 7 days.

### 11.6 Setup check
A Settings page lists what's missing (birth year, goal, place times, Last.fm, setup details) and what each one unlocks.

## 12. Removed or changed

- **Removed:**
  - water, everywhere
  - Wins jar
  - Night mode
  - voice shuffle and the three other voices (Gremlin only)
  - Passport
  - your own tracks (stomach and soreness move into readiness)
  - form clips (replaced by guides and cues)
  - the tempo coach (now a challenge)
  - the monthly challenge (replaced by one personal challenge a month from your data, never water)
  - morning-log speed records
  - the photo stamp idea
  - voice notes
  - the scheduled Claude review
- **Off by default:** the news ticker and daily forecast.
- **Shake for a stat stays, but calmer:** a higher threshold, ignored for 5 s after logging a set and during rest.
- **Moved:** occasion mode becomes Status; "What can I still eat" becomes the protein gap helper; the timeline becomes Close the day.
- **Later:** the laptop dashboard and Drive sync.

## 13. Data model (summary)

All new fields are optional. Old backups restore, and v2 adds tables without changing existing indexes except where noted.

- **FoodEntry:** `eatenAt`, `proteinUnknown`.
- **Day:**
  - `place` (place id; replaces `home`, and old `home` values migrate)
  - `status`, `missed`, `foodDone`
  - readiness answers: `energy`, `stomach`, `soreness` (a body-area map)
- **Sleep:** `carried`.
- **SetEntry:**
  - `skipped`, `form` (1–5), `cleanReps`, `rir`, `faults[]`, `challenges[]`, `discomfort`
  - `steps` (for carries)
  - `firstSide`
- **TrainingSession:** `context[]`, `quality`, `restLog` (lifting and rest spans), `battery`.
- **Settings:**
  - `places[]` (meal times, eased, foods first, office)
  - `foodCategories[]`
  - `lastfm` (key and username)
  - `reviewDay`, `wakeDefaults`, `formRecordsClean`
  - `prefs.water` (off), `prefs.batterySaver`
- **Plan (`health-plan` v2):** per exercise `challenges[]`, `cue`, `guide`, `noBand`, `tiredHands`, `measure` (`reps` | `seconds` | `steps`).
- **New tables (Dexie version bump):**
  - `usage` (events)
  - `edits` (history)
  - `auditNotes`
  - `forecasts` (made-at, target, predicted range, resolved outcome)
  - `markers` (chart notes)
  - `walk` (journal, camps, landmarks, souvenirs, quests)
  - `themes` (seen theme days)
  - `songs` (Last.fm cache)
- **Migration:** `home` → `place`, the plan file v1 → v2, water hidden, and the retired achievements kept but hidden.
- **The owner's one-off data repair** (from the 1.1 spec) runs before the migration, from `private/repair-1.1.md`.

## 14. Open items for the next rounds
1. **Trail building:** decided (§9), replacing "your pack".
2. **Visual reference board:**
   - Features from real apps, aspect by aspect.
   - It sets the look, the illustration style for the walk, and the moment styles' visual treatment.
3. **Quiet mode for moments:** unrated; out unless the owner asks for it.
4. **Exercise guides:** the full text is written in the build. The handle weight is assumed to be 0.5 kg until it is measured.

## 14a. Visual reference
The approved mockups are the design reference for the build: the Health v2 Screens board (rounds 1–7, 12 Oct 2026), 59 screens and theme cards, including Tracks pages, Medicines, the India route map, check-in (torso framing), character, achievements, journey clock, departures, souvenirs and the ring-style theme lab. The v1 → v2 feature map is `2026-10-12-health-v2-feature-map.md`.

## 15. Testing and release
- **Unit tests (Vitest)** for every domain rule:
  - eaten-at times
  - places and status
  - checklist timing
  - skipped sets and progression with the form gate
  - challenges as progress
  - clean-rep records
  - readiness scoring
  - the maintenance estimate (against worked examples from Hall's published parameters)
  - the sleep regularity approximation
  - forecasts and their track record
  - walk progression, passes, camps and loaded steps
  - theme calendar diversity
  - not-logged averages
  - migrations and old-backup restore
- **One final check:** in the browser on a phone-sized viewport with the owner's repaired backup, then one whole-branch review.
- **Release:** a single release (v2.0.0), published only on the owner's go-ahead.

## Sources
- Hall KD et al., "Quantification of the effect of energy imbalance on bodyweight", *Lancet* 2011, and its web appendix (NIH Body Weight Planner): tissue energy densities and partitioning.
- MacroFactor, "An In-Depth Look at MacroFactor's New V3 Expenditure Algorithm" and its weight-trend help pages: the expenditure-from-intake-and-trend approach.
- Windred DP et al., "Sleep regularity is a stronger predictor of mortality risk than sleep duration", *Sleep* 2024: the Sleep Regularity Index.
- Plotkin D et al., "Progressive overload without progressing load?", *PeerJ* 2022: rep progression as a valid form of overload.
- Bell L et al., "A practical approach to deloading", 2023/24: lighter weeks every 4–8 weeks.
