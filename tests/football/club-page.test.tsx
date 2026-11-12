import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { CLUBS, clubById } from '../../src/football/data/load';
import { groundFor, LUCKY_TWELVE } from '../../src/football/grounds';
import { ANTIGOON } from '../../src/football/rivals';
import { backPage, headToHead, loadClubPage } from '../../src/football/store/league';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { ClubPageView } from '../../src/screens/football/league/ClubPage';
import { BackPageCard } from '../../src/screens/football/league/News';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-club-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
  await playDue(new Date('2026-11-07T12:00:00').getTime());
});

describe('Club page', () => {
  // Desk spec §4 (Fork 2): the hidden ability is fogged until scouted; a club met before the fog keeps it (12.8 a).
  it('an unmet quirky club hides its quirk under the fog; met before the fog it shows the name and [data]; met now it stays hidden', async () => {
    const q = CLUBS.find((c) => c.kind === 'quirky' && c.hidden?.data)!;
    await db.fbSave.update('save', { met: [], fog: { since: '2026-01-01', old: [] } });
    let d = (await loadClubPage(q.id))!;
    let out = html(<ClubPageView d={d} />);
    expect(out).toContain('Hidden ability: not known yet');
    expect(out).not.toContain(q.hidden!.name);
    await db.fbSave.update('save', { met: [q.id], fog: { since: '2026-01-01', old: [q.id] } });
    d = (await loadClubPage(q.id))!;
    out = html(<ClubPageView d={d} />);
    expect(out).not.toContain('Hidden ability: not known yet');
    expect(out).toContain(`${q.hidden!.name} [data]`);
    await db.fbSave.update('save', { met: [q.id], fog: { since: '2026-01-01', old: [] } });
    out = html(<ClubPageView d={(await loadClubPage(q.id))!} />);
    expect(out).toContain('Hidden ability: not known yet');
  });

  it('the head-to-head counts match the stored matches', async () => {
    const m = (await db.fbMatches.orderBy('date').first())!;
    const all = await db.fbMatches.toArray();
    const h = headToHead(all, m.opp);
    const vs = all.filter((x) => x.opp === m.opp);
    expect(h.w + h.d + h.l).toBe(vs.length);
    expect(h.w).toBe(vs.filter((x) => x.result === 'W').length);
    const out = html(<ClubPageView d={(await loadClubPage(m.opp))!} />);
    expect(out).toMatch(new RegExp(`<b>${h.w}</b><span>Won</span></div><div><b>${h.d}</b><span>Drawn</span></div><div><b>${h.l}</b><span>Lost`));
  });

  it('every club page renders, with its ground and a wiki link', async () => {
    for (const c of CLUBS.filter((x) => x.kind !== 'own').slice(0, 30)) {
      const out = html(<ClubPageView d={(await loadClubPage(c.id))!} />);
      expect(out).toContain('class="fb-ground"');
      expect(out).toContain('wiki');
    }
  });
});

describe('Grounds', () => {
  it('the elite and Antigoon have their own unique ground; ordinary clubs share their tier’s; finals are neutral', () => {
    const elite = CLUBS.filter((c) => c.elite);
    expect(elite.length).toBeGreaterThan(0);
    const owns = [...elite, clubById(ANTIGOON)].map((c) => groundFor(c));
    for (const g of owns) expect(g.kind).toBe('own');
    expect(new Set(owns.map((g) => g.svg)).size).toBe(owns.length);
    const plain = CLUBS.filter((c) => c.kind !== 'own' && !c.elite && c.id !== ANTIGOON && !LUCKY_TWELVE.includes(c.id) && c.tier === 6).slice(0, 2);
    expect(groundFor(plain[0]).svg).toBe(groundFor(plain[1]).svg);
    expect(LUCKY_TWELVE).toHaveLength(12);
    expect(groundFor(plain[0], 6, [plain[0].id]).kind).toBe('own');
    expect(groundFor(plain[0], 6, [], true).kind).toBe('neutral');
  });
});

describe('The back page', () => {
  it('shows today’s headline and calls back a past result', async () => {
    const news = await db.fbNews.toArray();
    const matches = await db.fbMatches.orderBy('date').toArray();
    const b = backPage(news, matches, '2026-11-07');
    expect(b.headline?.kind).toBe('back');
    expect(b.headline!.date <= '2026-11-07').toBe(true);
    expect(b.callback).toMatch(/Brabo (beat|lost|drew)[^(]*\d–\d[^(]*\(season 1, day \d+\)/);
    const out = html(<BackPageCard news={news} matches={matches} today="2026-11-07" />);
    expect(out).toContain(b.headline!.text);
    expect(out).toContain('season 1, day');
  });
});
