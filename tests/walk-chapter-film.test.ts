import { describe, expect, it } from 'vitest';
import { CHAPTERS, STRIDE_M } from '../src/domain/walk';
import { CHAPTER_SLIDE_MS, chapterFilm } from '../src/walk/chapterFilm';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const end1 = CHAPTERS[0].end;

describe('the chapter film', () => {
  it('waits until the chapter is walked', () => {
    expect(chapterFilm(1, new Map([['2026-01-01', steps(end1 - 1)]]))).toBeUndefined();
    expect(chapterFilm(9, new Map([['2026-01-01', steps(end1 + 1)]]))).toBeUndefined();
  });
  it('tells the chapter in numbers', () => {
    const road = new Map([
      ['2026-01-01', steps(1000)],
      ['2026-01-10', steps(1500)],
      ['2026-02-01', steps(end1 - 2499)],
      ['2026-02-02', steps(30)],
    ]);
    const f = chapterFilm(1, road)!;
    expect(f.name).toBe(CHAPTERS[0].name);
    expect(f.slides.map((s) => s.small)).toEqual(['Delhi to Kanyakumari', 'days on the road', 'kilometres', 'cities reached', 'states and territories', 'on your longest day']);
    expect(f.slides[1].big).toBe('32');
    expect(f.slides[2].big).toBe(end1.toLocaleString('en-IN'));
    expect(f.slides[5].big).toBe('1,500 km');
    expect(f.fromKm).toBe(0);
    expect(f.toKm).toBe(end1);
  });
  it('lasts about fifteen seconds, the drawing included', () => {
    const f = chapterFilm(1, new Map([['2026-01-01', steps(end1 + 1)]]))!;
    const ms = (f.slides.length + 1) * CHAPTER_SLIDE_MS;
    expect(ms).toBeGreaterThanOrEqual(13_000);
    expect(ms).toBeLessThanOrEqual(17_000);
  });
});
