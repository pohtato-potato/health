import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Nameplate, RewardRows, Wardrobe, type RewardRow } from '../../src/screens/earned/CharacterParts';

const rewards = (open: boolean): RewardRow[] => [
  { id: 'goldRings', name: 'Gold rings', c: '#ffc94d', open, on: true, line: open ? 'Closed rings on Today turn gold' : 'Unlock: Test badge', onToggle: () => {} },
  { id: 'goldRoute', name: 'Gold route', c: '#ff9a5c', open, on: false, line: 'Your walked route is drawn in gold', onToggle: () => {} },
];

describe('y9-char Character', () => {
  it('the worn title as text on the nameplate, with the level and the count', () => {
    const out = html(<Nameplate worn="Test title" level={7} earned={12} />);
    expect(out).toContain('Wearing');
    expect(out).toContain('Test title');
    expect(out).toContain('Level 7 · 12 earned');
  });

  it('the wardrobe: earned titles are buttons, the worn one pressed, locked ones say how to earn them', () => {
    const out = html(<Wardrobe worn="a" onWear={() => {}} rows={[
      { id: 'a', name: 'Test one', how: 'Do a thing', has: true },
      { id: 'b', name: 'Test two', how: 'Do another', has: true },
      { id: 'c', name: 'Test three', how: 'Walk far', has: false },
    ]} />);
    expect(out).toMatch(/<button[^>]*aria-pressed="true"[^>]*>.*Test one/);
    expect(out).toMatch(/<button[^>]*aria-pressed="false"[^>]*>.*Test two/);
    expect(out).toMatch(/class="ch-t locked[^"]*"[^>]*>.*Test three.*Walk far/);
  });

  it('each reward works once unlocked: an open one is a live switch, a locked one is disabled and says how to unlock it', () => {
    const open = html(<RewardRows rows={rewards(true)} />);
    expect(open).toMatch(/role="switch"[^>]*aria-checked="true"/);
    expect(open).not.toContain('disabled');
    expect(open).toContain('Gold route');
    const shut = html(<RewardRows rows={rewards(false)} />);
    expect(shut.match(/disabled=""/g)).toHaveLength(2);
    expect(shut).toContain('Unlock: Test badge');
    expect(shut).toMatch(/aria-checked="false"/);
  });

  it('renders with no data', () => {
    expect(html(<Nameplate level={1} earned={0} />)).toContain('Nothing yet');
    expect(html(<Wardrobe rows={[]} onWear={() => {}} />)).toContain('No titles yet');
  });
});
