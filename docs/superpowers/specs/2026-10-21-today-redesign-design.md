# Today redesign: the Home page, its moments, and the morning reveal

Date: 21 Oct 2026 · Branch: prototype on `proto/today` (`#/proto/home`) · Status: draft for the owner's review

This spec turns the Today scoping rounds into one design. Today is the app's Home (`#/today`): the quick glance at everything, and the main page for logging almost everything. The look comes from the round-2 prototype (`#/proto/home`), the live moment mockups and the morning reveal mockups the owner approved. It all stays in the living-colour world of the Train redesign (`docs/superpowers/specs/2026-10-21-training-redesign-design.md`), not a new one.

**This repo is public.** No names, places, body numbers, foods, medicines or plans appear here or in code. Numbers below are examples. The creature roster is chosen in code and is not listed here, because the owner wants the creatures to stay surprises.

## Sources

- Round 1 answers, the first pinboard (81 pins), the final pinboard, the reveal-system picks, the Today mockup picks and the moment mockups. All are recorded outside the repo in the owner's `Today shared/decisions/`, with one consolidated file.
- The design critique of the old Today (25/40) and its measured faults.
- Train's living-colour design and its rules for gold, colour jobs and accessibility.

## Goals

1. **A glance at everything on the first screen.** The walk, the theme, a banner when due, the rings, the moment that matters now, and Next up.
2. **The main logging page.** Usual foods in one tap at the usual portion, Log anything, today's meals, the checklist and steps, all below the fold.
3. **A page that comes alive at moments.** A ring closing, a perfect day, a record night, a theme day and closing the day each get an authored animation that involves the aurora. Ordinary hours stay calm.
4. **A morning ritual.** After the morning log, last night is revealed as a short sequence: the night's visitors (creatures drawn in Warli stars), the walk, yesterday's rings and the day ahead.
5. **A collection worth keeping.** Creatures grow over visits and appear in themes, ring styles, Train records and the closed-day sky. The dex lives on You.

Non-goals: new tracking, notifications, any server, streaks of any kind, anything that rewards eating less.

## Design language

- **Same world as Train:** the Dusk look on a drifting aurora (`src/styles/live.css`, `src/ui/live/Aurora.tsx`). The aurora's colours follow the time of day: dawn, day, dusk and night tints.
- **Calm every day, vivid at moments.** Ordinary hours use the calm sky. Moments flush, bloom, sweep or settle it, then let it return, except the perfect day, which stays warmer for the rest of the evening.
- **Colour has jobs.**
  - **Gold:** records and a perfect day. A perfect day counts as the top achievement.
  - **The three ring inks:** calories (apricot), protein (lavender), steps (sage).
  - **Burn orange:** carried over from Train for record nights.
  - **Midnight blue:** theme nights.
  - **Grey-blue:** sick days.
  - Nothing else is gold. The current gold "Why today" label, festival icon and "ready to go heavier" lose it.
- **Warli stars are the app's thread.** Creatures, creature ring styles, the closed-day stars and the perfect-day constellation are all drawn as triangles, circles and lines whose joints light up as stars.
- **Varied blocks, not a stack of cards.** Only the moment card is a card. The walk, the line, the rings and Next up sit straight on the sky, each in its own form.

### Accessibility

- Standard text size for the magnifier: never larger by default. Nothing that carries meaning is under 14 px, except as noted in Fixes.
- Never colour alone. A closed ring, a gold moment and a rare creature always come with words or a shape as well.
- Every target is at least 44 px. Main actions are 50–56 px.
- **Stable positions:** blocks never move while you read. The banner slot and the moment card keep their places; only their contents change.
- **No reduced-motion or battery-saver versions** (owner, 25 Oct 2026; removed app-wide): motion stays as designed, and every moment still has its words.
- **High contrast:** every colour comes from a token.

## The page, top to bottom

### 1. The walk, in the page's sky

- The walk scene runs edge to edge and melts into the aurora; there is no box around it.
- A caption sits on a dark band (at least 4.5:1 contrast) at the bottom left. It has three lines:
  - the date, place and status (for example "Wed 21 Oct · Home · sick");
  - "Near *place*";
  - "Day *n* · *x* km to *landmark*".
- Tapping the scene opens the walk full screen: the scene large, the distance, the next place, and the place and status pickers that used to sit in a chip. Walk arrivals open this view on their own.

### 2. The banner slot

- One banner at a time, always in this spot, drawn as a line between two hairlines with one action.
- The banner takes no space when nothing is due. It only appears on load, never while you're reading.
- Priority: morning log still open after 14:00 → backup due → check-in proposal → occasion near. Rules are under Derived numbers.

### 3. The line

- The day's headline is set large on the sky, with the time trailing it quietly.
- At ordinary times it is a plain glance line ("Two rings in reach before bed.").
- At moments, the voice replaces it, in italic: the first log of the day, a ring closing, a perfect day, a record, an arrival, a theme day. A perfect day and a record night make the voice gold.
- On theme days a line below it gives the "why", with a small star mark.
- The full voice line also appears in the drawer.

### 4. The rings

- The three rings on the left; on the right, **only the numbers**, each in its ring's ink with a tiny unit (`1,640 kcal`, `98 g`, `7,310 steps`). There are no labels, targets, percentages, stages or "closed" text.
- The centre shows the count of closed rings (`2/3`). A closed ring shows through the ring itself, which is fully drawn.
- **Tapping a number** shows its target and its action in place: Log food for calories and protein; a number pad and Save for steps, with "Copy today's total from Samsung Health" after 19:00.
- **Opening Today** draws the rings in from empty, one after another, while the numbers count up (about 1.2 s).
- **Tapping the rings** spins them once together and fills them again.
- On theme days the rings wear the theme's style. On other days, a worn creature ring style replaces the plain rings (see Payoffs). When both apply, the theme's style wins for its day. Replays keep whichever style is showing.

### 5. The moment card

The one lit card. Its content follows the first matching rule:

| When | Card | Actions |
|---|---|---|
| Status is sick, injured or a break | "Rest is the plan" and the eased targets in plain words | none |
| Morning log not done, before 14:00 | "Last night is waiting" | Log the morning (opens the morning log; saving it starts the reveal) |
| A perfect day, 19:00 or later | "All three closed", in gold | Close the day (gold) |
| 21:00 or later, day not closed | "Ready to close the day?" with how many rings are closed and the protein gap | Close the day; add the gap foods |
| 19:00–21:00 with a protein gap | "*n* g protein to go" with the gap foods | Add them |
| Steps below the goal, 11:00–19:00 | "*n* steps to go" with laps of the loop | Type steps |
| Day closed | "Today, kept": the day's postcard | none |
| Otherwise | the glance in a sentence | none |

All times are log-day times: 1 am still counts as the evening before.

### 6. Next up

- A strip between two hairlines, like a departures row:
  - on the left: the session name, how long it usually takes, how many exercises are ready to go heavier, and readiness as a word ("Ready, though sleep held it back a little");
  - on the right: the week's dots and, in the evening, Start.
- On a record night it becomes the records strip: "2 records tonight" in gold, the records, "Gold stays until midnight", and a Finale button.
- When a session's sets look unfinished, the strip uses Train's own check: "4 sets look unfinished · check on Train", never the suspect length.

### 7. Logging, below the fold

- **Your usual *meal*:** chips for up to six foods you usually log at this meal. Each chip shows the portion you usually eat. One tap adds that portion, with an Undo toast; the toast also lets you change the amount.
- **Log anything:** the search box from the + sheet, on the page.
- **Meals today:** four tiles (breakfast, lunch, snacks, dinner). A logged tile shows kcal on one line and protein on its own line, so nothing wraps mid-phrase. An empty tile is dashed, says "Empty" and offers "Same as yesterday".
- **Checklist:** medicines and supplements as chips you press and hold to tick (about 0.65 s, with a fill under the finger). A ticked chip says "taken".

### 8. The drawer

- A handle pill rides above the tab bar. It shows "Ready *n*", the protein state ("22 g to go", "8 g short" or "Protein closed") and Close the day.
- Pulling it up opens the drawer:
  - the full voice line;
  - a readiness tile (score and the main reason, opening the readiness page);
  - a protein tile (the gap and one tap to add the gap foods);
  - Close the day (or "Change the closed day").

## Moments

Each moment is authored once, in Today's sky. Timings are approximate. Every moment has words for it, so colour and motion never carry it alone.

| Moment | What happens | The aurora |
|---|---|---|
| **A ring closes** | The ring completes and brightens. A ripple in its ink runs out across the whole sky, and sparks burst from the ring. The line says "*Ring* closed". A chime and a short buzz. | Flushes the ring's ink for about 3 s, then settles |
| **A perfect day** | The last ring closes. All three spin once together, then turn gold one by one. A gold bloom pours from the centre, and a ring of Warli stars draws itself around the rings. The line turns gold, and the moment card turns gold with a sheen. | Gold over a violet night, never muddy; stays warmer until the day is closed |
| **A record night** | A burn-orange-to-gold light sweeps across the sky, the way the Train finale ends. Next up becomes the records strip, and a sheen crosses it. | Warms to orange and gold until midnight |
| **A theme day** | The theme takes the sky. On the Orionids, meteors cross every few seconds and the rings are drawn as twinkling stars. Each theme defines one sky touch. | The theme's palette all day |
| **Closing the day** | The sky slows and settles into night. One star appears for each thing done, each named (meals, steps, checklist, morning log, a session, rings). The night's creature rests faintly in the sky, and the card becomes the day's postcard. | Night palette; the drift almost stops |
| **A walk arrival** | The walk opens full screen on the new place. | The scene's own sky |
| **A sick day** | No celebration. Plain words. | Cools to a quiet grey-blue and drifts slowly |

The chime is a new short sound, pleasant and clearly different from the rest timer. It follows the sound setting; the buzz follows the vibration setting.

## The morning reveal

- **When:** it plays right after the morning log is saved. It waits while sleep isn't logged, and while yesterday's late log is still open. It plays once a day; afterwards it can be replayed from the dex.
- **How:** tap to reveal, one card at a time, from about 20 s to a minute. Skip is always there (44 px), and the last card returns to Today.
- **The order:**
  1. Last night: the sleep length and one line about the kind of night.
  2. The visitors, one card each, with rare ones last. Each card has:
     - the creature drawing itself in Warli stars, then lighting up, with a burst of colour;
     - its name (or "Not yet known" for tracks);
     - its tier tag;
     - its stage dots;
     - a field note.
     If a visitor grew, its own **growth card** follows: the old stage dims, the new lines draw over it, and the card says what changed and what it unlocks.
  3. The walk: how far yesterday's steps carried you.
  4. Yesterday's rings, as numbers.
  5. The day ahead: the theme or the plan.
- Each card tints the sky in its creature's or its topic's colours.
- **Tapping a visitor** makes it react in its own way: a tail fans, legs gallop, a head turns, a form shifts. Parts move on their own hinges; the figure never just slides.

## Creatures

- **Three tiers:**
  - Everyday: wildlife of the region the walk is in.
  - Medium-rare: lost and legendary wildlife of that stretch.
  - Rare: guests from secular folklore around the world.
- Nothing is religious-coded and there is no astrology.
- **The first set** is at most 20 creatures, drawn from the stretch already walked and the current one: about 4–6 everyday creatures per region, a couple of medium-rare ones and a few rare guests. The rest come in later phases.
- **Each creature has:**
  - a drawing per stage or form;
  - its own colours;
  - an idle motion;
  - a tap reaction;
  - a temperament (slow, watchful, restless or bold), which decides which nights it likes;
  - up to six field notes in a naturalist's dry voice.
- **Growth:**
  - Everyday creatures gain detail: stage 1 at the first visit, stage 2 at 4 visits, stage 3 (grown) at 10 visits. One new field note per visit until the notes run out.
  - Medium-rare creatures: tracks at the 1st visit, a glimpse at the 2nd, a sighting at the 3rd (the name appears), and the legend at the 5th (the figure is ringed by its own constellation).
  - Rare guests show a new form from their tales on each visit (3 forms). Collecting every form completes them.
- **Style:** Warli stars for every creature. Small idle animations only; no sound per creature.

### Who visits

- **How many:** 3 visitors after 7 h or more of sleep, 2 after 6–7 h, 1 under 6 h.
- **Everyday visitors** are drawn at random from the current region's pool. A creature whose temperament matches the night counts double:
  - long nights (8 h or more) bring slow and watchful creatures;
  - short ones (under 6 h) bring restless ones;
  - bedtime before 23:00 favours dawn creatures; after 01:00 it favours night ones.
- **A medium-rare visitor** replaces one everyday visitor. Its chance is 4% a day, plus 6% after a perfect day, plus 5% after two or more records, plus 3% after a good night (7.5 h or more). That is about 2–3 a month.
- **A rare guest** replaces the last visitor. Its chance is 1% a day, plus 4% after a perfect day, plus 4% after two or more records, plus 1% after a good night. That is about one a month.
  - **Pity rule:** if no rare guest has come in 45 days, the next perfect day brings one.
- The draw is seeded by the date and stored when the reveal plays. Reloading never changes who came.
- **"How it works" on You:**
  - the rules in plain words;
  - your own odds today ("After a perfect day, a rare guest: 6% tonight");
  - your record so far (counts by tier).
  It is never shown inside the reveal.

## Payoffs

- **Theme days:** a grown everyday creature gives a theme day ("Peacock day") with its colours, its own "Why today" line and a sky touch.
  - It arrives once on its own, on the next day without another theme.
  - After that it stays in **You › Themes**, where any earned theme can be worn for one day ("Wear today"), or the calendar chooses.
- **Ring styles:** medium-rare legends and completed rare guests give a ring style: the rings drawn in the creature's marks (spots, Warli ticks, leaves) and filling mark by mark. Pick a style in You › Themes; it stays until changed. Numbers stay as they are.
- **Train record frame:** a rare guest arriving the morning after a record night frames that record's card on Train. The frame is a chain of stars along the card's edge with the guest's motif at a corner, kept 34 px clear of the text.
- **The closed-day sky:** the night's first visitor rests faintly in the sky after Close the day.
- **The Monday story and the month's film:** each gets a "Met this week" or "Met this month" slide.
- **Sick days:** the rest card names one found slow creature keeping you company. It is comfort, never a reward.
- **The evening steps hint:** a creature carries the hint ("The nilgai wandered 800 steps further"), and the plain number is always beside it.
- **Out:** a buddy in the walk scene, walk-arrival payoffs, achievements art. The Logbook postcard of a creature is decided later.

## The dex on You

- It opens on **Your night sky**: every found creature as a small constellation at its stage. Tapping one opens its card: the drawing at its current stage, its tier, visits, field notes so far, and Replay, which replays its last reveal card.
- **Cards** is one tap away: a two-column grid with the drawing, name, stage and visit count.
- Creatures not yet found don't appear, not even as outlines.
- "How it works" and You › Themes are reached from the dex.

## Data

All new data is local and optional. Old backups import unchanged.

### New table: `sightings`

| Field | Meaning |
|---|---|
| `id` | `date:creatureId` |
| `date` | the log day the reveal played for |
| `creatureId` | from the roster in code |
| `tier` | everyday, medium or rare |
| `stageAfter` | the stage or form after this visit |
| `grew` | whether this visit moved it up a stage |
| `why` | `night`, `perfect`, `records`, `goodNight` or `pity` |
| `at` | when it was revealed |

A creature's visits, stage, notes and the dex are all **derived** from sightings; there is no second copy to drift.

### Changed records

| Where | Field | Meaning |
|---|---|---|
| `Day` | `revealedAt?: number` | the reveal played for this day |
| `Day` | `theme?: string` | an earned theme worn on this day |
| `Settings` | `ringStyle?: string` | the worn creature ring style; absent means the plain rings |
| `Settings.prefs` | remove `ticker` and the night-screen option | unknown keys in old backups are ignored |

### Derived numbers

- **Usual portion** of food F at meal M: the median amount of F at M over the last 60 days, if it was logged there at least 3 times. Otherwise the most recent amount of F at any meal, otherwise the food's default.
- **Usual foods** for meal M: the six foods logged most often at M in the last 60 days; ties go to the most recent.
- **The meal of the moment** uses the existing `mealForTime` (before 4 am still counts as dinner).
- **Banner due:**
  - the morning log is still open and it's 14:00 or later;
  - backup: the last backup is 7 or more days old;
  - check-in: the monthly check-in proposal is waiting;
  - occasion: a festival is within 21 days and not yet covered by an occasion.
  - A dismissed banner stays away for the rest of the log day.
- **Visitors, odds, growth and the pity rule:** as above, all as pure functions of the day's data and stored sightings, seeded by the date.
- **The perfect-day sky** lasts until the day is closed or the log day ends.

## Removed

- The news ticker: its component, setting and DESIGN.md entry.
- The night version of Today (`TodayNight.tsx`) and the Night Dims rule. `usualWake` moves to the domain layer, because Week and Tracks still use it.
- The old Today cards that the new page replaces: the separate readiness card, the protein gap card, the Close the day card and the Why today card.

## Fixes, first

The `fix/today-faults` branch, minus its sick-day voice commit (the owner dropped that change), merges before the redesign build. It contains:
- Train's unfinished-sets warning on Today;
- the morning-log reminder kept after 14:00;
- 44 px targets, made by growing the tap area without changing the look;
- the ticker removal.

Also in that PR: the tab bar labels move from 11 to 14 px, and the ring targets from 12 to 14 px. Those are the only text-size changes.

## Out of scope (later list)

- Creatures beyond the first 20, and the other regions.
- The creature postcard to Logbook.
- Samsung Health import, voice logging, Health Wrapped, and the walk tab's own redesign (scoped separately on `scope/walk`).

## Build order

Each part ships on its own, with a plan, test-first rules, a browser check and a fresh review.

0. **Fixes PR.** The checked `fix/today-faults` branch, minus the sick-voice commit, plus the two text sizes.
1. **The page.** Sections 1–8: the scene and caption, the banner slot, the line, numbers-only rings with tap-for-target and steps, the moment card rules, the Next up and records strips, the logging section with usual portions and meal tiles, and the drawer. It also removes the ticker and the night screen.
2. **Living colour and moments.** The aurora on Today (time of day, calm everyday colour), rings drawing in and tap-to-spin, and the six moments with the chime and buzz.
3. **The creature engine and the reveal.** The roster format, the visit rules, the odds and the pity rule, growth, field notes, the `sightings` table, and the reveal after the morning log (cards, the growth card, tap reactions, skip and replay).
4. **The dex and the payoffs.** The dex on You (sky and cards), How it works, You › Themes (wear today, ring styles), the Train record frame, the closed-day creature, the Monday and month slides, the sick companion line and the steps hint.
5. **The first 20 creatures.** Each drawn in Warli stars with its stages or forms, colours, idle motion and tap reaction, reviewed on an art board before shipping.

## Testing

- **Pure rules, test-first, under `TZ=UTC`:**
  - usual portion and usual foods;
  - the moment card's rule order at each boundary time (13:59 and 14:00, 18:59 and 19:00, 20:59 and 21:00, 00:30);
  - banner priority and dismissal;
  - visitor count by sleep length;
  - the temperament weighting;
  - odds per state and the pity rule (seeded);
  - growth thresholds and forms;
  - theme arrival on the next free day;
  - one reveal per day, and its waits.
- **Components:** server-rendered checks that the rings show numbers only, the drawer handle text in each state, and the record strip.
- **Browser at 375×812 on the restored dev data:**
  - each moment plays and ends in its stated end state;
  - no text under 14 px except as allowed;
  - every target at least 44 px;
  - no overlapping text.
- **Privacy scan** of the diff before every push.

## Open questions

1. The odds (about 2–3 medium-rare and one rare a month) and the 45-day pity rule: right, or should rare guests be rarer or more common?
2. Visitors per night by sleep length (1, 2 or 3): right?
3. Growth at 4 and 10 visits for everyday creatures, and the legend at the 5th visit for medium-rare ones: right?
4. Close the day takes the moment card from 21:00, and the protein gap from 19:00: right?
5. Wearing an earned theme lasts one day. Should it be sticky until changed, like ring styles?
6. The dex opens on the sky (assumed, since this question wasn't answered): confirm.
7. The fixes PR: merge it now, before part 1?

## Decided after review (21 Oct)

The owner approved the spec and all seven open questions as proposed:
1. The odds stand (about 2–3 medium-rare visitors and one rare guest a month), with the 45-day pity rule.
2. Visitors per night by sleep length: 1, 2 or 3.
3. Growth at 4 and 10 visits; the medium-rare legend at the 5th visit.
4. Close the day takes the moment card from 21:00; the protein gap from 19:00.
5. A worn theme lasts one day.
6. The dex opens on the sky.
7. The fixes PR merges now, before part 1.

## Decided after the Walk redesign (25 Oct 2026)

The Walk tab was rebuilt on top of part 1 (`feat/walk`); Today and the Walk ship together. Decisions: `Today shared/decisions/2026-10-25-today-after-walk.md`.

- **The walk at the top** is the Walk tab's painted scene (`WalkVista`) at the same frame, with its milestone. The caption sits under the picture, in the fade: the date, place and status; the Walk tab's title (the stretch's name, else near or between places); one walk line.
- **No day count** on Today: the Walk tab counts days on the stretch.
- **One walk line**, in this order: an arrival, a small stop, a rest day, the night sky, tomorrow (only once today's steps are in), else the km the milestone shows.
- **Arrival days** press the city's passport stamp onto the scene until midnight.
- **Colour:** Today sits on the aurora tinted by the region, as every Walk page does (`auroraFor`). Part 2's living colour starts from that tint. The surfaces (moment card, food chips, meal tiles, search) are the Walk's glass with a hairline, so the land's colour shows through. The owner is still choosing between this and the old fills (dev: `#/today?card=as-is`).
- **Full-screen moments may stack:** Today's and the Walk's moments don't share a daily limit.
- **Close the day:** part 2's closing moment builds on the walker already moving on Close the day.
- **Monday:** part 4's "Met this week" slide sits beside the walk's cards in the weekly recap.

