import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BOUNTIES } from '../../src/football/content/season';
import { BountyPosters } from '../../src/screens/football/tree/SeasonScreens';

const [a, b, c] = BOUNTIES;

describe('s20 Bounties', () => {
  it('this week’s bounties as wanted posters, each with its reward stamped on; picked ones show progress, done ones say so', () => {
    const out = html(<BountyPosters offer={[a, b, c]} picked={[a.id, b.id]} done={[b.id]} have={() => 3} full={false} onPick={() => {}} />);
    expect(out).toMatch(/<b class="wp20-n">2<\/b>[\s\S]*?of 3 picked this week/);
    expect(out.match(/class="wp20-p/g)).toHaveLength(3);
    expect(out).toContain(`<em>Reward: 5 research</em>`);
    expect(out).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Picked · 3 of 5/);
    expect(out).toMatch(/class="wp20-p on dn"[\s\S]*?Done/);
    expect(out).toMatch(/aria-pressed="false"[^>]*>[\s\S]*?Wanted this week/);
  });
});
