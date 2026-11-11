import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { loadTonight } from '../../src/football/store/hooks';
import { foundClub } from '../../src/football/store/save';
import { CatchUp, keyChances } from '../../src/screens/football/CatchUp';
import { FIRST_SHIRTS, FirstRun, STEPS } from '../../src/screens/football/FirstRun';
import { TonightView } from '../../src/screens/football/Tonight';
import { playDueDone as playDue } from './helpers/matchday';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-first-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
});

describe('First run', () => {
  it('on an empty db, there is no save and the first run renders step 1 without throwing', async () => {
    expect(await db.fbSave.get('save')).toBeUndefined();
    expect(await loadTonight('2026-11-06')).toBeNull();
    let out = '';
    expect(() => { out = html(<FirstRun />); }).not.toThrow();
    expect(out).toContain('Arrival');
    expect(out).toContain('1 of 6');
  });

  it('every step but the shirt has Skip; the shirt needs a pick', () => {
    STEPS.forEach((name, i) => {
      const out = html(<FirstRun start={i} />);
      expect(out).toContain(name);
      if (name === 'The shirt') {
        expect(out).not.toContain('>Skip<');
        expect(out).toContain('Pick a shirt to go on.');
        expect(out.match(/role="radio"/g)).toHaveLength(FIRST_SHIRTS.length);
      } else expect(out).toContain('>Skip<');
    });
    expect(html(<FirstRun start={5} />)).toContain('Found the club');
  });

  it('finishing founds the club with a shirt from the offers', async () => {
    await foundClub('2026-11-06', { shirt: FIRST_SHIRTS[1].id, crest: 'b' });
    const s = (await db.fbSave.get('save'))!;
    expect(s.shirt).toBe('A2');
    expect(s.firstRunDone).toBe(true);
  });
});

describe('Old-self names', () => {
  it('after founding, every old-self club shows its stored name, never the placeholder', async () => {
    const { clubById, CLUBS } = await import('../../src/football/data/load');
    await foundClub('2026-11-06', { shirt: 'A1', crest: 'a' });
    const olds = CLUBS.filter((c) => c.kind === 'old');
    expect(olds.length).toBe(7);
    for (const c of olds) {
      const stored = (await db.fbClubs.get(c.id))!.old!;
      expect(clubById(c.id).name).toBe(stored.name);
      expect(clubById(c.id).name).not.toContain('<');
    }
  });
});

describe('Catch-up', () => {
  it('with 3 unwatched auto matches, Tonight shows "3 while you were away" and two buttons', async () => {
    await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
    const played = await playDue(new Date('2026-11-04T12:00:00').getTime());
    expect(played.length).toBe(3);
    const t = (await loadTonight('2026-11-04'))!;
    expect(t.unwatchedAuto).toHaveLength(3);
    const out = html(<TonightView t={t} />);
    expect(out).toContain('3 while you were away');
    expect(out).toContain('Watch as one reel');
    expect(out).toContain('Just the results');
    const res = html(<CatchUp ms={t.unwatchedAuto} shown />);
    expect(res.match(/<li>/g)).toHaveLength(3);
    expect(res).toMatch(/\d–\d/);
  });

  it('the reel keeps only the key chances, and always at least one', async () => {
    await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
    const [m] = await playDue(new Date('2026-11-02T12:00:00').getTime());
    const k = keyChances(m);
    expect(k.events.chances.length).toBeGreaterThan(0);
    expect(k.events.chances.length).toBeLessThanOrEqual(m.events.chances.length);
    for (const c of k.events.chances) if (k.events.chances.length > 1 || (c.side === 'atk' ? c.ok : !c.ok)) expect((c.side === 'atk' ? c.ok : !c.ok) || !!c.tag).toBe(true);
    expect(k.score).toEqual(m.score);
  });
});
