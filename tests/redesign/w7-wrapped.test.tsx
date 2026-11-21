import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PeriodStats } from '../../src/domain/period';
import { StoryFrame } from '../../src/screens/you/StorySlide';
import { wrappedSlides } from '../../src/screens/you/wrappedSlides';

const s = { from: '2026-01-01', to: '2026-03-01', logged: 50, km: 400, steps: 520000, topFoods: [{ name: 'Test dal', n: 9 }, { name: 'Test rice', n: 4 }], sleepAvg: 430, bestNight: { date: '2026-02-02', minutes: 540 }, sessions: 20, kgMoved: 12000, sets: 300, records: ['Test press'], perfect: 6, busiestWeekday: 1, unlocked: [], trendStart: undefined, trendEnd: undefined, waistStart: undefined, waistEnd: undefined } as unknown as PeriodStats;

describe('w7-wrapped Wrapped', () => {
  const slides = wrappedSlides(s, { title: 'The journey so far', place: 'Test town', laps: undefined, names: [], caught: { yes: 0, answered: 0 }, kept: { n: 0, yes: 0 } });
  it('one slide per thing with data, the road first after the days', () => {
    expect(slides[0].big).toBe('50 days');
    expect(slides[1]).toMatchObject({ title: 'The road so far', big: '400', road: true });
    expect(slides[1].say).toContain('Test town');
    expect(slides[1].chips).toContain('5,20,000 steps');
  });
  it('slides without data are left out', () => {
    expect(slides.some((x) => x.title === 'Caught the window')).toBe(false);
    expect(slides.some((x) => x.title === 'The trend')).toBe(false);
  });
  it('a slide shows progress bars on top, the big number and the road drawing behind', () => {
    const out = html(<StoryFrame g="#123" title={slides[1].title} at={1} of={slides.length} big={slides[1].big} say={slides[1].say} road onNext={() => {}} onBack={() => {}} onClose={() => {}} />);
    expect(out.match(/<i class="on"><\/i>/g)).toHaveLength(2);
    expect(out).toContain('yu-st-road');
    expect(out).toContain('2 of');
    expect(out).toContain('Back');
  });
});
