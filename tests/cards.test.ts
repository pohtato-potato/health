import { describe, expect, it } from 'vitest';
import { cardBack, cardFor } from '../src/domain/cards';
import type { ExerciseDef } from '../src/domain/plan';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const ok = { a: 'ok', b: 'ok' } as const;
const slip = { a: 'ok', b: 'slip' } as const;
const ex = (p: Partial<ExerciseDef> = {}): ExerciseDef => ({ id: 'curl', order: '1', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair', checks: [{ id: 'a', text: 'A', kind: 'do' }, { id: 'b', text: 'B', kind: 'do' }], ...p });
/** One session of sets; each partial is one set. */
const session = (day: number, ps: Partial<SetEntry>[]) => {
  const sid = `s${day}`;
  return ps.map((p, i) => ({ id: `x${++n}`, sessionId: sid, date: `2026-10-${String(day).padStart(2, '0')}`, session: 'C', exerciseId: 'curl', exercise: 'Curl', setNo: i + 1, side: 'both', loadKg: 10, reps: 12, at: day * 1e7 + i * 1e5, ...p }) as SetEntry);
};

describe('exercise card tiers', () => {
  it('nothing before the first set', () => expect(cardFor(ex(), []).logged).toBe(false));
  it('first light once logged', () => {
    const c = cardFor(ex(), session(1, [{ checks: slip }]));
    expect(c.tier).toBe('First light');
    expect(c.next).toBe('Every check went well on a whole session, for Clean');
  });
  it('clean after a whole clean session, and never lost', () => {
    const sets = [...session(1, [{ checks: ok }, { checks: ok }]), ...session(2, [{ checks: slip }])];
    const c = cardFor(ex(), sets);
    expect(c.tier).toBe('Clean');
    expect(c.next).toBe('Two clean sessions running, for Even');
  });
  it('old 5/5 scores count as clean', () => expect(cardFor(ex({ checks: undefined }), session(1, [{ form: 5 }])).tier).toBe('Clean'));
  it('says what Clean needs when there are no checks to tick', () => {
    expect(cardFor(ex({ checks: undefined }), session(1, [{}])).next).toBe('Clean needs form checks from the coach');
  });
  it('even: two clean sessions running', () => {
    expect(cardFor(ex(), [...session(1, [{ checks: ok }]), ...session(2, [{ checks: ok }])]).tier).toBe('Even');
  });
  it('even, per side: both sides within one rep', () => {
    const side = ex({ perSide: true });
    const sets = [...session(1, [{ side: 'L', checks: ok, reps: 12 }, { side: 'R', setNo: 1, checks: ok, reps: 11 }])];
    expect(cardFor(side, sets).tier).toBe('Even');
    expect(cardFor(side, session(2, [{ side: 'L', checks: ok }])).tier).toBe('Clean');
  });
  it('plated: a record at a new load', () => {
    const sets = [...session(1, [{ checks: ok }]), ...session(2, [{ checks: ok }]), ...session(3, [{ loadKg: 12.5, reps: 10, mark: '!!' }])];
    const c = cardFor(ex(), sets);
    expect(c.tier).toBe('Plated');
    expect(c.next).toBe('10 more clean sets at the top of the range, for Mastery');
  });
  it('mastery: ten clean sets running at the top of the range', () => {
    const top = Array.from({ length: 10 }, () => ({ reps: 15, checks: ok }));
    const sets = [...session(1, [{ checks: ok }]), ...session(2, [{ checks: ok }]), ...session(3, [{ loadKg: 12.5, mark: '!!' }]), ...session(4, top.slice(0, 5)), ...session(5, top.slice(5))];
    const c = cardFor(ex(), sets);
    expect(c.tier).toBe('Mastery');
    expect(c.next).toBe('Mastered at 10 kg');
  });
  it('counts the mastery run so far', () => {
    const sets = [...session(1, [{ checks: ok }]), ...session(2, [{ checks: ok }]), ...session(3, [{ loadKg: 12.5, mark: '!!' }]), ...session(4, [{ reps: 15, checks: ok }, { reps: 15, checks: ok }, { reps: 15, checks: ok }])];
    expect(cardFor(ex(), sets).next).toBe('7 more clean sets at the top of the range, for Mastery');
  });
  it('timed work uses seconds for the top of the range', () => {
    const plank = ex({ reps: undefined, seconds: [20, 45], measure: 'seconds' });
    const top = Array.from({ length: 10 }, () => ({ reps: undefined, seconds: 45, checks: ok, loadKg: null }));
    const sets = [...session(1, [{ reps: undefined, seconds: 30, checks: ok, loadKg: null }]), ...session(2, [{ reps: undefined, seconds: 30, checks: ok, loadKg: null }]), ...session(3, top)];
    expect(cardFor(plank, sets).tier).toBe('Mastery');
  });
});

describe('the back of a card', () => {
  it('best sets, a strength curve per session, and records', () => {
    const sets = [...session(1, [{ reps: 10 }, { reps: 12 }]), ...session(2, [{ loadKg: 12.5, reps: 9, mark: '!!' }])];
    const b = cardBack(sets);
    expect(b.best[0]).toBe('12.5 kg × 9');
    expect(b.curve).toHaveLength(2);
    expect(b.curve[1]).toBeGreaterThan(b.curve[0]);
    expect(b.records).toBe(1);
  });
});

describe('card review fixes', () => {
  it('an open-ended exercise never promises Mastery', () => {
    const open = ex({ open: true, reps: undefined, perSide: false });
    const c = cardFor(open, [...session(1, [{ checks: ok }]), ...session(2, [{ checks: ok }])]);
    expect(c.tier).toBe('Even');
    expect(c.next).toBe('A record at a new load, for Plated');
    const unloaded = cardFor(open, [...session(1, [{ checks: ok, loadKg: null }]), ...session(2, [{ checks: ok, loadKg: null }])]);
    expect(unloaded.next).toBe('Mastery needs a top to the range');
  });
  it('without checks, Mastery says what it needs', () => {
    const side = ex({ perSide: true, checks: undefined });
    const c = cardFor(side, session(1, [{ side: 'L' }, { side: 'R', setNo: 1 }]));
    expect(c.tier).toBe('Even');
    expect(cardFor(side, [...session(1, [{ side: 'L' }, { side: 'R', setNo: 1 }]), ...session(2, [{ loadKg: 12.5, mark: '!!', side: 'L' }])]).next).toBe('Mastery needs form checks from the coach');
  });
  it('even per side needs every set on both sides', () => {
    const side = ex({ perSide: true });
    expect(cardFor(side, session(1, [{ side: 'L', checks: ok }, { side: 'R', setNo: 1, checks: ok }, { side: 'L', setNo: 2, checks: ok }])).tier).toBe('Clean');
  });
  it('clean needs every check ticked well, not just one', () => {
    expect(cardFor(ex(), session(1, [{ checks: { a: 'ok' } }])).tier).toBe('First light');
  });
  it('mastered at the heaviest load that made a run', () => {
    const run = (kg: number) => Array.from({ length: 10 }, () => ({ reps: 15, checks: ok, loadKg: kg }));
    const sets = [...session(1, run(10)), ...session(2, [{ checks: slip }]), ...session(3, run(12.5))];
    expect(cardFor(ex(), sets).next).toBe('Mastered at 12.5 kg');
  });
  it('the back lists different best sets', () => {
    expect(cardBack(session(1, [{ reps: 12 }, { reps: 12 }, { reps: 12 }, { reps: 10 }])).best).toEqual(['10 kg × 12', '10 kg × 10']);
  });
});
