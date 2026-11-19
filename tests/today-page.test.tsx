import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayLayout } from '../src/screens/today/TodayLayout';

const slot = (name: string) => <div data-section={name} />;

describe('TodayLayout', () => {
  it("lays sections out as Home C (board six) draws them: heading, The day, Next with training, Football; then the rest, scrolled", () => {
    const html = renderToStaticMarkup(
      <TodayLayout walk={slot('walk')} status={slot('status')} due={slot('due')} football={slot('football')} banner={slot('banner')} line={slot('line')} season={slot('season')} rings={slot('rings')} moment={slot('moment')} next={slot('next')} shape={slot('shape')} log={slot('log')} handle={slot('handle')} />,
    );
    const order = [...html.matchAll(/data-section="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['walk', 'line', 'rings', 'moment', 'next', 'football', 'status', 'due', 'banner', 'season', 'shape', 'log', 'handle']);
  });
  it('keeps going when a section has nothing to show (no banner, a glance moment)', () => {
    const html = renderToStaticMarkup(<TodayLayout walk={slot('walk')} banner={null} line={slot('line')} rings={slot('rings')} moment={null} next={slot('next')} log={slot('log')} handle={slot('handle')} />);
    expect([...html.matchAll(/data-section="(\w+)"/g)].map((m) => m[1])).toEqual(['walk', 'line', 'rings', 'next', 'log', 'handle']);
  });
});
