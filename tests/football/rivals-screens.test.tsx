import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { afterMatch, rivalList, rivalTwist, type Meeting, type Rival } from '../../src/football/rivals';
import type { StoredMatch } from '../../src/football/store/tables';
import { RivalsView } from '../../src/screens/football/story/Rivals';
import { RivalryView } from '../../src/screens/football/story/Rivalry';
import { db } from '../../src/db/db';
import { migrateSave } from '../../src/football/store/play';

const loss = (clubId: string, o: Partial<Meeting> = {}): Meeting => ({ clubId, result: 'L', comp: 'league', ...o });
const match = (id: string, opp: string, result: 'W' | 'D' | 'L', score: [number, number]): StoredMatch => ({
  id, date: id, season: 1, day: 1, comp: 'league', round: 'Matchday 3', home: 'bra', away: opp, opp, braboHome: true, values: {} as never, flags: {},
  events: { seed: 1, chances: [], score, xg: [1, 1], moments: result === 'W' ? ['Clean sheet'] : [] }, score, result, watched: true, rotation: false, auto: false,
});

describe('Rivals', () => {
  it('Antigoon is always listed, even with no rivals stored', () => {
    expect(rivalList([]).map((r) => r.clubId)).toEqual(['ant']);
    const out = html(<RivalsView rivals={[]} matches={[]} />);
    expect(out).toContain('Antigoon');
    expect(out).toContain('Giant');
  });
  it('a cup loss creates a rival with "Bad blood"', () => {
    const r = afterMatch([], [], loss('zur', { comp: 'bigcup' }), '2026-11-06');
    expect(r.born?.how).toBe('cup');
    expect(rivalTwist(r.born!.clubId, r.born!.how).name).toBe('Bad blood');
    expect(afterMatch([], [], loss('zur', { comp: 'bigcup', final: true }), 'd').born?.how).toBe('final');
    expect(afterMatch([], [], loss('zur', { margin: 1 }), 'd').born?.how).toBe('close');
    expect(afterMatch([], [], loss('zur'), 'd').born).toBeUndefined();
  });
  it('a saved Night shift rival shows as Found a gap on both screens (C3)', () => {
    const old: Rival = { clubId: 'zur', how: 'fouram', since: '2026-10-08' };
    for (const out of [html(<RivalsView rivals={[old]} matches={[]} />), html(<RivalryView r={old} matches={[]} />)]) {
      expect(out).toContain('Found a gap');
      expect(out).toContain('Beat you by a single goal.');
      expect(out).not.toMatch(/Night shift|4 am/);
    }
  });
  it('the list never goes past 1 + 3', () => {
    let rivals: Rival[] = [{ clubId: 'ant', how: 'legend', since: '' }];
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) rivals = afterMatch(rivals, [], loss(id, { comp: 'bigcup' }), 'd').rivals;
    expect(rivals).toHaveLength(4);
    expect(rivalList(rivals)).toHaveLength(4);
    expect(rivalList([...rivals, { clubId: 'c9', how: 'cup', since: '' }])).toHaveLength(4);
  });
  it('five wins running fade a rival; Antigoon never fades', () => {
    const rivals: Rival[] = [{ clubId: 'zur', how: 'cup', since: '' }];
    const wins = Array.from({ length: 4 }, (): Meeting => ({ clubId: 'zur', result: 'W', comp: 'league' }));
    expect(afterMatch(rivals, wins, { clubId: 'zur', result: 'W', comp: 'league' }, 'd').faded).toBe('zur');
    const antWins = Array.from({ length: 9 }, (): Meeting => ({ clubId: 'ant', result: 'W', comp: 'league' }));
    expect(afterMatch([{ clubId: 'ant', how: 'legend', since: '' }], antWins, { clubId: 'ant', result: 'W', comp: 'league' }, 'd').faded).toBeUndefined();
  });
  it('the rivalry page shows the record and the meetings', () => {
    const ms = [match('2026-10-01', 'zur', 'W', [2, 0]), match('2026-10-08', 'zur', 'L', [0, 1]), match('2026-10-15', 'zur', 'W', [3, 1]), match('2026-10-20', 'ant', 'D', [1, 1])];
    const out = html(<RivalryView r={{ clubId: 'zur', how: 'cup', since: '2026-10-08' }} matches={ms} />);
    expect(out).toContain('The record');
    expect(out).toMatch(/>2<\/b><span class="fb-s">won/);
    expect(out).toMatch(/>0<\/b><span class="fb-s">drawn/);
    expect(out).toMatch(/>1<\/b><span class="fb-s">lost/);
    expect(out.match(/fb-meet/g)).toHaveLength(3);
    expect(out).toContain('Bad blood');
  });
});

describe('migrating a saved Night shift rival (C3)', () => {
  it('rewrites the stored save once, keeping everything else', async () => {
    await db.fbSave.clear();
    expect(await migrateSave()).toBe(false); // no club yet
    const save = { id: 'save', season: 2, rivals: [{ clubId: 'ant', how: 'legend', since: '' }, { clubId: 'hul', how: 'fouram', since: '2026-10-30', best: 'Pace' }] };
    await db.fbSave.put(save as never);
    expect(await migrateSave()).toBe(true);
    const after = await db.fbSave.get('save');
    expect(after?.season).toBe(2);
    expect(after?.rivals).toEqual([{ clubId: 'ant', how: 'legend', since: '' }, { clubId: 'hul', how: 'close', since: '2026-10-30', best: 'Pace', weak: 'Rest' }]);
    expect(await migrateSave()).toBe(false); // already done
  });
});
