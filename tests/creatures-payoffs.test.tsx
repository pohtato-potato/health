import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { MomentCard } from '../src/screens/today/MomentCard';
import { grepSrc } from './helpers/grepSrc';

// R4-7: the creatures are retired for the album and cards. Stored sightings stay (see creatures-backup.test.ts).
describe('creatures retired', () => {
  it('the Dex and the art board have no route and no screen', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).not.toMatch(/'\/dex'|proto\/creatures|DexPage|CreatureBoard/);
    expect(existsSync('src/screens/Dex.tsx')).toBe(false);
    expect(existsSync('src/ui/creatures')).toBe(false);
    expect(grepSrc(/go\('\/dex'|#\/dex/)).toEqual([]);
  });
  it('no screen draws a creature or reads the roster', () => {
    expect(grepSrc(/creatureRoster|CreatureFigure|CreatureSvg/, 'src/screens')).toEqual([]);
    expect(grepSrc(/creatureRoster|CreatureFigure|CreatureSvg/, 'src/state')).toEqual([]);
  });
  it('the sick-day and steps moments carry no creature', () => {
    const data = { closedRings: 1, proteinGapG: 0, gapFoods: '', addLabel: '', stepsLeft: 800, laps: '3' };
    const actions = { logMorning() {}, closeDay() {}, addGap() {}, typeSteps() {} };
    const steps = html(<MomentCard kind="steps" data={data} actions={actions} />);
    expect(steps).toContain('About 3 laps of the loop.');
    expect(steps).not.toMatch(/wandered/);
    expect(html(<MomentCard kind="rest" data={data} actions={actions} />)).not.toContain('company');
  });
});
