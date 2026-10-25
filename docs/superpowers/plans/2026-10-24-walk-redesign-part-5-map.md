# Walk redesign, part 5: the map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The map page rebuilt as something to look at properly: a night map with the survey's graticule on India's real states, your trail and the road ahead, reached states in their region's ink with their names, three levels (this stretch, the chapter, all of India) behind word buttons, the stretch's small stops, and a flyover along your trail that stops on a tap.

**Architecture:** Pure geometry in `src/walk/mapView.ts`, test-first: where any km of the main walk is on the India map (`pointAtKm`, between the real positions of its cities), the trail and road (`trailTo`, `roadAhead`), each level's frame (`levelBox`), a state's label point (`labelPoint`) and its ink (`stateInk`, from the region the walk is in when it first enters the state), and the flyover's frames (`flyoverBox`). The view `src/screens/walk/IndiaMap.tsx` is pure (props in, no router), with labels drawn in screen pixels at the measured width (`useDrawnWidth`, part 1). `src/screens/MapPage.tsx` is rewritten lean around it.

**Tech Stack:** React 19, TypeScript, Vitest, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("The map").

## Global Constraints

- "A night map with survey details: reached places glow, the trail is drawn in its region's ink, with the survey sheet's hatching and triangulation marks."
- "Three levels, with word buttons: the current stretch (opens here), the chapter, all of India. Reached states take their region's ink, with names always written, never under 14 px."
- "The flyover: a Strava-style flight along your trail so far, about 15 seconds, tap to stop."
- "Borders the route really crosses are drawn (Dholpur, and the Chambal as the Rajasthan–Madhya Pradesh line)."
- "Labels never below 14 px; 44 px targets; zoom buttons labelled with words." "Never colour alone." Reduced motion: no flyover animation (a still of the whole trail). Battery saver: still.
- Gold only where earned (the existing "gold route" reward).
- Tests run under `TZ=UTC`.

## Review Focus

1. **The very start** (km 0, no steps): the map opens on the first stretch's frame or Delhi, not an empty or zero-size box. Task 1.
2. **Past the written stretches** (no stretch at this km): the stretch level frames the road around you instead. Task 1.
3. **The islands** (Port Blair, Kavaratti reached by sea): the road draws a sea leg dashed, not across land as a walk. Task 1.
4. **Labels at the India level** at 328 px: state names stay 14 px and don't vanish. Task 2 (measured).
5. **The flyover with a one-point trail** (day one): no division by zero; it shows the still. Task 1.

---

### Task 1: The map's geometry (`src/walk/mapView.ts`, `tests/walk-map.test.ts`)

- `pointAtKm(km): [number, number]` — between the stops either side, by km.
- `trailTo(km): [number, number][]` — every stop passed, then `pointAtKm(km)`.
- `roadAhead(km): { points: [number, number][]; sea: boolean }[]` — the rest of the chapter, in legs, sea legs marked.
- `levelBox(level: 'stretch' | 'chapter' | 'india', km, aspect): [x, y, w, h]` — the stretch's extent (or 120 km around you past the written ones) with room, the chapter's cities, or India's box; never smaller than 30 map units.
- `stateInk(state): string` — the first ink of the region where the walk enters the state.
- `labelPoint(path): [x, y]` — the middle of a state's outline's bounding box.
- `flyoverBox(trail, t, aspect): [x, y, w, h]` — t from 0 to 1: a close frame moving from the trail's start to its end, widening to the whole trail at the end; with one point, that point's frame.
- Tests: pointAtKm at a stop's km is its city; halfway between Delhi and Agra is halfway; trail ends at pointAtKm; island legs are sea; level boxes contain what they should and are ≥ 30 units; flyover at 0 frames Delhi, at 1 contains the whole trail; one-point trail is fine.

### Task 2: The map view and page (`src/screens/walk/IndiaMap.tsx`, `src/screens/MapPage.tsx`, `tests/walk-map-screen.test.tsx`)

- `IndiaMap({ km, reached, level, flyT, width, stops })`: graticule with degree labels, India's outline, every state (reached ones in ink with names), the road ahead dashed (sea legs dotted), the trail, cities as dots with names (all at the India level only for reached ones and the next), the stretch's small stops at the stretch level, you.
- `MapPage`: title, the three level buttons (44 px, words, `aria-pressed`), the map, "Fly over your trail" (hidden under reduced motion or battery saver), the key in words, the stretch name, km of chapter, next state, the stride note.
- Tests: state names for reached states at 14 px on screen at width 328; no label under 14 px at any level; level buttons pressed state; the key names every line in words; the flyover button absent when still.
- Browser check at 360 px: each level, the flyover (and that a tap stops it), reduced motion, battery saver.

## Closing the part

Full suite, typecheck, build; one fresh reviewer; one fix pass.
