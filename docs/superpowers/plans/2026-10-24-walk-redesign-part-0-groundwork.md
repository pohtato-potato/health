# Walk redesign, part 0: groundwork — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One build branch with the debloat, the prototype and the Today page together; Today's walk opens the Walk tab; the landmarks the owner picks are replaced.

**Architecture:** `feat/walk` is cut from `feat/today-page`, then `origin/debloat/walk` and `proto/walk` are merged in (a dry run shows no textual conflicts). The place and status pickers leave `WalkFull` for a small `PlaceStatusRow` on the Walk tab, and `WalkFull` is deleted. Landmark replacements are new kit shapes in `src/walk/art/landmarks.ts`.

**Tech Stack:** Vite, React 19, TypeScript, Dexie, Vitest, `react-dom/server` for static render tests.

**Spec:** `docs/superpowers/specs/2026-10-24-walk-redesign-design.md` (Build order 0; "The Walk tab, top to bottom" item 3; Design language › Landmarks; open question 2).

## Global Constraints

- **This repo is public:** no names, places walked, step counts, dates walked or body numbers in code, tests or comments. Test values are invented.
- "Standard text size for the magnifier, never larger by default, nothing that carries meaning under 14 px."
- "Never colour alone: every state has a word."
- "Targets at least 44 px, main actions 50–56 px."
- "No religious motifs in any drawing, stamp or ornament."
- Tests run under `TZ=UTC`.
- A component that imports the router can't be rendered with `renderToStaticMarkup`: pass actions in as props.
- No push, PR or merge without the owner's word.

## Review Focus

1. **Semantic breaks after a clean merge.** The debloat removed `distanceInTerms`, `walkForecast`, `stateEntries`, `QUAD` and the souvenir shapes; the Today branch may still call them. Typecheck catches calls; the full test suite catches behaviour. Pinned in Task 1, Step 3.
2. **Stride on Today.** Today computes `walkKm` itself (`kmFromSteps` in `Today.tsx`); after the merge it must use the debloat's stride setting like every other screen. Pinned in Task 1, Step 4.
3. **The place and status pickers** must never be unreachable: they move in the same commit that deletes `WalkFull`. Pinned in Task 2.
4. **Keyboard and screen reader:** Today's walk button still announces where it goes ("Open the Walk tab"). Pinned in Task 2, Step 1.
5. **Every city still has a landmark** after replacements (iterate all 46). Pinned in Task 3.

---

### Task 1: The build branch

**Files:**
- Modify: whatever the merges and typecheck point to (expected: `src/screens/Today.tsx`, `src/domain/film.ts`)
- Test: `tests/walk-stride.test.ts`

**Interfaces:**
- Consumes: from `debloat/walk`: `setStride(m: number | undefined): void`, `strideM(): number`, `kmFromSteps(steps: number): number` in `src/domain/walk.ts`; `Settings.strideM?: number`.
- Produces: branch `feat/walk` with the full suite green.

- [ ] **Step 1: Cut and merge**

```bash
git switch -c feat/walk feat/today-page
git merge --no-ff origin/debloat/walk -m "Merge the Walk debloat"
git merge --no-ff proto/walk -m "Merge the Walk prototype"
```
Expected: both merges complete without conflicts. If one stops, resolve keeping both sides' intent, and record a ruling.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean. Each error is a call to something the debloat removed: delete the call and the line it fed, as the debloat spec's "Removed" table says.

- [ ] **Step 3: Full suite**

Run: `TZ=UTC npx vitest run`
Expected: PASS. A failing Today test that asserts removed walk copy ("You've walked…", a chapter forecast) is updated to the debloat's behaviour, with a ruling.

- [ ] **Step 4: Write the failing test** `tests/walk-stride.test.ts`

```ts
it('Today and the Walk tab use the same stride', () => {
  setStride(0.8);
  expect(kmFromSteps(10_000)).toBeCloseTo(8, 5);
  setStride(undefined);
  expect(kmFromSteps(10_000)).toBeCloseTo(7.4, 5);
  setStride(2); // outside 0.3–1.5 m
  expect(kmFromSteps(10_000)).toBeCloseTo(7.4, 5);
});
it('no screen turns steps into km on its own', () => {
  // every `* 0.74` or `STRIDE_M` use outside src/domain/walk.ts is a second figure
  const hits = grepSrc(/STRIDE_M|\*\s*0\.74/).filter((f) => !f.endsWith('src/domain/walk.ts'));
  expect(hits).toEqual([]);
});
```
`grepSrc(re)` reads every `src/**/*.ts(x)` file with `fs` and returns the paths whose text matches; put it in `tests/helpers/grepSrc.ts`.

- [ ] **Step 5: Run it, fix, run again**

Run: `TZ=UTC npx vitest run tests/walk-stride.test.ts`
Expected first: the second test fails if any screen (Today included) still uses `STRIDE_M` directly. Replace each with `kmFromSteps`. Then: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore(walk): one build branch with the debloat and the prototype"
```

### Task 2: Today's walk opens the Walk tab

**Files:**
- Create: `src/screens/walk/PlaceStatusRow.tsx`
- Modify: `src/screens/today/WalkTop.tsx`, `src/screens/Today.tsx`, `src/screens/WalkTab.tsx`, `src/styles/today.css` (remove `td-walkfull*`)
- Delete: `src/screens/today/WalkFull.tsx`
- Test: `tests/today-walk.test.tsx`, `tests/walk-place-status.test.tsx`

**Interfaces:**
- Consumes: `placeFor`, `changePlace`, `StatusRow`, `PlaceIcon` (as `WalkFull` uses them today).
- Produces: `PlaceStatusRow({ settings, today, day, onPlace }: { settings: Settings; today: DayKey; day: Day | undefined; onPlace: (id: string) => void })` — the place chips (only when there are places) and the status row, without headings larger than the page's `h3`.

- [ ] **Step 1: Write the failing tests**

In `tests/today-walk.test.tsx`, replace the WalkTop block's label assertion:
```ts
expect(html).toContain('aria-label="Wed 21 Oct · Home. Near Test Town. Day 31 · 16 km to Test Fort. Open the Walk tab"');
```
New `tests/walk-place-status.test.tsx`:
```ts
it('shows every place as a chip, the current one pressed', () => {
  const html = renderToStaticMarkup(<PlaceStatusRow settings={withPlaces(['Place A', 'Place B'])} today="2026-10-21" day={dayAt('Place B')} onPlace={() => {}} />);
  expect(html).toContain('Place A');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
});
it('shows the status row with no places set', () => {
  const html = renderToStaticMarkup(<PlaceStatusRow settings={withPlaces([])} today="2026-10-21" day={undefined} onPlace={() => {}} />);
  expect(html).not.toContain('Where now');
  expect(html).toContain('Status');
});
it('WalkFull is gone', () => {
  expect(existsSync('src/screens/today/WalkFull.tsx')).toBe(false);
});
```
`withPlaces` and `dayAt` build invented settings and a day in the test file.

- [ ] **Step 2: Run them to see them fail**

Run: `TZ=UTC npx vitest run tests/today-walk.test.tsx tests/walk-place-status.test.tsx`
Expected: FAIL (old label; `PlaceStatusRow` not found; `WalkFull` exists).

- [ ] **Step 3: Implement**

Move the chips and `StatusRow` from `WalkFull` into `PlaceStatusRow`; render it on `WalkTab` directly under the title. `WalkTop`'s label ends "Open the Walk tab"; Today passes `onOpen={() => go('/walk')}`, and drops `walkOpen`, `setWalkOpen` and the `WalkFull` render. Delete `WalkFull.tsx` and its CSS.

- [ ] **Step 4: Run the tests**

Run: `TZ=UTC npx vitest run`
Expected: PASS.

- [ ] **Step 5: Browser check at 360 px**

On the restored dev data: tap Today's walk, land on the Walk tab, change place and status there, return to Today and see the caption change. Measure the chips' height (≥ 44 px) with `javascript_tool`. Record as "verified by measurement".

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(walk): Today's walk opens the Walk tab, with place and status there"
```

### Task 3: Landmarks without religious emblems

Only after the owner answers open question 2. The default below is the spec's proposal; replace the list with the owner's choice.

**Files:**
- Modify: `src/walk/art/landmarks.ts` (new kit shapes; `STOP_ART` entries)
- Test: `tests/walk-landmarks.test.ts`

**Interfaces:**
- Consumes: the kit helpers in `landmarks.ts` (`rect`, `win`, `onion`, path strings in a 120-wide box standing on y = 0).
- Produces: new kit kinds `lake`, `museum`, `viaduct`, `townhall`, `houses`, `hill`, `riverbridge`; `STOP_ART` for the 11 cities per the owner's answer.

- [ ] **Step 1: Write the failing test**

```ts
const RELIGIOUS = ['mosque', 'gopuram', 'shikhara', 'church', 'gurdwara', 'stupa'];
it('every city has a landmark, none of them a religious building', () => {
  for (const name of CITIES) {
    const l = LANDMARKS[name];
    expect(l, name).toBeTruthy();
    expect(RELIGIOUS, name).not.toContain(l.kind);
  }
});
it('labels name the new landmarks', () => {
  expect(LANDMARKS.Bhopal.label).toBe('the Upper Lake');
  expect(LANDMARKS.Leh.label).toBe('Leh Palace');
  expect(LANDMARKS.Shimla.label).toBe("the toy train's viaduct");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `TZ=UTC npx vitest run tests/walk-landmarks.test.ts`
Expected: FAIL naming Bhopal first.

- [ ] **Step 3: Draw the shapes and remap**

Each new kind is two to four layered paths in the 120 × ~70 box, in the existing style (body, optional `lights`, pale `accents` for water). Remove the religious kinds from the kit once nothing maps to them.

- [ ] **Step 4: Run the tests**

Run: `TZ=UTC npx vitest run`
Expected: PASS.

- [ ] **Step 5: Look at each at 360 px**

Step through the 11 cities' scenes in the prototype's arrival screen (`#/proto/walk?screen=arrival&state=<City>:0`) and screenshot them in one batch for the closing summary.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(walk): secular landmarks for eleven cities"
```
