import { describe, expect, it } from 'vitest';
import { glanceLine } from '../src/domain/glance';

const hm = (h: number, m = 0) => h * 60 + m;
const base = { minutes: hm(16), closedRings: 1, dayClosed: false, morningDone: true };

describe('glanceLine: the plain line on Today when the voice is quiet', () => {
  it('a closed day says how many rings closed, then the next session', () => {
    expect(glanceLine({ ...base, dayClosed: true, closedRings: 2 })).toBe('Day closed with 2 of 3 rings.');
    expect(glanceLine({ ...base, dayClosed: true, closedRings: 2, nextSession: 'Session D on Saturday' })).toBe('Day closed with 2 of 3 rings. Session D on Saturday.');
  });
  it('all three closed', () => {
    expect(glanceLine({ ...base, closedRings: 3, minutes: hm(20) })).toBe('All three closed.');
  });
  it('before 11:00 with the morning log open and a session tonight', () => {
    expect(glanceLine({ ...base, minutes: hm(7, 40), morningDone: false, sessionTonight: 'Session C' })).toBe('Session C tonight. Log the morning when you’re up.');
  });
  it('before 11:00 with the morning log open and no session', () => {
    expect(glanceLine({ ...base, minutes: hm(7, 40), morningDone: false })).toBe('Log the morning when you’re up.');
  });
  it('from 19:00 it counts the rings', () => {
    expect(glanceLine({ ...base, minutes: hm(19), closedRings: 2 })).toBe('Two closed. One more before bed.');
    expect(glanceLine({ ...base, minutes: hm(21), closedRings: 1 })).toBe('One ring closed so far.');
    expect(glanceLine({ ...base, minutes: hm(21), closedRings: 0 })).toBe('The rings are still open.');
  });
  it('a session tonight, otherwise', () => {
    expect(glanceLine({ ...base, minutes: hm(14), sessionTonight: 'Session C' })).toBe('Session C tonight.');
  });
  it('nothing else applies', () => {
    expect(glanceLine(base)).toBe('On track.');
  });
});
