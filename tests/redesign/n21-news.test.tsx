import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NewsFeed } from '../../src/screens/football/league/News';

const news = [
  { id: 'a', date: '2026-03-04', kind: 'back', text: 'Test headline one' },
  { id: 'b', date: '2026-03-04', kind: 'press', text: 'A test question?', answered: 1 },
  { id: 'c', date: '2026-03-03', kind: 'studio', text: 'First pundit line.\nSecond pundit line.' },
  { id: 'd', date: '2026-03-03', kind: 'club', text: 'Test hut is built.' },
  { id: 'e', date: '2026-03-02', kind: 'world', text: 'Elsewhere, a test result.' },
] as never;

describe('n21 The news', () => {
  it('a filter for each kind with its count, All first and on', () => {
    const out = html(<NewsFeed news={news} today="2026-03-04" />);
    expect(out).toMatch(/aria-pressed="true"[^>]*>All<b[^>]*>5</);
    for (const k of ['Back pages', 'Press', 'The studio', 'Club', 'The world']) expect(out).toContain(`>${k}<`);
  });
  it('the feed by day, newest first, each kind in its own form', () => {
    const out = html(<NewsFeed news={news} today="2026-03-04" />);
    const days = [...out.matchAll(/class="nd21"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(days).toHaveLength(3);
    expect(out.indexOf('Test headline one')).toBeLessThan(out.indexOf('Elsewhere'));
    expect(out).toContain('class="bp"');
    expect(out).toMatch(/class="pr"[\s\S]*Answered/);
    expect(out.match(/<p class="sd-l"/g)).toHaveLength(2);
  });
  it('a filter shows only its kind', () => {
    const out = html(<NewsFeed news={news} today="2026-03-04" start="club" />);
    expect(out).toContain('Test hut is built.');
    expect(out).not.toContain('Test headline one');
  });
});
