# You redesign: design spec

5 Nov 2026 · Branch `feat/you` (cut from `main`, carrying the prototype) · Status: draft for the owner's review.

The repo is public: this spec holds no names, body numbers, plans, loads or medical details. Sample numbers in the prototype are made up.

**The look is the prototype:** `#/proto/you` (`src/screens/proto/YouLiving.tsx`, `src/styles/you-proto.css`), which the owner scored 8/10 after three rounds. Built screens are checked side by side against it at 360 px.

**Sources:** the scoping brief on `origin/scope/you` (`docs/superpowers/scoping/you-brief.md`, decisions 1–56), two pinboards and three prototype rounds. Where they differ, the latest answer wins and is written here.

## 1. Goals and non-goals

You is for time pass, for stats and trends, and for lifting a slow day by showing what has improved. It is not a logging page (that's Today) or a settings page.

**Goals**
- A first screen that lifts a slow day and invites browsing, in fixed positions.
- One home and one name for every page: Reports, Earned, Body, Tracks, Diary, Insights.
- More colour and more life than any page so far, with animation wherever it can be added.
- The faults the scoping found are fixed.

**Non-goals**
- **The match report, in every form.** It becomes its own tab later. See the Match Tab Flag document (kept outside the repo). No score, table, pitch, form guide or match chapter is built here. Football *titles* stay, as an ordinary family.
- A–Z index; this-week-against-your-best card; Journey sky; Journey page (retired); the waist-to-height card on You; the league-table browse card; everything in section 7 of the brief.
- Saving moments ahead of the redesign (the owner chose to hold everything).

## 2. Design language

**World.** Land and glass: `RegionFrameView` gives the region's aurora as the ground, with glass cards and the region's accent. Dusk tokens; Fraunces for display, DM Sans for text, DM Mono only where it already is.

**Colour.** One jewel colour per measure, in `src/ui/you/palette.ts`:

| Measure | Colour | | Measure | Colour |
|---|---|---|---|---|
| Steps | `#5fe3b4` | | Walk | `#4fd8e6` |
| Food and protein | `#ff9a6b` | | Shape | `#f598d6` |
| Sleep | `#79b4ff` | | Medicines | `#6fd0c8` |
| Training | `#b896ff` | | Own tracks | `#a9b8ff` |

- Momentum runs from pink `#ff7db8` to peach `#ffb36b` on its line. Its number is solid `#ffa593`: numbers are never gradient text.
- Gold `#f2c46d` is only for what was earned.
- Colour may carry meaning alone, as the brief retired that rule, but anything that judges (a grade, a flag, a trend) also has a word.

**Motion.** Everything that can animate does:
- Lines draw themselves, numbers count up, bars grow, lists rise in turn, as they scroll into view.
- Only `transform`, `opacity` and stroke offset move, so nothing shifts under the magnifier.
- Every animated element has a visible resting state. A keyframe with only a `from` over an `opacity: 0` base left items invisible in the prototype: every entry keyframe states its `to`.
- There are no battery-saver or reduced-motion variants.

**Access.** Text that carries meaning is at least 14 px, at standard text size, with no oversized default type beyond the page's display numbers. Tap targets are 44 px, growing invisibly where needed. Positions stay steady. Checked at 360 px.

## 3. The map

```
You
├── Film poster (days 1–7 of a month)      ← top of You
├── Header: "You" · day count · worn title · settings
├── Journey clock (tap: phase note)
├── Momentum panel: number · chart · four trend rows
├── Due lines
├── One finding today
├── Trophy case
├── Six doors, never reordered: Reports · Earned · Body · Tracks · Diary · Insights
├── Did you know · Three questions · What would it take · Surprise me
├── Today's lift · How's today? (Tired, Off plan, Bored)
└── Go to box
```

## 4. Screens

### 4.1 You

- **Film poster:** on days 1–7, if last month has data. A moving gradient, "October is finished", the title in `#ffe27a`, three totals, Play.
- **Clock:** `clockAt` as today. Tapping swaps the sentence for the phase note. The challenge moves to Earned.
- **Momentum panel:** count-up number, "Momentum, up N in four weeks", the line "From food, steps, sleep and training. Never from your weight.", the 28-day chart drawing itself, then four rows (Steps, Protein, Sleep, Training), each with a small line, a word and "now, was".
  - **It moves (owner, 5 Nov):** on arrival the number counts up over the same 1.1 s the chart draws, with a bright dot riding the tip of the line and landing on today, where it pulses softly for a moment and then rests. The four rows then arrive one after another: row slides in, its small line draws, its word appears as the line lands. It plays once per visit to the page. At rest everything is in its true place and at full strength, and a page that never gets animation frames lands there anyway.
- **Due lines:** one tap each; the block goes when nothing is due (rules in 6.3).
- **One finding today:** one per day, with "Why did this change?" opening its working.
- **Trophy case:** three tiles here, six on Earned. Every label takes two lines, so a short number never looks lost. Lining numerals.
- **Doors:** six, coloured, each with a live sub-line.
- **Browse:** Did you know (from the shake deck), three saved questions with live answers, What would it take (next stop by a date), Surprise me (the only one of its kind; it picks a fact, record or good day).
- **Today's lift:** one per day, from: a month ago today, this week's rank among your weeks, a creature's visits, your best from the record book.
- **How's today?:** three chips with a card below, plain sentence first, then Gremlin. Tired: nothing is owed, plus something ahead this week. Off plan: how many times you've come back, longest gap, days back to usual. Bored: a stat.
- **Go to box:** filters pages, months and settings as you type.

### 4.2 Earned

In order:
1. Trophy case, six tiles, chosen automatically until the owner picks.
2. Titles wall.
3. Visitors, by stretch of road, with no totals and no assumed roster, since creatures are added often.
4. Themes and ring styles, one picker.
5. This month's shelf and earlier shelves, each moment replayable. They start empty at launch; records and achievements fill back.
6. Firsts timeline, named milestones, lifetime odometers, night sky.
7. Doors to the records wall and achievements (achievement wall keeps its look).

Streaks stay counted quietly here. The character sheet goes: its titles join the wall, its themes join the picker.

**Titles** (about 45 in the prototype, in six families: football, the road, from Gremlin, doing the thing, slow days, visitors). Each has a rule worked out from data. A new title offers "Wear it"; it never wears itself.

### 4.3 Reports

- **Weekly story,** one for the whole app, replacing `/week`, `/receipt`, `/review`, Today's Monday story and the Walk's Monday card. Chapters in order: on the road (opens on the vista), who came by (real creature art), the tally, the swing, food, sleep, training, one finding, next week, backup status. Long is fine. Today offers it on Monday.
- **Film:** colour-field gradients, a coloured number on every screen, the real trail drawing, dark ground for creatures with names in their colour, stars joined by a line, a credits roll, then the assessment.
- **Month page:** the Feltron dense page in harmonised colours; the Whoop assessment with the word coloured and no pill; try next; top fives; sleep profile.
- **Corrections:** a corrected number shows its note. The correction ledger lists them.
- **Archive:** every past week and month, as it was.
- **Year page:** last of all (Part 8).
- **Removed:** climate report; month and journey Wrapped (the Walk keeps its own).

### 4.4 Tracks

**Home:** tiles on their own colour with a small line and their animation at low strength.

**Every page's shape:** headline sentence; changed, why, next; the page's views; insights with their working; compare; history. The page's ground fills the screen, behind the content, and is not inside an animated block (a transform there traps a fixed layer).

| Track | Ground | Accent | Animation |
|---|---|---|---|
| Food | `#a8341c` | `#ffb27a` | A steaming bowl |
| Shape | `#7a2c5e` | `#f598d6` | A tape measure sliding |
| Steps | `#0f7059` | `#5fe3b4` | Footprints up the page |
| Sleep | `#1f469c` | `#79b4ff` | Yellow stars, a soft moon |
| Training | `#4d2cb0` | `#b896ff` | Bars beating |
| Readiness | `#3f7a12` | `#d8f58a` | A battery charging |
| Joints | `#34507f` | `#b7dcff` | A joint bending |
| Drinks | `#935008` | `#ffc45e` | Bubbles and foam |
| Medicines | `#0f6a73` | `#6fd0c8` | Capsules drifting |
| Own tracks | `#33479f` | `#a9b8ff` | Shapes floating |
| Compare | `#0f4f8a` | `#7fe0ff` | Two dots orbiting |

Accent text on a ground is a lighter cut (`color-mix` 45% accent, rest white). Art sits at 60% strength, behind cards at least 80% opaque, and never carries meaning.

**Own views:**
- **Food:** week statement, protein clock, foods compendium.
- **Shape:** forecast cone, reasons, tape, photos.
- **Steps:** charts that walk (6.6), sorted days, habit strength.
- **Sleep:** each night, balance, social jet lag, profile.
- **Training:** strength per exercise, readiness calls, form.
- **Readiness:** what fed it, against sessions, fitness and freshness.
- **Joints:** calendar with flags and swaps, what came before, physio door.
- **Drinks:** "No drinks" as an answer, morning after.
- **Medicines:** list, refills, one editor.
- **Own tracks:** number, 1 to 5, or yes and no.
- **Compare:** any two, experiments as natural events.

### 4.5 Insights and Diary

**Insights:** ask your own data, kept answers, every trend, one heatmap, record book, stat of the week, track record. Each insight has its working, the data still needed, and confidence in words.

**Diary:** every day, a month view, search, "not logged" in words, the day card. A small button leaves an audit note.

### 4.6 Gremlin

Gremlin becomes the only voice. About 12 lines per moment, about 350 in all, for the existing 19 moments plus creatures, stretches, reports, slow days, returns, backups and corrections. Gremlin warms up as the journey goes on, and never admits it. A switch turns it down. Existing lines that joke about body or food stay, by the owner's call. Prompts, confirmations and joint flags stay plain.

### 4.7 Settings and data

**Settings** groups: About you, Targets, Places and the walk, Checklist, Food categories, Moments and themes, Privacy, Data and backups, Connections. Session settings move to a sheet on Train and stay reachable from Settings.

**Backups:** status in words; stamped only when the file is confirmed safe; a file can be checked without restoring; seven daily snapshots plus one before any big change.

**Data check-up,** with fixes: empty days, double entries, a weight far off trend, unfinished sessions, steps far above usual, doses ticked twice. Full edit history by day, with undo.

## 5. Data

| Change | Where | Part |
|---|---|---|
| `Settings.youQuestions?: string[]` (up to three question ids) | settings | 1 |
| `Settings.trophyPicks?: string[]`, up to six | settings | 2 |
| `moments` table: `{ id, at, kind, payload }` | Dexie version 6 | 2 |
| `titlesSeen` on settings: titles already offered | settings | 2 |
| `Day.noDrinks?: boolean` | days | 4 |
| `snapshots` table and `corrections` table | Dexie version 7 | 7 (corrections: 3) |
| `Prefs.gremlinQuiet?: boolean` | settings | 6 |

Backups carry every new field. Retired features keep old data in backup files.

## 6. Derived numbers, exact rules

### 6.1 Momentum

A 0 to 100 score for how the last two weeks have gone. Weight and calories never enter it.

- **Window:** the 14 days ending the day before `date`, since today isn't finished.
- **Steps:** among days with steps logged, the share with the steps ring closed.
- **Protein:** among days with food logged, the share with the protein ring closed.
- **Sleep:** among days with sleep logged, the share at or over the sleep target.
- **Training:** sessions done in the window ÷ (sessions per week × 2), capped at 1. Counted only with a plan.
- An area with fewer than 4 logged days (training: no plan) is left out, never counted as zero.
- **Score:** the rounded mean of the areas left, × 100. With fewer than 2 areas, there is no score, and the panel says how many more days it needs.
- **Change:** today's score minus the score 28 days ago, if there is one.

### 6.2 Trend rows

Each area compares the same window now against the window ending 28 days earlier. A rise of 8 points or more reads "Improving" ("Building" for Training), a fall of 8 or more "Easing", otherwise "Steady". The small line shows the 16 values of the area's score, every second day.

### 6.3 Due lines, in fixed order

1. **Weekly story:** last full week has data and hasn't been opened.
2. **Check-in due:** by `checkinSchedule`.
3. **Backup:** 10 or more days since the last confirmed backup: "Backup safe up to 26 Oct · 10 days not saved". With no backup ever, after 10 days of use: "No backup yet".
4. **Data check-up** items (from Part 7).

### 6.4 Daily finding and lift

Both are seeded by date, so they hold for the day and change the next. Each comes only from candidates with enough data. With none, the block is absent, not filled with filler.

### 6.5 Titles

Rules live in `src/domain/titles.ts`, each `(stats) => boolean`, tested for every title. Football-named titles use ordinary data (for example Super Sub: swapped an exercise rather than skipping, 10 times); none needs match results.

### 6.6 Charts that walk

Steps over time with each stretch of road as its own soft ground, labelled with the stretch's name, the line taking that stretch's light. A dotted line marks your usual. Plan changes and sick days are flagged in words. It takes colours from `auroraFor`, so new regions work without changes.

## 7. Fixes included

1. Training's "+0%" goes; strength per exercise replaces it (Part 4).
2. Backup stamped only when confirmed safe (Part 7).
3. Restore takes a snapshot first (Part 7).
4. Medicines' "+ Add" opens an empty form and saves nothing until Save (Part 4).
5. Drinks show "not logged" until answered (Part 4).
6. Back links point at the new homes (Parts 2–5).
7. Chart labels reach 14 px (Part 4).

**Removed, in the part that replaces each:** Experiments, water, other voices, Larger text, High contrast and Big dials, climate report, Wrapped (but the Walk's), character sheet, "A stat from your data" row, What if as it was.

## 8. Build order

Each part is planned when the one before closes. All parts ship together, on the owner's word.

| Part | Builds | Why here |
|---|---|---|
| 1 | You page | Everything else hangs from its doors |
| 2 | Earned and titles | The trophy case and title need a home |
| 3 | Reports and the film | The owner hasn't had October's film yet |
| 4 | Tracks | Largest; relies on the shared motion and colour |
| 5 | Insights and Diary | Needs track views to link to |
| 6 | Gremlin | Lines are written against all the moments above |
| 7 | Settings and data | Safety work, and removals last |
| 8 | Year page | Needs the rest, and the anniversary |

## 9. Open questions

Sent to the owner in one numbered list. None remain; see below.

## 10. Decided after review (5 Nov)

1. Momentum's rule (6.1) stands, with protein alone standing for food. The panel must be animated, as set out in 4.1.
2. Build order (section 8) stands.
3. All parts ship together at the end, not one at a time. Everything stays on `feat/you` until the owner says to ship.
4. The ticks on Today are dropped; the owner says they are fine.
