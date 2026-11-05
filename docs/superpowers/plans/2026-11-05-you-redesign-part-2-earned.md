# You redesign, Part 2: Earned and titles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native; one reviewer after the last part). Load impeccable and impeccable-extras before Task 4. Steps use checkbox syntax.

**Goal:** A real Earned page: six trophies you can pick, a titles wall worked out from data, visitors by stretch, one rewards picker, shelves, firsts, milestones and odometers. The character sheet goes.

**Architecture:** `src/domain/titles.ts` holds `TitleStats`, `titleStats(input)` and `TITLE_DEFS`, rules as `(stats) => boolean`. `src/domain/earned.ts` holds odometers, firsts, milestones, visitors and shelves. `src/screens/earned/` holds the sections.

**Spec:** sections 4.2, 5, 6.5. **Tech:** as Part 1.

## Global Constraints
As Part 1. No title needs a match result. A title never wears itself. Visitors show no totals and assume no roster.

## Review Focus
1. Sparse data: every rule is false on empty stats; no section shows an empty frame. *(Task 1, 2.)*
2. Old `settings.title` ids from the character sheet keep resolving. *(Task 1.)*
3. A sighting of a creature no longer on the roster doesn't break the page. *(Task 2.)*
4. Rewards moved from the character sheet keep working: confetti, gold rings, gym mode. *(Task 5, by use.)*
5. A backup from before version 6 restores with `moments` empty. *(Task 3.)*

---
### Task 1: Titles
Files: `src/domain/titles.ts`, `tests/titles.test.ts`. Produces `TitleStats`, `titleStats`, `TITLE_DEFS` (`id, name, how, family, rule`), `earnedTitles(stats)`, `titleName(id)`.
Tests: every rule false on empty, true on a full input; thresholds fire at the number and not one below; each computed stat from crafted days, sessions and sets.
Commit: `feat(you): titles worked out from data`.

### Task 2: Earned rules
Files: `src/domain/earned.ts`, grow `src/domain/trophies.ts`, `tests/earned.test.ts`. Produces `odometers`, `firsts`, `milestones`, `visitorsByStretch`, `shelves`, `trophyCandidates`, `pickedTrophies`.
Tests: odometers leave skipped sets out; firsts are earliest; unknown creature still lists; shelves newest first; picks win over automatic, order kept, max six.
Commit: `feat(you): the rules behind Earned`.

### Task 3: Storage
Dexie version 6 `moments`, in `TABLES` for backup; `Settings.trophyPicks`, `Settings.titlesSeen`; `logMoment`. Test: a moment round-trips; `moments` is in the backup tables.
Commit: `feat(you): moments and title settings`.

### Task 4: The page
`src/screens/earned/` sections; `/earned` route; `Earned` door and go-to point there; `/character` redirects; You's trophy case uses picks; `wornTitle` learns new ids; back links on `/dex`, `/records`, `/achievements` return to Earned; a new title offers "Wear it".
Commit: `feat(you): the Earned page`.

### Task 5: Close
Remove `CharacterPage`, moving Rewards to Earned. Browser check at 360 px against the prototype, with probes. Full tests. Short note, then Part 3.
