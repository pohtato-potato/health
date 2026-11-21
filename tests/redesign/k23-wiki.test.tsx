import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WikiPage } from '../../src/screens/football/league/Wiki';

const base = { name: 'Testville Rovers', nick: 'The Testers', crest: '<svg></svg>', facts: [['Founded', '1899'], ['Ground', 'Test Park'], ['Style', 'Grit']] as [string, string][], history: 'Founded by test-makers.', league: ['Season 1: Division Three, finished 4th'] };

describe('k23 Wiki', () => {
  it('a masthead, the info box as a description list, and short sections', () => {
    const out = html(<WikiPage {...base} />);
    expect(out).toContain('class="wk23"');
    expect(out).toMatch(/<dl class="ibox"><dt>Founded<\/dt><dd>1899<\/dd>/);
    expect(out).toContain('Their history');
    expect(out).toContain('In your league');
    expect(out).toContain('Season 1: Division Three, finished 4th');
  });
  it('the rival flag shows only for your rival', () => {
    expect(html(<WikiPage {...base} />)).not.toContain('class="rival"');
    expect(html(<WikiPage {...base} rival="Your rival since 15 Nov: a legend rivalry." />)).toMatch(/class="rival"[\s\S]*Your rival since 15 Nov/);
  });
});
