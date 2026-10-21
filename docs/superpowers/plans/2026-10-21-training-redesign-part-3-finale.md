# Training redesign, part 3: the finale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the session-end form and the story-card finale with the seven-page living-colour finale from the spec:
1. flags and a note;
2. records;
3. soundtrack;
4. where the time went;
5. form;
6. recap rings;
7. tonight's best.

**Architecture:**
- **Numbers:** the pure numbers go in `src/domain/finale.ts`, with tests.
- **Screen:** `src/screens/live/LiveFinale.tsx` renders the pages on the `LiveFrame` aurora. Each page sets a tint class, `fs-<tone>`.
- **Saving:** page 1 saves the session (`finishSession`), using the same steps as today's `DoneForm.save`. The other pages then show what was saved.
- **Routing:** `SessionDone` renders `LiveFinale` in place of `DoneForm` and the old `Finale`. `recordLines`, `recordPages` and `sessionStats` stay in `SessionDone.tsx`, because Train and SessionView import them.

**Spec:** `docs/superpowers/specs/2026-10-21-training-redesign-design.md` §8 "Finale". Visual reference: the prototype's `Finale` (`src/screens/proto/SessionLiving.tsx:906-1100`) and its CSS (`living.css`, "Finale" sections).

## Global Constraints

Part 1's constraints, plus:
- The page order is fixed: flags, records, soundtrack, time, form, recap, best.
- A page with nothing to say is left out: no records means no records page or best page, no songs means no soundtrack page, no form checks or scores means no form page. Flags, time and recap always show.
- The tints are: gold for records and best, violet for music, blue for time, green for form, calm for flags, and the theme's rings for the recap.
- Gold is used only for records and the best.
- The three recap rings use `RINGS[theme]`.
- "Done" on the last page goes to `/train`. There is no way back to page 1 once it has saved.

## Review Focus

1. **A session with no records, no songs, no checks and no timers** (an old-style list session). The finale shows flags, time, recap, and form only if old 1–5 scores exist, and nothing breaks. → Task 1 tests on empty inputs.
2. **Sets with no set timer** (list-logged). Lifting time falls back to the old split, total minus rest, and "between" is 0. It is never negative. → Task 1 test.
3. **Saving twice** (a double tap on page 1). Only one `finishSession`, and the session is saved before the songs are fetched. → a guard flag; checked by measurement.
4. **Offline Last.fm.** The finale must not hang more than 4 s (the existing race). → kept as is.
5. **Per-side left/right line with only one side logged.** No claim is made. → Task 1 test.

---

### Task 1: Finale numbers

**File:** `src/domain/finale.ts`. Test: `tests/finale.test.ts`.

**Produces:**
- `hourSplit(session: Pick<TrainingSession, 'startedAt' | 'endedAt' | 'restLog'>, sets: Pick<SetEntry, 'startedAt' | 'endedAt' | 'skipped'>[]): { total: number; lift: number; rest: number; between: number; longestRest: number }`, all in ms.
  - When at least one set has a timer, `lift` is the sum of the timed sets, `rest` comes from the rest spans, and `between = max(0, total − lift − rest)`.
  - With no timers, it falls back to `hourBreakdown` (lift = total − rest) with `between: 0`.
- `formReport(sets: SetEntry[], checksOf: (exId: string) => FormCheck[]): { share?: number; rows: { text: string; ok: number; of: number }[]; slip?: { text: string; times: number }; sides?: string }`.
  - `share` is ok ÷ (ok + slip) over all checks.
  - `rows` are per check text, worst first, at most 5.
  - `slip` is the check text slipped most often.
  - `sides` is "Left and right were within one rep on every per-side set." when every set number with both sides logged is within 1 rep. Otherwise it is "Biggest gap: {name} set {n}, left {l}, right {r}." It is `undefined` when no set has both sides logged.
- `recapRings(sets: SetEntry[], exs: ExerciseDef[]): { exercises: [number, number]; inRange: [number, number]; checks?: number }`.
  - `exercises` is done ÷ planned, where an exercise is done when it has a non-skipped set.
  - `inRange` counts working sets with value ≥ the bottom of the range, out of the working (non-drop, non-skipped) sets that have a range.
  - `checks` is the ok share, or `undefined` with no checks.
- `bestMoment(pages: RecordPage[]): RecordPage | undefined`. Picks the heaviest record (bigLabel `KG`) first, then the largest number.
- `trackArt(name: string): string`. A deterministic two-colour `linear-gradient` from a string hash. Different names usually give different gradients.

- [ ] **Tests:**
  - `hourSplit` with sets 0–60 s and 180–240 s, a rest 60–150 s, and a total of 300 s gives lift 120, rest 90, between 90 (all × 1000). With no timers, between is 0 and lift is total − rest.
  - `formReport`:
    - its share is right;
    - its rows are sorted worst first;
    - the slip text is right;
    - the sides line covers both the within-one and the gap cases, and is `undefined` with only the L side logged;
    - it gives an empty report for sets without checks.
  - `recapRings` counts the right fractions, and `checks` is `undefined` with no checks.
  - `bestMoment` prefers a `KG` page, and returns `undefined` for no pages.
  - `trackArt` is stable for the same name and differs for 'A' and 'B'.
- [ ] **Fail, implement, pass, commit** with the message `feat(train): finale numbers`.

### Task 2: The finale pages

**Files:** create `src/screens/live/LiveFinale.tsx`; add finale CSS to `src/styles/live.css`. Test: `tests/finale-screens.test.tsx`.

**Produces:** `LiveFinale(props: { step: number; onStep: (n: number) => void; data: FinaleData; flags: { id: string; label: string }[]; picked: string[]; onPick: (ids: string[]) => void; note: string; onNote: (t: string) => void; onSave: () => void; saving: boolean; onBack: () => void; onDiscard: () => void; onDone: () => void; saver: boolean; rings: [string, string, string] })`.

`FinaleData` is:
```
{ name: string; pages: RecordPage[]; recordSongs: Record<string, string>;
  songs: { name: string; record: boolean }[]; topArtist?: string;
  hour: ReturnType<typeof hourSplit>; usualMin?: number;
  form: ReturnType<typeof formReport>; rings: ReturnType<typeof recapRings>;
  quality: number; best?: RecordPage }
```

Page 1 is not part of the visible step list until it is saved. `pagesFor(data): Tone[]` (exported) gives the list of pages that show, from the Global Constraints.

**Page by page:**
1. **Flags:** chips for the plan's session flags, a note textarea, "Save · Nothing to flag" or "Save · Flag knee", plus "Back to the session" and "Discard" links.
2. **Records:** one gold card per page, with its song.
3. **Soundtrack:** the track count, a list of up to 8 tracks with `trackArt` tiles and a "record" tag, and the most-played artist.
4. **Time:** the total, a three-part bar, three rows (Lifting, Resting, Between rest and lifting), the longest rest, and the comparison with the usual length.
5. **Form:** "N% went well" (or the old average form word), the rows with "every set", "n of m" or "slipped n of m" tags, the slip line, and the sides line.
6. **Recap:** three rings and the quality in the centre, a legend in words, and the quality sentence.
7. **Best:** gold bloom and dust, unless in battery saver.

**Controls:** "Next", "And the best part" before the best page, and "Done".

- [ ] **Tests** (static markup):
  - `pagesFor` with no records, songs or checks gives `['flags', 'time', 'recap']`, and with everything gives all seven.
  - Page 1 renders "Nothing to flag" and the flag chips.
  - The time page says "Between rest and lifting" and shows the minutes.
  - The form page says "75% went well".
  - The recap page shows the three legend lines in words.
  - The best page is `st-record` with the record number.
  - In saver, there is no `blob` or `lv-dust`.
- [ ] **Fail, implement, pass, commit** with the message `feat(train): seven-page finale`.

### Task 3: Wire it to the session's end

**File:** `src/screens/SessionDone.tsx`. Its `DoneForm` and `Finale` usage are replaced by a `LiveDone` component that holds the step, the picked flags, the note and the saved data. Delete `src/screens/session/Finale.tsx` if nothing else imports it.

- [ ] **Save** keeps today's order: compute quality, `finishSession`, the flag toast, then the songs (raced against 4 s), then the records' pages. A `saving` guard makes it run once. After saving, the step moves to the first page after flags.
- [ ] **Test:** `finaleData(...)` (a pure builder in `src/domain/finale.ts`) maps `mine` / `songs` / `pages` / `plan` to `FinaleData`. Test it with a small fixture: record songs are matched with `songAt`, and `usualMin` is passed through.
- [ ] **Suite, typecheck and build; commit** with the message `feat(train): the finale closes the session`.

### Task 4: Check and review

- [ ] `TZ=UTC npx vitest run`, typecheck, build.
- [ ] A browser check at phone size: finish the local test session through every page, in saver and not.
- [ ] Final review by a fresh reviewer, then one fix pass.
