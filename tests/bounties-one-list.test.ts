import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOUNTIES } from '../src/football/content/season';
import { bountyOffer, isTrainingBounty } from '../src/football/tree/season';
import { addDays } from '../src/domain/dates';

// Step 1 brief: one bounty list, in Football, that includes training bounties.
describe('one bounty list, with training in it', () => {
  const weeks = Array.from({ length: 120 }, (_, i) => addDays('2026-01-05', i * 7));
  it('the pool has training jobs', () => {
    expect(BOUNTIES.filter(isTrainingBounty).length).toBeGreaterThanOrEqual(3);
  });
  it('every week offers six, at least one of them training, and stays seeded', () => {
    for (const w of weeks) {
      const o = bountyOffer(w);
      expect(o).toHaveLength(6);
      expect(new Set(o.map((b) => b.id)).size).toBe(6);
      expect(o.some(isTrainingBounty)).toBe(true);
      expect(bountyOffer(w)).toEqual(o);
    }
  });
  it('weeks that already had a training job keep the same offer', () => {
    // The guarantee only swaps the last slot, and only when no training job was drawn.
    const unchanged = weeks.filter((w) => bountyOffer(w).filter(isTrainingBounty).length > 1);
    expect(unchanged.length).toBeGreaterThan(0);
  });
  it('Train has no list of its own: it opens the Football list', () => {
    const train = readFileSync(new URL('../src/screens/Train.tsx', import.meta.url), 'utf8');
    expect(train).toMatch(/go\('\/football\/bounties'\)/);
    expect(train).not.toMatch(/BOUNTIES\b/);
  });
  it('a bounty picked before is still paid by id, whatever the offer is now', () => {
    const tree = readFileSync(new URL('../src/football/store/tree.ts', import.meta.url), 'utf8');
    expect(tree).toMatch(/BOUNTIES\.find\(\(x\) => x\.id === id\)/);
  });
});
