import 'fake-indexeddb/auto';
import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SettingsView } from '../../src/screens/football/story/Settings';

const s = { buzz: true, season: 1, phase: 'season' } as never;

describe('m23 Football settings', () => {
  it('each on/off setting is a coloured row with a real, labelled switch', () => {
    const out = html(<SettingsView s={s} />);
    const sw = out.match(/<input[^>]*role="switch"[^>]*>/g) ?? [];
    expect(sw).toHaveLength(3);
    for (const name of ['Buzz on goals', 'Stadium sound', 'Low-log week']) expect(sw.some((x) => x.includes(`aria-label="${name}"`))).toBe(true);
    expect(sw.find((x) => x.includes('Buzz on goals'))).toMatch(/checked/);
    expect(out.match(/[ "]set23[ "]/g)!.length).toBeGreaterThanOrEqual(7);
    expect(out).toMatch(/style="--c:#[0-9a-f]{6}"/);
  });
  it('then which log feeds which axis, each in its axis ink, marked fixed', () => {
    const out = html(<SettingsView s={s} />);
    expect(out).toContain('What feeds each axis');
    expect(out).toMatch(/class="hd23"><b>What feeds each axis<\/b><span>Fixed<\/span>/);
    expect(out.match(/class="ax23"/g)).toHaveLength(6);
    expect(out).toMatch(/--c:#ff9a76[^>]*><i>P<\/i><span><b>Power<\/b><small>Training sessions<\/small>/);
  });
});
