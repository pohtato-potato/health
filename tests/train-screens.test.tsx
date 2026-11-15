import { describe, expect, it, vi } from 'vitest';

// The kit's sheet reads the route at import; Node has no window.
vi.hoisted(() => {
  const g = globalThis as unknown as { window?: unknown };
  g.window ??= { location: { hash: '' }, addEventListener: () => {}, removeEventListener: () => {} };
});
import { renderToStaticMarkup } from 'react-dom/server';
import { TonightCard } from '../src/screens/train/Cards';
import { BodyPanel, ExerciseBlock, MuscleBars, WeekLead } from '../src/screens/train/Week';
import { BodyCard, FourWeeksCard, MonthCard, PlanCard, RecordsCard, RecentCard } from '../src/screens/train/Sections';

const noop = () => {};
const MUSCLES = [
  { name: 'Side delts', muscles: ['side-delts' as const], sets: 7, lo: 10, hi: 16, state: 'low' as const },
  { name: 'Chest', muscles: ['chest' as const], sets: 8, lo: 6, hi: 12, state: 'ok' as const },
  { name: 'Biceps', muscles: ['biceps' as const], sets: 18, lo: 8, hi: 14, state: 'high' as const },
];

describe('the week (look pass L2)', () => {
  const h = renderToStaticMarkup(
    <WeekLead
      words="Two done, two to go"
      done={[{ code: 'GA', day: 'Tue', place: 'gym' }, { code: 'HA', day: 'Thu', place: 'home' }]}
      picks={[{ id: 'GB', code: 'GB', focus: 'Legs and arms', minutes: 60, place: 'gym' }, { id: 'HB', code: 'HB', focus: 'Chest and arms', minutes: 65, place: 'home' }]}
      picked="GB"
      onPick={noop}
      also={[{ id: 'GA', label: 'repeat GA' }]}
      allDone={false}
    />,
  );
  it('says the count, any order, and what was done', () => {
    expect(h).toContain('Two done, two to go');
    expect(h).toContain('any order');
    expect(h).toContain('GA Tue');
  });
  it('offers what is left as picks, one chosen', () => {
    expect(h).toContain('Which one today?');
    expect(h).toMatch(/role="radio" aria-checked="true" aria-label="GB, at the gym: [^"]+" class="tr-pick gym on"/);
    expect(h).toMatch(/aria-checked="false" aria-label="[^"]+, at home: [^"]+" class="tr-pick home"/);
    expect(h).toContain('repeat GA');
  });
});

describe('the exercises', () => {
  const h = renderToStaticMarkup(
    <ExerciseBlock
      ink="#9db4d6"
      head="Plates change · at 10 kg"
      groups={[
        [{ id: 'a', name: 'Machine row', target: '3 × 10–12', effort: 'stop 2–3 short', weight: { text: '35 kg', label: 'Machine row: 35 kg. Change it', onTap: noop }, up: 'Top of the range last time: try 37.5' }],
        [
          { id: 'b', name: 'Cable raise', target: '3 × 12–20', effort: 'to 0–1 left', hard: true, weight: { text: '5 kg', label: 'x', onTap: noop } },
          { id: 'c', name: 'Made-up fly', target: '2 × 12–15', effort: 'to 0–1 left', hard: true, weight: { text: 'find', label: 'y', onTap: noop } },
        ],
      ]}
    />,
  );
  it('weights are buttons, effort is a chip, going up is suggested', () => {
    expect(h).toMatch(/<button type="button" class="tr-weight"[^>]*>35 kg<\/button>/);
    expect(h).toContain('stop 2–3 short');
    expect(h).toMatch(/class="tr-eff hard">to 0–1 left/);
    expect(h).toContain('Top of the range last time: try 37.5');
    expect(h).toContain('Plates change · at 10 kg');
  });
  it('pairs show as a pair', () => {
    expect(h).toContain('tr-group pair');
    expect(h).toContain('back to back');
  });
});

describe('the body and sets per muscle', () => {
  it('the figure panel names the colours and opens the numbers', () => {
    const h = renderToStaticMarkup(<BodyPanel rows={MUSCLES} onOpen={noop} />);
    expect(h).toContain('This week on your body');
    expect(h).toContain('Tap for the numbers');
    expect(h).toContain('1 on target, 1 low');
  });
  it('bars carry the count and the plan range, in words too', () => {
    const h = renderToStaticMarkup(<MuscleBars rows={MUSCLES} />);
    expect(h).toContain('Side delts: 7 hard sets, low; the plan asks 10 to 16');
    expect(h).toContain('Biceps: 18 hard sets, high');
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
    expect(h).toMatch(/10 × 14[\s\S]*aria-label="to"><svg[\s\S]*10 × 19/); // a drawn arrow, never a typed one
    expect(h).not.toMatch(/[→↑›]/);
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
    expect(h).toMatch(/All 23 <svg/);
    expect(h).toContain('lv-tag gold');
    expect(RecordsCard({ total: 0, rows: [], onAll: noop })).toBeNull();
  });
  it('this month, with the film early in a month', () => {
    const h = renderToStaticMarkup(<MonthCard month="October" next="1 Nov" m={{ sessions: 13, records: 21, usualMin: 94, improved: { name: 'Reverse curl', pct: 40 } }} film={false} onFilm={noop} />);
    expect(h).toContain('October so far');
    expect(h).toContain('Most improved: reverse curl, up 40%.');
    expect(h).toContain('full report on 1 Nov');
    expect(renderToStaticMarkup(<MonthCard month="November" next="1 Dec" m={{ sessions: 1, records: 0 }} film onFilm={noop} />)).toMatch(/Last month’s film <svg/);
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

describe('train review fixes', () => {
  it('the body card waits for the first hard set', () => {
    expect(BodyCard({ rows: [{ name: 'Legs', sets: 0, lo: 10, hi: 16, state: 'low' }], onOpen: noop })).toBeNull();
  });
  it('the body card is a card with a link, not one big button', () => {
    const h = renderToStaticMarkup(<BodyCard rows={[{ name: 'Legs', sets: 5, lo: 10, hi: 16, state: 'low' }]} onOpen={noop} />);
    expect(h).toMatch(/^<div class="lv-card"/);
    expect(h).toMatch(/Muscle map <svg/);
  });
  it('tonight says logged later instead of a length', () => {
    const h = renderToStaticMarkup(<TonightCard name="Session C" records={[]} mins={2} sets={20} later onReplay={noop} />);
    expect(h).toContain('logged later · 20 sets');
  });
});

import { ExerciseCard } from '../src/screens/train/ExerciseCard';
import { POSES } from '../src/domain/poses';

describe('exercise cards', () => {
  const back = { best: ['12.5 kg × 9', '10 kg × 14'], curve: [14, 15, 16.2], records: 3 };
  const card = (tier: 'First light' | 'Clean' | 'Even' | 'Plated' | 'Mastery', seed = 'rdl', initialBack = false) =>
    renderToStaticMarkup(<ExerciseCard name="Romanian deadlift" pose={POSES.hinge} tier={tier} next="Two clean sessions running, for Even" seed={seed} back={back} initialBack={initialBack} />);
  it('names the tier in words', () => expect(card('Clean')).toContain('>Clean<'));
  it('is gold only at Mastery', () => {
    expect(card('Mastery')).toContain('t-mastery');
    expect(card('Plated')).not.toContain('mastery');
  });
  it('keeps each card’s patterns its own', () => {
    const ids = (h: string) => [...h.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(card('Plated', 'rdl'))).not.toEqual(ids(card('Plated', 'curl')));
  });
  it('shows the best sets and records on the back', () => {
    const h = card('Plated', 'rdl', true);
    expect(h).toContain('Best sets');
    expect(h).toContain('12.5 kg × 9');
    expect(h).toContain('3 records');
  });
  it('reads its whole face, with Next', () => {
    const h = card('Clean');
    expect(h).not.toMatch(/<button[^>]*aria-label/);
    expect(h).toContain('Next: Two clean sessions running, for Even');
    expect(h).toContain('Tap for best sets');
  });
  it('the strength line is decoration to a screen reader', () => expect(card('Plated', 'rdl', true)).toMatch(/class="lv-card-ex-spark" aria-hidden="true"/));
});

describe('the plan version', () => {
  it('shows on the plan card', () => {
    expect(renderToStaticMarkup(<PlanCard name="Home 4-way" version="1.2" sessions={['A', 'B']} since="2026-10-20" rules={[]} onOpen={noop} />)).toContain('A · B · version 1.2 · since 20 Oct');
  });
});
