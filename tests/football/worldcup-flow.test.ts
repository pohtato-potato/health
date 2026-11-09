import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { createElement } from 'react';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { NATIONS } from '../../src/football/events';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { AXES, type AxisValues } from '../../src/football/types';
import { buzz } from '../../src/screens/football/Match';
import { SettingsView } from '../../src/screens/football/story/Settings';

const START = '2026-10-10';
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-wc-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub(START, { shirt: 'H1', crest: 'a' });
});

/** Plays 5 nights, sets their shapes to `v` on every axis, then turns the save to World Cup day 1. */
async function worldCupEve(v: number, country?: string) {
  for (let i = 0; i < 5; i++) await kickOff(addDays(START, i));
  const values = Object.fromEntries(AXES.map((a) => [a, v])) as AxisValues;
  await db.fbMatches.toCollection().modify({ values });
  const s = (await db.fbSave.get('save'))!;
  await db.fbSave.put({ ...s, phase: 'event', event: { id: 'worldcup', days: 7 }, day: 1, wcCountry: country });
  const date = addDays(START, 5);
  const played = await kickOff(date);
  const news = (await db.fbNews.toArray()).filter((x) => x.date === date && x.kind === 'world');
  return { played, news };
}
const weakest = [...NATIONS].sort((a, b) => a.strength - b.strength)[0];
const strongest = [...NATIONS].sort((a, b) => b.strength - a.strength)[0];

describe('the World Cup', () => {
  it('with no country picked, the World Cup only follows', async () => {
    const { played, news } = await worldCupEve(20);
    expect(played).toHaveLength(0);
    expect(news.some((x) => x.text.includes('Pick a country'))).toBe(true);
  });
  it('with a strong nation and a low average, no call-up', async () => {
    const { played, news } = await worldCupEve(6, strongest.id);
    expect(played).toHaveLength(0);
    expect(news.some((x) => x.text.includes('a call-up needs'))).toBe(true);
  });
  it("with a high average, Brabo's owner plays on group day 1 as a double-header", async () => {
    const { played } = await worldCupEve(20, weakest.id);
    expect(played).toHaveLength(2);
    expect(played.every((m) => m.comp === 'worldcup' && m.opp.startsWith('nat:'))).toBe(true);
    expect(played.map((m) => m.leg)).toEqual([1, 2]);
    expect(new Set(played.map((m) => m.opp)).size).toBe(2);
  });
});

describe('settings', () => {
  it('turning buzz off leaves navigator.vibrate uncalled', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    buzz(false, [60, 40, 120]);
    expect(vibrate).not.toHaveBeenCalled();
    buzz(true, 80);
    expect(vibrate).toHaveBeenCalledWith(80);
    vi.unstubAllGlobals();
  });
  it('settings has the 5 spec rows plus stadium sound and the low-log week', async () => {
    const s = (await db.fbSave.get('save'))!;
    const out = html(createElement(SettingsView, { s }));
    expect(out.match(/fb-setrow/g)).toHaveLength(7);
    expect(out).toContain('Stadium sound');
    expect(out).toContain('Low-log week');
    expect(out).not.toMatch(/water/i);
  });
});
