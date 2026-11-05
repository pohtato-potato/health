import { describe, expect, it } from 'vitest';
import { autoTrophies } from '../src/domain/trophies';
import { matchGoTo } from '../src/domain/goTo';
import { QUESTIONS, surprise, whatWouldItTake, type BrowseInput } from '../src/domain/browse';
import { defaultSettings } from '../src/db/actions';
import type { Day, TrainingSession } from '../src/domain/types';

const TODAY = '2026-11-05';
const input = (over: Partial<BrowseInput> = {}): BrowseInput => ({
  today: TODAY, settings: defaultSettings(), days: [], entries: [], sessions: [], sets: [], measurements: [], ...over,
});

describe('autoTrophies', () => {
  const days = [{ date: '2026-10-02', steps: 16204 }, { date: '2026-09-02', steps: 500 }] as Day[];

  it('gives up to 3, biggest step day first, and none without data', () => {
    const t = autoTrophies(input({ days }));
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t[0]).toMatchObject({ value: '16,204', label: 'Most steps in a day' });
    expect(autoTrophies(input())).toEqual([]);
  });

  it('every label is 2 words or more, so tiles wrap alike', () => {
    for (const t of autoTrophies(input({ days }))) expect(t.label.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('best month names the month with the most steps', () => {
    expect(autoTrophies(input({ days })).find((t) => t.id === 'month')?.value).toBe('Oct');
  });
});

describe('QUESTIONS', () => {
  const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

  it('offers three to start, and answers undefined with no data', () => {
    expect(QUESTIONS).toHaveLength(3);
    for (const x of QUESTIONS) expect(x.answer(input())).toBeUndefined();
  });

  it('late sessions counts done sessions begun from 11 pm', () => {
    const at = (h: number) => new Date(2026, 9, 3, h).getTime();
    const s = (id: string, h: number) => ({ id, date: '2026-10-03', startedAt: at(h), status: 'done' }) as TrainingSession;
    expect(q('late-sessions').answer(input({ sessions: [s('a', 23), s('b', 22)] }))).toBe('1');
  });

  it('best week names the week by its Monday', () => {
    const days = [{ date: '2026-10-28', steps: 90000 }, { date: '2026-10-07', steps: 10 }] as Day[];
    expect(q('best-week').answer(input({ days }))).toBe('From 26 Oct');
  });
});

describe('whatWouldItTake', () => {
  it('100 km in 14 days at 0.74 m a step is 9,653 steps a day', () => {
    expect(whatWouldItTake(130, TODAY, 0.74)).toEqual({ stop: 'Agra', by: '2026-11-19', stepsPerDay: 9653 });
  });

  it('is absent past the last stop', () => {
    expect(whatWouldItTake(999999, TODAY, 0.74)).toBeUndefined();
  });
});

describe('surprise', () => {
  const i = input({ days: Array.from({ length: 40 }, (_, n) => ({ date: `2026-09-${String((n % 28) + 1).padStart(2, '0')}`, steps: 9000 + n })) as Day[] });

  it('is stable for one seed', () => {
    expect(surprise('a', i)).toEqual(surprise('a', i));
  });

  it('returns nothing with no data', () => {
    expect(surprise('a', input())).toBeUndefined();
  });
});

describe('matchGoTo', () => {
  it('"back" finds Backup', () => {
    expect(matchGoTo('back', []).map((h) => h.label)).toContain('Backup');
  });

  it('an empty query lists nothing', () => {
    expect(matchGoTo('  ', [])).toEqual([]);
  });

  it('a month name finds its report', () => {
    expect(matchGoTo('octo', ['2026-10'])[0]).toEqual({ label: 'October 2026', path: '/film?m=2026-10' });
  });

  it('matches without regard to case, and never lists Journey or Character', () => {
    expect(matchGoTo('MEDICINES', []).map((h) => h.label)).toContain('Medicines');
    expect(matchGoTo('journey', [])).toEqual([]);
    expect(matchGoTo('character', [])).toEqual([]);
  });
});
