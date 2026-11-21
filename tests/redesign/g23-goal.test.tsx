import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoalScene, goalKind } from '../../src/screens/football/match/Takeover';

const base = { minute: 72, fixture: 'Brabo v Harbour Town', pct: 68, score: { home: 'Brabo', away: 'Harbour Town', n: [2, 1] as [number, number] }, facts: ['Tap-in', 'Power unit', 'In front'], onOn: () => {} };

describe('Goal scenes (g23-tap, g23-scr, g23-run, t17-bloom)', () => {
  it('the chance kind picks the scene; a third goal by one player is the hat-trick', () => {
    expect(goalKind({ type: 'Tap-in' }, 1)).toBe('tap');
    expect(goalKind({ type: 'Set piece' }, 2)).toBe('tap');
    expect(goalKind({ type: 'Long shot' }, 1)).toBe('scr');
    expect(goalKind({ type: 'Counter-attack' }, 2)).toBe('run');
    expect(goalKind({ type: 'Counter-attack' }, 3)).toBe('hat');
  });

  it('the tap-in shows the scorer card, the chance and the score, with no radar', () => {
    const out = renderToStaticMarkup(<GoalScene {...base} kind="tap" scorer="Test Striker" line="Test Striker is first to it. 72′."><i className="card-x" /></GoalScene>);
    expect(out).toContain('class="gs-card"');
    expect(out).toContain('card-x');
    expect(out).toContain('<b>68%</b><span>to score. Test Striker did.</span>');
    expect(out).toContain('aria-label="Brabo 2, Harbour Town 1"');
    expect(out).toContain('Test Striker is first to it. 72′.');
    expect(out).toContain('Test Striker leans in and pokes the ball into the net');
    expect(out).not.toMatch(/radar|ms-stadium|md-stadium/);
  });

  it('the screamer and the breakaway draw their own scene; the ghost cards are hidden from screen readers', () => {
    const scr = renderToStaticMarkup(<GoalScene {...base} kind="scr" pct={14} />);
    expect(scr).toContain('Screamer');
    expect(scr).toContain('gs-shard');
    expect(scr).toContain('arcs into the top corner');
    const run = renderToStaticMarkup(<GoalScene {...base} kind="run" pct={23} />);
    expect(run).toContain('Gone');
    expect(run.match(/class="gs-ghost" aria-hidden="true"/g)).toHaveLength(2);
  });

  it('the hat-trick orbits the three minutes and has no odds', () => {
    const out = renderToStaticMarkup(<GoalScene {...base} kind="hat" scorer="Test Striker" minutes={[17, 72, 87]} />);
    expect(out).toContain('Hat-trick');
    expect(out).toContain('three goals: 17′, 72′, 87′');
    expect(out).not.toContain('ws-odds');
  });

  it('renders with no scorer, line or facts', () => {
    const out = renderToStaticMarkup(<GoalScene {...base} kind="tap" facts={[]} />);
    expect(out).toContain('<span>to score.</span>');
    expect(out).toContain('Your player leans in');
    expect(out).not.toContain('ws-facts');
    expect(out).toContain('Carry on');
  });
});
