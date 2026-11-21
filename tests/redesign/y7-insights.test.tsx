import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnswerCard } from '../../src/screens/insights/Ask';
import { askData } from '../../src/domain/askData';
import { defaultSettings } from '../../src/db/actions';
import type { Day } from '../../src/domain/types';

const TODAY = '2026-03-20';
const days = Array.from({ length: 10 }, (_, n) => ({ date: `2026-03-${String(n + 5).padStart(2, '0')}`, steps: 4000 + n * 300 }) as Day);
const input = { today: TODAY, settings: defaultSettings(), days, entries: [], sessions: [], sets: [] };

describe('y7-insights Insights, the answer card', () => {
  it('the answer leads with the plain sentence, after the question you asked', () => {
    const a = askData('Best step day', input)!;
    const out = html(<AnswerCard q="Best step day" reply={a} kept={false} onKeep={() => {}} />);
    const qAt = out.indexOf('Best step day');
    const aAt = out.indexOf(a.answer);
    expect(qAt).toBeGreaterThan(-1);
    expect(aAt).toBeGreaterThan(qAt);
    expect(out.indexOf('<svg')).toBeGreaterThan(aAt);
    expect(out).toContain('Highest so far: 6,700 steps');
  });

  it('the chart marks the best day in words, not colour alone, and says what it is based on', () => {
    const a = askData('Average steps', input)!;
    expect(a.points).toHaveLength(10);
    const out = html(<AnswerCard q="Average steps" reply={a} kept={false} onKeep={() => {}} />);
    expect(out).toContain('The best day');
    expect(out).toMatch(/Based on 10 logged days/);
    expect(out).toContain('Keep this question');
  });

  it('renders with no data', () => {
    const a = askData('Average steps', { ...input, days: [] })!;
    const out = html(<AnswerCard q="Average steps" reply={a} kept={false} onKeep={() => {}} />);
    expect(out).toContain('No steps logged');
    expect(out).not.toContain('<svg');
  });
});
