# You tab: inventory (21 Oct 2026)

A survey from the code of everything reached from `#/you`, written before the You redesign. It records what exists, where it sits, and what is unused, duplicated, hard to find, too deep or risky for honest data. No design here: that happens later, with impeccable.

Sources read: `src/screens/You.tsx` and every screen it links to, `src/App.tsx` (routes), `src/styles/app.css` (control sizes), `PRODUCT.md`, `DESIGN.md`, and the training redesign spec (`docs/superpowers/specs/2026-10-21-training-redesign-design.md`).

## 1. The map

How the screens nest today. `→` is a tap. A screen in *italics* is also reached from somewhere outside You, and that place is named in brackets.

```
You (#/you)
├── header: "You", day N of M, worn title
│   └── ⋯ → Settings (#/settings)                       [also: Today banners, Next up, Photos]
├── Benchmark card (waist ÷ height, toward reveal day)    only when height is set
├── Four doors
│   ├── Tracks (#/tracks)                                 7 / 30 / 90 day switch
│   │   ├── Food        → #/track?k=food
│   │   ├── Shape       → #/track?k=shape
│   │   │   └── Photos (#/photos)                         [also: check-in result]
│   │   │       ├── Check-in (#/checkin)                  [also: + sheet, Today banner]
│   │   │       └── → Settings › Privacy
│   │   ├── Steps       → #/track?k=steps                 step streak and shields live here
│   │   ├── Sleep       → #/track?k=sleep
│   │   ├── Training    → #/track?k=training
│   │   │   └── each session → Session view (#/session/view)
│   │   ├── Readiness   → *Readiness (#/readiness)*       [also: Today]
│   │   ├── Joints      → #/track?k=joints                only when the plan has joint checks
│   │   │   └── For your physio (#/physio)                share as text
│   │   ├── Drinks      → #/track?k=drinks
│   │   ├── Water       → #/track?k=water                 only when water is switched on
│   │   └── Medicines card → Medicines
│   ├── Medicines (#/medicines)                           [also: Settings, Tracks, checklist sheet, + sheet]
│   ├── Night sky (#/sky)                                 a star per perfect day
│   └── Diary (#/diary)                                   [also: Food today]
│       └── each row → the matching log sheet or Close the day
├── List
│   ├── Achievements (#/achievements)                     [also: Journey, Map, toasts, moments]
│   ├── Character (#/character)                           stats, titles, wardrobe, themes
│   ├── Journey clock (#/journey)  ← a hidden hub, see below
│   ├── Reveal day (#/reveal)                             [also: Journey]
│   ├── Experiments (#/experiments)
│   └── A stat from your data                             same as shaking the phone
├── "The week of … is ready" → Weekly review story (#/review)    only after a logged week
├── "Your <month> film" → Monthly film (#/film)          only on days 1–7    [also: Train]
│   └── → Climate report
├── Heatmap: last 8 weeks, one measure at a time (6 chips)
└── What if: a steps dial and +sessions chips move the walk and reveal-day dates

Journey (#/journey), reached only as "Journey clock" on You (and from moments)
├── Journey clock, phase, On this day, Walk card → Map, Departures, Challenge
├── Achievements card → Achievements
├── Reports
│   ├── Week N receipt (#/receipt)        ← → previous / next week
│   ├── Weekly recap (#/week)             → receipt
│   ├── <month> climate report (#/climate) → <month> wrapped
│   ├── <month>, wrapped (#/wrapped)
│   ├── The journey, wrapped (#/wrapped?all=1)
│   └── Monthly review with Claude (sheet)          [also: Settings]
├── Heatmap: the whole journey, a row per month
├── Streaks
└── Reveal card → Reveal day

Settings (#/settings): three parts, each group a summary row that opens in place
├── Your plan
│   ├── You: name, height, goal date, birthday (one editor sheet; birth year hides inside it), units (not changeable)
│   ├── Targets: calories range, protein, steps, water, sleep, sessions; free-meal save-up; suggest target changes
│   ├── Places: home loop steps, confirm yesterday's steps, places editor (meal times, eased steps, foods first)
│   ├── Checklist and medicines: → Medicines, each item (name, times, on/off), add an item
│   ├── Training plan: battery saver, plan → Plan editor (#/plan) or import, undo import, plates owned, plates and dumbbells editor, band, ding, test the ding, screen on, buzz on records, tempo coach
│   └── Food categories: rename, remove
├── Your data
│   ├── Backup: back up now, full backup with photos, nudge after N days, restore
│   ├── Audit pack and Claude review: export workbook, export audit pack, review day, audit note box, monthly review sheet, Claude Project instructions (copy)
│   ├── Last.fm: username and key
│   └── Storage: protected storage, erase everything
└── The feel
    ├── Battery saver and feel: larger text, high contrast, big dials, Voice, ticker, shake for a stat, theme
    ├── Moments and themes: moments, seasonal themes, quiet in public
    ├── Home screen and ticker: shortcuts (text only), install (text only)
    └── Privacy: blur photos, fingerprint for photos
```

Elsewhere but You-shaped: the Records wall (`#/records`) is reached only from Train. The muscle map, plan editor and session replay are Train's.

## 2. Counts

| Kind | Count | Notes |
|---|---|---|
| Pages one tap from You | 12 | Settings, Tracks, Medicines, Night sky, Diary, Achievements, Character, Journey, Reveal, Experiments, the weekly review, the monthly film. Below them: nine Track pages, Readiness, Physio, Photos, Check-in, the plan editor and six reports under Journey |
| Settings groups | 14 | About 60 controls in the code once every group is open (a repeated row, like a checklist item, counted once) |
| Charts | About 15 kinds | Hero chart (every Track), mini bars and sparklines (Tracks tiles), two heatmaps, the achievement wall, the medicines week, the night sky, the what-if dial, the steps weekday pattern, sleep windows, the climate tiles, the wrapped cards, the benchmark card, the photo compare |
| Reports | 7 | Weekly review story, weekly recap, receipt, climate report, month wrapped, journey wrapped, monthly film |
| Exports | 6 | Quick backup, full backup, workbook, audit pack, Claude review (prompt and workbook), physio text. The coach export is specced, not built |

## 3. What is unused, duplicated, hard to find or too deep

### Duplicated

1. **Medicines has four doors**: a You door, a Settings row, a Tracks card and the checklist sheet. Its items are edited in two places with two editors: Settings' item editor (name and times) and Medicines' own editor (kind, form, dose, times, course, stock).
2. **Two heatmaps.** You has an 8-week heatmap with six measures; Journey has a whole-journey heatmap. They use different rules for what counts as "logged".
3. **Three week reviews.** The weekly review story (You), the weekly recap and the receipt (Journey). Each says how last week went, in a different form.
4. **Two month reports, plus a film.** The climate report and month wrapped hold nearly the same numbers (sleep, steps, water, calories, training, the weight trend). The monthly film is a third take, offered on You and Train.
5. **The monthly Claude review** sits in Settings and in Journey's reports, and a review-day banner on Today sends you to Settings.
6. **Streaks in two places.** The step streak and shields are shown on the Steps track and on Journey.
7. **The voice and theme** look like settings but also belong to Character's wardrobe (titles and themes). Theme is picked in Settings; titles are picked in Character.

### Hard to find

8. **The reports hide inside "Journey clock".** Its label on You says "The whole journey as one day", but the page also holds the reports, both wrapped, the achievements card, streaks, departures and the challenge. Nothing on You says the reports are there.
9. **Records live only on Train**, while achievements, character and the night sky (the other "things you earned") live on You.
10. **Photos are three taps deep** (You › Tracks › Shape › Photos), though the check-in is a monthly ritual.
11. **Check-in has no door on You at all.** It's reached from the + sheet, a banner or Photos.
12. **Physio's summary** is under You › Tracks › Joints, at the foot of the page.
13. **The audit note box** ("something looked wrong") is only in Settings › Audit pack, deep inside an expandable group. The point of a note is to leave it where the problem is.
14. **Settings opens with every group collapsed**, so a single switch (high contrast, say) is two taps plus a scan of 14 summary rows. Nothing searches Settings.

### Too deep or too much

15. **Settings › Training plan holds 13 controls** of three different kinds: session behaviour (ding, screen on, buzz, tempo coach, battery saver), equipment (plates, band) and the plan (import, undo). The Train redesign adds plan history on Train, so plan rows now live in two tabs.
16. **Settings › Feel mixes accessibility with fun.** Larger text, high contrast and big dials sit next to the ticker and shake for a stat. The ticker is being removed (Today round 1).
17. **The You page is long and flat.** In order: header, benchmark, four doors, a list of six, two conditional cards, a heatmap and the what-if card. Nothing on the first screen changes from day to day, apart from the conditional cards.

### Probably unused

18. **"A stat from your data"** duplicates shaking the phone.
19. **The What if card** is the last thing on You. It moves only two dates, and its waist response is called "a rough rule of thumb".
20. **Home screen and ticker** in Settings is two lines of static text and one switch for a feature that is going.
21. **Units** is shown as a row ("kg and inches") that cannot be changed.

The usage log (`src/db/usage.ts`) records page opens on the phone. The real backup or audit pack would settle which of these are actually unused. No usage data is in the repo, so this list is a guess from the code.

## 4. Bugs and risks to honest data

Ordered by harm. Each one is something the code does today.

| # | Where | What happens | Rule broken |
|---|---|---|---|
| B1 | Check-in › Tape (`CheckIn.tsx`) | Each tape reading starts at the last reading (or a built-in default the first time) and is saved as-is on Next. A reading you never touched is stored as a new measurement on today's date, so a skipped tape looks like "no change". | Never pre-fill an answer; never change a number silently |
| B2 | Settings › Feel › Voice | The row's tap runs `back('/you')`: it leaves Settings. You has no voice picker, so the voice can't be changed after setup. | Broken control |
| B3 | Backups (`db/backup.ts`, `fullBackup.ts`) | "Last backup" is stamped when the share sheet returns, even if the file never reached Drive. The status dot then turns green. | Never change a number silently (the status overstates safety) |
| B4 | Backup banners (`Banners.tsx`) | Only one banner shows at a time, picked by priority. The backup nudge and the Sunday full-backup banner can lose to other banners for days. | Backups you can't forget |
| B5 | Restore (Settings) | Restore replaces everything after a single sheet, with no automatic backup of the current data first. | Hard to undo |
| B6 | Medicines › + Add | Tapping Add creates a live checklist item called "New medicine", due at 8 am, before anything is typed. If you back out, it stays on the checklist and starts counting misses. | Never pre-fill; silent changes |
| B7 | Diary and Drinks | Drinks have no "not logged" state: no drink entries shows as "none" (Diary) or "None" (Tracks tile and Drinks page). A night you didn't log reads as a night without drinks. | Never show "not logged" as zero |
| B8 | Tracks › Training tile | The strength change shows "+0%" with no sessions, rather than "—" or "no sessions". | Never show "not logged" as zero |
| B9 | Climate report | The rainfall (water) tile says "Target reached on 0 days" even when water tracking is off. The other tiles say "No … logged" when empty, but water never does. | Never show "not logged" as zero |
| B10 | Experiments | Remove deletes an experiment and its history with no confirm and no undo. End it closes it as of yesterday with no undo. | Silent, permanent change |
| B11 | Diary | The day strip goes back only 60 days, so older days can't be opened or fixed from the Diary. | Too deep (unreachable) |
| B12 | Diary › Recent edits | Shows only the last six edits. An edit with no name shows the raw table name ("Changed days"). Undo is one tap with no confirm. | Plain data |
| B13 | Achievements, Records, Medicines, Settings | Back links fall back to the wrong parent when the page is opened directly: Achievements → Journey, Records → Train, Physio → "Back" to Tracks. | Steady positions |
| B14 | Settings › Setup card | Lists what is missing, but nothing in it can be tapped. | Too deep |
| B15 | Wrapped | Cards use hard-coded gradients and colours outside the design tokens, so high contrast and theme days don't reach them. | Accessibility, Fixed Ink rule |

## 5. Accessibility sweep (standard text size)

At the standard text size, which is how the owner reads with the magnifier:

**Targets under 44 px.** `.chip.sm` is 36 px, `.btn.sm` is 40 px and segmented controls (`.seg button`) are 38 px. They grow to 44 px only with Larger text switched on. On You and the pages under it they are:
- You: the heatmap's six measure chips, the what-if session chips, the Open and Play buttons.
- Settings: the review-day chips, Remove in food categories, the Turn on button for protected storage, the Copy button for the Project instructions, the Places editor's Edit and kind chips, the nudge select (`field sm`).
- Tracks: the 7 / 30 / 90 switch on every Track page.
- Achievements: the four filter chips. Experiments: End it, Remove and the metric chips. Medicines: + Add, Edit, Restocked, Remove, Medicine / Supplement, every appointment button and the editor's chips. Diary: Undo. Photos: the pose and compare switches.
- Medicines › "+ Add a time" is set to 36 px tall.

**Colour carrying meaning alone.**
- Records wall: gold, silver and bronze are coloured dots with only an `aria-label`.
- Medicines › Last 7 days: on time, late and missed are sage, gold and rose squares. The words are screen-reader-only; the visible key is a sentence of colour names.
- Achievement wall: each cell's tier is only its colour (the legend names the colours, the cells don't).
- Both heatmaps: the level is opacity only, with no key for what each step means.
- Tracks tiles, hero charts and the mini bars: a bar under target is drawn fainter. Fainter means "under target" with no word.
- Steps › weekday pattern: the low day is apricot and the high day full sage, with no label.
- Photos: the two months being compared are marked by a pearl border only.
- Backup: the status dot is sage or gold (the date beside it does carry the words).

**Small text in charts.** Every chart's axis labels, target and band labels are 10 px SVG text. The tier pills on achievements are 11 px; the climate tiles' "what" labels are 11 px.

**Depth and overlap.** Photo compare's date tags float over the photos on a translucent black, and overlay mode depends on reading two images through each other.

## 6. Already on the later list that may belong here

From the training redesign spec, the Today pinboard and the request:
- **Health Wrapped**: a month wrapped and a journey wrapped already exist (`Reports.tsx`) but are hidden under Journey. "Training Wrapped" is on the later list.
- **Plan history**: specced for Train (the last 10 versions). Settings still has its own plan rows and the old 7-day undo of an import.
- **The weekly coach export**: specced "from the export screen", that is, Settings › Audit pack. Not built yet.
- **Samsung Health import**: on the later list. Steps are typed in by hand every day, and "Confirm yesterday's steps" lives in Settings › Places.
