# Walk redesign, part 3: stretches and small stops — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Named stretches and small stops on the main walk: the stretch's storybook name leads the Walk tab's title, its long page opens from the name, a half-screen sheet marks a stretch's end, and small stops appear as a status line that opens their card of facts. Writing for the first batch, Agra to Bhopal (km 230–770), with sources.

**Architecture:** Content lives in `src/walk/content/stretches.ts` and `src/walk/content/stops.ts` as typed data. Rules in `src/walk/road.ts`, test-first, read only the content and steps by day. Screens: `src/screens/walk/StretchPage.tsx` (route `#/stretch?id=`), `StopPage.tsx` (route `#/stop?id=`), `StretchEndSheet.tsx` (shown once per stretch, seen id `walk-stretch:<id>`). The Walk tab's title and status lines (part 2) take the stretch and the stop. The rest of chapter 1's writing follows in batches before the redesign ships; the content checks cover whatever is written, from Agra to `WRITTEN_TO_KM`.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("The road: stretches, small stops, people"; "How history is told"). Look: the prototype's small stop (`StopMoment` in `src/screens/proto/WalkProto.tsx`), which the owner kept as it was.

## Global Constraints

- **This repo is public:** no personal values. Content is public history and geography.
- "Stretches: one to two weeks long (about 100 km at the default pace), each ending where the land changes. Naming starts from Agra."
- "Small stops: six kinds, each with a word and a mark: River, Border, Food, Forts and temples, Wildlife, Strange but true. They follow the land, but never more than about three days apart. Each has three to five facts, shown one at a time ("1 of 4")."
- "All sides, critically … told plainly and from every side." Places of worship are fine as a mix, never the focus (owner, 24 Oct).
- "Written in our own words: no quotations." Every fact has a source; a claim that's disputed says so.
- "Nothing that carries meaning under 14 px"; "never colour alone"; "targets at least 44 px"; "stable positions".
- Tests run under `TZ=UTC`.

## Review Focus

1. **A stop and a stretch end on the same day,** or two stops on one day: one status line (the last stop), and the sheet shows once. Pinned in Task 1.
2. **Before Agra** (km < 230): no stretch, title falls back to "Near X". Pinned in Task 1.
3. **Past the written range** (km > `WRITTEN_TO_KM`): no stretch and no stop, no crash. Pinned in Task 1.
4. **Editing an old day** moves when a stop was reached; the line still shows only on the day it is reached now. Pinned in Task 1 (uses `crossings`).
5. **Facts accuracy:** every fact traceable to a listed source; disputed claims marked. Checked in Task 2 by the content review step (not a unit test).

---

### Task 1: The road's rules

**Files:**
- Create: `src/walk/road.ts`, `src/walk/content/types.ts`
- Test: `tests/walk-road.test.ts`

**Interfaces:**
- Produces:
  - `StopKind = 'river' | 'border' | 'food' | 'fort' | 'wildlife' | 'strange'`; `STOP_WORDS: Record<StopKind, string>` ("River", "Border", "Food", "Forts and temples", "Wildlife", "Strange but true").
  - `Stretch { id: string; name: string; plain: string; fromKm: number; toKm: number; page: string[]; deeper?: { title: string; text: string }; sources: Source[] }`.
  - `SmallStop { id: string; kind: StopKind; km: number; name: string; facts: string[]; creature?: string; sources: Source[] }`; `Source { title: string; url?: string }`.
  - `stretchAt(km, stretches): Stretch | undefined`.
  - `stretchDay(stepsByDay, today, s: Stretch): number` — the day of the stretch (1 on the day you entered it).
  - `stopToday(stepsByDay, today, stops): SmallStop | undefined` — the last stop reached on this day.
  - `stretchesEnded(stepsByDay, stretches): Stretch[]` — every stretch whose end you've passed, in order (the sheet shows the latest unseen one).
- Tests (real values from the content's shape, invented content):
  - `stretchAt` at a stretch's `fromKm` is that stretch, at its `toKm` the next one; below the first and above the last, undefined.
  - `stopToday` with two stops crossed the same day returns the later; a day with none returns undefined.
  - `stretchDay` is 1 on the entry day and counts calendar days after it.
  - `stretchesEnded` lists ended stretches in order and none at km 0.

### Task 2: Agra to Bhopal, written

**Files:**
- Create: `src/walk/content/stretches.ts`, `src/walk/content/stops.ts` (`STRETCHES`, `STOPS`, `WRITTEN_TO_KM = 770`)
- Test: `tests/walk-content.test.ts`

- Tests:
  - Stretches tile `230 … WRITTEN_TO_KM` with no gap or overlap; every stretch is 50–220 km; every one has a page of at least two paragraphs and a source.
  - Stops are in km order within `230 … WRITTEN_TO_KM`; from Agra on, no gap between stops (or Agra and the first stop) is more than 45 km; every stop has 3–5 facts, each under 220 characters, and a source.
  - Every `StopKind` appears at least once in the batch (all six kinds shown in its first two months); every kind has a word.
- **Content step:** research each stretch and stop with web sources; write in our own words; mark disputed claims ("often said … unproven"). Then a self-review pass against the sources before commit (the owner asked Claude to review batches).

### Task 3: The title, the stop line and the screens

**Files:**
- Create: `src/screens/walk/StretchPage.tsx`, `StopPage.tsx`, `StretchEndSheet.tsx`, `src/walk/ui/StopMark.tsx`
- Modify: `src/screens/WalkTab.tsx`, `src/screens/walk/WalkTitle.tsx` (name as a button to its page), `src/screens/walk/StatusLines.tsx` (a line can open something), `src/walk/page.ts` (`statusLines` takes `stop?: { text; id }`), `src/App.tsx` (routes `/stretch`, `/stop`), `src/styles/walk.css`
- Test: `tests/walk-road-screens.test.tsx`
- Tests:
  - With a stretch, the title is its name as a 44 px button to `/stretch?id=…` and the sub reads "Agra to Gwalior · day 3 of about 9"; without one, "Near X" as before.
  - The stop line reads "River · The Chambal" and is a button.
  - `StopFacts` shows "1 of 4 · tap for the next", advances, wraps; every fact is at least 15 px text.
  - `StretchEndSheet` names the stretch done and the next one, once (seen id).
  - Every `StopKind` has a mark (iterate all kinds).
- **Browser check at 360 px:** title, stop line, stop page, stretch page, end sheet; reduced motion; battery saver.

## Closing the part

Full suite, typecheck, build. One fresh reviewer on the most capable model (code and a fact-check of the batch). One fix pass. Summary and one question: "Write the next batch of chapter 1, or plan part 4?"
