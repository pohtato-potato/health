import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TonightCard, UpNextCard } from '../src/screens/train/Cards';
import { BodyCard, FourWeeksCard, MonthCard, PlanCard, RecordsCard, RecentCard } from '../src/screens/train/Sections';

const noop = () => {};
const blocks = [
  { kg: 10, items: [{ name: 'Romanian deadlift', light: false }] },
  { kg: 5, items: [{ name: 'Lean-away lateral raise', light: false }] },
];

describe('up next', () => {
  const h = renderToStaticMarkup(<UpNextCard name="Session C" usual={{ min: 92, fromHistory: true }} changes={1} heavier={2} focus="Head in line" blocks={blocks} swaps={0} onStart={noop} onShort={noop} chips={[]} />);
  it('says how long, the plates, what is ready and the focus', () => {
    expect(h).toContain('usually <b>92 min</b>');
    expect(h).toContain('one plate change');
    expect(h).toContain('2 ready to go heavier');
    expect(h).toContain('form focus: head in line');
  });
  it('lists the whole plan in load blocks', () => {
    expect(h).toContain('Plates change · 10 → 5 kg');
    expect(h).toContain('Start Session C');
  });
});

describe('tonight', () => {
  it('is gold with records, and replays the finale', () => {
    const h = renderToStaticMarkup(<TonightCard name="Session C" records={['RDL 10 × 19']} mins={88} sets={26} liftMin={33} quality={89} checks={0.78} onReplay={noop} />);
    expect(h).toMatch(/class="lv-card lv-tr-hero lv-tr-tonight gold"/);
    expect(h).toContain('1 record');
    expect(h).toContain('33 min lifting');
    expect(h).toContain('78% of checks went well');
    expect(h).toContain('Replay tonight&#x27;s finale');
  });
  it('is calm without records', () => {
    const h = renderToStaticMarkup(<TonightCard name="Session C" records={[]} mins={60} sets={20} onReplay={noop} />);
    expect(h).toContain('Session C done');
    expect(h).not.toContain(' gold');
  });
});

describe('the sections', () => {
  it('four weeks ago', () => {
    const h = renderToStaticMarkup(<FourWeeksCard name="Session C" then="2026-09-23" rows={[{ name: 'Romanian deadlift', then: '10 × 14', now: '10 × 19', up: true }]} />);
    expect(h).toContain('You, four weeks ago');
    expect(h).toContain('Session C · 23 Sep');
    expect(h).toMatch(/10 × 14[\s\S]*→[\s\S]*10 × 19/);
  });
  it('the body, in words as well as colour', () => {
    const h = renderToStaticMarkup(
      <BodyCard rows={[{ name: 'Legs', sets: 5, lo: 10, hi: 16, state: 'low' }, { name: 'Arms', sets: 16, lo: 8, hi: 14, state: 'high' }, { name: 'Back', sets: 12, lo: 10, hi: 16, state: 'ok' }]} line="Legs are 5 sets short of 10 this week." onOpen={noop} />,
    );
    expect(h).toContain('This week on your body');
    expect(h).toContain('>low<');
    expect(h).toContain('>high<');
    expect(h).toContain('on target');
    expect(h).toContain('Legs are 5 sets short of 10 this week.');
  });
  it('records, in gold', () => {
    const h = renderToStaticMarkup(<RecordsCard total={23} rows={[{ what: '10 kg × 19', name: 'Romanian deadlift', when: 'tonight' }]} onAll={noop} />);
    expect(h).toContain('All 23 ›');
    expect(h).toContain('lv-tag gold');
    expect(RecordsCard({ total: 0, rows: [], onAll: noop })).toBeNull();
  });
  it('this month, with the film early in a month', () => {
    const h = renderToStaticMarkup(<MonthCard month="October" next="1 Nov" m={{ sessions: 13, records: 21, usualMin: 94, improved: { name: 'Reverse curl', pct: 40 } }} film={false} onFilm={noop} />);
    expect(h).toContain('October so far');
    expect(h).toContain('Most improved: reverse curl, up 40%.');
    expect(h).toContain('full report on 1 Nov');
    expect(renderToStaticMarkup(<MonthCard month="November" next="1 Dec" m={{ sessions: 1, records: 0 }} film onFilm={noop} />)).toContain('Last month’s film ›');
    expect(MonthCard({ month: 'November', next: '1 Dec', m: { sessions: 0, records: 0 }, film: false, onFilm: noop })).toBeNull();
  });
  it('recent sessions, with record tags', () => {
    const h = renderToStaticMarkup(<RecentCard rows={[{ id: 'a', title: 'Session B', sub: 'Tue · 90 min · 26 sets', records: 2 }]} onOpen={noop} />);
    expect(h).toContain('2 records');
    expect(RecentCard({ rows: [], onOpen: noop })).toBeNull();
  });
  it('the plan', () => {
    const h = renderToStaticMarkup(<PlanCard name="Home 4-way" sessions={['A', 'B', 'C', 'D']} since="2026-10-20" warmup="Arm circles" rules={[]} onOpen={noop} />);
    expect(h).toContain('Home 4-way');
    expect(h).toContain('A · B · C · D · since 20 Oct');
    expect(h).toContain('Warm-up and rules');
  });
});
