import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { advance, type Bracket } from '../../src/football/cups';
import { loadLeague } from '../../src/football/store/league';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { Calendar, shapeOf } from '../../src/screens/football/league/Calendar';
import { BracketView, Cup, giantKillings } from '../../src/screens/football/league/Cups';
import { Events } from '../../src/screens/football/league/Events';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-cups-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
  await playDue(new Date('2026-11-07T12:00:00').getTime());
});

/** Play a bracket on with home wins until the last 16 is drawn and played. */
function playUntil(b: Bracket, stop: string): Bracket {
  let out = b;
  for (let i = 0; i < out.rounds.length && out.rounds[i].name !== stop; i++) {
    const res: Record<string, { score: [number, number] }> = {};
    for (const t of out.rounds[i].ties) if (t.away) res[`${t.home}-${t.away}`] = { score: [1, 0] };
    out = advance(out, i, res);
  }
  return out;
}

describe('Calendar', () => {
  it('has 42 cells with the right shapes and gold finals', async () => {
    const l = (await loadLeague())!;
    const out = html(<Calendar season={1} today={l.save.day} matches={l.matches} />);
    expect(out.match(/<li class="fb-calday/g)).toHaveLength(42);
    expect(shapeOf({ kind: 'league' })).toBe('c');
    expect(shapeOf({ kind: 'bigcup' })).toBe('d');
    expect(shapeOf({ kind: 'tiercup' })).toBe('s');
    expect(shapeOf({ kind: 'event' })).toBe('h');
    expect(out.match(/fb-res [cds] todo fin/g)).toHaveLength(2);
    expect(out).toMatch(/aria-label="Day 5, Big Cup[^"]*"><span class="fb-res d/);
    expect(out).toMatch(/aria-label="Day 10, Trophy[^"]*"><span class="fb-res s/);
  });

  it('played cells show the result letter', async () => {
    const l = (await loadLeague())!;
    const out = html(<Calendar season={1} today={l.save.day} matches={l.matches} />);
    const played = l.matches.filter((m) => m.comp !== 'event');
    expect(played.length).toBeGreaterThan(0);
    for (const m of played.slice(0, 3)) expect(out).toMatch(new RegExp(`aria-label="Day ${m.day}, [^"]*(won|drew|lost)"><span class="fb-res [cds] r-[WDL]"[^>]*><b>[WDL]</b>`));
  });
});

describe('Cups', () => {
  it('the bracket shows 16 slots from the last 16, and the next round waits as “?”', async () => {
    const l = (await loadLeague())!;
    const drawn = playUntil(l.season.bigcup, 'Last 16');
    const out = html(<BracketView b={drawn} />);
    expect(out).toContain('Last 16');
    const [l16, qf] = out.split('aria-label="Quarter-final"');
    expect(l16.match(/class="fb-slot/g)).toHaveLength(16);
    expect(qf.match(/class="fb-slot unknown"/g)).toHaveLength(8);
    // Played: the winners carry their colours into the quarter-finals.
    const played = playUntil(l.season.bigcup, 'Quarter-final');
    const next = html(<BracketView b={played} />);
    const q = next.split('aria-label="Semi-final"')[0];
    expect(q).toContain('Quarter-final');
    expect(q.match(/class="fb-slot[^"]*" style="--k:#[0-9a-fA-F]{6}"/g)).toHaveLength(8);
  });

  it('the round list and the giant-killings render', async () => {
    const l = (await loadLeague())!;
    const b = playUntil(l.season.bigcup, 'Quarter-final');
    const out = html(<Cup b={b} tierOf={l.season.tierOf} />);
    expect(out).toContain('The Big Cup');
    expect(out.match(/class="fb-rd/g)).toHaveLength(b.rounds.length);
    const gk = giantKillings(b, l.season.tierOf);
    for (const g of gk) expect(g.wTier - g.lTier).toBeGreaterThanOrEqual(2);
    if (gk.length) expect(out).toContain('Giant-killings so far');
  });
});

describe('Events', () => {
  it('each World Cup group day row has its label, text and result in that order', async () => {
    const l = (await loadLeague())!;
    const base = l.matches[0];
    const ms = [1, 2].map((d) => ({ ...base, id: `wc${d}`, date: `2026-12-1${d}`, comp: 'friendly' as const, round: `World Cup, day ${d} of 7` }));
    const out = html(<Events event={{ id: 'worldcup', days: 7 }} matches={ms} />);
    expect(out).toContain('World Cup');
    const rows = out.match(/<li class="fb-evrow">.*?<\/li>/g)!;
    expect(rows).toHaveLength(2);
    for (const [i, r] of rows.entries()) expect(r).toMatch(new RegExp(`fb-evlabel">Day ${i + 1} of 7</b><span class="fb-evtext">[^<]+\\d–\\d[^<]+</span><span class="fb-res c r-[WDL]"`));
  });
});
