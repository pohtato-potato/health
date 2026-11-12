// The desk, Fork 1, through the store: dice frozen once seen, spends stored as a user key, shut at Close the day,
// folded into the world when the day plays at 4 am. Made-up days.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDay, patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, TABLES, db, setDatabase } from '../../src/db/db';
import { addDays, atOn } from '../../src/domain/dates';
import { courseSheet, deskOf, finishCourse, saveDraft, freezeDice, importMine, loadDesk, questionPool, spendAt } from '../../src/football/store/desk';
import { loadTonight } from '../../src/football/store/hooks';
import { scoutLevel } from '../../src/football/store/paused';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { startCupRun } from '../../src/football/cup/store';
import { unspentResearch } from '../../src/football/desk/rules';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
const noon = (d: string) => atOn(d, 12 * 60);
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-desk-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = 0; i < 20; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
  await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
  // The 10th plays at 4 am on the 11th, so the 11th is the desk's day.
  await playDue(noon('2026-10-11'));
});

async function desk(date = '2026-10-11') {
  const t = (await loadTonight(date))!;
  return { t, m: await loadDesk(t) };
}

describe('the desk through the store', () => {
  it('hands over dice made from yesterday, and freezes them once seen', async () => {
    const { m } = await desk();
    expect(m.dice.length).toBeGreaterThan(0);
    expect(m.dice.find((d) => d.axis === 'Pace')?.reason).toBe('9,900 steps');
    await freezeDice(m.date, m.dice);
    await patchDay('2026-10-10', { steps: 20000 });
    expect((await desk()).m.dice).toEqual(m.dice);
  });

  it('a die spent is stored once, marks tonight’s opponent scouted, and the tray shrinks', async () => {
    const { t, m } = await desk();
    const d = m.dice[0];
    expect(await spendAt(m.date, d, 'watch')).toBeUndefined();
    expect(await spendAt(m.date, d, 'column', m.view.columnLines[0].id)).toBe('no-die');
    const save = (await db.fbSave.get('save'))!;
    expect(deskOf(save).spends).toHaveLength(1);
    expect(scoutLevel(save, t.fixture!.opp)).toBe(d.value >= 3 ? 'full' : 'style');
    expect((await desk()).m.left).toHaveLength(m.dice.length - 1);
  });

  it('Close the day shuts the desk; when the day plays, spends land and the dice left become research', async () => {
    const { m } = await desk();
    const line = m.view.columnLines[0];
    expect(await spendAt(m.date, m.dice[0], 'column', line.id)).toBeUndefined();
    await closeDay(m.date, true, noon(m.date));
    expect(await spendAt(m.date, m.dice[1], 'watch')).toBe('shut');
    expect((await desk()).m.shut).toBe(true);
    await playDue(noon(addDays(m.date, 1)));
    const save = (await db.fbSave.get('save'))!;
    const gain = save.tree!.gains.filter((g) => g.why === 'desk' && g.on === m.date);
    expect(gain.reduce((t, g) => t + g.n, 0)).toBe(unspentResearch(m.dice.length - 1));
    const news = await db.fbNews.where('date').equals(addDays(m.date, 1)).toArray();
    expect(news.some((x) => x.text.includes(line.text))).toBe(true);
  });

  it('the coaching course: five questions, handed in once, a pass counts toward the eye and a cup run', async () => {
    const { m } = await desk();
    const d = m.dice[0];
    expect(await spendAt(m.date, d, 'course')).toBeUndefined();
    const save = (await db.fbSave.get('save'))!;
    const sheet = (await courseSheet(deskOf(save), `${m.date}:${d.axis}`))!;
    expect(sheet.questions).toHaveLength(5);
    const r = await finishCourse(sheet.spend, sheet.questions.map((q) => q.answer), m.date);
    expect(r).toMatchObject({ right: 5, passed: true });
    expect(await finishCourse(sheet.spend, [null, null, null, null, null], m.date)).toEqual(r);
    expect(deskOf(await db.fbSave.get('save')).courses).toHaveLength(1);
    const run = await startCupRun(1, noon(m.date));
    expect(run.run.eye).toBe(1);
  });

  it('a course left halfway keeps its answers, and a used lifeline stays used', async () => {
    const { m } = await desk();
    const d = m.dice.find((x) => x.value >= 5) ?? m.dice[0];
    expect(await spendAt(m.date, d, 'course')).toBeUndefined();
    const id = `${m.date}:${d.axis}`;
    await saveDraft(id, { answers: ['x', null, null, null, null], helped: 'q-a' });
    await saveDraft(id, { answers: ['x', 'y', null, null, null], helped: 'q-b' });
    const sheet = (await courseSheet(deskOf(await db.fbSave.get('save')), id))!;
    expect(sheet.draft).toEqual({ answers: ['x', 'y', null, null, null], helped: 'q-a' });
    await finishCourse(id, sheet.draft!.answers, m.date);
    expect(deskOf(await db.fbSave.get('save')).drafts?.[id]).toBeUndefined();
  });

  it('the owner’s questions go into their own table, join the pool, and are kept in backups', async () => {
    const r = await importMine('question,answer,explanation,year,section\nSquare of 13?,169,13 × 13,2022,QA\n', 'mine.csv');
    expect(r.added).toBe(1);
    expect((await importMine('question,answer,explanation\nSquare of 13?,169,13 × 13\n', 'again.csv')).added).toBe(0);
    expect((await questionPool()).filter((q) => q.source === 'mine')).toHaveLength(1);
    expect(TABLES).toContain('deskQuestions');
  });
});
