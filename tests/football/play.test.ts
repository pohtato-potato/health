import 'fake-indexeddb/auto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDay, patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays, atOn } from '../../src/domain/dates';
import { CATCH_UP_CAP, finishPaused, finishWithAssistant, kickOff, pausedMatch, playDue, recordLive } from '../../src/football/store/play';
import { choosePick, setPlan } from '../../src/football/store/matchday';
import { pausedInput } from '../../src/football/store/paused';
import { finishMatch, nextChance, playMatch, startMatch } from '../../src/football/engine';
import { OWN } from '../../src/football/store/season';
import { foundClub } from '../../src/football/store/save';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-play-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = 0; i < 20; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
  await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
});
const noon = (d: string) => atOn(d, 12 * 60);

describe('kick-off and the 4 am rule', () => {
  it('closing a past day stores one match; closing again adds nothing', async () => {
    await closeDay('2026-10-10', true, noon('2026-10-11'));
    // the league match waits to be watched; Skip stores it
    expect(await db.fbMatches.count()).toBe(0);
    expect((await pausedMatch())?.date).toBe('2026-10-10');
    await finishWithAssistant();
    expect(await db.fbMatches.count()).toBe(1);
    await closeDay('2026-10-10', false, noon('2026-10-11'));
    await closeDay('2026-10-10', true, noon('2026-10-11'));
    expect(await db.fbMatches.count()).toBe(1);
    expect(await pausedMatch()).toBeUndefined();
  });
  it('closing today waits for the morning match (whichever is later)', async () => {
    await closeDay('2026-10-10', true, noon('2026-10-10'));
    expect(await db.fbMatches.count()).toBe(0);
    expect(await playDue(noon('2026-10-11'))).toEqual([]);
    expect((await pausedMatch())?.date).toBe('2026-10-10');
  });
  it('plays missed days once each at 4 am, and running it again adds nothing', async () => {
    const played = await playDue(noon('2026-10-13'));
    // the last one waits to be watched
    expect(played.map((m) => m.date)).toEqual(['2026-10-10', '2026-10-11']);
    expect(played.every((m) => m.auto)).toBe(true);
    expect((await pausedMatch())?.date).toBe('2026-10-12');
    expect(await playDue(noon('2026-10-13'))).toHaveLength(0);
    expect(await db.fbMatches.count()).toBe(2);
  });
  it('a clock that goes backwards plays nothing', async () => {
    await kickOff('2026-10-12');
    expect(await kickOff('2026-10-11')).toHaveLength(0);
    expect(await playDue(noon('2026-10-11'))).toHaveLength(0);
  });
  it('caps catch-up at 42 days', async () => {
    const played = await playDue(noon(addDays('2026-10-10', 80)));
    // Only the last 42 days are played; break days inside them (layer 4) have no matches.
    const first = addDays('2026-10-10', 80 - CATCH_UP_CAP);
    const breaks = ((await db.fbSave.get('save'))!.globe?.breaks ?? []).flatMap((b) => b.days).filter((d) => d >= first);
    expect(played.every((m) => m.date >= first)).toBe(true);
    const waiting = await pausedMatch();
    expect(new Set([...played.map((m) => m.date), ...(waiting ? [waiting.date] : [])]).size).toBe(CATCH_UP_CAP - breaks.length);
  });
  it('a later edit never changes a played match', async () => {
    await kickOff('2026-10-12');
    const before = await db.fbMatches.toArray();
    await patchDay('2026-10-12', { steps: 30000 });
    await playDue(noon('2026-10-13'));
    const after = await db.fbMatches.where('date').equals('2026-10-12').toArray();
    expect(after).toEqual(before.filter((m) => m.date === '2026-10-12'));
  });
  it('a sick day plays the Rotation XI', async () => {
    await patchDay('2026-10-10', { status: 'sick' });
    await kickOff('2026-10-10');
    const m = (await finishWithAssistant())!;
    expect(m.rotation).toBe(true);
  });
  it('every league club plays each matchday', async () => {
    await kickOff('2026-10-10');
    // Brabo's row reads "to be played" until the match is watched or skipped
    const before = (await db.fbSeasons.get(1))!;
    expect(Object.values(before.results).reduce((a, r) => a + r.length, 0)).toBe(53);
    await finishWithAssistant();
    const s = (await db.fbSeasons.get(1))!;
    const day1 = Object.values(s.results).reduce((a, r) => a + r.length, 0);
    expect(day1).toBe(54);
    const row = Object.values(s.results).flat().filter((r) => r.home === OWN || r.away === OWN);
    expect(row).toHaveLength(1);
    const stored = (await db.fbMatches.toArray())[0];
    // the table's score is home first, the stored match's Brabo first
    expect(row[0].score).toEqual(stored.home === OWN ? stored.score : [stored.score[1], stored.score[0]]);
  });
  it('a whole season and an event roll into season 2 with every tier at 18', async () => {
    const save0 = (await db.fbSave.get('save'))!;
    let d = save0.founded;
    for (let i = 0; i < 60; i++) { await kickOff(d); d = addDays(d, 1); }
    const save = (await db.fbSave.get('save'))!;
    expect(save.season).toBe(2);
    const s1 = (await db.fbSeasons.get(1))!;
    expect(s1.final).toBeTruthy();
    const clubs = await db.fbClubs.toArray();
    for (const t of [1, 2, 3, 4, 5, 6]) expect(clubs.filter((c) => c.tier === t)).toHaveLength(18);
    const s2 = (await db.fbSeasons.get(2))!;
    const s1dates = (await db.fbMatches.where('season').equals(1).toArray()).map((m) => m.date).sort();
    expect(s2.start).toBe(addDays(s1dates[s1dates.length - 1], 1));
    expect(s1dates.length).toBeGreaterThanOrEqual(43);
  }, 60000);
  it('football modules other than the store never touch the database', () => {
    const dir = join(__dirname, '../../src/football');
    for (const f of readdirSync(dir)) if (f.endsWith('.ts')) expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(/from '\.\.\/db\/db'|from '\.\.\/\.\.\/db\/db'/);
  });
});

describe('the league match that waits for you (matchday spec §2.1)', () => {
  it('stores data, not a closure: the stored match is exactly the rebuilt input replayed', async () => {
    await kickOff('2026-10-10');
    const p = (await pausedMatch())!;
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    const save = (await db.fbSave.get('save'))!;
    const expected = playMatch(pausedInput(p, save, { watch: false }));
    const m = (await finishWithAssistant())!;
    expect(m.events).toEqual(expected);
    expect(m.events.calls!.length).toBeGreaterThanOrEqual(1);
    expect(m.events.calls!.every((c) => c.by === 'assistant')).toBe(true);
    expect(m.watched).toBe(true); // skipped: seen, never back in the catch-up reel
  });
  it('the next 4 am finishes a match nobody opened, with the assistant, before playing on', async () => {
    await kickOff('2026-10-10');
    const played = await playDue(noon('2026-10-12'));
    expect(played[0].date).toBe('2026-10-10');
    expect(played[0].events.calls!.every((c) => c.by === 'assistant')).toBe(true);
    expect(played[0].watched).toBe(false); // nobody opened it: it waits in the catch-up reel
    expect((await pausedMatch())?.date ?? '2026-10-11').toBe('2026-10-11');
  });
  it('a watched match: the calls you made and the half-time change are kept, and resume where you left', async () => {
    await kickOff('2026-10-10');
    const save = (await db.fbSave.get('save'))!;
    let p = (await pausedMatch())!;
    // watch: stop at half-time, change the plan, then answer each call with "shoot on sight"
    for (;;) {
      const st = startMatch(pausedInput(p, (await db.fbSave.get('save'))!, { watch: true }));
      while (nextChance(st)) { /* to the next stop */ }
      if (!st.stop) break;
      if (st.stop.kind === 'half') await recordLive({ halfSeen: true, half2: 'hold' });
      else await recordLive({ pick: 'shoot' });
      p = (await pausedMatch())!;
    }
    const shown = finishMatch((() => { const st = startMatch(pausedInput(p, save, { watch: true })); while (nextChance(st)) { /* */ } return st; })());
    const m = (await finishPaused({ watched: true }))!;
    expect(m.events).toEqual(shown);
    expect(m.watched).toBe(true);
    expect(m.events.calls!.every((c) => c.by === 'you' && c.pick === 'shoot')).toBe(true);
    expect(m.plan?.half2).toBe('hold');
  });
  it('a later edit to the day never changes a waiting match; the plan can change until kick-off', async () => {
    await kickOff('2026-10-10');
    const p = (await pausedMatch())!;
    await patchDay('2026-10-10', { steps: 30000 });
    expect((await pausedMatch())!.input).toEqual(p.input);
    await setPlan('2026-10-10', { tempo: 'quick' });
    const m = (await finishWithAssistant())!;
    expect(m.plan?.tempo).toBe('quick');
  });
  it('after a league win, the pick of three: one tile, once, never league points', async () => {
    let d = '2026-10-10', won;
    for (let i = 0; i < 20 && !won; i++, d = addDays(d, 1)) { await kickOff(d); const m = await finishWithAssistant(); if (m?.result === 'W') won = m; }
    expect(won).toBeTruthy();
    expect(won!.pick!.tiles).toHaveLength(3);
    const before = (await db.fbSave.get('save'))!;
    const k = won!.pick!.tiles.findIndex((t) => t.kind === 'research');
    expect(await choosePick(won!.id, k)).toBe(true);
    expect(await choosePick(won!.id, k)).toBe(false);
    const after = (await db.fbSave.get('save'))!;
    expect(after.tree!.earned - (before.tree?.earned ?? 0)).toBe(2);
    expect((await db.fbMatches.get(won!.id))!.pick!.chosen).toBe(k);
  });
});
