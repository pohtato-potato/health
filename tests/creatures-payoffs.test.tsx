import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURES, creatureById } from '../src/domain/creatureRoster';
import { DexGrid } from '../src/ui/creatures/DexGrid';
import { CreatureBoard } from '../src/screens/proto/CreatureBoard';
import { MomentCard } from '../src/screens/today/MomentCard';
import { called, MetCard, RecordFrame } from '../src/ui/creatures/Payoffs';
import { grepSrc } from './helpers/grepSrc';

const data = { closedRings: 1, proteinGapG: 0, gapFoods: '', addLabel: '', stepsLeft: 800 };
const actions = { logMorning() {}, closeDay() {}, addGap() {}, typeSteps() {} };
const seen = (id: string, n = 1) => Array.from({ length: n }, () => ({ creatureId: id }));

describe('creature payoffs', () => {
  it('a sick day names its company, and says nothing without one', () => {
    expect(html(<MomentCard kind="rest" data={{ ...data, companion: 'the gharial' }} actions={actions} />)).toContain('The gharial is keeping you company.');
    expect(html(<MomentCard kind="rest" data={data} actions={actions} />)).not.toContain('company');
  });
  it('the steps hint keeps the plain number beside it', () => {
    const out = html(<MomentCard kind="steps" data={{ ...data, stepsCreature: 'the nilgai' }} actions={actions} />);
    expect(out).toContain('800 steps to go');
    expect(out).toContain('The nilgai wandered 800 steps further.');
  });
  it('a medium-rare stays unnamed in sentences until its sighting', () => {
    expect(called('cheetah', seen('cheetah'))).toBe('something not yet named');
    expect(called('cheetah', seen('cheetah', 3))).toBe('the cheetah');
  });
  it('met cards show who came, and nothing when nobody did', () => {
    expect(html(<MetCard title="Met this week" ids={[]} sightings={[]} />)).toBe('');
    expect(html(<MetCard title="Met this week" ids={['nilgai']} sightings={seen('nilgai')} />)).toContain('Nilgai');
  });
  it('the record frame keeps the record and says who framed it', () => {
    const out = html(<RecordFrame guest={creatureById('tanuki')!} stage={1}><b>the record</b></RecordFrame>);
    expect(out).toContain('the record');
    expect(out).toContain('Framed by the tanuki');
  });
});

describe('the dex', () => {
  it('draws only what has been found', () => {
    const out = html(<DexGrid cards rows={[{ id: 'nilgai', tier: 'everyday', visits: 4, stage: 2, first: 'a', last: 'b' }]} onOpen={() => {}} />);
    expect(out).toContain('Nilgai');
    expect(out).toContain('4 visits');
    expect(out).not.toContain('Tanuki');
    expect(html(<DexGrid cards={false} rows={[]} onOpen={() => {}} />)).not.toContain('<svg');
  });
});

describe('the art board', () => {
  const out = html(<CreatureBoard />);
  it('is marked unapproved and hides names until asked', () => {
    expect(out).toContain('Unapproved');
    for (const c of CREATURES) expect(out, c.id).not.toContain(c.name);
  });
  it('shows all twenty at every stage', () => {
    expect((out.match(/<section/g) ?? []).length).toBe(CREATURES.length);
    expect((out.match(/<figure/g) ?? []).length).toBe(CREATURES.reduce((n, c) => n + (c.tier === 'medium' ? 4 : 3), 0));
  });
  it('is only routed in development', () => {
    expect(grepSrc(/import\.meta\.env\.DEV \? \{ '\/proto\/creatures'/).length).toBeGreaterThan(0);
  });
});
