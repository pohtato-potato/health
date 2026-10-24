import { describe, expect, it } from 'vitest';
import type { RouteDef } from '../src/walk/catalogue';
import { marksReached, signatureOf } from '../src/walk/signature';

const base = { id: 't', name: 'Test road', km: 387, record: 'dated', group: 'india', places: [], pages: [], sources: [] } as unknown as RouteDef;

describe('signatures', () => {
  it('uses a route’s own signature when it has one', () => {
    const marks = Array.from({ length: 24 }, (_, i) => ({ km: 16 * (i + 1) }));
    const s = signatureOf({ ...base, signature: { title: 'Grains of salt', note: 'n', mark: 'crystal', marks } });
    expect(s.title).toBe('Grains of salt');
    expect(s.marks).toHaveLength(24);
  });

  it('defaults a dated route to its halts, about one per 50 km, at least six', () => {
    const s = signatureOf(base);
    expect(s.title).toBe('The halts');
    expect(s.mark).toBe('stage');
    expect(s.marks).toHaveLength(8); // max(6, round(387 / 50))
    expect(s.marks[7].km).toBeCloseTo(387, 5);
    expect(signatureOf({ ...base, km: 120 }).marks).toHaveLength(6);
  });

  it('defaults place-by-place routes to halts too', () => {
    expect(signatureOf({ ...base, record: 'place' }).title).toBe('The halts');
  });

  it('defaults book routes to chapters and others to milestones', () => {
    expect(signatureOf({ ...base, group: 'books', book: {} as never }).title).toBe('Chapters on the road');
    expect(signatureOf({ ...base, group: 'books', book: {} as never }).mark).toBe('chapter');
    expect(signatureOf({ ...base, record: 'none' }).title).toBe('Milestones');
    expect(signatureOf({ ...base, record: 'estimated' }).mark).toBe('stone');
  });

  it('counts the marks at or before your km', () => {
    const s = signatureOf(base); // marks every 48.375 km
    expect(marksReached(s, 0)).toBe(0);
    expect(marksReached(s, 48.375)).toBe(1);
    expect(marksReached(s, 48.3)).toBe(0);
    expect(marksReached(s, 1000)).toBe(8);
  });
});
