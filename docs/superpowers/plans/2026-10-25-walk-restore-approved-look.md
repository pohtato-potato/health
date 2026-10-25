# Walk: restore the approved look — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Walk screens look like the approved prototype (`#/proto/walk`, mockup round 4) again: the painted perspective scene for every region, region and route aurora tints on every Walk screen, the strip with the stretch's stops, the route page's odometer and then-and-you line. Battery saver and reduced-motion variants are removed from the whole app, at the owner's request.

**Architecture:** A new scene, `src/walk/art/vista.tsx`, rebuilds `walk-art/top-ravines.svg` in code: the same layers (sky and glow, far band, mid band with rim light, near ground and trees, a perspective road over a crest with today's piece in sage, grass, walker) shaped and coloured per region by `lightFor(part, region)`, with the landmark ahead rising on the far band. The Walk tab's top uses it; Today and the road pages keep `WalkScene`. Aurora colours come from a per-region table and, for route pages, from the route's ink, through one wrapper, `WalkFrame`. Pure rules for the strip and the odometer are test-first.

**Tech Stack:** React 19, TypeScript, Vitest, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("Design language", "The Walk tab, top to bottom", "The route page"); approved comp `src/screens/proto/walk-art/top-ravines.svg`, `strip-stretch.svg`, `src/styles/walk-proto.css`, `src/screens/proto/walkRoutePage.tsx`.

## Global Constraints

- The brief wins: match the approved comp's composition, palette logic and type; don't invent a new look.
- "Every Walk screen sits on the aurora … tinted by the region you're walking through." Route pages tint by the route's ink. Never gold except for what was earned.
- Nothing that carries meaning under 14 px; 44 px targets; never colour alone; checked at 360 px.
- No battery saver and no reduced-motion variants anywhere (owner, 25 Oct 2026). Motion stays as designed.

## Review Focus

1. **Every region drawn:** each of the nine regions renders a scene without gaps, with its own skyline and trees, by day and by night. Test iterates regions × parts of day.
2. **Today's road:** zero km draws no sage piece; a big day doesn't run past the crest.
3. **Muddy tints:** no aurora tint is brown or grey; each keeps its hue. Test on saturation.
4. **The strip at the ends of a stretch and past the written ones:** no stretch means the next city alone; labels never overlap at 360 px.
5. **Nothing left of the removed modes:** no `batterySaver`, `batteryMode`, `.saver` or `prefers-reduced-motion` remains outside the prototype files; old settings with `batterySaver` still load.

---

### Task 1: Remove battery saver and reduced motion

Delete `batteryMode`, `useBatteryLevel`, the saver rest screen variant, `.saver` styles, the Settings toggle (the group becomes "Feel"), the `batterySaver` pref; unwrap `prefers-reduced-motion: no-preference` blocks and delete `reduce` blocks; remove JS motion checks. Update tests that pinned them. PRODUCT.md and DESIGN.md lose the reduced-motion and saver lines.

### Task 2: Aurora tints and `WalkFrame`

- `auroraFor(region)` from a table (ravines plum `#4a2a4f` as in the comp; coast sea `#263d63`; ghats green `#2f4a4a`; others chosen to keep their hue), `--lv-b` `#0c0e1d`; `auroraForInk(ink)` for routes.
- `WalkFrame({ tint, children, className })` puts `Aurora` and the tint behind any Walk page; shelf, route, join, finish, passport, stretch and stop pages use it.
- Tests: never gold; every tint's HSL saturation ≥ 0.25 and lightness 0.15–0.35; ravines is the comp's plum.

### Task 3: The vista

- `Vista({ region, part, todayKm, landmark?, landmarkScale, festive })` in `src/walk/art/vista.tsx`, viewBox `0 34 360 216` like the comp.
- Region skylines: mesas (ravines, deccan), dunes (desert), low hills (plains, east), peaks (ghats, northeast, himalaya), a sea line (coast). Trees: acacia (plains, desert, ravines, deccan), palm (coast, ghats), conifer (himalaya, northeast), broadleaf (east).
- Today's sage piece: length from today's km over 40 km of road, at least visible, at most to the crest; none at 0.
- The walker; stars and moon at night; birds by day; festive decor in the sky; the stone stays the existing `Milestone`, on the left shoulder.
- Tests: every region × part renders sky, road and walker; today's piece present only with km; landmark drawn when given.

### Task 4: The strip

- `stripFor(km, stretch, stops, nextCity)` → `{ from, to, toKm, youFrac, stops: { frac, word, passed }[] }`; with no stretch, from here to the next city.
- `WalkStrip` draws the comp: the road line, today's walked part in sage, a dot per stop with its kind's word, start and end labels ("Gwalior · 112 km"); labels that would collide drop to the kind's mark.
- Also restores the comp's "Today 10.4 km · 241 km from Delhi" line and the "Choose a walk" door with the free places.

### Task 5: The route page

- `Odometer({ km })`: digits in tiles as the comp, counting up once on open.
- `ThenLine`: two markers on one line, "Then · day N" and "You · day M", with the who-took-how-long line under it; only with a record.

## Closing

Full suite under `TZ=UTC`, typecheck, build; side-by-side at 360 px with the prototype for the Walk tab, a route page, the shelf and the passport; one fresh review; one fix pass.
