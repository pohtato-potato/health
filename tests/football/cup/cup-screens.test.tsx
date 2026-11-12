// Cup runs: the run's store (saved after every card and every stop, settled once, paid once a day) and the screens that
// render without a browser. Made-up targets, no one's data.
import 'fake-indexeddb/auto';
import '../helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../../src/db/actions';
import { HealthDB, TABLES, db, setDatabase } from '../../../src/db/db';
import { PAY } from '../../../src/football/cup/book';
import { abandon, enter, reachable, type RunState } from '../../../src/football/cup/run';
import { clearRun, dealToday, loadBook, loadRun, runCtx, saveRun, startCupRun } from '../../../src/football/cup/store';
import { engineOf } from '../../../src/football/store/tree';
import { foundClub } from '../../../src/football/store/save';
import { DealView } from '../../../src/screens/football/cup/CupScreens';

let n = 0;
const T = new Date('2026-11-08T12:00:00').getTime();
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-cup-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
});
/** A run that cleared `k` stops, ended as `how`. */
const ended = (r: RunState, k: number, how: RunState['over']): RunState => ({ ...r, path: r.map.nodes.slice(0, k).map((x) => x.id), over: how });

describe('cup runs: the store', () => {
  it('lives in its own tables, which backups include', () => {
    for (const t of ['cupRuns', 'cupBook', 'cupDone']) expect(TABLES).toContain(t);
  });
  it('deals today\'s deck: an empty week is the first week, so basic cards, no punts', async () => {
    const d = await dealToday('2026-11-08');
    expect(d.cards).toHaveLength(12 + 3);
    expect(d.rows.every((r) => r.level === 'basic')).toBe(true);
  });
  it('starts one run at a time, saves after every stop, and resumes where it was left', async () => {
    const rec = await startCupRun(1, T);
    expect(rec.run.cup).toBe(1);
    await expect(startCupRun(1, T + 1)).rejects.toThrow();
    const ctx = await runCtx();
    const next = enter(rec.run, reachable(rec.run)[0], ctx);
    expect(next.stop?.kind).toBe('match');
    await saveRun(next, T);
    const back = await loadRun();
    expect(back!.run).toEqual(next);
    expect(back!.end).toBeUndefined();
  });
  it('an abandoned run keeps what it earned and settles once', async () => {
    const rec = await startCupRun(1, T);
    const r = ended(rec.run, 4, 'abandoned');
    const end = await saveRun(r, T);
    expect(end!.pay.research).toBe(2);
    const again = await saveRun(r, T);
    expect(again).toEqual(end);
    expect(await db.cupDone.count()).toBe(1);
    const book = await loadBook();
    expect(book.cups[1].furthest).toBe(4);
    expect(book.runs).toBe(1);
  });
  it('only the first run that ends each day pays, a won cup pays its full 5; reaching the final pays an album card', async () => {
    const before = engineOf((await db.fbSave.get('save'))!).earned;
    const rec = await startCupRun(1, T);
    const finalId = rec.run.map.nodes.find((x) => x.kind === 'final')!.id;
    const won: RunState = { ...ended(rec.run, 14, 'won'), path: [...rec.run.map.nodes.slice(0, 13).map((x) => x.id), finalId] };
    const end = await saveRun(won, T);
    expect(end!.pay.research).toBe(PAY.cupWin);
    expect(end!.pay.album).toBe(true);
    const eng = engineOf((await db.fbSave.get('save'))!);
    expect(eng.earned - before).toBe(PAY.cupWin);
    expect(eng.packs.some((p) => p.source === 'cup-final')).toBe(true);
    expect((await loadBook()).cups[1].won).toBe(1);
    // a second run the same day still counts for the book, but pays nothing
    await clearRun();
    const rec2 = await startCupRun(1, T + 1000);
    const end2 = await saveRun(ended(rec2.run, 6, 'lost'), T + 2000);
    expect(end2!.pay).toMatchObject({ research: 0, album: false });
    expect(engineOf((await db.fbSave.get('save'))!).earned - before).toBe(PAY.cupWin);
    expect((await loadBook()).runs).toBe(2);
  });
  it('never touches the league', async () => {
    const save0 = await db.fbSave.get('save');
    const matches = await db.fbMatches.count();
    const rec = await startCupRun(1, T);
    await saveRun(abandon(rec.run), T);
    const save1 = await db.fbSave.get('save');
    expect({ ...save1, tree: undefined }).toEqual({ ...save0, tree: undefined });
    expect(await db.fbMatches.count()).toBe(matches);
  });
  it('"How your deck was dealt" lists each axis and each extra', async () => {
    const d = await dealToday('2026-11-08');
    const out = html(<DealView deal={d} title="How your deck was dealt" />);
    for (const a of ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape']) expect(out).toContain(`>${a}<`);
    expect(out.match(/class="cup-dr extra"/g)).toHaveLength(3);
  });
});
