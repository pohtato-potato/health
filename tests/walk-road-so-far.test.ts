import { describe, expect, it } from 'vitest';
import { CHAPTERS, STRIDE_M } from '../src/domain/walk';
import { roadSoFar } from '../src/walk/roadSoFar';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);

describe('the road so far', () => {
  const road = new Map([
    ['2026-01-01', steps(100)], // Delhi, Haryana, Uttar Pradesh
    ['2026-01-02', steps(255)], // 355: Agra, Rajasthan, Madhya Pradesh, Gwalior
  ]);
  it('lists every arrival in date order, then route order within a day', () => {
    const r = roadSoFar(road);
    expect(r.map((e) => `${e.date} ${e.kind} ${e.name}`)).toEqual([
      '2026-01-01 start Delhi',
      '2026-01-01 state Haryana',
      '2026-01-01 state Uttar Pradesh',
      '2026-01-02 city Agra',
      '2026-01-02 state Rajasthan',
      '2026-01-02 state Madhya Pradesh',
      '2026-01-02 city Gwalior',
    ]);
  });
  it('marks a chapter’s end once, after its last city', () => {
    const r = roadSoFar(new Map([['2026-01-01', steps(CHAPTERS[0].end + 5)]]));
    const ends = r.filter((e) => e.kind === 'chapter');
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ name: CHAPTERS[0].name, chapter: 1 });
    const i = r.indexOf(ends[0]);
    expect(r[i - 1]).toMatchObject({ kind: 'city', name: 'Kanyakumari' });
  });
  it('is empty before the first step', () => expect(roadSoFar(new Map())).toEqual([]));
});
