import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BondPlates } from '../../src/screens/football/desk/Congress';

const row = (id: string, rank: number, askOpen = false) => ({ id, name: `Test ${id}`, role: 'Kit room', points: 0, rank, toNext: 3, tone: 'warm' as const, askOpen });

describe('b21 Staff, the bonds', () => {
  it('one plate per bond: its rank in diamonds and as a number, the ask said in words', () => {
    const out = html(<BondPlates members={[row('a', 2), row('b', 5, true), row('c', 0)] as never} />);
    expect(out.match(/class="bo21-p/g)).toHaveLength(3);
    expect(out).toContain('aria-label="Rank 5 of 10"');
    expect(out).toContain('>5</b><small>of 10</small>');
    expect(out).toContain('class="bo21-p ask"');
    expect(out).toContain('Has asked you something');
    expect(out).toContain('3 to rank 3');
    expect(out).not.toMatch(/slash/);
  });
});
