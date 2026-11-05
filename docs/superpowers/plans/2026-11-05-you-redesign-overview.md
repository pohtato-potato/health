# You redesign: the build, part by part

**Spec:** `docs/superpowers/specs/2026-11-05-you-redesign-design.md`. **The look:** the prototype at `#/proto/you` (`src/screens/proto/YouLiving.tsx`, `src/styles/you-proto.css`).

This is the map of the whole build. Each part gets its own detailed plan (writing-plans format), written when the part before it is closed, because each part's tasks depend on the code the last one leaves. Part 1's is ready:

- `2026-11-05-you-redesign-part-1-you-page.md`

**Branch:** `feat/you`, cut from `main`. Every part commits there. No push, PR or merge without the owner's word.

**Running each part** (playbook, Phase E, as the owner runs it): execute natively with superpowers executing-plans; progress ledger first; test-first for every pure rule; rulings recorded as `Ruling: what — why — cost if wrong`; browser check at 360 px on the restored dev data, side by side with the prototype; use impeccable (with impeccable-extras and the craft floor) before each part's UI work. A part closes with its tests and browser check and a short note, and the next part follows without a stop. **One** fresh reviewer on the most capable model checks the whole branch after the last part, and every Critical and Important gets fixed then.

**Standing rules for every part:** no match report, score, table or form guide (Match Tab Flag); text at least 14 px; targets 44 px; only `transform`, `opacity` and stroke offset animate; every entry keyframe states its `to`; no fixed layer inside an animated block; no gradient text; no personal values in the repo.

## Order and dependencies

```
1 You page ─┬─► 2 Earned & titles ─► 6 Gremlin ─► 7 Settings & data ─► 8 Year page
            ├─► 3 Reports & film ───────┘
            └─► 4 Tracks ─► 5 Insights & Diary ─┘
```

## Part 1: The You page

- **Builds:** shared colour and motion blocks; Momentum and trend rows; Due lines; daily finding; today's lift and How's today; trophy case; six doors; browse cards; Go to box; the rewritten page.
- **Doors in the meantime:** Reports opens `/week`, Earned `/achievements`, Body `/checkin`, Tracks `/tracks`, Diary `/diary`, Insights a small new `/insights` holding the heatmap.
- **Exit check:** side by side with the prototype at 360 px; live animation seen with the pane showing; nothing invisible at rest.

## Part 2: Earned and titles

- **Files:** `src/screens/earned/` sections; `src/domain/titles.ts` (rules); `src/domain/trophies.ts` grows to six with picks; `src/domain/odometers.ts`; Dexie version 6 `moments`.
- **Produces:** `TITLE_DEFS: TitleDef[]` with `family`, `titlesEarned(stats): Set<string>`, `logMoment(kind, payload)`, `visitorsByStretch(sightings, km)`.
- **Key tests:** every title has a rule that fires on a crafted input and not on an empty one; "Wear it" never sets `Settings.title` by itself; old `settings.title` ids still resolve; a creature not in the roster's first set still lists under its stretch; moments start empty and records and achievements fill back.
- **Removes:** the character sheet (`/character` redirects to Earned). `/dex`, `/records` and `/achievements` get back links to Earned.
- **Exit check:** titles wall against the prototype; the replay of a moment plays and returns.

## Part 3: Reports and the film

- **Files:** `src/screens/reports/` (`ReportsHome`, `WeeklyStory`, `MonthPage`, `Archive`); `src/domain/weeklyStory.ts`, `monthReport.ts`, `corrections.ts`; `MonthlyFilm.tsx` rework; Dexie `corrections` table.
- **Produces:** `weeklyStory(week, input): StoryChapter[]`, `filmFrames(month, input): FilmFrame[]`, `assessment(month, input): Grade[]`.
- **Key tests:** chapters in fixed order and absent when they have no data; October's film has credits and an assessment; a grade always has a word; a corrected number shows its note; a past week opens as it was.
- **Removes:** `/week`, `/receipt`, `/review`, climate, month and journey Wrapped, Today's Monday story and the Walk's Monday card; old routes redirect.
- **Exit check:** film at 360 px on every frame; October's real film played from the poster on the restored data.

## Part 4: Tracks

- **Files:** `src/screens/tracks/` rework around one `TrackShell` (ground, headline, changed/why/next, views); `src/ui/you/ambient/` one small component per track; `src/walk/ui/WalkChart.tsx`; views per spec 4.4.
- **Produces:** `TRACK_LOOK: Record<TrackKey, { ground; accent; Ambient }>`, `headlineFor(track, data)`, `strengthByExercise(sets, today)`, `stretchBands(from, to, stepsByDay)`.
- **Key tests:** "not logged" never reads as zero on any track; `strengthByExercise` says "not enough sessions yet" until it can speak, never "+0%"; Drinks shows "not logged" until "No drinks" is answered; Medicines' Add saves nothing until Save; stretch bands tile the range with no gap on any route.
- **Removes:** the Water page and tile, `strengthIndex`.
- **Exit check:** every page against the prototype, chart labels at 14 px, art behind text measured, a greyscale look at grades.

## Part 5: Insights and Diary

- **Files:** `src/screens/insights/`, `src/domain/askData.ts`, `src/screens/Diary.tsx` rework, `src/domain/dayCard.ts`.
- **Produces:** `askData(query, input): { answer; days: DayKey[] }`, `searchDiary(q, input)`, `confidenceWord(n)`.
- **Key tests:** an answer lists every day it used; "when did I last…" finds the right day; each insight states the data still needed.
- **Removes:** Experiments, with natural events kept under Compare.
- **Exit check:** long-press "why did this change?" works by touch; audit note saves.

## Part 6: Gremlin

- **Files:** `src/domain/voice.ts` rewritten; `src/domain/gremlin/` lines by moment.
- **Produces:** `gremlinLine(moment, seed, day)`, warm-up stage by journey day.
- **Key tests:** every moment has about 12 lines; a day repeats the same line; warmth rises with the day and no line admits it; the switch quiets it; old `voice` settings fall back safely; a backup holding another voice restores.
- **Content task:** all lines go to the owner in one batch before the part closes.

## Part 7: Settings and data

- **Files:** `src/screens/Settings.tsx` regrouped; `src/db/snapshots.ts`; `src/domain/checkup.ts`; `src/db/fullBackup.ts`; Train's settings sheet.
- **Key tests:** a backup is stamped only after a confirmed read-back; restore takes a snapshot first; seven dailies kept; each check-up finding offers a fix; undo restores an edit; an old backup restores with new fields absent.
- **Removes:** Larger text, High contrast, Big dials, Units row.
- **Exit check, production build:** run the built artefact for backup save and read-back, since dev mode proves nothing about file handling.

## Part 8: Year page

Almanac by month, most-of lists, the replay, day one against today, the temperature blanket. Offered on the journey's anniversary. Planned last, on real data.

## Ship

Everything ships together, once, after the whole-branch review (owner, 5 Nov). Playbook, Phase F: privacy scan, tests also under `TZ=UTC`, typecheck, build. Remove `#/proto/you` in the last part. Push, PR, merge and deploy only on the owner's word.
