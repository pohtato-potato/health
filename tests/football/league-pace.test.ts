// League pace (O36): three league matchdays a day for the rest of one season, behind a switch that is off by default.
import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { beforeEach, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays, daysBetween } from '../../src/domain/dates';
import { LEAGUE_MATCHDAYS, matchdayList, matchdaysBefore, matchIdFor, paceLine, paceNight, paceOn, paceWeekDone, titleSafe } from '../../src/football/pace';
import { finishWithAssistant, kickOff, pausedMatch } from '../../src/football/store/play';
import { foundClub, setLeaguePace } from '../../src/football/store/save';
import { OWN } from '../../src/football/store/season';
import { standings, type Row } from '../../src/football/table';
import type { StoredMatch } from '../../src/football/store/tables';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
const START = '2026-10-10';
let n = 0;
async function fresh(name: string) {
  setDatabase(new HealthDB(`fb-pace-${name}-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = -20; i < 30; i++) await patchDay(addDays(START, i), { steps: 9000 + ((i * 37) % 5) * 400, sleep: { asleep: 1380, woke: 420 } });
  await foundClub(START, { shirt: 'H1', crest: 'a' });
}
beforeEach(() => fresh('t'));
const all = async () => (await db.fbMatches.toArray()).sort((a, b) => a.id.localeCompare(b.id));
const mine = (ms: StoredMatch[], date: string) => ms.filter((m) => m.date === date && m.comp === 'league').sort((a, b) => a.day - b.day);
const row = (id: string, pts: number): Row => ({ id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts, form: [] });

describe('the rules', () => {
  it('the title is safe only with a lead bigger than three points a match left', () => {
    expect(titleSafe([row(OWN, 40), row('x', 30)], OWN, 3)).toBe(true);
    expect(titleSafe([row(OWN, 39), row('x', 30)], OWN, 3)).toBe(false); // level on points would leave goal difference
    expect(titleSafe([row('x', 40), row(OWN, 30)], OWN, 0)).toBe(false);
    expect(titleSafe([row(OWN, 1), row('x', 0)], OWN, 0)).toBe(true);
  });
  it('matchdays are counted from the 42-day calendar (34 league days)', () => {
    expect(LEAGUE_MATCHDAYS).toBe(34);
    expect(matchdaysBefore(1)).toBe(0);
    expect(matchdaysBefore(43)).toBe(34);
    expect(matchdaysBefore(6)).toBe(4); // day 5 is a Big Cup day
  });
  it('the pace counts only in its season, from its first day, and stops at its last', () => {
    const s = { season: 2, phase: 'season', pace: { season: 2, from: '2026-11-20', to: '2026-11-25' } };
    expect(paceOn(s, '2026-11-19')).toBe(false);
    expect(paceOn(s, '2026-11-20')).toBe(true);
    expect(paceOn(s, '2026-11-26')).toBe(false);
    expect(paceOn({ ...s, season: 3 }, '2026-11-21')).toBe(false);
    expect(paceOn({ ...s, phase: 'event' }, '2026-11-21')).toBe(false);
    expect(paceOn({ season: 2, phase: 'season' }, '2026-11-21')).toBe(false);
  });
  it('slot 0 keeps the old id; the extra matchdays get their own', () => {
    expect(matchIdFor('2026-11-20', undefined, 0)).toBe('2026-11-20:1');
    expect(matchIdFor('2026-11-20', undefined, 2)).toBe('2026-11-20:1#2');
  });
  it('the week pack counts real days of the pace', () => {
    const p = { season: 1, from: '2026-11-01' };
    expect(paceWeekDone(p, '2026-11-07', daysBetween)).toBe(true);
    expect(paceWeekDone(p, '2026-11-08', daysBetween)).toBe(false);
  });
  it('the night ahead: three matchdays, cup rounds on the way, and a stop before a break', () => {
    expect(paceNight(4, () => false)).toEqual({ matchdays: [4, 5, 6], rounds: ['Last 128 and Last 64'] });
    expect(paceNight(12, (d) => d === 14).matchdays).toEqual([10, 11]);
    expect(matchdayList([4, 5, 6])).toBe('Matchdays 4, 5 and 6');
    expect(matchdayList([9])).toBe('Matchday 9');
  });
  it('the switch says what it does and that it ends with the season', () => {
    expect(paceLine(false, false)).toMatch(/three league matchdays/);
    expect(paceLine(false, false)).toMatch(/next season is one a day again/);
    expect(paceLine(true, false)).toMatch(/title is safe/);
  });
});

describe('off by default', () => {
  it('a new save has no pace, and a day plays one league match', async () => {
    expect((await db.fbSave.get('save'))!.pace).toBeUndefined();
    await kickOff(START);
    await finishWithAssistant();
    expect(mine(await all(), START)).toHaveLength(1);
    expect((await db.fbSave.get('save'))!.day).toBe(2);
  });
});

describe('three a day', () => {
  it('each day plays three league matchdays; the last waits, the first two are finished by the assistant', async () => {
    await setLeaguePace(true, START);
    await kickOff(START);
    const paused = await pausedMatch();
    expect(paused?.id).toBe(`${START}:1#2`);
    const done = mine(await all(), START);
    expect(done.map((m) => m.id)).toEqual([`${START}:1`, `${START}:1#1`]);
    expect(done.every((m) => !m.watched)).toBe(true); // all watchable afterwards
    await finishWithAssistant();
    const three = mine(await all(), START);
    expect(three.map((m) => m.round)).toEqual(['Matchday 1', 'Matchday 2', 'Matchday 3']);
    expect(new Set(three.map((m) => m.opp)).size).toBe(3);
    expect(new Set(three.map((m) => m.events.seed)).size).toBe(3); // own dice
    const s = (await db.fbSave.get('save'))!;
    expect(s.day).toBe(4);
    // The table: every division has three matchdays in (9 matches each).
    const season = (await db.fbSeasons.get(1))!;
    for (const t of [1, 2, 3, 4, 5, 6] as const) expect(season.results[t]).toHaveLength(27);
    const ids = Object.keys(season.tierOf).filter((id) => season.tierOf[id] === 6);
    const table = standings(season.results[6], ids);
    expect(table.find((r) => r.id === OWN)!.p).toBe(3);
    expect(table.find((r) => r.id === OWN)!.form).toHaveLength(3);
    // All three on that day's numbers.
    expect(three[1].values).toEqual(three[0].values);
  });

  it('replays the same: the same logs give the same three results', async () => {
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    const a = mine(await all(), START).map((m) => [m.id, m.score.join('-'), m.events.seed]);
    await fresh('b');
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    expect(mine(await all(), START).map((m) => [m.id, m.score.join('-'), m.events.seed])).toEqual(a);
  });

  it('days before the switch are untouched, and the first of three is the match one a day would have played', async () => {
    await kickOff(START);
    await finishWithAssistant();
    await kickOff(addDays(START, 1));
    await finishWithAssistant();
    const one = await all();
    await fresh('c');
    await kickOff(START);
    await finishWithAssistant();
    await setLeaguePace(true, addDays(START, 1));
    await kickOff(addDays(START, 1));
    await finishWithAssistant();
    const paced = await all();
    const pick = (ms: StoredMatch[], id: string) => { const m = ms.find((x) => x.id === id)!; return [m.score, m.events.seed, m.opp, m.round]; };
    expect(pick(paced, `${START}:1`)).toEqual(pick(one, `${START}:1`));
    expect(pick(paced, `${addDays(START, 1)}:1`)).toEqual(pick(one, `${addDays(START, 1)}:1`));
    expect(mine(paced, addDays(START, 1))).toHaveLength(3);
  });

  it('a sick, travel or break day: the rotation squad plays all three', async () => {
    await patchDay(START, { status: 'sick' });
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    const three = mine(await all(), START);
    expect(three).toHaveLength(3);
    expect(three.every((m) => m.rotation)).toBe(true);
  });

  it('cup days on the way are played in order, and the night stops after the third league matchday', async () => {
    // Day 4 of the season: matchday 4, then day 5 is the Big Cup, then matchdays 5 and 6.
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, day: 4 });
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    const night = (await all()).filter((m) => m.date === START);
    expect(night.filter((m) => m.comp === 'league').map((m) => m.round)).toEqual(['Matchday 4', 'Matchday 5', 'Matchday 6']);
    expect(night.some((m) => m.comp === 'bigcup' || m.comp === 'friendly')).toBe(true);
    expect(new Set(night.map((m) => m.id)).size).toBe(night.length);
    expect((await db.fbSave.get('save'))!.day).toBe(8);
  });

  it('an international break still comes: the night stops before it', async () => {
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, day: 12 }); // matchday on 12, then 13, then the break before 14
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    expect((await db.fbSave.get('save'))!.day).toBe(14);
    await kickOff(addDays(START, 1));
    expect((await db.fbSave.get('save'))!.globe?.breaks.some((b) => b.days.includes(addDays(START, 1)))).toBe(true);
    expect(mine(await all(), addDays(START, 1))).toHaveLength(0);
  });

  it('research from matches comes once a day: the extra matchdays pay no lesson', async () => {
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    const gains = (await db.fbSave.get('save'))!.tree!.gains.filter((g) => g.on === START && ['win', 'draw', 'loss'].includes(g.why));
    expect(gains).toHaveLength(1);
  });

  it('turning it off before any day is played forgets it; afterwards it stops after the last day played', async () => {
    await setLeaguePace(true, START);
    await setLeaguePace(false, START);
    expect((await db.fbSave.get('save'))!.pace).toBeUndefined();
    await setLeaguePace(true, START);
    await kickOff(START);
    await finishWithAssistant();
    await setLeaguePace(false, addDays(START, 1));
    expect((await db.fbSave.get('save'))!.pace).toEqual({ season: 1, from: START, to: START });
    await kickOff(addDays(START, 1));
    await finishWithAssistant();
    expect(mine(await all(), addDays(START, 1))).toHaveLength(1);
  });
});

describe('the title is safe: the season ends that day', () => {
  /** Made-up: every other club in Brabo's division docked 200 points, so the title is safe after any league match. */
  async function dockTheRest() {
    const season = (await db.fbSeasons.get(1))!;
    for (const id of Object.keys(season.tierOf)) if (season.tierOf[id] === 6 && id !== OWN) season.deductions[id] = 200;
    await db.fbSeasons.put(season);
  }
  async function expectEnded(matchday: number) {
    const s = (await db.fbSave.get('save'))!;
    expect(s.phase).toBe('event');
    const season = (await db.fbSeasons.get(1))!;
    expect(season.leagueEnded).toEqual({ matchday, date: START });
    // Every division stopped on the same matchday.
    for (const t of [1, 2, 3, 4, 5, 6] as const) expect(season.results[t]).toHaveLength(matchday * 9);
    expect(season.final?.up[6]).toContain(OWN);
    expect(season.final?.tables[6][0].id).toBe(OWN);
    // The cups and the playoffs were played out that day.
    expect(season.bigcup.winner).toBeTruthy();
    expect(Object.values(season.tiercups).every((b) => b.winner)).toBe(true);
    expect(season.playoffs[5]?.winner).toBeTruthy();
    expect((await db.fbNews.toArray()).some((x) => x.id === `${START}:title-safe`)).toBe(true);
    const ms = await all();
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
    expect(ms.filter((m) => m.comp === 'friendly')).toHaveLength(0);
  }

  it('a match that makes it safe ends the league for everyone, plays the cups out and promotes, that day', async () => {
    await dockTheRest();
    await setLeaguePace(true, START);
    await kickOff(START);
    expect(await pausedMatch()).toBeUndefined();
    await expectEnded(1);
  });

  it('when the clincher is the one waiting, finishing it ends the season', async () => {
    await setLeaguePace(true, START);
    await kickOff(START);
    expect((await db.fbSave.get('save'))!.phase).toBe('season');
    await dockTheRest();
    await finishWithAssistant();
    await expectEnded(3);
  });

  it('without the pace, a safe title waits for the 42 days as before', async () => {
    await dockTheRest();
    await kickOff(START);
    await finishWithAssistant();
    expect((await db.fbSave.get('save'))!.phase).toBe('season');
    expect((await db.fbSeasons.get(1))!.leagueEnded).toBeUndefined();
  });

  it('next season is one a day again without the owner doing anything', { timeout: 60_000 }, async () => {
    await dockTheRest();
    await setLeaguePace(true, START);
    await kickOff(START);
    for (let k = 1; k < 14; k++) {
      const d = addDays(START, k);
      await kickOff(d);
      await finishWithAssistant();
      const s = (await db.fbSave.get('save'))!;
      if (s.season === 2 && s.phase === 'season' && s.day > 1) {
        expect(paceOn(s, d)).toBe(false);
        expect(mine(await all(), d)).toHaveLength(1);
        return;
      }
    }
    throw new Error('the next season never started');
  });
});

describe('the screens', () => {
  it('the settings switch: off by default, says what it does, and goes once its season is over', async () => {
    const { PaceRow } = await import('../../src/screens/football/story/Settings');
    const { createElement } = await import('react');
    const { renderToStaticMarkup: html } = await import('react-dom/server');
    const s = (await db.fbSave.get('save'))!;
    const off = html(createElement(PaceRow, { s }));
    expect(off).toContain('Three matches a day for the rest of this season');
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('next season is one a day again');
    const on = html(createElement(PaceRow, { s: { ...s, pace: { season: 1, from: START } } }));
    expect(on).toContain('aria-pressed="true"');
    const after = html(createElement(PaceRow, { s: { ...s, season: 2, pace: { season: 1, from: START } } }));
    expect(after).not.toContain('aria-pressed');
    expect(after).toContain('one match a day again');
    expect(html(createElement(PaceRow, { s: { ...s, season: 3, pace: { season: 1, from: START } } }))).toBe('');
  });

  it('the parcel shows the night’s three: the waiting one leads, the other two under it with Watch or Skip', async () => {
    const { loadParcel } = await import('../../src/football/store/around');
    const { NightResults } = await import('../../src/screens/football/Parcel');
    const { createElement } = await import('react');
    const { renderToStaticMarkup: html } = await import('react-dom/server');
    await setLeaguePace(true, START);
    await kickOff(START);
    const save = (await db.fbSave.get('save'))!;
    const t = { save, date: addDays(START, 1), morning: { grew: [] } } as never;
    const p = await loadParcel(t);
    expect(p.waiting?.id).toBe(`${START}:1#2`);
    expect(p.result).toBeUndefined();
    expect(p.others.map((m) => m.round)).toEqual(['Matchday 1', 'Matchday 2']);
    const out = html(createElement(NightResults, { ms: p.others }));
    expect(out).toContain('Also last night: 2 more matches');
    expect(out.match(/>Watch</g)).toHaveLength(2);
    expect(out).not.toMatch(/\d–\d/); // no score before Watch or Skip
    await finishWithAssistant();
    const after = await loadParcel({ ...(t as object), save: (await db.fbSave.get('save'))! } as never);
    expect(after.result?.round).toBe('Matchday 3');
    expect(after.others).toHaveLength(2);
  });
});
