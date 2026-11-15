// LG-3 (ledger O38, spec 2026-11-14 §9): everything counted against 42 days or 34 matchdays, rescaled to 28 and 22 in
// world 2, and unchanged in world 1.
import { describe, expect, it } from 'vitest';
import { BOARD, BOON_DAYS, TRACK, TRACK_2 } from '../../src/football/content/season';
import { BREAK_BEFORE, breakBefore, breakDue } from '../../src/football/globe/duty';
import { daysOf } from '../../src/football/calendar';
import { weeksOf } from '../../src/football/kits';
import { talkWindow } from '../../src/football/talks';
import { boardDef, boardFor, boonPicksDue, objectiveMet, trackDue, trackOf, trackSteps, type SeasonFacts } from '../../src/football/tree/season';
import { allAxes } from '../../src/football/types';

describe('international breaks', () => {
  it('before days 14 and 30 of 42; days 10 and 20 of 28, both league nights', () => {
    expect(breakBefore(1)).toEqual(BREAK_BEFORE);
    expect(breakBefore(2)).toEqual({ 1: 10, 2: 20 });
    for (const d of [10, 20]) expect(daysOf(2)[d - 1].kind).toBe('league');
    expect(breakDue('season', 1, 10, [], 2)).toEqual({ n: 1, done: 0 });
    expect(breakDue('season', 1, 10, [])).toBeUndefined();
    expect(breakDue('season', 1, 14, [])).toEqual({ n: 1, done: 0 });
  });
});

describe('the season track', () => {
  it('42 steps in world 1; 28 in world 2 with every reward kept, in order', () => {
    expect(trackOf(1)).toBe(TRACK);
    expect(TRACK_2).toHaveLength(28);
    const rewards = (t: typeof TRACK) => t.filter((s) => s.reward).map((s) => s.label);
    expect(rewards(TRACK_2)).toEqual(rewards(TRACK));
    expect(TRACK_2.find((s) => s.label === 'Icon odds')!.step).toBe(28);
  });
  it('steps cap at the season length, and rewards fall due on the 28-step track', () => {
    const eng = { track: { season: 1, steps: Array.from({ length: 30 }, (_, i) => `d${i}`), catchups: 0 }, trackPaid: [] } as never;
    expect(trackSteps(eng, 1, 2)).toBe(28);
    expect(trackSteps(eng, 1, 1)).toBe(30);
    expect(trackDue(eng, 1, 2).map((s) => s.label)).toContain('Icon odds');
    expect(trackDue(eng, 1, 1).map((s) => s.label)).not.toContain('Icon odds');
  });
});

describe('boons', () => {
  it('picks on days 1, 15 and 29 of 42; 1, 10 and 19 of 28', () => {
    expect(BOON_DAYS).toEqual([1, 15, 29]);
    expect(boonPicksDue(14, 0)).toEqual([1]);
    expect(boonPicksDue(10, 0, 2)).toEqual([1, 2]);
    expect(boonPicksDue(19, 1, 2)).toEqual([1, 2, 3, 4]);
  });
});

describe('the board', () => {
  const facts = (f: Partial<SeasonFacts>): SeasonFacts => ({ position: 12, divisionSize: 12, promoted: false, playoffs: false, goals: 0, cleanSheets: 0, derbyWins: 0, homeUnbeaten: 0, aboveRival: undefined, bigcup: [], tiercup: [], inContinental: false, derbyOn: false, ...f });
  it('places by share of the table: clear of the bottom three of 12 is 9th; top half 6th; the top six becomes the top four', () => {
    expect(objectiveMet(boardDef('o-survive', 2), facts({ position: 9 }))).toBe(true);
    expect(objectiveMet(boardDef('o-survive', 2), facts({ position: 10 }))).toBe(false);
    expect(objectiveMet(boardDef('o-top-half', 2), facts({ position: 7 }))).toBe(false);
    expect(boardDef('o-top-six', 2).text).toBe('Finish in the top four.');
    expect(objectiveMet(boardDef('o-top-six', 2), facts({ position: 4 }))).toBe(true);
    expect(objectiveMet(boardDef('o-survive', 1), facts({ position: 15 }))).toBe(true);
  });
  it('totals by share of the season: 40 goals, 8 clean sheets, 5 home matches unbeaten', () => {
    expect(objectiveMet(boardDef('o-goals', 2), facts({ goals: 40 }))).toBe(true);
    expect(objectiveMet(boardDef('o-goals', 2), facts({ goals: 39 }))).toBe(false);
    expect(objectiveMet(boardDef('o-clean-sheets', 2), facts({ cleanSheets: 8 }))).toBe(true);
    expect(objectiveMet(boardDef('o-home', 2), facts({ homeUnbeaten: 5 }))).toBe(true);
    expect(boardDef('o-goals', 1)).toBe(BOARD.find((o) => o.id === 'o-goals'));
  });
  it('the pair cup replaces the division cup in the text', () => {
    expect(boardDef('o-tiercup-win', 2).text).toBe('Win the pair cup.');
  });
  it('the season draws its two from the rescaled set', () => {
    const two = boardFor(3, 'mid', { inContinental: false, derbyOn: false, divisionSize: 12, topTier: false }, 2);
    expect(two).toHaveLength(2);
    for (const o of two) expect(o).toEqual(boardDef(o.id, 2));
  });
});

describe('the data kit and the target talks', () => {
  const m = (day: number) => ({ day, values: allAxes(10), result: 'W' as const, comp: 'league' });
  it('one stripe a week: six for 42 days, four for 28', () => {
    expect(weeksOf([m(1), m(40)])).toHaveLength(6);
    expect(weeksOf([m(1), m(28)])).toHaveLength(4);
    expect(weeksOf([])).toHaveLength(6);
  });
  it('the agents look back six weeks in world 1, one 28-day season in world 2', () => {
    expect(talkWindow('2026-12-29')).toEqual({ from: '2026-11-17', to: '2026-12-28' });
    expect(talkWindow('2026-12-29', 2)).toEqual({ from: '2026-12-01', to: '2026-12-28' });
  });
});
