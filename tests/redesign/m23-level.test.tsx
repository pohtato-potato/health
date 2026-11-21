import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LevelUp } from '../../src/screens/football/moments/LevelUp';

const from = { step: 3 as const, opt: 'b' as const };

describe('Club level up (m23-level)', () => {
  it('the crest sits in the orb; Keep and the new step are buttons', () => {
    const out = renderToStaticMarkup(<LevelUp from={from} step={4} onPick={() => {}} />);
    expect(out).toContain('class="orb"');
    expect(out).toContain('Club level up<br/><span>Step 4 of 5</span>');
    expect(out).toMatch(/<button type="button" role="radio" aria-checked="false">.*Keep<\/button>/);
    expect(out).toMatch(/<button type="button" role="radio" aria-checked="true" class="on">.*The new step<\/button>/);
    expect(out.match(/aria-label="Option [A-E]"/g)).toHaveLength(5);
    expect(out).toContain('>Wear it</button>');
  });
  it('keeping hides the options and says so on the button', () => {
    const out = renderToStaticMarkup(<LevelUp from={from} step={4} onPick={() => {}} start="keep" />);
    expect(out).not.toContain('Options for the new step');
    expect(out).toContain('Old crests come back on the anniversary kit.');
    expect(out).toContain('>Keep it</button>');
  });
});
