import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FbSquadRow } from '../../src/football/store/tables';
import { AcademyCard, FreePlaces } from '../../src/screens/football/world/WorldScreens';

const y: FbSquadRow = { id: 'y1', kind: 'youth', name: 'Test youngster', axis: 'Routine', potential: 4, what: 'a short walk', exercise: false, season: 1, logged: [], status: 'growing', sessions: ['2026-03-01', '2026-03-02'], growth: 6.75, lastGrow: { on: '2026-03-02', n: 4.5 }, link: { kind: 'habit', id: 'h1', name: 'a short walk' } as never };

describe('c23 Academy, growth as rings', () => {
  it('the youngster is their card; sessions and growth are rings with the numbers as text', () => {
    const out = html(<AcademyCard y={y} need={12} tonight={4.5} />);
    expect(out).toContain('class="k6');
    expect(out.match(/class="f"/g)).toHaveLength(2);
    expect(out).toContain('2 of 12 sessions');
    expect(out).toContain('6.75 of 12 growth');
    expect(out).toContain('+4.5 last night');
  });
  it('a youngster with no habit says nothing counts', () => {
    expect(html(<AcademyCard y={{ ...y, link: undefined }} need={12} tonight={0} />)).toContain('not tied to a habit: nothing counts');
  });
  it('free places say so', () => {
    const out = html(<FreePlaces n={2} />);
    expect(out.match(/class="t23-free"/g)).toHaveLength(2);
    expect(out).toContain('A free place. Tie a trialist to a habit and they start here.');
  });
});
