/** The fix release from the 7 Nov 2026 review: one block per fix. */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { konamiStep, KONAMI_STYLE, tapDirection } from '../src/ui/useKonami';
import { LiveFrame, LiveStage } from '../src/screens/live/Frame';
import { counter, seconds } from '../src/domain/liveSet';
import { SetScreen } from '../src/screens/live/SetScreen';
import { numbersPatch, per100FromTotal, valuesFor } from '../src/domain/foods';
import { FOOD_FIX_FORMAT, fixFood, findFoodFor, parseFoodFixes, pastEntryFixes } from '../src/domain/foodFixes';
import { buildSession, NO_BAND_DEFAULT, type ExerciseDef, type PlanDef } from '../src/domain/plan';
import { fitFontSize } from '../src/ui/fitText';
import { LiveFinale } from '../src/screens/live/LiveFinale';
import { pagesFor, type FinaleData } from '../src/domain/finale';
import { BodyCard } from '../src/screens/train/Sections';
import { screenSummary, visitsFor } from '../src/domain/visits';
import { auditFiles } from '../src/export/auditPack';
import { defaultSettings } from '../src/db/actions';
import { ACHIEVEMENTS } from '../src/domain/achievements';
import type { Food, FoodEntry, LiveCounter, Settings } from '../src/domain/types';
import type { Row } from '../src/screens/session/SetTable';

const css = (f: string) => readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8');
/** The declarations of the last rule whose selector list is exactly `sel`. */
const rule = (src: string, sel: string) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const all = [...src.matchAll(new RegExp(`(?:^|\\n|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'g'))];
  return all.map((m) => m[1]).join(';');
};

describe('1 · the rings scroll, and the Konami code works by taps', () => {
  it('lets a vertical drag scroll the page', () => expect(KONAMI_STYLE.touchAction).toBe('pan-y'));
  it('reads a tap by the edge it lands nearest', () => {
    expect(tapDirection(50, 5, 100, 100)).toBe('up');
    expect(tapDirection(50, 95, 100, 100)).toBe('down');
    expect(tapDirection(4, 50, 100, 100)).toBe('left');
    expect(tapDirection(97, 50, 100, 100)).toBe('right');
  });
  it('fires on ↑ ↑ ↓ ↓ ← → ← → and starts over', () => {
    let m: string[] = [];
    let done = false;
    for (const d of ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'] as const) ({ moves: m, done } = konamiStep(m, d));
    expect(done).toBe(true);
    expect(m).toEqual([]);
  });
  it('says tap in the hint', () => expect(ACHIEVEMENTS.find((a) => a.name === 'Konami code')!.desc).toMatch(/^Tap/));
});

describe('2 · one aurora for the whole session', () => {
  it('a frame on a stage draws no aurora of its own', () => {
    const h = renderToStaticMarkup(
      <LiveStage>
        <LiveFrame state="in">x</LiveFrame>
      </LiveStage>,
    );
    expect(h.match(/lv-field/g)).toHaveLength(1);
    expect(h).toMatch(/class="lv [^"]*lv-staged/);
  });
  it('a frame on its own still draws one', () => expect(renderToStaticMarkup(<LiveFrame state="in">x</LiveFrame>).match(/lv-field/g)).toHaveLength(1));
  it('the tint glides instead of re-blurring big layers', () => {
    const live = css('live.css');
    expect(rule(live, '.lv .blob')).not.toMatch(/filter:\s*blur/);
    expect(live).toMatch(/@property --lvx-a/);
    expect(rule(live, ".lv")).toMatch(/transition:[^;]*--lvx-a/);
  });
});

const NOW = 1_000_000;
const ex: ExerciseDef = { id: 'curl', order: '1', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair' };
const row: Row = { ex, setNo: 1, side: 'both', drop: false, key: 'curl:1:both' };
const noop = () => {};
const setHtml = (c: LiveCounter, timed = false) =>
  renderToStaticMarkup(<SetScreen row={row} name="Curl" kg={10} aim="10–15" bottom={10} tempo={false} timed={timed} nudge={false} c={c} onCounter={noop} onDone={noop} onSkip={noop} theme="dusk" buzz={false} now={NOW} />);

describe('3 · Start set', () => {
  it('starts the clock without a rep', () => {
    const c = counter({ key: 'k', taps: [] }, { t: 'start', at: 100 });
    expect(c.startedAt).toBe(100);
    expect(c.taps).toEqual([]);
  });
  it('a later rep keeps the start', () => expect(counter(counter({ key: 'k', taps: [] }, { t: 'start', at: 100 }), { t: 'tap', at: 900 }).startedAt).toBe(100));
  it('taking every rep back keeps a started set started', () => {
    const c = [{ t: 'start', at: 100 }, { t: 'tap', at: 900 }, { t: 'undo' }].reduce((x, a) => counter(x, a as never), { key: 'k', taps: [] } as LiveCounter);
    expect(c.startedAt).toBe(100);
  });
  it('a set started by a rep still resets on undo, as before', () => expect(counter(counter({ key: 'k', taps: [] }, { t: 'tap', at: 5 }), { t: 'undo' }).startedAt).toBeUndefined());
  it('a timed set started by the button runs its clock', () => expect(seconds(counter({ key: 'k', taps: [] }, { t: 'start', at: NOW - 5000 }), NOW)).toBe(5));
  it('offers Start set before the set starts, Set done after', () => {
    expect(setHtml({ key: row.key, taps: [] })).toContain('>Start set<');
    const started = setHtml({ key: row.key, taps: [], startedAt: NOW - 65_000, started: true });
    expect(started).not.toContain('>Start set<');
    expect(started).toContain('Set done');
    expect(started).toContain('1:05');
  });
});

describe('4 · a food by its total', () => {
  it('divides the total into per 100 g', () => expect(per100FromTotal(330, 800, 40)).toEqual({ kcal: 242.4, protein: 12.1 }));
  it('gives the same total back at that amount', () => {
    const f = { id: 'x', createdAt: 0, name: 'x', unit: 'g', per: 100, defaultAmount: 330, ...per100FromTotal(330, 800, 40) } as Food;
    expect(valuesFor(f, 330)).toEqual({ kcal: 800, protein: 39.9 });
  });
  it('refuses a zero amount', () => expect(per100FromTotal(0, 800, 40)).toBeUndefined());
});

describe('5 · one entry’s own numbers', () => {
  it('marks them as its own and leaves the food alone', () => expect(numbersPatch(512.4, 52, true)).toEqual({ kcal: 512, protein: 52, own: true, proteinUnknown: undefined }));
  it('a typed protein is no longer "not sure"', () => expect(numbersPatch(300, 20, false).proteinUnknown).toBeUndefined());
});

const chicken: Food = { id: 'c', createdAt: 0, name: 'Chicken breast', note: 'cooked', unit: 'g', per: 100, kcal: 165, protein: 31, defaultAmount: 125 };
const salad: Food = { id: 's', createdAt: 0, name: 'Salad', unit: 'g', per: 100, kcal: 330, protein: 15, defaultAmount: 400 };
const fileJson = { format: FOOD_FIX_FORMAT, from: 'Coach', fixes: [{ id: 'f1', food: 'chicken breast', per: 100, kcal: 120, protein: 22.5, weighed: 'raw', note: 'raw' }, { id: 'f2', food: 'Salad', per: 300, kcal: 170, protein: 5 }] };

describe('6 · food fixes from the coach', () => {
  it('reads the file', () => expect(parseFoodFixes(fileJson)).toHaveLength(2));
  it('refuses anything else', () => {
    expect(parseFoodFixes({ format: 'health-plan' })).toBeTypeOf('string');
    expect(parseFoodFixes({ format: FOOD_FIX_FORMAT, fixes: [{ id: 'x', food: 'a', per: 0, kcal: 1, protein: 1 }] })).toBeTypeOf('string');
  });
  it('finds the food by name, ignoring case', () => {
    const fx = parseFoodFixes(fileJson) as Exclude<ReturnType<typeof parseFoodFixes>, string>;
    expect(findFoodFor(fx[0], [salad, chicken])?.id).toBe('c');
    expect(findFoodFor({ ...fx[0], food: 'paneer' }, [salad, chicken])).toBeUndefined();
  });
  it('stores a per-serving fix per 100 g, as usual', () => {
    const fx = parseFoodFixes(fileJson) as Exclude<ReturnType<typeof parseFoodFixes>, string>;
    const s = fixFood(salad, fx[1]);
    expect(s).toMatchObject({ unit: 'g', per: 100, kcal: 56.7, protein: 1.7, defaultAmount: 300 });
    expect(valuesFor(s, 300)).toEqual({ kcal: 170, protein: 5.1 });
    expect(fixFood(chicken, fx[0])).toMatchObject({ kcal: 120, protein: 22.5, weighed: 'raw', note: 'raw', defaultAmount: 125 });
  });
  it('past entries change only on request, and only the ones at the old numbers', () => {
    const e = (id: string, amount: number, kcal: number, extra: Partial<FoodEntry> = {}): FoodEntry => ({ id, date: '2026-11-01', meal: 'lunch', at: 0, kind: 'food', foodId: 'c', name: 'Chicken breast', amount, portion: '', kcal, protein: 0, ...extra });
    const fixed = { ...chicken, kcal: 120, protein: 22.5 };
    const out = pastEntryFixes([e('a', 250, 413), e('b', 250, 500, { own: true }), e('c', 100, 165, { foodId: 's' })], fixed);
    expect(out).toEqual([{ id: 'a', kcal: 300, protein: 56.3, was: { kcal: 413, protein: 0 } }]);
  });
});

const band: PlanDef = {
  format: 'health-plan',
  version: 2,
  name: 'T',
  from: '2026-01-01',
  rotation: ['A'],
  bigJump: 0.25,
  warmup: '',
  rules: [],
  flags: [],
  sessions: [
    {
      id: 'A',
      name: 'A',
      minutes: 60,
      short: [],
      exercises: [
        { id: 'face-pull', order: '1', name: 'Band face pull', sets: 3, reps: [12, 20], load: 'band', bandLevels: ['Light', 'Medium'] },
        { id: 'pull-apart', order: '2', name: 'Band pull-apart', sets: 2, reps: [15, 25], load: 'band', noBand: { name: 'Prone Y raise', load: 'body' } },
        { id: 'curl', order: '3', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair' },
      ],
    },
  ],
} as unknown as PlanDef;

describe('7 · no band', () => {
  it('swaps band moves while the band is off', () => {
    const exs = buildSession(band, 'A', { equipment: { band: false } });
    expect(exs.map((e) => [e.id, e.name, e.load])).toEqual([
      ['face-pull', NO_BAND_DEFAULT.name, 'pair'],
      ['pull-apart', 'Prone Y raise', 'body'],
      ['curl', 'Curl', 'pair'],
    ]);
    expect(exs[0].bandLevels).toBeUndefined();
  });
  it('keeps them with a band', () => expect(buildSession(band, 'A', { equipment: { band: true } })[0].name).toBe('Band face pull'));
  it('the default swap is a dumbbell rear-delt raise', () => expect(NO_BAND_DEFAULT).toMatchObject({ load: 'pair', name: expect.stringMatching(/rear-delt raise/i) }));
});

const best: FinaleData = {
  name: 'S',
  pages: [{ name: 'Plank', big: '134', bigLabel: 'SECONDS', detail: '2:14' }],
  recordSongs: {},
  songs: [],
  hour: { total: 60_000, lift: 0, rest: 0, between: 0, longestRest: 0 },
  form: { rows: [] },
  rings: { exercises: [1, 1], inRange: [1, 1] },
  quality: 80,
  best: { name: 'Plank', big: '134', bigLabel: 'SECONDS', detail: '2:14' },
};

describe('8 · Tonight’s best', () => {
  const h = renderToStaticMarkup(<LiveFinale step={pagesFor(best).indexOf('best')} onStep={noop} data={best} flags={[]} picked={[]} onPick={noop} note="" onNote={noop} onSave={noop} saving={false} onBack={noop} onDiscard={noop} onDone={noop} rings={['#111', '#222', '#333']} />);
  it('is on the best page', () => expect(h).toContain('Tonight&#x27;s best'));
  it('puts a space before the unit', () => expect(h).toMatch(/134 <span class="unit">seconds/));
  it('has no fixed 120 px size', () => expect(h).not.toContain('font-size:120px'));
  it('shrinks to fit its line', () => {
    expect(fitFontSize({ max: 120, min: 40, avail: 300, natural: 600 })).toBe(60);
    expect(fitFontSize({ max: 120, min: 40, avail: 300, natural: 200 })).toBe(120);
    expect(fitFontSize({ max: 120, min: 40, avail: 100, natural: 600 })).toBe(40);
  });
});

describe('9 · the muscle list', () => {
  const h = renderToStaticMarkup(<BodyCard rows={[{ name: 'Shoulders', sets: 4, lo: 10, hi: 20, state: 'low' }, { name: 'Biceps', sets: 8, lo: 6, hi: 12, state: 'ok' }]} onOpen={noop} />);
  it('keeps the count and range together', () => expect(h).toMatch(/<span class="lv-tr-nums[^"]*"><b class="num tn">4<\/b>\s*\/10–20<\/span>/));
  it('one row per group, never wrapping', () => {
    const live = css('live.css');
    expect(rule(live, '.lv-tr-body-list')).toMatch(/grid-template-columns:\s*1fr\b/);
    expect(rule(live, '.lv-tr-body-row')).toMatch(/flex-wrap:\s*nowrap/);
  });
  it('the mark says it in words or a tick', () => {
    expect(h).toContain('>low<');
    expect(h).toContain('>✓<');
  });
});

describe('10 · the live set screen', () => {
  const h = setHtml({ key: row.key, taps: [] });
  it('the ghost side and weight sit in a row above the count', () => expect(h).toMatch(/class="lv-ghosts"[^>]*>.*10<small>kg<\/small>.*class="lv-countwrap"/));
  it('the header never pushes its chips off the edge', () => {
    const live = css('live.css');
    expect(rule(live, '.lv-top')).toMatch(/grid-template-columns:\s*44px minmax\(0, 1fr\) auto/);
    expect(rule(live, '.lv-title')).toMatch(/min-width:\s*0/);
    expect(rule(live, '.lv-bigkg')).not.toMatch(/position:\s*absolute/);
  });
});

describe('11 · flag pills', () => it('all align the same way', () => expect(rule(css('live.css'), '.lv-flags button')).toMatch(/text-align:\s*left/)));

describe('12 · screen visits', () => {
  const r = (path: string, q = '') => ({ path, params: new URLSearchParams(q) });
  it('a new screen is a visit', () => expect(visitsFor(r('/today'), r('/train'))).toEqual([{ kind: 'screen', detail: '/train' }]));
  it('a sheet opening is a visit', () => expect(visitsFor(r('/today'), r('/today', 'sheet=log'))).toEqual([{ kind: 'sheet', detail: 'log' }]));
  it('a sheet closing, or a param change, is not', () => {
    expect(visitsFor(r('/today', 'sheet=log'), r('/today'))).toEqual([]);
    expect(visitsFor(r('/train', 'x=1'), r('/train', 'x=2'))).toEqual([]);
  });
  it('ids in a path are not kept', () => expect(visitsFor(r('/today'), r('/session/view/3f9a1c2e-7d1b-4c2a-9a55-0b3c1d2e4f5a'))).toEqual([{ kind: 'screen', detail: '/session/view/:id' }]));
  it('the audit pack sums them up', () => {
    const usage = [
      { at: 1, kind: 'screen' as const, detail: '/train' },
      { at: 2, kind: 'screen' as const, detail: '/train' },
      { at: 3, kind: 'sheet' as const, detail: 'log' },
      { at: 4, kind: 'open' as const },
    ];
    expect(screenSummary(usage)).toEqual([
      { kind: 'screen', name: '/train', visits: 2, last: 2 },
      { kind: 'sheet', name: 'log', visits: 1, last: 3 },
    ]);
    const files = auditFiles({ settings: defaultSettings() as Settings, days: [], foods: [], entries: [], sessions: [], sets: [], measurements: [], checkins: [], weeks: [] } as never, { usage, edits: [], notes: [] });
    expect(files.map((f) => f.name)).toContain('screens.json');
  });
});
