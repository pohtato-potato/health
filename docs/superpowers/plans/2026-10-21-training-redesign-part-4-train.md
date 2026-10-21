# Training redesign, part 4: the Train tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Train in living colour, following the spec's "The Train tab" and the approved prototype (`#/proto/train`).

- **Before a session:** the next session's card, with the whole plan in load blocks.
- **After a session:** the night's card, gold when there were records, with "Replay tonight's finale".
- **Below, in both states:**
  1. "You, four weeks ago"
  2. "This week on your body", against targets
  3. Records
  4. This month so far, which opens the monthly film
  5. Recent sessions
  6. The plan

The exercise cards come in part 5.

**Architecture:**
- **Pure numbers:** `src/domain/trainView.ts`.
- **Screen:** `src/screens/Train.tsx` is rewritten on a tab variant of the living background (`.lv.lv-tab`: the aurora is fixed behind a scrolling page, and the tab bar stays usable). The housekeeping cards (triggers, lighter week, unfinished sets, always-skipped) stay, restyled as `lv-card`.
- **Replay:** a new route, `/session/replay?id=`, rebuilds a past session's finale with `finaleData` and shows it from page 2.

**Spec:** `docs/superpowers/specs/2026-10-21-training-redesign-design.md`, "The Train tab". Visual reference: `src/screens/proto/TrainLiving.tsx` and the `.tr-*` rules in `src/styles/living.css`.

## Global Constraints

Part 1's constraints, plus:
- **Body colours:** green on target, yellow low, blue high. A legend in words, and each count with its range and a word or ✓.
- **Body targets** (`PlanDef.weeklyTargets`, optional) default to: Shoulders 10–16, Back 10–16, Chest 8–12, Arms 8–14, Legs 10–16, Core 4–8.
- **Gold:** only the records card, the record tags and the after-state with records.
- **Unchanged:** session starts, the 30-minute version, the trip and extra chips, the swaps note, triggers, the lighter week and the housekeeping cards all keep their current behaviour.
- **Months:** "This month so far" counts calendar months. Its full report is the existing `/film`.

## Review Focus

1. **No plan, or no sessions yet.** Train still renders: the start card, and no empty cards. → Task 1 tests on empty inputs; Task 2 guards.
2. **"Four weeks ago" when that session was never done 3–5 weeks back.** The card is left out. → Task 1 test.
3. **A session in progress.** Train shows "Resume" and nothing that starts a second session. → Kept from `NextUpCard`.
4. **After-state on a day with two sessions.** It summarises the latest one. → Task 1 test.
5. **Replaying a session from before set timers and checks.** It still renders (time falls back, no form page). → Task 4, using the part 3 fallbacks.

---

### Task 1: Train numbers

**Files:** `src/domain/trainView.ts`; move `GROUPS` from `src/screens/MuscleMap.tsx` to `src/domain/muscles.ts` and re-export it; add `weeklyTargets?: Record<string, [number, number]>` to `PlanDef`. Test: `tests/train-view.test.ts`.

**Produces:**
- `fourWeeksAgo(sessions, sets, sessionId, today): { then: DayKey; rows: { name: string; then: string; now: string; up: boolean }[] } | undefined`
  - "then" is the done session with that id closest to 28 days ago, within 21–35 days. "Now" is the latest done one.
  - Each row is the best working set per exercise in both sessions, shown as "10 × 14" (kg × reps, or "× 30 s" for seconds), for up to 4 exercises.
  - `up` is true when now beats then.
- `weekVolume(sets, plan, today): { name: string; sets: number; lo: number; hi: number; state: 'low' | 'ok' | 'high' }[]`. Built from `weeklyHardSets` and `GROUPS`, rounded, with the targets.
- `volumeLine(rows): string | undefined`. Names the group furthest below its target, e.g. "Legs are 5 sets short of 10 this week." It returns `undefined` when nothing is low.
- `monthSoFar(sessions, sets, today): { sessions: number; records: number; usualMin?: number; improved?: { name: string; pct: number } }`
  - `usualMin` is the median length of this month's done sessions that weren't logged later. With fewer than 2 such sessions it is `undefined`.
  - `improved` compares each exercise's best value this month with its best in the month's first session that included it. It is the largest % gain, and only shown when it is at least 10%.
- `tonight(sessions, sets, today): { session: TrainingSession; records: SetEntry[]; mins: number; sets: number; liftMin?: number; quality?: number; checks?: number } | undefined`. Summarises the latest session done today.
- `formFocus(sets, plan, sessionId): string | undefined`. The check text slipped most often across that session's last 3 runs.

- [ ] **Tests:** each function on a small fixture, plus the empty-input cases and Review Focus 2 and 4.
- [ ] **Fail → implement → pass; commit** with the message `feat(train): train tab numbers`.

### Task 2: The page, before and after

**Files:** rewrite `src/screens/Train.tsx`; `src/styles/live.css` (`.lv-tab` and the `tr-*` rules ported as `lv-tr-*`). Test: `tests/train-screens.test.tsx`.

**Produces:**
- `UpNextCard(props: { name: string; usual: { min: number; fromHistory: boolean }; changes: number; heavier: number; focus?: string; blocks: Blocks; swaps: number; onStart: () => void; onShort: () => void; chips: { label: string; onClick: () => void }[]; note?: string })`. The blocks are shown in a scrollable list using the part 2 `BlockList`.
- `TonightCard(props: { name: string; records: { label: string }[]; mins: number; sets: number; liftMin?: number; quality?: number; checks?: number; next?: string; onReplay: () => void })`. It is gold when there are records.
- `Train` picks:
  - an active session → `NextUpCard` (as now);
  - a session done today → `TonightCard`;
  - otherwise → `UpNextCard`;
  - no plan → as now.

- [ ] **Test** (static):
  - `UpNextCard` shows "usually 92 min", "one plate change", "2 ready to go heavier", "form focus: head in line", and the block list with a plate line.
  - `TonightCard` with records has the class `gold` and "Replay tonight's finale". Without records it says "Session C done" and has no gold.
- [ ] **Fail → pass; commit** with the message `feat(train): train tab before and after`.

### Task 3: The sections below

**Files:** `src/screens/train/Sections.tsx` (`FourWeeksCard`, `BodyCard`, `RecordsCard`, `MonthCard`, `RecentCard`, `PlanCard`); wire them into `Train.tsx`. Test: `tests/train-screens.test.tsx`.

- **BodyCard:** `BodyHeat` with heat 0.9 per group and tint by state (`#6fe0b0` ok, `#f5ea6a` low, `#7fc4f0` high), the legend, a two-column list, and `volumeLine`. Tapping it opens `/muscles`.
- **RecordsCard:** the latest 3 records, one per exercise, in gold, with "tonight" or a date tag, and "All N ›" opening `/records`.
- **MonthCard:** sessions, records and usual minutes; "most improved"; "full report on 1 Nov". On the first three days of a month it shows "Last month's film ›", which opens `/film`.
- **RecentCard:** as now, restyled, with record tags in gold.
- **PlanCard:** name, sessions and "since" date, opening `/plan`. Warm-up and rules sit in a collapsible below it.

- [ ] **Test:** each card renders its words. The body list says "low" and "high" in words, and the legend is present. With nothing to show, a card returns `null`.
- [ ] **Fail → pass; commit** with the message `feat(train): train tab sections`.

### Task 4: Replay the finale

**Files:** `src/screens/live/Replay.tsx`; the route `/session/replay` in `src/App.tsx`; `LiveFinale` gains `startAt?: number` (no change needed if `step` is passed as 1). Test: `tests/finale-data.test.ts` (replay data from a done session, with cached songs passed in).

- [ ] **Replay** builds `finaleData` from the saved session, its sets, `db.songs` rows for that session, `recordPages` and `quality`. It renders `LiveFinale` from step 1. Done goes back to `/train`.
- [ ] **Test:** `finaleData` for a done session with no timers gives hour `between: 0` and `pages: []`. Then commit with the message `feat(train): replay a session's finale`.

### Task 5: Check and review

- [ ] `TZ=UTC npx vitest run`, typecheck, build. A browser check at phone size: Train before (no session today) and after (a session done today), the replay, and saver.
- [ ] Final review by a fresh reviewer, then one fix pass.
