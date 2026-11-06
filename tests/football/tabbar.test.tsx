import './helpers/windowStub';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlusButton, TabBar } from '../../src/ui/TabBar';
import { FootballHome } from '../../src/screens/football/FootballHome';

describe('tab bar A', () => {
  it('has five links in the order Today, Train, Football, Walk, You', () => {
    const out = html(<TabBar active="today" />);
    const tabs = [...out.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(['today', 'train', 'football', 'walk', 'you']);
    expect(out).toContain('>Football</a>');
  });

  it('the plus is not inside the bar', () => {
    expect(html(<TabBar active="walk" />)).not.toContain('Log something');
  });

  it('on Today the plus sits in the handle row; elsewhere it is the fixed corner button', () => {
    const today = readFileSync('src/screens/Today.tsx', 'utf8');
    expect(today).toMatch(/<div className="td-dock">[\s\S]*<DrawerHandle[\s\S]*<PlusButton docked \/>[\s\S]*<\/div>/);
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain("page.tab !== 'today' && <PlusButton />");
    expect(html(<PlusButton docked />)).toContain('class="fab-plus docked"');
    expect(html(<PlusButton />)).toContain('class="fab-plus"');
  });

  it('every Football route lives under the football tab', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    for (const r of ['/football', '/football/club', '/football/league', '/football/story', '/football/match', '/football/player', '/football/club-page', '/football/cups', '/football/settings'])
      expect(app).toContain(`'${r}': { el: () => <Football />, tab: 'football' }`);
  });

  it('the Football home renders 4 segment buttons', () => {
    const out = html(<FootballHome section="league" />);
    expect([...out.matchAll(/<a [^>]*href="#\/football[^"]*"/g)]).toHaveLength(4);
    expect(out).toMatch(/class="on"[^>]*>League</);
  });
});
