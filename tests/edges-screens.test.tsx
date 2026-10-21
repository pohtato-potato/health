import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BeforeScreen } from '../src/screens/live/BeforeScreen';

const noop = () => {};
const blocks = [
  { kg: 10, items: [{ name: 'Romanian deadlift', light: false }, { name: 'Goblet squat', light: true }] },
  { kg: 5, items: [{ name: 'Lateral raise', light: false }] },
];
const before = (p: Partial<Parameters<typeof BeforeScreen>[0]> = {}) =>
  renderToStaticMarkup(<BeforeScreen name="Session C" usual={{ min: 92, fromHistory: true }} startedAt={0} blocks={blocks} changes={1} legs onSoreness={noop} warmup="Arm circles" onStart={noop} saver={false} {...p} />);

describe('before the session', () => {
  it('says how long it usually takes', () => {
    expect(before()).toContain('usually <b>92 min</b>');
    expect(before({ usual: { min: 60, fromHistory: false } })).toContain('about <b>60 min</b>');
  });
  it('asks about legs only when there is leg work', () => {
    expect(before()).toContain('Legs sore');
    expect(before({ legs: false })).not.toContain('Legs sore');
  });
  it('drops leg work to one set at 4 or 5', () => {
    const h = before({ soreness: 4 });
    expect(h).toContain('leg work drops to 1 set');
    expect(h).toContain('1 set</span>');
  });
  it('leaves the warm-up out when the plan has none', () => {
    expect(before()).toContain('Warm-up');
    expect(before({ warmup: undefined })).not.toContain('Warm-up');
  });
  it('marks the plate change between blocks', () => {
    expect(before()).toMatch(/Goblet squat[\s\S]*Plates change · 10 → 5 kg[\s\S]*Lateral raise/);
    expect(before()).toContain('one plate change');
  });
});

import { GuideScreen } from '../src/screens/live/GuideScreen';
import { RestLive } from '../src/screens/live/RestLive';
import type { ExerciseDef } from '../src/domain/plan';

const row: ExerciseDef = { id: 'lean-lateral', order: '4', name: 'Lean-away lateral raise', sets: 3, reps: [12, 20], load: 'pair', perSide: true, lead: 'L', leadWhy: 'the smaller left side leads', guide: { setup: 'Hold the door frame.', movement: 'Raise to shoulder height.', breathing: '', faults: [], feel: 'Side of the shoulder.', stop: '', progress: '' } };
const guide = (p: Partial<Parameters<typeof GuideScreen>[0]> = {}) =>
  renderToStaticMarkup(<GuideScreen ex={row} name={row.name} kg={5} lead="L" tempo={false} setup={{ text: 'Door frame, left hand', from: '2026-10-21' }} onSetup={noop} checks={[]} onGo={noop} saver={false} {...p} />);

describe('the guide before the first set', () => {
  it('names the lead side and why', () => {
    const h = guide();
    expect(h).toContain('LEFT FIRST');
    expect(h).toContain('the smaller left side leads');
  });
  it('shows only the guide sections that exist', () => {
    const h = guide();
    expect(h).toContain('Raise to shoulder height.');
    expect(h).not.toContain('>Stop<');
  });
  it('shows the setup and since when', () => expect(guide()).toContain('Your setup · from 21 Oct'));
  it('offers to add a setup when there is none', () => expect(guide({ setup: undefined })).toContain('Add my setup'));
  it('lists the checks only when the plan has them', () => {
    expect(guide()).not.toContain('check after each set');
    expect(guide({ checks: [{ id: 'a', text: 'Lead with the elbow', kind: 'do' }] })).toContain('Lead with the elbow');
  });
  it('says the tempo when it is on', () => expect(guide({ tempo: true })).toContain('Tempo: lower 3 s, lift 1 s'));
});

describe('a note from the rest screen', () => {
  const rest = (note?: string) =>
    renderToStaticMarkup(<RestLive endsAt={60_000} total={90} now={0} from="in" just={[]} next={null} onMore={noop} onReady={noop} saver={false} rings={['#111111', '#222222', '#333333']} note={note} onNote={noop} />);
  it('shows the note kept', () => expect(rest('Elbow ached on set 3')).toContain('Note: Elbow ached on set 3'));
  it('offers one when there is none', () => expect(rest()).toContain('+ Note on this exercise'));
});

import { PlatesScreen } from '../src/screens/live/PlatesScreen';

describe('the plate change', () => {
  const plates = (p: Partial<Parameters<typeof PlatesScreen>[0]> = {}) =>
    renderToStaticMarkup(<PlatesScreen change={{ from: 10, to: 5 }} forNames={['Skull crusher', 'Floor fly']} collar={false} onCollar={noop} onGo={noop} saver={false} {...p} />);
  it('shows the change and who it is for', () => {
    const h = plates();
    expect(h).toMatch(/10 kg[\s\S]*→[\s\S]*5 kg/);
    expect(h).toContain('For skull crusher and floor fly.');
  });
  it('lets you go straight on without a collar check', () => expect(plates()).not.toMatch(/<button[^>]*disabled/));
  it('holds Ready until the collars are ticked', () => {
    const h = plates({ collar: true });
    expect(h).toContain('Collars tight on both handles');
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Check the collars first/);
  });
  it('can be only the collar check, with no change', () => {
    const h = plates({ change: undefined, collar: true });
    expect(h).not.toContain('Plates change');
    expect(h).toContain('Collars tight');
  });
});

import { RecordScreen } from '../src/screens/live/RecordScreen';
import { SessionLook, SetsLook } from '../src/screens/live/QuickLooks';

describe('the record moment', () => {
  const rec = (p: Partial<Parameters<typeof RecordScreen>[0]> = {}) =>
    renderToStaticMarkup(<RecordScreen name="Romanian deadlift" kg={10} value="19" was={{ value: 18, date: '2026-10-03' }} onGo={noop} saver={false} {...p} />);
  it('names the old best and when', () => expect(rec()).toContain('Your best was 18, on 3 Oct.'));
  it('is gold', () => expect(rec()).toMatch(/class="lv [^"]*st-record/));
  it('names the song when known', () => expect(rec({ song: 'Midnight City · M83' })).toContain('Midnight City · M83'));
  it('is still in battery saver', () => {
    const h = rec({ saver: true });
    expect(h).not.toContain('blob');
    expect(h).not.toContain('lv-dust');
  });
});

describe('quick looks', () => {
  it('sets: tonight against last time, with tags and the note', () => {
    const h = renderToStaticMarkup(<SetsLook name="Curl" rows={[{ label: 'Set 1', tonight: '12', last: '11', tags: ['burn from 10'] }, { label: 'Set 2', last: '10', tags: [] }]} note="Elbow ached" onClose={noop} />);
    expect(h).toMatch(/Set 1[\s\S]*12[\s\S]*11/);
    expect(h).toContain('burn from 10');
    expect(h).toContain('Elbow ached');
  });
  it('session: blocks with plate changes, length, and the list and finish', () => {
    const h = renderToStaticMarkup(<SessionLook blocks={[{ kg: 10, items: [{ name: 'Curl', light: false }] }, { kg: 5, items: [{ name: 'Fly', light: false }] }]} usual={{ min: 92, fromHistory: true }} startedAt={0} onList={noop} onFinish={noop} onClose={noop} />);
    expect(h).toContain('Plates change · 10 → 5 kg');
    expect(h).toContain('usually <b>92 min</b>');
    expect(h).toContain('Open the set list');
    expect(h).toContain('Finish session');
  });
});
