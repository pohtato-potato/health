// Faults from the 13 Nov look review: the tech page with no id, the two matchday counts on Tonight, and the desk's
// spent dice against its "Dice left" count. Made-up days only.
import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { seasonDays, SEASON_DAYS } from '../../src/football/calendar';
import { TECHS } from '../../src/football/content/tree';
import { trayOf } from '../../src/football/desk/rules';
import type { Die, Spend } from '../../src/football/desk/types';
import { loadTonight } from '../../src/football/store/hooks';
import { foundClub } from '../../src/football/store/save';
import { fixtureFor } from '../../src/football/store/tonight';
import { techDoor } from '../../src/football/tree/research';
import { TonightView } from '../../src/screens/football/Tonight';

const die = (axis: Die['axis'], value: Die['value']): Die => ({ axis, value, score: value * 3, reason: `${axis} reason` });
const spend = (axis: Die['axis']): Spend => ({ id: `d:${axis}`, day: '2030-03-05', axis, value: 4, job: 'watch', effects: [] });

describe('the tech page with no tech (#/football/tech)', () => {
  it('a real id opens that tech', () => {
    const t = TECHS[0];
    expect(techDoor(t.id)).toEqual({ path: '/football/tech', params: { id: t.id } });
  });
  it('no id, or an id that is not a tech, goes to the tree', () => {
    const tree = { path: '/football/club', params: { view: 'tree' } };
    expect(techDoor('')).toEqual(tree);
    expect(techDoor(null)).toEqual(tree);
    expect(techDoor('not-a-tech')).toEqual(tree);
  });
  it('the page no longer has a dead end to show', () => {
    expect(readFileSync('src/screens/football/tree/TreeScreens.tsx', 'utf8')).not.toContain('No such tech');
  });
});

describe('Tonight: the day of the season and the league matchday', () => {
  let n = 0;
  beforeEach(async () => {
    setDatabase(new HealthDB(`fb-look-fixes-${++n}`));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
  });

  it('the header counts days of the season; only the line under the title says "Matchday"', async () => {
    const save = (await db.fbSave.get('save'))!;
    const season = (await db.fbSeasons.get(save.season))!;
    const plan = seasonDays();
    // A league night later than a cup night: the day of the season and the league matchday differ.
    const day = plan.findIndex((p, i) => p.kind === 'league' && p.matchday !== i + 1) + 1;
    expect(day).toBeGreaterThan(1);
    const f = fixtureFor({ ...save, day }, season)!;
    expect(f.label).toBe(`Day ${day} of ${SEASON_DAYS}`);
    expect(f.round).toBe(`Matchday ${plan[day - 1].matchday}`);
    expect(f.label).not.toMatch(/Matchday/);
  });

  it('never two different "Matchday" numbers on one screen', async () => {
    const t = (await loadTonight('2026-11-06'))!;
    const save = { ...t.save, day: 8 };
    const season = (await db.fbSeasons.get(save.season))!;
    const out = html(<TonightView t={{ ...t, save, fixture: fixtureFor(save, season) }} />);
    const said = new Set([...out.matchAll(/Matchday (\d+)/g)].map((m) => m[1]));
    expect(said.size).toBeLessThanOrEqual(1);
    expect(out).toContain(`Day 8 of ${SEASON_DAYS}`);
  });
});

describe('the desk: spent dice and the count agree', () => {
  const dice = [die('Pace', 5), die('Power', 5), die('Fuel', 6), die('Rest', 3), die('Routine', 6), die('Shape', 6)];
  it('the count names both numbers, and every die is either left or spent', () => {
    const t = trayOf(dice, [spend('Fuel'), spend('Rest')]);
    expect(t.label).toBe('Dice left: 4 of 6');
    expect(t.dice.filter((d) => d.spent).map((d) => d.die.axis)).toEqual(['Fuel', 'Rest']);
    expect(t.dice.filter((d) => !d.spent)).toHaveLength(4);
    expect(t.left.map((d) => d.axis)).toEqual(['Pace', 'Power', 'Routine', 'Shape']);
  });
  it('nothing spent, everything spent, and a day with no dice', () => {
    expect(trayOf(dice, []).label).toBe('Dice left: 6 of 6');
    expect(trayOf(dice, dice.map((d) => spend(d.axis))).label).toBe('Dice left: 0 of 6');
    expect(trayOf([], []).label).toBe('No dice today');
  });
  it('the number in the label is the number of dice not marked spent, whatever was spent', () => {
    for (let mask = 0; mask < 64; mask++) {
      const spent = dice.filter((_, i) => mask & (1 << i)).map((d) => spend(d.axis));
      const t = trayOf(dice, spent);
      expect(t.label).toBe(`Dice left: ${t.dice.filter((d) => !d.spent).length} of 6`);
    }
  });
});

describe('one name, one meaning: the match (mt-) and the parcel, pledge and desk (md-)', () => {
  const NAMES = ['page', 'score', 'strip', 'opts', 'opt', 'card', 'tile'];
  const football = readFileSync('src/styles/football.css', 'utf8');
  const matchday = readFileSync('src/styles/matchday.css', 'utf8');
  it('football.css styles the match under mt- and leaves those md- names to matchday.css', () => {
    for (const n of NAMES) {
      expect(football, n).not.toMatch(new RegExp(`\\.md-${n}(?![\\w-])`));
      expect(football, n).toMatch(new RegExp(`\\.mt-${n}(?![\\w-])`));
      expect(matchday, n).not.toMatch(new RegExp(`\\.mt-${n}(?![\\w-])`));
    }
  });
  it('the match screens use mt-, the parcel and the pledge md-', () => {
    const md = new RegExp(`['"\` ]md-(${NAMES.join('|')})(?![\\w-])`);
    const mt = new RegExp(`['"\` ]mt-(${NAMES.join('|')})(?![\\w-])`);
    for (const f of ['src/screens/football/match/Live.tsx', 'src/screens/football/match/MatchBits.tsx']) expect(readFileSync(f, 'utf8'), f).not.toMatch(md);
    for (const f of ['src/screens/football/Parcel.tsx', 'src/screens/Pledge.tsx', 'src/screens/football/desk/Desk.tsx', 'src/screens/football/desk/Market.tsx']) expect(readFileSync(f, 'utf8'), f).not.toMatch(mt);
  });
});
