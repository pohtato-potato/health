import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { loadTonight } from '../../src/football/store/hooks';
import { kickOffDone as kickOff } from './helpers/matchday';
import { foundClub } from '../../src/football/store/save';
import { FootballCardView, KickOffCard, footballCardState } from '../../src/screens/today/FootballCard';

const at = (d: string, hm: string) => new Date(`${d}T${hm}:00`).getTime();
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-todaycard-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
});

async function lastNight() {
  await foundClub('2026-11-05', { shirt: 'H1', crest: 'a' });
  await kickOff('2026-11-05');
  const last = (await db.fbMatches.where('date').equals('2026-11-05').first())!;
  const t = (await loadTonight('2026-11-06'))!;
  return { last, t };
}

describe('Today’s Football card', () => {
  it('at 08:00 with an unwatched match it is sealed and shows no score', async () => {
    const { last, t } = await lastNight();
    const now = at('2026-11-06', '08:00');
    expect(footballCardState(now, last, t.fixture)).toBe('sealed');
    const out = html(<FootballCardView state="sealed" t={t} last={last} />);
    expect(out).toContain('Sealed');
    expect(out).not.toMatch(/\d\s*[–-]\s*\d/);
  });

  it('from 18:00 it is half-time, with the opponent and the weakest axis', async () => {
    const { last, t } = await lastNight();
    expect(footballCardState(at('2026-11-06', '18:30'), last, t.fixture)).toBe('halftime');
    expect(footballCardState(at('2026-11-07', '01:30'), { ...last, watched: true }, t.fixture)).toBe('halftime');
    const out = html(<FootballCardView state="halftime" t={{ ...t, flags: {}, liveValues: { ...t.liveValues, Rest: 6 } }} last={last} />);
    expect(out).toContain('Half-time');
    expect(out).toContain("Weakest so far: Rest 6");
    expect(out).toContain('The match plays in the morning, once the day is done.');
    expect(out).not.toContain('class="lab');
  });

  it('after closing the day, before watching, it is evening; watched in the day, it goes', async () => {
    const { t } = await lastNight();
    await kickOff('2026-11-06');
    const today = (await db.fbMatches.where('date').equals('2026-11-06').first())!;
    expect(footballCardState(at('2026-11-06', '21:00'), today, t.fixture)).toBe('evening');
    expect(footballCardState(at('2026-11-06', '21:00'), { ...today, watched: true }, t.fixture)).toBe('none');
    expect(footballCardState(at('2026-11-06', '10:00'), { ...today, date: '2026-11-05', watched: true }, t.fixture)).toBe('none');
  });

  it('before the club is founded it is none and renders nothing', async () => {
    expect(await loadTonight('2026-11-06')).toBeNull();
    expect(footballCardState(at('2026-11-06', '19:00'))).toBe('none');
    expect(html(<FootballCardView state="none" t={null} />)).toBe('');
  });

  it('Close the day’s last screen offers Watch now and Later; Later leaves it unwatched', async () => {
    const { last, t } = await lastNight();
    let later = 0;
    const out = html(<KickOffCard m={last} save={t.save} onWatch={() => undefined} onLater={() => later++} />);
    expect(out).toContain('Watch now');
    expect(out).toContain('Later');
    expect(out).not.toMatch(/\d\s*[–-]\s*\d/);
    expect((await db.fbMatches.get(last.id))!.watched).toBeFalsy();
  });
});
