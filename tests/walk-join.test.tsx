import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RouteRun } from '../src/domain/types';
import { CATALOGUE } from '../src/walk/catalogue';
import { signatureOf } from '../src/walk/signature';
import { JoinView } from '../src/screens/walk/JoinMoment';

const byId = (id: string) => CATALOGUE.find((r) => r.id === id)!;
const run = (id: string, extra: Partial<RouteRun> = {}): RouteRun => ({ id, spans: [{ from: '2026-03-01' }], ...extra });
const view = (id: string, runs: RouteRun[]) =>
  renderToStaticMarkup(<JoinView def={byId(id)} runs={runs} usualKm={7.4} today="2026-03-01" onStory={() => {}} onStart={() => {}} onTarget={() => {}} onPage={() => {}} />);

describe('joining a route', () => {
  it('welcomes you to a challenge, with its length, time, no deadline and the place it takes', () => {
    const html = view('dandi', [run('kos'), run('dandi')]);
    expect(html).toContain('You’ve joined The Dandi March');
    expect(html).toContain('with no deadline');
    expect(html).toContain('Challenge 2 of 2');
    expect(html).toContain(`0 of ${signatureOf(byId('dandi')).marks.length}`);
    expect(html).toContain('>Start walking<');
    expect(html).toContain('Add a target date');
    expect(html).not.toContain('With the story');
  });

  it('sets out on an expedition, which has no target date', () => {
    const html = view('xuanzang', [run('xuanzang')]);
    expect(html).toContain('Your expedition begins: Xuanzang&#x27;s road');
    expect(html).toContain('Expedition 1 of 2');
    expect(html).toContain('>Set out<');
    expect(html).not.toContain('Add a target date');
    expect(html).toContain('EXPEDITION VISA');
  });

  it('asks a book route, once, how to walk it', () => {
    const html = view('harold', [run('harold')]);
    expect(html).toContain('>With the story<');
    expect(html).toContain('>Places only<');
    expect(html).toMatch(/aria-pressed="true"[^>]*>With the story</);
    expect(renderToStaticMarkup(<JoinView def={byId('harold')} runs={[run('harold', { story: 'places' })]} usualKm={7.4} today="2026-03-01" onStory={() => {}} onStart={() => {}} onTarget={() => {}} onPage={() => {}} />)).toMatch(/aria-pressed="true"[^>]*>Places only</);
  });

  it('says so, and writes nothing, for a route you are not walking', () => {
    const html = view('dandi', []);
    expect(html).toContain('You haven’t joined this route.');
    expect(html).toContain('>See its page<');
    expect(html).not.toContain('Start walking');
  });
});
