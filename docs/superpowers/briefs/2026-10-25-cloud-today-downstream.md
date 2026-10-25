# Cloud brief: finish Today and Walk, and bring Today's downstream pages into the same world

Written 25 Oct 2026 by the local Today session. The owner will run this in a cloud Claude Code session. The repo is **public**: no personal names, places, body numbers, foods, medicines or plans in code, tests, docs or commit messages.

## 1. Where the code is

- **`feat/walk`**: Today part 1 (the redesigned Today page) plus the whole Walk redesign (parts 0–8), plus the Today↔Walk joins below. Never merged. All tests pass.
- **`proto/today-downstream`** (one commit on top of `feat/walk`): a working **prototype** of this brief's four decisions. It is the visual reference: run it and match it. Build the real version from it, keeping what holds up and tidying the rest.
- Start your work on a new branch **`feat/today-downstream`** from `proto/today-downstream`.
- At the end, open **one draft PR into `main`** with everything: Today part 1, the Walk, the joins and this work. The owner wants them to ship together. **Do not merge.**

## 2. Read first

1. `PRODUCT.md`: the users, the accessibility needs (low vision, read through the phone's magnifier), and "no reduced-motion or battery-saver variants".
2. `DESIGN.md`: especially **Today**, **Walk Tab**, **Walk Band**, **Moments**, and the Named Rules.
3. `docs/superpowers/specs/2026-10-21-today-redesign-design.md`: the Today spec. Its last section, "Decided after the Walk redesign", is current.
4. `docs/superpowers/specs/2026-10-24-walk-redesign-design.md`: the Walk spec.

## 3. Already built (find these, don't rebuild them)

| What | Where |
|---|---|
| Today's top: the place's own drawing every day (the same `Scene` the arrival uses; the fort at Gwalior, say), the Walk's title, no day count, one walk line, the arrival stamp | `src/screens/Today.tsx`, `src/screens/today/WalkTop.tsx`, `src/domain/walkCaption.ts` (`walkCaption`, `todayWalkLine`, `scenePlace`), `tests/today-walk.test.tsx` |
| Today on the region's aurora, with the Walk glass surfaces | `TodayLayout.tsx` (`tint`), the end of `src/styles/today.css` |
| The region tint table | `auroraFor` in `src/walk/page.ts` |
| The Walk tab's sky-line class fix (a global `.sky` was hijacking it) | `src/screens/walk/StatusLines.tsx` |
| **Prototype:** the region tint helper and the day's glow | `src/ui/live/regionTint.ts` (`regionTint`, `DayGlow`, `useWalkKm`) |
| **Prototype:** the region ground behind pages, and the root colour for sheets | `src/ui/live/RegionGround.tsx` (mounted in `App.tsx`), `src/styles/region.css` |
| **Prototype:** the + sheet in Today's order | `src/sheets/LogSheet.tsx` |
| **Prototype:** Today and Train lit by the day's glow | `Today.tsx` (`glow`; dev-only `?glow=in\|record\|perfect`), `Train.tsx` (`trainLight`) |

## 4. What to build (the owner's decisions)

### 1A · Sheets in a solid tint of the land
Every sheet, on every tab, is a **solid** surface: the region's colour mixed into the night (about 34% `--region-a` into `#0c0e1d`). It is never see-through, because the magnifier needs a steady background. What sits inside is the Walk glass (`#0c0e1d` at 50%) with an 18% text hairline.
- **Prototype gaps to close:**
  - The morning log's place buttons (the unselected one is still navy).
  - Inputs (`.field` stays near-black; decide whether glass or a slightly lighter tint reads better).
  - The date chips.
  - Every other sheet in `src/sheets/` and the sheets Today opens: Steps, Waist, Drinks, Night out, Free meal, Checklist, Quick add, More, Occasion, What's left.
  - Walk through each sheet at 360 px.

### 2A · The + sheet in Today's order
Search ("Log anything") comes first, then "Your usual {meal}" chips, then the tiles, then More. The More line is now 14 px; it was 12.
- **To build:**
  - **Usual chips should behave as they do on Today:** one tap adds the food at its usual portion, with a toast and Undo (see `addUsual` in `Today.tsx`). In the prototype the chip opens Add food instead.
  - Pull the add-and-toast logic into one shared hook so Today and the + sheet use the same code.
  - Add a test for the order.
- **Leave alone:** the toast's "Undo" versus "Change" wording. It's an open question for the owner, so keep "Undo".

### 3A · The pages Today opens, on the region's colour (a light pass)
Food (`/food`), Close the day (`/close`), Readiness (`/readiness`), the weekly recap (`/week`) and Check-in (`/checkin`) sit on the region's aurora. Their `.card`, `.panel`, `.meal-panel` and `.list` surfaces become glass, and their hairlines use the glass edge. **Layouts don't change.**
- **To build:**
  - Replace the prototype's hard-coded `REGION_PAGES` list with something each page opts into, such as a `RegionFrame` wrapper like the Walk's `WalkFrame`.
  - Check every row separator: Close the day's still look blue.
  - Food's progress-bar tracks are navy.
  - Check-in wasn't checked in the prototype.
  - **Leave Close the day's gold button alone, but flag it in the PR:** gold is meant only for records and a perfect day.

### 4A · The land, and a light for how the day went
- The region's colour is the ground on Today, the Walk, Train between sessions, and the pages above.
- How the day went is **one light**, the aurora's accent blob, larger and lower on the right:
  - **soft green** (`#bfe8d4`) after a session in range;
  - **gold** (`#f6cf72`) after a record night or on a perfect day;
  - none on an ordinary day.
- The whole screen changes colour **only** during a live session (the `st-*` states in `src/styles/live.css`, on `/session`) and in full-screen moments.
- **To build:**
  - A pure `dayGlow({ perfect, session })` in `src/domain/`, tested first. Order: perfect, then record, then in range, then none. Reuse `trainGlow` from `src/domain/trainView.ts`.
  - Today and the Train tab both use it.
  - Make sure `/session` still shows its full state colours.
  - Keep the dev `?glow=` override behind `import.meta.env.DEV`, or remove it.

## 5. How to work

- **Process:**
  - Test-first for every rule (TDD).
  - Build all four parts natively, then run **one** comprehensive review at the end. The owner doesn't want a review after each part.
- **Accessibility floors (measure, don't eyeball), at 360 px wide (the owner's Galaxy S23), not 375:**
  - Nothing that carries meaning is under 14 px.
  - Every tap target is at least 44 px. Grow a small control's tap area with an invisible `::after` and leave how it looks unchanged.
  - Text never overlaps.
  - No sideways scroll.
  - Colour never carries meaning alone.
  - Blocks stay where they are while you read.
- **Class names:**
  - Prefix new class names. The app has global classes that silently restyle anything sharing the name:
    - `.sky`: a full-bleed gradient;
    - `.glow`: a breathing opacity animation, which faded the whole page in the prototype until it was renamed `lv-glow`;
    - `.band`: the walk band.
  - Grep the styles before adding any class.
- **Motion:** never add reduced-motion or battery-saver versions. Motion stays as designed.
- **Tests and build:** run tests with `TZ=UTC` (CI runs Node 24 on Ubuntu). `npx tsc --noEmit -p .` must be clean, and `npm run build` must pass.
- **Sample data:**
  - The local sample backup is git-ignored and **not** in the repo. Use the app's own setup with made-up values, or write a small generator of **fictional** data under `tests/` or `scripts/`.
  - Never commit real data.
  - To see the region colours, give the sample enough steps to reach the ravines (around 300 km, roughly 400,000 steps at the default stride). That's where the plum is easiest to judge.
- **Docs:** when you're done, update DESIGN.md (sheets, the region frame, the day's glow) and the Today spec's "Decided after the Walk redesign" section.
- **Privacy:** scan the diff for personal data before every push.

## 6. What to hand back

- The branch `feat/today-downstream`, pushed, with a draft PR into `main` and the PR body ending in the standard Claude Code line. Don't merge.
- In the PR body:
  - what was reused from the prototype and what was rewritten;
  - each page checked at 360 px, with the probe results (text under 14 px, targets under 44 px, overlaps);
  - anything left for the owner (the gold Close the day button, the toast's Undo wording).
