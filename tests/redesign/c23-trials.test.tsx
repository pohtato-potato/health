import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FbSquadRow } from '../../src/football/store/tables';
import { TrialCard } from '../../src/screens/football/world/WorldScreens';

const y = (status: FbSquadRow['status'], extra: Partial<FbSquadRow> = {}): FbSquadRow => ({ id: `y-${status}`, kind: 'youth', name: `Test ${status}`, axis: 'Routine', potential: 4, what: 'a short walk', exercise: false, season: 1, logged: [], status, ...extra });

describe('c23 Trials, players as cards', () => {
  it('a trialist is their card, with stars, the line and when they wait until', () => {
    const out = html(<TrialCard y={y('trial', { trialUntil: '2026-03-08' })} lead />);
    expect(out).toContain('class="k6');
    expect(out).toContain('aria-label="4 stars"');
    expect(out).toContain('Routine · a short walk');
    expect(out).toContain('Waits until 8 Mar');
    expect(out).toContain('Tie to a habit');
    expect(out).not.toContain('sub8');
  });
  it('the outcome says what happened, in words', () => {
    expect(html(<TrialCard y={y('growing')} />)).toContain('Tied to a habit · at the academy');
    const gone = html(<TrialCard y={y('left', { leftOn: '2026-03-09' })} />);
    expect(gone).toContain('Went home 9 Mar');
    expect(gone).toContain('class="t23pl gone"');
    expect(html(<TrialCard y={y('promoted')} />)).toContain('Joined the squad');
  });
});
