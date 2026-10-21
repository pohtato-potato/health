import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NextStrip, RecordsStrip } from '../src/screens/today/NextStrip';

describe('NextStrip', () => {
  it('shows the session, its usual length, the ready word and the week', () => {
    const html = renderToStaticMarkup(<NextStrip title="Session C tonight" sub="Usually 92 min · 2 ready to go heavier" ready="Ready, though sleep held it back a little" week={{ done: 2, of: 4 }} onOpen={() => {}} />);
    for (const t of ['Session C tonight', 'Usually 92 min · 2 ready to go heavier', 'Ready, though sleep held it back a little', '2 of 4']) expect(html).toContain(t);
    expect(html).toContain('aria-label="2 of 4 sessions this week"');
    expect(html).toContain('data-section="next"');
  });
  it('says unfinished sets in words instead of a length', () => {
    const html = renderToStaticMarkup(<NextStrip title="Session D" sub="4 sets look unfinished · check on Train" week={{ done: 3, of: 4 }} onOpen={() => {}} />);
    expect(html).toContain('4 sets look unfinished · check on Train');
  });
  it('with no plan says "No plan yet" and offers to add one', () => {
    const html = renderToStaticMarkup(<NextStrip title="No plan yet" sub="Add one in Settings and Train runs it." action={{ label: 'Add a plan', run: () => {} }} onOpen={() => {}} />);
    expect(html).toContain('No plan yet');
    expect(html).toContain('>Add a plan<');
    expect(html).not.toContain('sessions this week');
  });
  it('never puts "ready to go heavier" in gold', () => {
    const html = renderToStaticMarkup(<NextStrip title="Session C tonight" sub="2 ready to go heavier" week={{ done: 2, of: 4 }} onOpen={() => {}} />);
    expect(html).not.toContain('gold');
  });
});

describe('RecordsStrip', () => {
  it('shows "2 records tonight" in gold with each record and a Finale button', () => {
    const html = renderToStaticMarkup(<RecordsStrip records={['Test row 10 kg × 19', 'Test raise 5 kg × 17']} onFinale={() => {}} />);
    expect(html).toContain('2 records tonight');
    expect(html).toContain('goldtxt');
    expect(html).toContain('Test row 10 kg × 19');
    expect(html).toContain('Test raise 5 kg × 17');
    expect(html).toContain('>Finale<');
  });
  it('says "1 record tonight" for one', () => {
    expect(renderToStaticMarkup(<RecordsStrip records={['Test row 10 kg × 19']} onFinale={() => {}} />)).toContain('1 record tonight');
  });
});

import { readyWord } from '../src/domain/readiness';
describe('readyWord', () => {
  it('names the band and what held it back most', () => {
    expect(readyWord({ score: 70, known: true, parts: [{ key: 'sleep', label: 'Sleep', delta: -8 } as never, { key: 'soreness', label: 'Soreness', delta: 2 } as never] })).toBe('Steady · sleep held it back');
  });
  it('is just the band when nothing held it back', () => {
    expect(readyWord({ score: 85, known: true, parts: [] })).toBe('Good to push');
  });
  it('is undefined without enough data, never a made-up word', () => {
    expect(readyWord({ score: 0, known: false, parts: [] })).toBeUndefined();
  });
});
