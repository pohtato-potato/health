import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { kickOffDone as kickOff } from './helpers/matchday';
import { answerPress, foundClub } from '../../src/football/store/save';
import { pressItem } from '../../src/football/news';
import { FullTimeView } from '../../src/screens/football/FullTime';
import { Press } from '../../src/screens/football/Press';
import { Studio } from '../../src/screens/football/Studio';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-ft-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
});

async function played() {
  await kickOff('2026-11-06');
  const m = (await db.fbMatches.where('date').equals('2026-11-06').first())!;
  const save = (await db.fbSave.get('save'))!;
  return { m, save };
}

describe('Full time', () => {
  it('lists the score, xG, moments and a found-out ability once', async () => {
    const { m, save } = await played();
    const shown = { ...m, events: { ...m.events, moments: ['Clean sheet', 'Came from behind'], revealed: 'Night shift' } };
    const out = html(<FullTimeView m={shown} save={save} />);
    expect(out).toContain('Full time');
    expect(out).toMatch(/xG \d\.\d – \d\.\d/);
    expect(out).toContain('Clean sheet');
    expect(out).toContain('Came from behind');
    expect(out.split('Night shift').length - 1).toBe(1);
    expect(out).toContain('Found out');
    const plain = html(<FullTimeView m={{ ...m, events: { ...m.events, revealed: undefined } }} save={save} />);
    expect(plain).not.toContain('Found out');
  });

  it('the match stores a studio exchange of exactly three lines and a press question', async () => {
    const { m } = await played();
    const studio = (await db.fbNews.get(`${m.id}:studio`))!;
    const lines = studio.text.split('\n');
    expect(lines).toHaveLength(3);
    const out = html(<Studio lines={lines} />);
    expect(out.match(/class="fb-ln /g)).toHaveLength(3);
    expect(out).toContain('The gremlin');
    expect(out).toContain('The pundit');
    const press = (await db.fbNews.get(`${m.id}:press`))!;
    expect(pressItem(press.lineId!)).toBeTruthy();
  });

  it('answering the press stores tomorrow’s back page with that answer’s headline, once', async () => {
    const { m } = await played();
    const head = await answerPress(m.id, 1);
    expect(head).toBeTruthy();
    const back = (await db.fbNews.get(`${m.id}:back`))!;
    expect(back.date).toBe(addDays(m.date, 1));
    expect(back.text).toBe(head);
    expect((await db.fbNews.get(`${m.id}:press`))!.answered).toBe(1);
    expect(await answerPress(m.id, 2)).toBeUndefined();
    expect((await db.fbNews.get(`${m.id}:back`))!.text).toBe(head);
  });

  it('the press screen shows three answer buttons at least 44 px tall', async () => {
    const { m } = await played();
    const press = (await db.fbNews.get(`${m.id}:press`))!;
    const facts = { club: 'Brabo United', opp: 'X', score: '1–0', minute: 50, pct: 40, streak: 1, axis: 'Pace', tier: 'Tier 6', situation: 'press', date: m.date };
    const closed = html(<Press matchId={m.id} lineId={press.lineId!} facts={facts} onAnswer={async () => undefined} />);
    expect(closed).toContain('Face the press');
    const open = html(<Press matchId={m.id} lineId={press.lineId!} facts={facts} startOpen onAnswer={async () => undefined} />);
    expect(open.match(/class="fb-btn fb-answer"/g)).toHaveLength(3);
    const done = html(<Press matchId={m.id} lineId={press.lineId!} facts={facts} answered={0} onAnswer={async () => undefined} />);
    expect(done).toContain('Tomorrow’s back page');
    const css = (await import('node:fs')).readFileSync('src/styles/football.css', 'utf8');
    expect(css).toMatch(/\.fb-answer \{[^}]*min-height: 56px/);
  });
});
