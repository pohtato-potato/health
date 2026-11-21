import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { CLUBS } from '../../src/football/data/load';
import { twistOf } from '../../src/football/rivals';
import { Orb } from '../../src/screens/football/moments/Orb';
import { RivalBorn } from '../../src/screens/football/moments/RivalBorn';

const css = readFileSync('src/styles/football.css', 'utf8');
const rule = (sel: string) => css.match(new RegExp(`\\n${sel.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';

describe('The shared orb (m23-*, Task 2.15)', () => {
  it('the centre piece is the grid’s only child in flow, centred with place-items and no offset', () => {
    expect(rule('.orb')).toMatch(/display: grid; place-items: center/);
    const core = rule('.orb-core');
    expect(core).not.toMatch(/transform|translate|left|top|margin/);
    expect(rule('.orb-ring')).toMatch(/position: absolute; inset: 0/);
    expect(rule('.orb-rays')).toMatch(/position: absolute; inset: 0/);
    const out = renderToStaticMarkup(<Orb colour="#e30613"><b>X</b></Orb>);
    expect(out).toMatch(/<span class="orb-rays" aria-hidden="true">(<i [^>]*><\/i>){12}<\/span><span class="orb-ring" aria-hidden="true"><\/span><span class="orb-core"><b>X<\/b><\/span>/);
  });
});

describe('A rival is born (m23-rival)', () => {
  const club = CLUBS.find((c) => c.kind !== 'own')!;
  const r = { clubId: club.id, how: 'legend' as const, since: '2026-11-15' };
  it('names the club and the date, and gives the modifier as text', () => {
    const out = renderToStaticMarkup(<RivalBorn r={r} onDone={() => {}} />);
    expect(out).toContain(`${club.name}, 15 Nov.`);
    expect(out).toContain('A rival<br/><span>is born</span>');
    const tw = twistOf(r);
    const esc = (t: string) => renderToStaticMarkup(<>{t}</>);
    expect(out).toContain(esc(`The rivalry’s modifier: ${tw.name}`));
    expect(out).toContain(esc(tw.text));
    expect(out).toContain('>Noted</button>');
  });
  it('renders with no date', () => {
    expect(renderToStaticMarkup(<RivalBorn r={{ ...r, since: '' }} onDone={() => {}} />)).toContain(`${club.name}. `);
  });
});
