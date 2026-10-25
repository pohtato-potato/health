# Walk redesign, part 1: geography and the route engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything later parts draw from: real land and route lines, the route catalogue and its checks, signatures, walking a route over time (join, set down, pick up, finish), and the drawn map card, route map and marks as real components.

**Architecture:** A Python generator in `scripts/` turns Natural Earth (public domain, kept outside the repo) and `scripts/geo/routes.json` into two generated TypeScript files under `src/walk/geo/`. Each route is a `RouteDef` file under `src/walk/catalogue/routes/`. Pure rules live in `src/walk/` and are tested first; the one new table (`routes`, database version 4) is written through `src/db/walkRoutes.ts`. The prototype's `RouteArt`, `RouteMap` and `MarkShape` are ported into `src/walk/ui/`, reading the generated data instead of the prototype's.

**Tech Stack:** Vite, React 19, TypeScript, Dexie 4, Vitest with `fake-indexeddb`, `react-dom/server`; Python 3 standard library for the generator.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` (Data › Route catalogue, Walking a route, Derived numbers; Design language › the map card; Challenges and expeditions › Shape).

## Global Constraints

- **This repo is public:** no names, places walked, step counts, dates walked or body numbers in code, tests or comments. Test values are invented.
- "Each route has one ink … **Never gold**."
- "Up to 1,500 km is a challenge" (exactly 1,500 is a challenge); "two challenges and two expeditions at once."
- "Setting down and picking up … Progress is kept, steps while it's down don't count, and a set-down route frees its place. Nothing ever fails."
- "`from` counts, `to` (the day it was set down) doesn't."
- "`doneOn` … once set, a route stays finished."
- "The one kilometre figure: `kmFromSteps(steps) = steps × stride / 1000`" — every distance goes through it.
- "Generated files are never edited by hand."
- "Nothing that carries meaning under 14 px"; "never colour alone."
- Tests run under `TZ=UTC`.

## Review Focus

1. **Set down and picked up on the same day.** That day's steps count once (the new span's `from`), not twice and not zero. Pinned in Task 4.
2. **The stride changes after a route is finished.** A shorter stride lowers the km, but the route stays finished because `doneOn` is set. Pinned in Task 4.
3. **Joining a route that's already in the table** (set down, or finished) resumes or refuses; it never resets progress. Pinned in Task 4.
4. **A backup from before version 4** (no `routes` table) restores and the walk works. Pinned in Task 4.
5. **A place's km past its route's length, or out of order,** in a new catalogue file: the catalogue checks fail loudly rather than drawing a dot off the line. Pinned in Task 2.

---

### Task 1: The geo generator and generated land

**Files:**
- Create: `scripts/make-geo.py` (ported from the shared Walk folder's `mockups/make_geo.py`), `scripts/geo/routes.json`, `scripts/geo/README.md` (where Natural Earth comes from, how to run)
- Create (generated): `src/walk/geo/regions.ts`, `src/walk/geo/routes.ts`
- Test: `tests/walk-geo.test.ts`

**Interfaces:**
- Produces:
  - `REGIONS: Record<RegionKey, Region>`, `Region { box: [number, number, number, number]; outline: string; extra?: string; states?: { name: string; path: string; areaKm2: number; ut: boolean }[] }`, `RegionKey = 'india' | 'britain' | 'med' | 'japan' | 'asia' | 'fantasy'` (more added as routes need them).
  - `ROUTE_LINES: Record<string, { region: RegionKey; line: [number, number][]; ends: [string, string] }>`.
  - `INDIA_AREA_KM2: number`.

- [ ] **Step 1: Write the failing test**

```ts
it('draws all 36 states and union territories of India', () => {
  expect(REGIONS.india.states).toHaveLength(36);
  expect(REGIONS.india.states!.filter((s) => s.ut)).toHaveLength(8);
});
it("adds up India's area within 5% of 3.29 million km²", () => {
  expect(INDIA_AREA_KM2).toBeGreaterThan(3.12e6);
  expect(INDIA_AREA_KM2).toBeLessThan(3.45e6);
});
it('keeps every route line on its region, with at least two points', () => {
  for (const [id, r] of Object.entries(ROUTE_LINES)) {
    const [x0, y0, x1, y1] = REGIONS[r.region].box;
    expect(r.line.length, id).toBeGreaterThanOrEqual(2);
    for (const [x, y] of r.line) expect(x >= x0 - 20 && x <= x1 + 20 && y >= y0 - 20 && y <= y1 + 20, id).toBe(true);
  }
});
it('draws the states the first road crosses, so their shared borders (the Chambal line) are on the map', () => {
  expect(REGIONS.india.states!.map((s) => s.name)).toEqual(expect.arrayContaining(['Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh']));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-geo.test.ts`
Expected: FAIL, module `src/walk/geo/regions` not found.

- [ ] **Step 3: Port the generator**

`python3 -I scripts/make-geo.py <natural-earth dir> src/walk/geo` reads the three files the mockup script reads, takes route waypoints (longitude, latitude) from `scripts/geo/routes.json` (`{ "<id>": { "region": "india", "ends": ["Sabarmati", "Dandi"], "points": [[72.58, 23.06], …] } }`, moved out of the script's inline `ROUTES`), and writes `regions.ts` and `routes.ts` with a "generated, do not edit" header. New in the port: each Indian state's area, computed on the sphere from its unprojected rings (spherical excess, Earth radius 6,371 km), its `ut` flag (Delhi, Chandigarh, Puducherry, Ladakh, Jammu and Kashmir, Lakshadweep, Andaman and Nicobar, Dadra and Nagar Haveli and Daman and Diu), and `INDIA_AREA_KM2` as their sum. The Natural Earth files are in the shared Walk folder's `natural-earth/`; the README says so and names the three files.

- [ ] **Step 4: Generate and run the tests**

Run: `python3 -I scripts/make-geo.py "../Walk shared/natural-earth" src/walk/geo && TZ=UTC npx vitest run tests/walk-geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts src/walk/geo tests/walk-geo.test.ts
git commit -m "feat(walk): real land and route lines from Natural Earth"
```

### Task 2: The route catalogue and its checks

**Files:**
- Create: `src/walk/catalogue/types.ts`, `src/walk/catalogue/index.ts`, `src/walk/catalogue/routes/<id>.ts` for the prototype's 15 routes (data ported from `src/screens/proto/walkSample.ts` and `walkContent.ts`, all `ready: false`)
- Test: `tests/walk-catalogue.test.ts`

**Interfaces:**
- Consumes: `ROUTE_LINES` (Task 1).
- Produces:
  - `RouteDef` exactly as the spec's table, plus `Group = 'india' | 'world' | 'books' | 'wild'`, `RecordKind = 'dated' | 'place' | 'story' | 'estimated' | 'none'`, `Mark` (the prototype's 15: `'seal' | 'crystal' | 'minar' | 'station' | 'milecastle' | 'postcard' | 'elephant' | 'walker' | 'island' | 'moon' | 'shield' | 'house' | 'stage' | 'chapter' | 'stone'`).
  - `CATALOGUE: RouteDef[]`, `routeById(id: string): RouteDef | undefined`, `shelfRoutes(): RouteDef[]` (ready only), `kindOf(def: RouteDef): 'challenge' | 'expedition'` (`km > 1500` is an expedition).
  - `GROUP_NAMES: Record<Group, string>`, `RECORD_NAMES: Record<RecordKind, string>` (the prototype's wording).

- [ ] **Step 1: Write the failing test**

Every check iterates the whole catalogue, so new routes are checked automatically:
```ts
const GOLDS = /#(?:d4af37|ffd700|e8c26b|c9a227|f2c94c)|gold/i;
for (const r of CATALOGUE) describe(r.id, () => {
  it('has a line', () => expect(ROUTE_LINES[r.id]?.line.length).toBeGreaterThanOrEqual(2));
  it('keeps places in order and within its length', () => {
    r.places.forEach((p, i) => {
      expect(p.km).toBeGreaterThanOrEqual(0);
      expect(p.km).toBeLessThanOrEqual(r.km);
      if (i) expect(p.km).toBeGreaterThan(r.places[i - 1].km);
      expect(p.at).toBeLessThan(ROUTE_LINES[r.id].line.length);
    });
  });
  it('has a source', () => expect(r.sources.length).toBeGreaterThan(0));
  it('is never gold', () => expect(r.ink).not.toMatch(GOLDS));
  it('says nothing of then-and-you without a record', () => { if (r.record === 'none') expect(r.then).toBeUndefined(); });
  it('sorts its pages by km', () => r.pages.forEach((p, i) => i && expect(p.km).toBeGreaterThanOrEqual(r.pages[i - 1].km)));
  it('has a book only when it is in the books group', () => expect(!!r.book).toBe(r.group === 'books'));
});
it('ids are unique', () => expect(new Set(CATALOGUE.map((r) => r.id)).size).toBe(CATALOGUE.length));
it('1,500 km is a challenge, 1,501 an expedition', () => {
  expect(kindOf({ ...CATALOGUE[0], km: 1500 })).toBe('challenge');
  expect(kindOf({ ...CATALOGUE[0], km: 1501 })).toBe('expedition');
});
it('shows only ready routes on the shelf', () => expect(shelfRoutes().every((r) => r.ready)).toBe(true));
```

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-catalogue.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the types, the index and the 15 route files**

Port the prototype's draft data. Places get `at` from the prototype's `[index, name]` pairs and `km` from the route's length times that index's share of the line's drawn length. Every draft gets at least one source the prototype round used; mark the file `ready: false`.

- [ ] **Step 4: Run the tests**

Run: `TZ=UTC npx vitest run tests/walk-catalogue.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/walk/catalogue tests/walk-catalogue.test.ts
git commit -m "feat(walk): the route catalogue and its checks"
```

### Task 3: Signatures

**Files:**
- Create: `src/walk/signature.ts`
- Test: `tests/walk-signature.test.ts`

**Interfaces:**
- Consumes: `RouteDef`, `Mark` (Task 2).
- Produces: `Signature { title: string; note: string; mark: Mark; marks: { km: number; name?: string }[] }`, `signatureOf(def: RouteDef): Signature`, `marksReached(sig: Signature, km: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
const base = { id: 't', name: 'Test road', km: 387, record: 'dated', group: 'india', places: [], pages: [], sources: [{ title: 'x' }] } as unknown as RouteDef;
it('uses a route’s own signature when it has one', () => {
  const marks = Array.from({ length: 24 }, (_, i) => ({ km: 16 * (i + 1) }));
  expect(signatureOf({ ...base, signature: { title: 'Grains of salt', note: 'n', mark: 'crystal', marks } }).marks).toHaveLength(24);
});
it('defaults a dated route to its halts, about one per 50 km, at least six', () => {
  const s = signatureOf(base);
  expect(s.title).toBe('The halts');
  expect(s.mark).toBe('stage');
  expect(s.marks).toHaveLength(8); // max(6, round(387 / 50))
  expect(s.marks[7].km).toBeCloseTo(387, 5);
  expect(signatureOf({ ...base, km: 120 }).marks).toHaveLength(6);
});
it('defaults book routes to chapters and others to milestones', () => {
  expect(signatureOf({ ...base, group: 'books', book: {} as never }).title).toBe('Chapters on the road');
  expect(signatureOf({ ...base, record: 'none' }).title).toBe('Milestones');
});
it('counts the marks at or before your km', () => {
  const s = signatureOf(base); // marks every 48.375 km
  expect(marksReached(s, 0)).toBe(0);
  expect(marksReached(s, 48.375)).toBe(1);
  expect(marksReached(s, 1000)).toBe(8);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-signature.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `signatureOf` and `marksReached` in `src/walk/signature.ts`**

Default marks are evenly spaced at `km × (i + 1) / count`. The notes are the prototype's wording.

- [ ] **Step 4: Run the tests**

Run: `TZ=UTC npx vitest run tests/walk-signature.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/walk/signature.ts tests/walk-signature.test.ts
git commit -m "feat(walk): every route's signature collection"
```

### Task 4: Walking a route

**Files:**
- Create: `src/walk/runs.ts` (pure rules), `src/db/walkRoutes.ts` (actions)
- Modify: `src/domain/types.ts` (`RouteRun`), `src/db/db.ts` (version 4, `routes: 'id'`, add `'routes'` to `TABLES`), `src/export/workbook.ts` (a Routes sheet, following the walk sheet near line 284)
- Test: `tests/walk-runs.test.ts`, `tests/walk-runs-db.test.ts`

**Interfaces:**
- Consumes: `kmFromSteps` (`src/domain/walk.ts`), `RouteDef`, `kindOf`, `routeById` (Task 2), `addDays`, `DayKey` (`src/domain/dates.ts`).
- Produces:
  - `RouteRun { id: string; spans: { from: DayKey; to?: DayKey }[]; story?: 'story' | 'places'; storyPauseKm?: number; target?: DayKey; doneOn?: DayKey }`.
  - `stepsByDay(days: Pick<Day, 'date' | 'steps'>[]): Map<DayKey, number>`.
  - `routeKm(run: RouteRun, def: RouteDef, steps: Map<DayKey, number>): number` — capped at `def.km`.
  - `runState(run: RouteRun, def: RouteDef, km: number): 'walking' | 'set down' | 'finished'` — the words shown.
  - `placesFree(runs: RouteRun[], kmById: Map<string, number>): { challenge: number; expedition: number }` — two of each minus those walking.
  - `finishedOn(run: RouteRun, def: RouteDef, steps: Map<DayKey, number>): DayKey | undefined` — the first day the running km reached the length.
  - In `src/db/walkRoutes.ts`: `joinRoute(id: string, today: DayKey, story?: 'story' | 'places'): Promise<'joined' | 'resumed' | 'no place' | 'finished'>`, `setRouteDown(id, today)`, `pickRouteUp(id, today): Promise<'picked up' | 'no place'>`, `markRouteDone(id, day)`, `setRouteTarget(id, day | undefined)`, `pauseStory(id, km | undefined)`.

- [ ] **Step 1: Write the failing rules test** `tests/walk-runs.test.ts`

```ts
const def = { id: 't', km: 100 } as RouteDef;
const steps = new Map([['2026-01-01', 10_000], ['2026-01-02', 10_000], ['2026-01-03', 10_000], ['2026-01-04', 10_000]]); // 7.4 km a day at 0.74 m
it('counts days from joining', () => {
  expect(routeKm({ id: 't', spans: [{ from: '2026-01-02' }] }, def, steps)).toBeCloseTo(22.2, 5);
});
it("doesn't count the day it was set down, or the days while down", () => {
  expect(routeKm({ id: 't', spans: [{ from: '2026-01-01', to: '2026-01-02' }, { from: '2026-01-04' }] }, def, steps)).toBeCloseTo(14.8, 5);
});
it('counts a day once when set down and picked up the same day', () => {
  expect(routeKm({ id: 't', spans: [{ from: '2026-01-01', to: '2026-01-02' }, { from: '2026-01-02' }] }, def, steps)).toBeCloseTo(29.6, 5);
});
it('caps at the route’s length and finishes', () => {
  const short = { id: 's', km: 20 } as RouteDef;
  const run = { id: 's', spans: [{ from: '2026-01-01' }] };
  expect(routeKm(run, short, steps)).toBe(20);
  expect(finishedOn(run, short, steps)).toBe('2026-01-03');
  expect(runState(run, short, 20)).toBe('finished');
});
it('stays finished when a shorter stride lowers the km', () => {
  setStride(0.5);
  expect(runState({ id: 's', spans: [{ from: '2026-01-01' }], doneOn: '2026-01-03' }, { id: 's', km: 20 } as RouteDef, 15)).toBe('finished');
  setStride(undefined);
});
it('frees a place when a route is set down', () => {
  withCatalogue([challenge('a', 100), challenge('b', 100)], () => {
    const runs = [{ id: 'a', spans: [{ from: '2026-01-01' }] }, { id: 'b', spans: [{ from: '2026-01-01', to: '2026-01-03' }] }];
    expect(placesFree(runs, new Map([['a', 5], ['b', 5]]))).toEqual({ challenge: 1, expedition: 2 });
  });
});
it('reads steps by day, skipping days with none saved', () => {
  expect(stepsByDay([{ date: '2026-01-01', steps: 5 }, { date: '2026-01-02' }])).toEqual(new Map([['2026-01-01', 5]]));
});
```
`withCatalogue(defs, fn)` is a test-only override exported from `src/walk/catalogue/index.ts`; `challenge(id, km)` builds an invented `RouteDef` in the test file.

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-runs.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the rules in `src/walk/runs.ts`**

A day counts when `from <= day && (to === undefined || day < to)` for any span; overlapping spans never double-count (sum over the set of counted days).

- [ ] **Step 4: Run it to see it pass**

Run: `TZ=UTC npx vitest run tests/walk-runs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing database test** `tests/walk-runs-db.test.ts`

```ts
it('joins, sets down, picks up and resumes without resetting', async () => {
  expect(await joinRoute('a', '2026-01-01')).toBe('joined');
  await setRouteDown('a', '2026-01-05');
  expect(await joinRoute('a', '2026-01-09')).toBe('resumed');
  expect((await db.routes.get('a'))!.spans).toEqual([{ from: '2026-01-01', to: '2026-01-05' }, { from: '2026-01-09' }]);
});
it('refuses a third challenge', async () => {
  await joinRoute('a', '2026-01-01');
  await joinRoute('b', '2026-01-01');
  expect(await joinRoute('c', '2026-01-01')).toBe('no place');
});
it('refuses to rejoin a finished route', async () => {
  await joinRoute('a', '2026-01-01');
  await markRouteDone('a', '2026-01-20');
  expect(await joinRoute('a', '2026-02-01')).toBe('finished');
});
it('backs up and restores routes, and restores an old backup without them', async () => {
  await joinRoute('a', '2026-01-01');
  const b = await exportData();
  expect(b.tables.routes).toHaveLength(1);
  const old = { ...b, tables: { ...b.tables } };
  delete (old.tables as Record<string, unknown>).routes;
  await restoreData(old);
  expect(await db.routes.count()).toBe(0);
});
```
(Ids `a`, `b`, `c` are invented challenges under `withCatalogue`; answer 5 of the spec's open questions may turn "finished" into a second run, and this test changes with it.)

- [ ] **Step 6: Run it to see it fail, implement, run again**

Run: `TZ=UTC npx vitest run tests/walk-runs-db.test.ts`
Expected first: FAIL (no `routes` table). Add version 4 and the actions; then PASS. Add the Routes sheet to the workbook (id, name, km walked, state word, joined, finished) and extend the existing workbook test with one row.

- [ ] **Step 7: Full suite and commit**

Run: `TZ=UTC npx vitest run && npm run typecheck`
Expected: PASS, clean.
```bash
git add -A && git commit -m "feat(walk): join, set down, pick up and finish any route"
```

### Task 5: Route geometry

**Files:**
- Create: `src/walk/geometry.ts`
- Test: `tests/walk-geometry.test.ts`

**Interfaces:**
- Consumes: `ROUTE_LINES` (Task 1), `RouteDef` (Task 2).
- Produces: `along(line: [number, number][], frac: number): [number, number]`, `lineFracAtIndex(line, i: number): number`, `fracAtKm(def: RouteDef, km: number): number` — the share of the drawn line at that km, pinned to the places so the dot sits on a place exactly when you reach it (between places, linear in km).

- [ ] **Step 1: Write the failing test**

```ts
const line: [number, number][] = [[0, 0], [10, 0], [10, 30]]; // drawn length 40
it('walks along the drawn line', () => {
  expect(along(line, 0)).toEqual([0, 0]);
  expect(along(line, 0.25)).toEqual([10, 0]);
  expect(along(line, 1)).toEqual([10, 30]);
  expect(along(line, 2)).toEqual([10, 30]);
});
it('puts the dot on a place exactly when you reach it', () => {
  const def = { id: 'g', km: 400, places: [{ name: 'A', km: 0, at: 0 }, { name: 'B', km: 300, at: 1 }, { name: 'C', km: 400, at: 2 }] } as unknown as RouteDef;
  withLines({ g: { region: 'india', line, ends: ['A', 'C'] } }, () => {
    expect(fracAtKm(def, 300)).toBeCloseTo(0.25, 5); // B is at index 1, a quarter of the drawn length
    expect(fracAtKm(def, 150)).toBeCloseTo(0.125, 5);
    expect(fracAtKm(def, 350)).toBeCloseTo(0.625, 5);
  });
});
```
`withLines` is a test-only override exported from `src/walk/geo/index.ts`, a small hand-written wrapper over the generated `routes.ts`.

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-geometry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement in `src/walk/geometry.ts`**

- [ ] **Step 4: Run it to see it pass, then commit**

Run: `TZ=UTC npx vitest run tests/walk-geometry.test.ts`
Expected: PASS.
```bash
git add src/walk/geometry.ts src/walk/geo/index.ts tests/walk-geometry.test.ts
git commit -m "feat(walk): where you are on any route's line"
```

### Task 6: The map card, the route map and the marks

**Files:**
- Create: `src/walk/ui/MarkShape.tsx`, `src/walk/ui/RouteArt.tsx`, `src/walk/ui/RouteMap.tsx`, `src/styles/walk.css` (the prototype's `.wp-rc`, `.wp-sc`, route-map and mark rules, renamed `walk-*`)
- Modify: `src/main.tsx` or the stylesheet index (import `walk.css`)
- Test: `tests/walk-ui.test.tsx`

**Interfaces:**
- Consumes: `REGIONS`, `ROUTE_LINES` (Task 1), `routeById` (Task 2), `fracAtKm`, `along` (Task 5), `Mark` (Task 2).
- Produces:
  - `markPath(mark: Mark): ReactNode` (paths on a 24-unit grid, for placing inside another drawing) and `MarkShape({ mark }: { mark: Mark })` (the same in its own `svg`).
  - `RouteArt({ id, km, kind = 'band', label, names = true }: { id: string; km: number; kind?: 'band' | 'thumb' | 'hero'; label?: string; names?: boolean })` — the map card's drawing, framed to the route's own extent.
  - `RouteMap({ id, km }: { id: string; km: number })` — the route page's map: land, the whole route (out and home drawn differently after `turn`), labelled places, your dot.
  - `inkStyle(id: string): CSSProperties` — `{ '--ink': def.ink }`.

- [ ] **Step 1: Write the failing test**

```ts
const MARKS: Mark[] = ['seal', 'crystal', 'minar', 'station', 'milecastle', 'postcard', 'elephant', 'walker', 'island', 'moon', 'shield', 'house', 'stage', 'chapter', 'stone'];
it('draws every mark without a nested svg inside markPath', () => {
  for (const m of MARKS) {
    const html = renderToStaticMarkup(<svg>{markPath(m)}</svg>);
    expect(html.match(/<svg/g), m).toHaveLength(1);
    expect(html, m).toMatch(/<(path|circle|rect)/);
  }
});
it('labels the map card with the route and draws the walked part', () => {
  const html = renderToStaticMarkup(<RouteArt id="dandi" km={100} label="The Dandi March on its map" />);
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="The Dandi March on its map"');
  expect(html).toContain('walk-art-walked');
});
it('draws no walked part at 0 km', () => {
  expect(renderToStaticMarkup(<RouteArt id="dandi" km={0} />)).not.toContain('walk-art-walked');
});
it('draws one map, not two, on the route map', () => {
  const html = renderToStaticMarkup(<RouteMap id="xuanzang" km={2610} />);
  expect(html.match(/class="walk-land"/g)).toHaveLength(1);
});
it('writes place names at 14 px or more', () => {
  const html = renderToStaticMarkup(<RouteMap id="xuanzang" km={2610} />);
  for (const m of html.matchAll(/font-size="([\d.]+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14);
});
```
Font sizes inside the SVG are written in screen pixels: the component scales its `viewBox` labels by the drawn width it's given (`width` prop, default 328 for a 360 px phone with 16 px gutters).

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-ui.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Port the components**

From `src/screens/proto/walkArt.tsx` (`RouteArt`), `walkRoutePage.tsx` (`RouteMap`, `MarkShape`, `markPath`) and the matching CSS. They read `REGIONS`, `ROUTE_LINES` and `routeById` instead of the prototype's data, and place the dot with `fracAtKm`. Class names change from `wp-*` to `walk-*`.

- [ ] **Step 4: Run the tests, then look**

Run: `TZ=UTC npx vitest run && npm run typecheck`
Expected: PASS, clean.
Then a browser check at 360 px: point the prototype's shelf at the real `RouteArt`, screenshot all 15 cards beside the prototype's, and revert that change. Record as "verified by measurement: 15 cards, no overflow, card heights equal".

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(walk): the map card, route map and marks as real components"
```

## Closing the part

Run `TZ=UTC npx vitest run`, `npm run typecheck`, `npm run build`. Final review by one fresh reviewer on the most capable model with the plan, the spec, the ledger's rulings and this Review Focus. One fix pass. Then the closing summary and one question: "Build part 2?"
