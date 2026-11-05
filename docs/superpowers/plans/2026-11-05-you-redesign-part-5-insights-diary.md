# You redesign, Part 5: Insights and Diary

**Spec:** `docs/superpowers/specs/2026-11-05-you-redesign-design.md`, section 4.5. **Overview:** `2026-11-05-you-redesign-overview.md`.

**Goal:** Insights you can question and check; a Diary you can search, with blanks that say "not logged".

## Rules (tested in `tests/ask-data.test.ts`)

- `askData(query, input)`: answers "when did I last…", "how many…", "average…", "best/worst…". Every answer lists the days it used. A question it can't read returns nothing, and the page shows examples.
- `confidenceWord(n)`: Early days, Some evidence, Fair evidence, Solid.
- `insightCards(input)`: each card either speaks, with its working and confidence, or states the data it still needs.
- `naturalEvents(days, settings, today)`: sick and away runs of two days or more, against the week before.
- `statOfWeek`, `trackRecord`: quiet when there's nothing to say.
- `dayCard(date, input)`: what was logged and what wasn't, in words; blank never reads as zero.
- `searchDiary(q, input)`: notes, food and exercises, newest first.

## Screens

- `src/screens/insights/`: ask box, kept answers (`Settings.keptAsks`), every trend with "Why did this change?" on tap and press-and-hold, one heatmap, record book, stat of the week, track record, insight cards.
- `src/screens/Diary.tsx`: day strip and month view, search, day card, audit note, recent edits with undo.
- `/experiments` redirects to Compare, which lists natural events. Saved experiments stay in the data.

## Exit check

At 360 px: long-press "Why did this change?" by touch; an audit note saves; text at least 14 px; targets at least 44 px.
