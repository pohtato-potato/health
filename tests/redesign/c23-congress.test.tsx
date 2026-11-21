import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MOTIONS } from '../../src/football/content/desk/motions';
import { HallHead, MotionChalk } from '../../src/screens/football/desk/Congress';

const m = MOTIONS[0];
const row = (x: object) => ({ id: m.id, brabo: 'abstain', for: 40, against: 31, abstain: 25, passing: true, lobbied: 0, leanFor: 0, leanAgainst: 0, ...x }) as never;

describe('c23 Congress on the tactics board', () => {
  it('each motion gives for, against and abstain as numbers, and Passing as a word', () => {
    const out = html(<MotionChalk h={row({})} def={m} i={0} n={3} onVote={() => {}} />);
    expect(out).toContain('class="cg23');
    expect(out).toMatch(/>40<\/b>.*for/s);
    expect(out).toMatch(/>31<\/b>.*against/s);
    expect(out).toContain('25 seats abstain');
    expect(out).toContain('Passing');
    expect(out).toContain('Motion 1 of 3');
    expect(out).toContain(m.name);
  });
  it('a motion behind on the count says Falling, and your vote is a radio', () => {
    const out = html(<MotionChalk h={row({ for: 20, against: 50, passing: false, brabo: 'against' })} def={m} i={1} n={3} onVote={() => {}} />);
    expect(out).toContain('Falling');
    expect(out).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*>Against/);
  });
  it('the hall head counts the seats that vote', () => {
    const out = html(<HallHead seats={96} season={2} line="12 days left to lobby" />);
    expect(out).toContain('96');
    expect(out).toContain('seats vote before season 2');
  });
});
