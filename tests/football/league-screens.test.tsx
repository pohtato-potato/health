import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { gapOf, loadLeague } from '../../src/football/store/league';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { Pyramid } from '../../src/screens/football/league/Pyramid';
import { Table } from '../../src/screens/football/league/Table';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-league-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
  await playDue(new Date('2026-11-06T12:00:00').getTime());
});

describe('League table', () => {
  it('renders 18 rows with the tier colour, result-letter form and points; each row links to the club page', async () => {
    const l = (await loadLeague())!;
    const out = html(<Table tier={5} rows={l.tables[5]} />);
    expect(out).toContain('--t:var(--fb-t5)');
    const rows = out.match(/<li class="fb-trow[^"]*"/g)!;
    expect(rows).toHaveLength(18);
    expect(out.match(/href="#\/football\/club-page\?id=[^"]+"/g)).toHaveLength(18);
    expect(out.match(/class="fb-res c r-[WDL]"/g)!.length).toBeGreaterThan(18);
    expect(out.match(/class="fb-tpts">\d+/g)).toHaveLength(18);
  });

  it('cut lines sit after rows 2 and 6 and before row 16', async () => {
    const l = (await loadLeague())!;
    const out = html(<Table tier={4} rows={l.tables[4]} />);
    const items = [...out.matchAll(/<li class="(fb-trow|fb-cut)[^"]*"/g)].map((m) => m[1]);
    expect(items.indexOf('fb-cut')).toBe(2);
    const cuts = items.map((x, i) => (x === 'fb-cut' ? i : -1)).filter((i) => i >= 0);
    expect(cuts).toEqual([2, 7, 17]);
    expect(out).toContain('Top two go up');
    expect(out).toContain('3rd to 6th: playoffs');
    expect(out).toContain('Bottom three go down');
    const six = html(<Table tier={6} rows={l.tables[6]} />);
    expect(six).not.toContain('Bottom three go down');
    const top = html(<Table tier={1} rows={l.tables[1]} />);
    expect(top).not.toContain('Top two go up');
    expect(top).toContain('Bottom three go down');
  });

  it('Brabo’s row is marked “You”', async () => {
    const l = (await loadLeague())!;
    const out = html(<Table tier={6} rows={l.tables[6]} />);
    expect(out).toMatch(/fb-trow me[\s\S]*Brabo United<em>You<\/em>/);
  });
});

describe('Pyramid', () => {
  it('renders 6 tiers in their colours, each band with a gap class and its word', async () => {
    const l = (await loadLeague())!;
    const out = html(<Pyramid tierOf={l.season.tierOf} rating={40} />);
    for (let t = 1; t <= 6; t++) expect(out).toContain(`--t:var(--fb-t${t})`);
    expect(out.match(/class="fb-gap gap-(up|even|down)"/g)).toHaveLength(6);
    expect(out).toContain('fb-tier t6 here');
    expect(out).toContain('your level');
    expect(out).toContain('far above');
  });

  it('the gap reads up, even and down against the band', () => {
    expect(gapOf(40, 6).cls).toBe('gap-even');
    expect(gapOf(40, 1)).toEqual({ cls: 'gap-up', word: 'far above' });
    expect(gapOf(70, 6)).toEqual({ cls: 'gap-down', word: 'below you' });
  });
});
