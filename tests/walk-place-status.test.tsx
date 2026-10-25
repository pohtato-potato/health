import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Day, Place, Settings } from '../src/domain/types';
import { PlaceStatusRow } from '../src/screens/walk/PlaceStatusRow';

const place = (id: string, name: string): Place => ({ id, name, kind: id === 'a' ? 'home' : 'other', meals: {}, eased: false, foodsFirst: 'normal' }) as unknown as Place;
const withPlaces = (names: string[]) => ({ places: names.map((n, i) => place(String.fromCharCode(97 + i), n)) }) as unknown as Settings;
const dayAt = (id: string) => ({ date: '2026-10-21', place: id }) as Day;

describe('the place and status row on the Walk tab', () => {
  it('shows every place as a chip, the current one pressed', () => {
    const html = renderToStaticMarkup(<PlaceStatusRow settings={withPlaces(['Place A', 'Place B'])} today="2026-10-21" day={dayAt('b')} onPlace={() => {}} startOpen />);
    expect(html).toContain('Place A');
    expect(html).toContain('Place B');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Place B/);
  });

  it('shows the status row with no places set', () => {
    const html = renderToStaticMarkup(<PlaceStatusRow settings={withPlaces([])} today="2026-10-21" day={null} onPlace={() => {}} startOpen />);
    expect(html).not.toContain('Where now');
    expect(html).toContain('Status');
  });

  it('folds into one small summary button until opened', () => {
    const html = renderToStaticMarkup(<PlaceStatusRow settings={withPlaces(['Place A', 'Place B'])} today="2026-10-21" day={{ ...dayAt('b'), status: 'sick' }} onPlace={() => {}} />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Place B · Sick');
    expect(html).not.toContain('Where now');
  });

  it('says no status in words when there is none', () => {
    expect(renderToStaticMarkup(<PlaceStatusRow settings={withPlaces(['Place A'])} today="2026-10-21" day={dayAt('a')} onPlace={() => {}} />)).toContain('Place A · No status');
  });

  it('WalkFull is gone', () => {
    expect(existsSync('src/screens/today/WalkFull.tsx')).toBe(false);
  });
});
