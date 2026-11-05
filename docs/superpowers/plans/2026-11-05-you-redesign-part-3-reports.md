# You redesign, Part 3: Reports and the film — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native; one reviewer after the last part). Steps use checkbox syntax.

**Goal:** One weekly story for the whole app, the Feltron month page with the assessment, the reworked film, an archive of every past week and month, and a correction ledger. `/week`, `/receipt`, `/review`, climate and month and journey Wrapped go.

**Spec:** section 4.3, 5. **Architecture:** `src/domain/weeklyStory.ts`, `monthReport.ts`, `corrections.ts` are pure; `src/screens/reports/` renders them.

## Review Focus
1. A week or month with little data: chapters absent, a grade only with data, and a grade always has a word. *(Task 1, 2.)*
2. A past week opens as it was: nothing reads today's data. *(Task 1.)*
3. Old links (`/week`, `/receipt`, `/review`, `/climate`, `/wrapped`) still land somewhere. *(Task 4.)*
4. The Walk's own Wrapped keeps working. *(Task 4.)*
5. A backup from before version 7 restores with no corrections. *(Task 3.)*

### Task 1: Weekly story
`storyChapters(week, input): StoryChapter[]`, fixed order: road, visitors, tally, swing, food, sleep, training, finding, next, backup. Commit `feat(you): the weekly story rules`.
### Task 2: Month report and film frames
`assessment(month, i): Grade[]`, `monthSpread`, `topFives`, `sleepProfile`, `filmFrames(month, i): FilmFrame[]` ending in credits and the assessment. Commit `feat(you): the month report and film frames`.
### Task 3: Corrections
Dexie version 7 `corrections`, `correctionsIn(from, to, list)`, `addCorrection`. Commit with Task 4.
### Task 4: Pages
`/reports`, `/reports/week`, `/reports/month`, reworked `/film`; old routes redirect; door, go-to, due line and Monday banner point here; Journey rows re-pointed. Commit `feat(you): reports, the film and the archive`.
### Task 5: Close
360 px check on every film frame with October's real data; full tests. Short note, then Part 4.
