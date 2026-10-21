import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveFinale } from '../src/screens/live/LiveFinale';
import { pagesFor, type FinaleData } from '../src/domain/finale';

const noop = () => {};
const MIN = 60_000;
const empty: FinaleData = {
  name: 'Session C',
  pages: [],
  recordSongs: {},
  songs: [],
  hour: { total: 88 * MIN, lift: 33 * MIN, rest: 35 * MIN, between: 20 * MIN, longestRest: 6 * MIN },
  form: { rows: [] },
  rings: { exercises: [8, 8], inRange: [24, 26] },
  quality: 89,
};
const full: FinaleData = {
  ...empty,
  pages: [{ name: 'Romanian deadlift', big: '19', bigLabel: 'REPS', detail: '10 kg × 19', previous: 'Previous best: 10 kg × 18, on 18 Oct' }],
  recordSongs: { 'Romanian deadlift': 'Midnight City · M83' },
  songs: [{ name: 'Midnight City · M83', record: true }, { name: 'Intro · The xx', record: false }],
  topArtist: 'M83',
  usualMin: 92,
  form: { share: 0.75, rows: [{ text: 'Head in line', ok: 1, of: 3 }, { text: 'Back stayed flat', ok: 4, of: 4 }], slip: { text: 'Head in line', times: 2 }, sides: 'Left and right were within one rep on every per-side set.' },
  rings: { exercises: [8, 8], inRange: [24, 26], checks: 0.75 },
  best: { name: 'Romanian deadlift', big: '19', bigLabel: 'REPS', detail: '10 kg × 19' },
};
const at = (step: number, data = full, p: Partial<Parameters<typeof LiveFinale>[0]> = {}) =>
  renderToStaticMarkup(
    <LiveFinale step={step} onStep={noop} data={data} flags={[{ id: 'knee', label: 'Knee' }, { id: 'back', label: 'Lower back' }]} picked={[]} onPick={noop} note="" onNote={noop} onSave={noop} saving={false} onBack={noop} onDiscard={noop} onDone={noop} saver={false} rings={['#111111', '#222222', '#333333']} {...p} />,
  );

describe('which finale pages show', () => {
  it('only the ones with something to say', () => expect(pagesFor(empty)).toEqual(['flags', 'time', 'recap']));
  it('all seven with everything', () => expect(pagesFor(full)).toEqual(['flags', 'records', 'music', 'time', 'form', 'recap', 'best']));
});

describe('the finale pages', () => {
  it('flags first', () => {
    const h = at(0);
    expect(h).toContain('Anything to flag?');
    expect(h).toContain('Lower back');
    expect(h).toContain('Save · Nothing to flag');
    expect(h).toContain('Back to the session');
  });
  it('records, in gold, with their song', () => {
    const h = at(1);
    expect(h).toMatch(/class="lv [^"]*fs-records/);
    expect(h).toContain('Midnight City · M83');
    expect(h).toContain('Previous best: 10 kg × 18, on 18 Oct');
  });
  it('the soundtrack', () => {
    const h = at(2);
    expect(h).toContain('2 tracks');
    expect(h).toContain('Most played: M83');
  });
  it('where the time went, in words', () => {
    const h = at(3);
    expect(h).toContain('88 min');
    expect(h).toContain('Between rest and lifting');
    expect(h).toContain('20 min');
    expect(h).toContain('4 min quicker than your usual');
  });
  it('form', () => {
    const h = at(4);
    expect(h).toContain('75% went well');
    expect(h).toContain('slipped 2 of 3');
    expect(h).toContain('every set');
  });
  it('the recap rings, with a legend in words', () => {
    const h = at(5);
    expect(h).toContain('8 of 8 exercises');
    expect(h).toContain('24 of 26 sets in range');
    expect(h).toContain('75% of form checks went well');
    expect(h).toContain('And the best part');
  });
  it('tonight’s best last, in gold', () => {
    const h = at(6);
    expect(h).toMatch(/class="lv [^"]*st-record/);
    expect(h).toContain('>19<');
    expect(h).toContain('Done');
  });
  it('is still in battery saver', () => {
    const h = at(6, full, { saver: true });
    expect(h).not.toContain('blob');
    expect(h).not.toContain('lv-dust');
  });
  it('steps through only the pages that show', () => {
    expect(at(1, empty)).toContain('88 min');
  });
});
