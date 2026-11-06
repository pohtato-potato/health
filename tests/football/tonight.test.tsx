import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { CLUBS } from '../../src/football/data/load';
import { loadTonight } from '../../src/football/store/hooks';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { TonightView } from '../../src/screens/football/Tonight';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-tonight-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
});

describe('Tonight', () => {
  it('shows the matchday, both clubs and the six axes with values', async () => {
    const t = (await loadTonight('2026-11-06'))!;
    expect(t.fixture?.comp).toBe('league');
    const out = html(<TonightView t={t} />);
    expect(out).toContain('Matchday 1 of 42');
    expect(out).toContain('Brabo United');
    expect(out).toContain(t.opp!.name);
    for (const a of ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape']) expect(out).toMatch(new RegExp(`>${a}</tspan><tspan[^>]*>10<`));
    expect(out).toContain('no data');
  });

  it('notes a hidden ability for an unmet club', async () => {
    const t = (await loadTonight('2026-11-06'))!;
    const quirky = CLUBS.find((c) => c.kind === 'quirky' && c.hidden)!;
    const out = html(<TonightView t={{ ...t, opp: quirky, known: quirky.known, hiddenNote: true, fixture: { ...t.fixture!, opp: quirky.id } }} />);
    expect(out).toContain('One ability, found out after you first play them');
    expect(out).toContain(`Tonight: ${quirky.name}`);
    const met = html(<TonightView t={{ ...t, opp: quirky, known: quirky.known, hiddenNote: false }} />);
    expect(met).not.toContain('found out after');
  });

  it('after the match it shows the result card', async () => {
    await kickOff('2026-11-06');
    const t = (await loadTonight('2026-11-06'))!;
    expect(t.played).toHaveLength(1);
    const out = html(<TonightView t={t} />);
    expect(out).toContain('Full time');
    expect(out).toContain('Watch the match');
    expect(out).toMatch(/\d–\d/);
  });

  it('returns null before the club is founded', async () => {
    setDatabase(new HealthDB(`fb-tonight-empty-${++n}`));
    await db.open();
    expect(await loadTonight('2026-11-06')).toBeNull();
  });
});
