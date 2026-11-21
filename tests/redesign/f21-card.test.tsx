import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CardVersion } from '../../src/football/players/types';
import { CardHistory, PlayerHead } from '../../src/screens/football/players/Screens';

const vs: CardVersion[] = [
  { tier: 'bronze', step: 2, on: '2026-01-05', overall: 50 },
  { tier: 'silver', step: 1, on: '2026-01-20', overall: 61 },
  { tier: 'gold', step: 3, on: '2026-02-11', overall: 77 },
];
const p = { id: 'p1', name: 'Test lift', art: 'pushh', unit: 'Power', overall: 77, card: { tier: 'gold', step: 3 }, versions: vs, apps: 3, best: 78, goals: 6, saves: 1, kind: 'exercise' } as never;

describe('f21 A player, crowns side by side', () => {
  it('the history row: one small card per version, newest marked, its crowns in a row', () => {
    const out = html(<CardHistory p={p} />);
    expect(out).toContain('Card history');
    expect(out).toContain('3 cards since 5 Jan');
    expect(out.match(/class="hs19-v/g)).toHaveLength(3);
    expect(out).toContain('class="hs19-v now"');
    // each card's step crowns: 2, 1 and 3 chevrons in its own row
    expect(out.match(/<span class="sub8" aria-hidden="true">(<i><\/i>)+<\/span>/g)?.map((m) => m.split('<i>').length - 1)).toEqual([2, 1, 3]);
    for (const t of ['Bronze II', 'Silver I', 'Gold III', '>50<', '>61<', '>77<', '11 Feb']) expect(out).toContain(t);
  });
  it('the head: the overall big, the step and unit, and since when', () => {
    const out = html(<PlayerHead p={p} />);
    expect(out).toContain('class="pr19"');
    expect(out).toContain('>77</b>');
    expect(out).toContain('Gold III · Power');
    expect(out).toContain('Gold III since 11 Feb');
  });
});
