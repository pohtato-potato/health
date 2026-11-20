import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BOARD } from '../../src/football/content/season';
import { BoardMinutes } from '../../src/screens/football/tree/TreeScreens';

const [a, b] = BOARD;

describe('d20 The board', () => {
  it('the minutes: each ask, how you stand on it in words, and what the board will say if met', () => {
    const out = html(<BoardMinutes season={2} goals={[{ id: a.id, o: a, line: 'Test line one, on track', ok: true }, { id: b.id, o: b, line: 'Test line two', ok: false }]} />);
    expect(out).toContain('Minutes · season 2');
    expect(out).toContain(a.text);
    expect(out).toContain('Test line one, on track');
    expect(out).toContain(`If met: ${a.met}`);
    expect(out).toContain('class="it ok"');
    expect(out).toContain('class="it"');
    expect(out).not.toContain('class="stp"');
    expect(out).toContain('Each one met brings 10 research.');
  });
  it('"On track" stamps on only when every ask is', () => {
    const out = html(<BoardMinutes season={2} goals={[{ id: a.id, o: a, line: 'x', ok: true }]} />);
    expect(out).toContain('class="stp">On track<');
  });
});
