# Walk redesign, part 2: the Walk tab page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Walk tab, top to bottom, as the spec draws it: the scene with today's piece of road and the milestone stone, the strip, the title, up to three status lines, tomorrow's line, the challenge cards and expedition lines, the doors, all on the aurora tinted by the region.

**Architecture:** Pure rules in `src/walk/page.ts`, each test-first. Sections in `src/screens/walk/`, one file each, taking plain props (no router, no database) so they render statically in tests; `src/screens/WalkTab.tsx` becomes a thin page that loads data and lays them out. Styles go in `src/styles/walk.css`, ported from the prototype's `walk-proto.css` (`.wp-rc`, `.wp-exp`, `.wp-doors`, `.wp-lines`, `.wp-title`). The stretch names arrive in part 3: until then the title is "Near X" or "Between X and Y".

**Tech Stack:** React 19, TypeScript, Dexie (`dexie-react-hooks`), Vitest, `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` ("The Walk tab, top to bottom"; "Derived numbers"; "Design language"). Look: `#/proto/walk` (`WalkPage` in `src/screens/proto/WalkProto.tsx`).

## Global Constraints

- **This repo is public:** no names, places walked, step counts or dates walked in code, tests or comments. Test values are invented.
- "Standard text size for the magnifier, never larger by default, nothing that carries meaning under 14 px."
- "Never colour alone: every state has a word."
- "Targets at least 44 px, main actions 50–56 px."
- "Stable positions: nothing moves while you look at it, and lines that come and go keep their space."
- "Each route has one ink … Never gold."
- "Battery saver is black and still; reduced motion replaces drift and drawing with fades."
- "Every screen is checked at 360 px wide."
- Every distance goes through `kmFromSteps`.
- Tests run under `TZ=UTC`. Section components take actions as props and never import the router.

## Review Focus

1. **The first day, before any steps.** No steps saved: the page still renders, says how to set off, and the tomorrow line uses the 10 km fallback. Pinned in Task 1 and Task 4.
2. **The end of the road** (past the last stop): no next stop, no stone, no tomorrow line, no "Between". Pinned in Task 1.
3. **Exactly 20 km from a place** is "Near"; 20.1 is "Between". Pinned in Task 1.
4. **A status that isn't a rest** (occasion) adds no rest line; travelling gets its own words. Pinned in Task 2.
5. **The status lines' space:** the block keeps the height of three lines whether it shows none, one or three. Pinned in Task 4 (measured).

---

### Task 1: Where you are, and tomorrow

**Files:**
- Create: `src/walk/page.ts`, `src/walk/hindi.ts`
- Test: `tests/walk-page.test.ts`

**Interfaces:**
- Consumes: `positionAt`, `ALL_STOPS`, `CITIES`, `kmFromSteps` (`src/domain/walk.ts`); `Day`, `DayKey`.
- Produces:
  - `whereNow(km: number): { kind: 'near'; place: string } | { kind: 'between'; from: string; to: string } | { kind: 'end'; place: string }` — near within 20 km (inclusive) of the stop behind or ahead.
  - `whereLine(w): string` — "Near Agra", "Between Agra and Gwalior", "Leh, the end of the road".
  - `usualAndBig(days: Pick<Day, 'date' | 'steps'>[], today: DayKey): { usualKm: number; bigKm: number; known: boolean }` — from the last 28 days before today with steps: the median and the 90th percentile (nearest rank); with fewer than 7 such days, `usualKm` 10, `bigKm` 15, `known` false.
  - `timeAtPace(km: number, kmADay: number): string` — "about 9 days", "about 6 weeks" (14–74 days), "about 4 months" (75–539), "about 2.7 years".
  - `tomorrowLine(km: number, usualKm: number, bigKm: number): string | undefined` — undefined at the end of the road.
  - `stoneFor(km: number): { name: string; hindi: string; km: number } | undefined` — the next stop, its Hindi name, whole km left (rounded up).
  - `HINDI: Record<string, string>` in `hindi.ts`, one entry per city.

- [ ] **Step 1: Write the failing test**

```ts
// a test road built from the real stops: Delhi 0, Agra 230, Gwalior 350
it('says near within 20 km of a place, between otherwise', () => {
  expect(whereLine(whereNow(210))).toBe('Near Agra');
  expect(whereLine(whereNow(250))).toBe('Near Agra');
  expect(whereLine(whereNow(250.1))).toBe('Between Agra and Gwalior');
  expect(whereLine(whereNow(330))).toBe('Near Gwalior');
  expect(whereLine(whereNow(0))).toBe('Near Delhi');
});
it('says the end of the road past the last stop', () => {
  expect(whereLine(whereNow(1e9))).toBe('Leh, the end of the road');
  expect(stoneFor(1e9)).toBeUndefined();
  expect(tomorrowLine(1e9, 10, 15)).toBeUndefined();
});
it('takes the usual and a big day from the last 28 days with steps', () => {
  const days = Array.from({ length: 30 }, (_, i) => ({ date: addDays('2026-03-31', -i - 1), steps: 10_000 + i * 100 }));
  const u = usualAndBig(days, '2026-03-31');
  expect(u.known).toBe(true);
  expect(u.usualKm).toBeCloseTo(kmFromSteps(11_350), 5); // median of 10,000…12,700
  expect(u.bigKm).toBeCloseTo(kmFromSteps(12_500), 5); // 90th percentile, nearest rank (the 26th of 28)
});
it('falls back to 10 km with fewer than 7 days, and ignores today', () => {
  expect(usualAndBig([{ date: '2026-03-31', steps: 40_000 }], '2026-03-31')).toEqual({ usualKm: 10, bigKm: 15, known: false });
});
it('says how long at your pace', () => {
  expect(timeAtPace(90, 10)).toBe('about 9 days');
  expect(timeAtPace(387, 10)).toBe('about 6 weeks');
  expect(timeAtPace(1200, 10)).toBe('about 4 months');
  expect(timeAtPace(10_000, 10)).toBe('about 2.7 years');
});
it('says what tomorrow reaches', () => {
  expect(tomorrowLine(225, 10, 15)).toBe('Tomorrow: a usual day reaches Agra.');
  expect(tomorrowLine(300, 10, 55)).toBe('Tomorrow: a usual day takes you to 40 km from Gwalior. A big day reaches it.');
  expect(tomorrowLine(240, 10, 15)).toBe('Tomorrow: a usual day takes you to 100 km from Gwalior.');
});
it('puts the next stop on the stone, in Hindi, for every city', () => {
  expect(stoneFor(238)).toEqual({ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 });
  for (const c of CITIES) expect(HINDI[c], c).toMatch(/[ऀ-ॿ]/);
});
```

- [ ] **Step 2: Run it to see it fail** — `TZ=UTC npx vitest run tests/walk-page.test.ts`, expected: module not found.
- [ ] **Step 3: Implement** `page.ts` and `hindi.ts` (Devanagari names as used on Indian railway boards).
- [ ] **Step 4: Run it to see it pass**, then commit `feat(walk): where you are and what tomorrow reaches`.

### Task 2: Status lines and the region's light

**Files:**
- Modify: `src/walk/page.ts`
- Test: `tests/walk-page-lines.test.ts`

**Interfaces:**
- Consumes: `crossings`, `ALL_STOPS` (`src/domain/walk.ts`), `peopleMet` (`src/walk/people.ts`), `Status`, `regionAt`, the region inks (`src/ui/light.ts` — export `inksFor(region)`).
- Produces:
  - `StatusLine { kind: 'arrival' | 'stop' | 'person' | 'rest'; text: string }`.
  - `statusLines(i: { arrival?: string; stop?: string; person?: { name: string; who: string; line: string }; status?: Status; near: string }): StatusLine[]` — at most one of each kind, in the order arrival · stop · person · rest, at most three.
  - `restLine(status: Status | undefined, near: string): string | undefined` — sick or injured: "Resting at camp outside Agra. The road waits."; break: "A day off at camp outside Agra. The road waits."; travelling: "Travelling today. The road keeps your steps as usual."; occasion or none: undefined.
  - `arrivedToday(stepsByDay: Map<DayKey, number>, today: DayKey): string | undefined` — the last city first reached today.
  - `auroraFor(region: RegionId): { '--lv-a': string; '--lv-b': string; '--lv-accent': string }` — the region's second ink mixed 70% toward the night ground (`#0c0e1d`) for `--lv-a`, 92% for `--lv-b`, and its first ink for the accent.

- [ ] **Step 1: Write the failing test**

```ts
it('orders the lines arrival, stop, person, rest, at most three', () => {
  const l = statusLines({ arrival: 'Agra', stop: 'A river crossing', person: { name: 'P', who: 'a carter', line: 'Says hello.' }, status: 'sick', near: 'Agra' });
  expect(l.map((x) => x.kind)).toEqual(['arrival', 'stop', 'person']);
  expect(l[0].text).toBe('Arrived in Agra today.');
});
it('puts a rest day in kind words, and none for an occasion', () => {
  expect(restLine('sick', 'Agra')).toBe('Resting at camp outside Agra. The road waits.');
  expect(restLine('break', 'Agra')).toBe('A day off at camp outside Agra. The road waits.');
  expect(restLine('travelling', 'Agra')).toBe('Travelling today. The road keeps your steps as usual.');
  expect(restLine('occasion', 'Agra')).toBeUndefined();
  expect(statusLines({ status: 'occasion', near: 'Agra' })).toEqual([]);
});
it('names the city first reached today', () => {
  const steps = new Map([['2026-01-01', 300_000]]); // 222 km at 0.74 m: past nothing new but Delhi
  expect(arrivedToday(steps, '2026-01-01')).toBe('Delhi');
  steps.set('2026-01-02', 20_000); // to about 236.8 km: Agra
  expect(arrivedToday(steps, '2026-01-02')).toBe('Agra');
  expect(arrivedToday(steps, '2026-01-03')).toBeUndefined();
});
it('tints the aurora dark from the region, never gold', () => {
  for (const r of REGIONS) {
    const t = auroraFor(r);
    expect(luminance(t['--lv-a'])).toBeLessThan(0.12);
    expect(goldish(t['--lv-a'])).toBe(false);
  }
});
```
(`goldish` moves from the catalogue test to `tests/helpers/goldish.ts` so both tests share it.)

- [ ] **Step 2–4:** run (fail), implement, run (pass); commit `feat(walk): status lines and the region's light`.

### Task 3: The scene's road and the stone

**Files:**
- Modify: `src/walk/WalkScene.tsx` (props `todayKm?: number`, `label?: boolean`)
- Create: `src/screens/walk/Milestone.tsx`
- Test: `tests/walk-scene-top.test.tsx`

**Interfaces:**
- Produces:
  - `WalkScene` draws today's piece of road brighter behind you (`walk-today` path; its length is today's km over a 40 km road behind you, at least 6 px, at most the whole trail) and leaves out the in-scene "You · …" label when `label` is false.
  - `Milestone({ stone }: { stone: { name: string; hindi: string; km: number } })` — one front-on stone, 40 × 50 px, the Hindi name on its cap and the km on its body, `role="img"` with the label "Milestone: Gwalior, 112 km".

- [ ] **Step 1: Write the failing test**

```ts
it('draws today’s road brighter only on a walking day', () => {
  expect(renderToStaticMarkup(<WalkScene km={240} hero todayKm={10} />)).toContain('walk-today');
  expect(renderToStaticMarkup(<WalkScene km={240} hero todayKm={0} />)).not.toContain('walk-today');
});
it('leaves the in-scene label out when asked', () => {
  expect(renderToStaticMarkup(<WalkScene km={240} hero label={false} />)).not.toContain('You ·');
});
it('labels the stone in words', () => {
  const html = renderToStaticMarkup(<Milestone stone={{ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 }} />);
  expect(html).toContain('aria-label="Milestone: Gwalior, 112 km"');
  expect(html).toContain('ग्वालियर');
});
```

- [ ] **Step 2–4:** run (fail), implement, run (pass); commit `feat(walk): today's road and the milestone stone`.

### Task 4: The sections and the page

**Files:**
- Create: `src/screens/walk/WalkTop.tsx` (scene, stone, strip), `WalkTitle.tsx`, `StatusLines.tsx`, `RouteCards.tsx` (`ChallengeCard`, `ExpeditionLine`), `WalkDoors.tsx`
- Modify: `src/screens/WalkTab.tsx` (thin page), `src/styles/walk.css`
- Test: `tests/walk-sections.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3; `RouteArt`, `inkStyle` (part 1); `routeById`, `kindOf`, `RECORD_NAMES` (part 1); `routeKm`, `runState`, `placesFree`, `stepsByDay` (part 1); `db.routes` via `useLiveQuery`; `Aurora`, `batteryMode`, `useBatteryLevel`; `PlaceStatusRow` (part 0).
- Produces:
  - `WalkTop({ km, todayKm, stone, festive, strip, onStrip })` — the strip reads "Gwalior · 112 km" and is a 44 px button to the map.
  - `WalkTitle({ where, sub })` — `h1` "Near Agra", sub "295 km from Delhi · day 31".
  - `StatusLines({ lines }: { lines: StatusLine[] })` — a list that always reserves three lines' height.
  - `ChallengeCard({ id, km, line, target, onOpen })`, `ExpeditionLine({ id, km, onOpen })` — the map card and the slim line; both say km and state in words.
  - `WalkDoors({ onGo })` — Map · Departures · Wrapped, each a 44 px row. (Passport joins in part 4.)
  - `WalkTab` lays out: WalkTop, WalkTitle, PlaceStatusRow, StatusLines, tomorrow line, challenges (if any walking), expeditions (if any walking), "Cities reached" chips, doors; on `<div className="page lv lv-tab walk">` with `Aurora` (still in battery saver) and `auroraFor(regionAt(km))`.

- [ ] **Step 1: Write the failing test**

```ts
it('shows a challenge card with its km and state in words', () => {
  const html = renderToStaticMarkup(<ChallengeCard id="dandi" km={118} state="walking" line="Across the Mahi." onOpen={() => {}} />);
  expect(html).toContain('118');
  expect(html).toContain('of 387 km');
  expect(html).toContain('Across the Mahi.');
});
it('says set down in words on a set-down card', () => {
  expect(renderToStaticMarkup(<ChallengeCard id="dandi" km={118} state="set down" onOpen={() => {}} />)).toContain('Set down');
});
it('shows an expedition as a slim line with its km', () => {
  const html = renderToStaticMarkup(<ExpeditionLine id="xuanzang" km={2610} onOpen={() => {}} />);
  expect(html).toContain("Xuanzang's road");
  expect(html).toContain('2,610 of 10,000 km');
});
it('keeps the status lines’ space when there are none', () => {
  expect(renderToStaticMarkup(<StatusLines lines={[]} />)).toContain('walk-lines');
});
it('opens each door', () => {
  const html = renderToStaticMarkup(<WalkDoors onGo={() => {}} />);
  for (const d of ['Map', 'Departures', 'Wrapped']) expect(html).toContain(`>${d}<`);
});
it('reads the strip as words', () => {
  expect(renderToStaticMarkup(<WalkTop km={238} todayKm={8} stone={{ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 }} onStrip={() => {}} />)).toContain('Gwalior · 112 km');
});
```

- [ ] **Step 2–4:** run (fail), implement the sections and the page, port the card CSS (renamed `walk-rc`, `walk-exp`, `walk-doors`, `walk-lines`; `--route-ink`), run (pass).
- [ ] **Step 5: Browser check at 360 px** on the restored dev data, battery saver off and on, reduced motion on: no horizontal scroll; every target ≥ 44 px; nothing meaningful under 14 px; the status block's height equal with 0 and 3 lines; the aurora tinted; battery saver black and still. Record as "verified by measurement".
- [ ] **Step 6: Commit** `feat(walk): the Walk tab page`.

## Closing the part

`TZ=UTC npx vitest run`, `npm run typecheck`, `npm run build`. One fresh reviewer on the most capable model with this plan, the spec, the ledger's rulings and the Review Focus. One fix pass. Closing summary, one go-ahead question: "Plan and build part 3?"
