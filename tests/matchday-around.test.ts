// Matchday spec §4–§6, Fork B: the rules around the match. Made-up days only.
import { describe, expect, it } from 'vitest';
import type { Day } from '../src/domain/types';
import { caughtShare, keptAgainst, keptPledgeNight, pledgeFor, pledgeOnFood, pledgeOutcome, pledgeTimes, sleepyWindow, weekStrip } from '../src/domain/pledge';
import { awayDay, excusedWeighIns } from '../src/domain/officeDay';
import { isOfficeDay } from '../src/domain/officeUsual';
import { physioDue, returnDate } from '../src/domain/treatment';
import { haggled, ratedTarget, talkAsk, talkDue, talkTarget } from '../src/football/talks';
import { groundShut, heldAtNight, parcelDue, parcelTiles, PARCEL_MAX } from '../src/football/parcel';

const sleep = (asleep: number, carried?: boolean) => ({ asleep, woke: 480, ...(carried ? { carried } : {}) });
const days = (xs: Day[]) => new Map(xs.map((d) => [d.date, d]));

describe('the lights-out pledge', () => {
  it('kept means asleep no later than the pledge plus 45 minutes, across midnight', () => {
    expect(keptAgainst(90, 90)).toBe(true); // 1:30 for 1:30
    expect(keptAgainst(135, 90)).toBe(true); // 2:15, the edge
    expect(keptAgainst(136, 90)).toBe(false);
    expect(keptAgainst(23 * 60, 90)).toBe(true); // earlier, the evening before, still kept
    expect(keptAgainst(10, 23 * 60 + 30)).toBe(true); // 0:10 against 23:30 (+45 = 0:15)
    expect(keptAgainst(20, 23 * 60 + 30)).toBe(false);
  });

  it('reads the typed asleep time of the next morning, never a copied night', () => {
    expect(pledgeOutcome({ pledge: { at: 90 } }, { sleep: sleep(100) })).toBe('kept');
    expect(pledgeOutcome({ pledge: { at: 90 } }, { sleep: sleep(100, true) })).toBe('missed');
    expect(pledgeOutcome({ pledge: { at: 90 } }, {})).toBe('waiting');
    expect(pledgeOutcome({ pledge: { at: null } }, { sleep: sleep(100) })).toBe('not-tonight');
    expect(pledgeOutcome({}, { sleep: sleep(100) })).toBe('none');
  });

  it('the night stored on a date is covered by the evening before', () => {
    const m = days([{ date: '2030-03-04', pledge: { at: 60 } }, { date: '2030-03-05', sleep: sleep(70) }]);
    expect(pledgeFor(m, '2030-03-05')).toBe(60);
    expect(pledgeFor(m, '2030-03-04')).toBeUndefined();
    expect(keptPledgeNight(m, '2030-03-05')).toBe(true);
    expect(keptPledgeNight(m, '2030-03-06')).toBe(false);
  });

  it('offers three times half an hour apart around the sleepy window', () => {
    const xs: Day[] = [60, 90, 75, 80, 120].map((a, i) => ({ date: `2030-03-0${i + 1}`, sleep: sleep(a) }));
    xs.push({ date: '2030-03-06', sleep: sleep(600, true) }); // copied: left out
    expect(sleepyWindow(xs, '2030-03-07')).toBe(90);
    expect(pledgeTimes(90)).toEqual([60, 90, 120]);
    expect(pledgeTimes(0)).toEqual([23 * 60 + 30, 0, 30]);
    expect(pledgeTimes(undefined)).toEqual([23 * 60 + 30, 0, 30]);
  });

  it('the week strip counts settled pledges from Monday, not "not tonight"', () => {
    // 2030-03-04 is a Monday.
    const m = days([
      { date: '2030-03-04', pledge: { at: 60 } }, { date: '2030-03-05', sleep: sleep(70), pledge: { at: 60 } },
      { date: '2030-03-06', sleep: sleep(200), pledge: { at: null } }, { date: '2030-03-07', sleep: sleep(70) },
    ]);
    const s = weekStrip(m, '2030-03-07');
    expect(s.nights.map((n) => n.kept)).toEqual([true, false]);
    expect(s.kept).toBe(1);
  });

  it('shows on Food after dinner on a day without training, read from the entries, once', () => {
    const late = new Date(2030, 2, 4, 20, 10).getTime();
    expect(pledgeOnFood(undefined, [{ meal: 'dinner' }], [])).toBe(true);
    expect(pledgeOnFood(undefined, [{ meal: 'snacks', eatenAt: late }], [])).toBe(true);
    expect(pledgeOnFood(undefined, [{ meal: 'lunch' }], [])).toBe(false);
    expect(pledgeOnFood(undefined, [{ meal: 'dinner' }], [{ status: 'done' }])).toBe(false);
    expect(pledgeOnFood({ pledge: { at: null } }, [{ meal: 'dinner' }], [])).toBe(false);
  });

  it('"Caught the window?" is counted for Reports only', () => {
    const xs: Day[] = [{ date: '2030-03-01', caughtWindow: true }, { date: '2030-03-02', caughtWindow: false }, { date: '2030-03-03' }];
    expect(caughtShare(xs, '2030-03-01', '2030-03-07')).toEqual({ yes: 1, answered: 2 });
  });
});

describe('office days are away games', () => {
  const settings = { places: [{ id: 'h', name: 'Home', kind: 'home' as const, meals: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 }, eased: false, foodsFirst: 'home' as const }, { id: 'o', name: 'Office', kind: 'office' as const, meals: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 }, eased: true, foodsFirst: 'normal' as const }] };
  it('a hand mark wins over the place, either way', () => {
    expect(isOfficeDay({ place: 'h', office: true }, settings.places)).toBe(true);
    expect(isOfficeDay({ place: 'o', office: false }, settings.places)).toBe(false);
    expect(isOfficeDay({ place: 'o' }, settings.places)).toBe(true);
  });
  it('the Commuter plays on a marked office day', () => {
    expect(awayDay({ place: 'h', office: true }, settings)).toBe(true);
    expect(awayDay({ place: 'h' }, settings)).toBe(false);
    expect(awayDay({ place: 'o', office: false }, settings)).toBe(false);
  });
  it('a missing weigh-in on an office day is expected, not missed', () => {
    const xs = [
      { date: '2030-03-01', office: true }, { date: '2030-03-02', office: true, weightKg: 70 }, { date: '2030-03-03' },
      { date: '2030-02-20', office: true }, // outside the week
    ];
    expect(excusedWeighIns(xs, '2030-03-03', settings)).toBe(1);
  });
});

describe('the treatment table', () => {
  it('asks once on a sick day', () => {
    expect(physioDue({ status: 'sick' })).toBe(true);
    expect(physioDue({ status: 'sick', physio: 'same' })).toBe(false);
    expect(physioDue({})).toBe(false);
  });
  it('two "better" sick days in a row set the return for tomorrow', () => {
    const m = days([{ date: '2030-03-01', status: 'sick', physio: 'better' }, { date: '2030-03-02', status: 'sick', physio: 'better' }]);
    expect(returnDate(m, '2030-03-02')).toBe('2030-03-03');
    expect(returnDate(m, '2030-03-01')).toBeUndefined();
    const n = days([{ date: '2030-03-01', status: 'sick', physio: 'same' }, { date: '2030-03-02', status: 'sick', physio: 'better' }]);
    expect(returnDate(n, '2030-03-02')).toBeUndefined();
  });
});

describe('target talks', () => {
  it('asks for the six-week median, rounded, only when it is above the target', () => {
    expect(talkAsk('steps', [9800, 11200, 12100, 10900, 13000], 10000)).toBe(11000);
    expect(talkAsk('steps', [9000, 9400, 9900], 10000)).toBeUndefined();
    expect(talkAsk('protein', [118, 131, 126, 124], 110)).toBe(125);
    expect(talkAsk('protein', [], 110)).toBeUndefined();
  });
  it('sign takes the ask, haggle goes halfway on the habit step, hold keeps it, nothing falls', () => {
    expect(talkTarget('steps', 'sign', 10000, 12000)).toBe(12000);
    expect(talkTarget('steps', 'haggle', 10000, 12000)).toBe(11000);
    expect(haggled('steps', 10000, 10500)).toBe(10500);
    expect(talkTarget('protein', 'haggle', 110, 125)).toBe(115);
    expect(talkTarget('steps', 'hold', 10000, 12000)).toBe(10000);
    expect(talkTarget('steps', 'sign', 10000, 9000)).toBe(10000);
  });
  it('is due in a season\'s first week, once per habit', () => {
    const save = { phase: 'season' as const, day: 3, season: 2 };
    expect(talkDue(save, [], 'steps')).toBe(true);
    expect(talkDue(save, [{ season: 2, habit: 'steps' }], 'steps')).toBe(false);
    expect(talkDue(save, [{ season: 1, habit: 'steps' }], 'steps')).toBe(true);
    expect(talkDue({ ...save, day: 8 }, [], 'steps')).toBe(false);
    expect(talkDue({ ...save, phase: 'event' }, [], 'protein')).toBe(false);
  });
});

describe('the morning parcel and the ground at night', () => {
  it('the result leads, the desk tiles have their places, six at most', () => {
    expect(parcelTiles({ pack: true, scout: true, result: true })).toEqual(['result', 'scout', 'pack']);
    expect(parcelTiles({ result: true, table: true, talks: true, scout: true, academy: true, cast: true, dice: true, pack: true })).toHaveLength(PARCEL_MAX);
    expect(parcelTiles({})).toEqual([]);
  });
  it('shows once a morning, never while the ground is shut', () => {
    expect(parcelDue(undefined, '2030-03-02', false, ['result'])).toBe(true);
    expect(parcelDue('2030-03-02', '2030-03-02', false, ['result'])).toBe(false);
    expect(parcelDue('2030-03-01', '2030-03-02', true, ['result'])).toBe(false);
    expect(parcelDue(undefined, '2030-03-02', false, [])).toBe(false);
  });
  it('the ground shuts once the day is sealed, holding packs and results only', () => {
    expect(groundShut({ seal: { at: 1 } })).toBe(true);
    expect(groundShut({})).toBe(false);
    expect(heldAtNight('packs')).toBe(true);
    expect(heldAtNight('results')).toBe(true);
    expect(heldAtNight('table')).toBe(false);
    expect(heldAtNight('cups')).toBe(false);
  });
});

describe('a raised target never costs the player that season (choice A a)', () => {
  const talk = { season: 2, habit: 'steps' as const, pick: 'sign' as const, from: 10000, to: 12000, on: '2030-03-04', until: '2030-04-14' };
  it('rates against the old target until the season ends, then the new one', () => {
    expect(ratedTarget([talk], 'steps', '2030-03-10', 12000)).toBe(10000);
    expect(ratedTarget([talk], 'steps', '2030-04-15', 12000)).toBe(12000);
    expect(ratedTarget([talk], 'steps', '2030-03-03', 10000)).toBe(10000);
    expect(ratedTarget([talk], 'protein', '2030-03-10', 120)).toBe(120);
  });
  it('a hold changes nothing', () => {
    expect(ratedTarget([{ ...talk, pick: 'hold', to: 10000 }], 'steps', '2030-03-10', 10000)).toBe(10000);
  });
});
