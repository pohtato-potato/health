import { describe, expect, it } from 'vitest';
import { POSES, poseFor } from '../src/domain/poses';
import { DEFAULT_PLAN } from '../src/domain/defaultPlan';
import { allExercises } from '../src/domain/plan';

/** A 29-exercise plan, by id and name only. */
const CURRENT = [
  ['split-squat', 'Split squat'], ['single-leg-bridge', 'Single-leg glute bridge'], ['ohp', 'Seated overhead press'], ['lateral-raise', 'Lateral raise'],
  ['floor-press', 'Floor press'], ['overhead-ext', 'Overhead triceps extension'], ['row', 'One-arm dumbbell row'], ['pullover', 'Pullover'],
  ['rear-delt', 'Rear delt fly, face down'], ['curl', 'Chair-supported curl'], ['hammer-curl', 'Hammer curl'], ['wrist-curl', 'Wrist curl'],
  ['reverse-curl', 'Reverse-grip curl'], ['side-plank', 'Side plank'], ['rdl', 'Romanian deadlift'], ['goblet-squat', 'Goblet box squat'],
  ['incline-pushup', 'Incline push-up'], ['lean-lateral', 'Lean-away lateral raise'], ['skull-crusher', 'Skull crusher'], ['floor-fly', 'Floor fly'],
  ['calf-raise', 'Single-leg calf raise'], ['plank', 'Forearm plank'], ['seal-row', 'Chest-supported row'], ['seated-lateral', 'Seated lateral raise'],
  ['face-pull', 'Band face pull'], ['concentration-curl', 'Concentration curl'], ['close-grip-press', 'Close-grip floor press'], ['farmer-carry', 'Farmer carry'],
  ['dead-bug', 'Dead bug'], ['bent-row', 'Bent-over row'], ['rear-delt-1arm', 'One-arm rear delt fly'],
] as const;

describe('poses', () => {
  for (const [id, p] of Object.entries(POSES)) {
    it(`${id} stays in the card and joins real stars`, () => {
      for (const [x, y] of p.stars) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(130);
      }
      for (const [a, b] of [...p.lines, ...(p.pair ?? [])]) {
        expect(p.stars[a], `${id} ${a}`).toBeDefined();
        expect(p.stars[b], `${id} ${b}`).toBeDefined();
      }
    });
  }
  it('every exercise in a 29-exercise plan has its own pose', () => {
    for (const [id, name] of CURRENT) expect(poseFor({ id, name }), id).not.toBe('stand');
  });
  it('every exercise in the built-in plan has its own pose', () => {
    for (const ex of allExercises(DEFAULT_PLAN)) expect(poseFor(ex), ex.id).not.toBe('stand');
  });
  it('an unknown exercise falls back to its movement, then to standing', () => {
    expect(poseFor({ id: 'x', name: 'Bulgarian thing' })).toBe('stand');
    expect(poseFor({ id: 'x', name: 'Pull-up' })).toBe('row');
    expect(poseFor({ id: 'x', name: 'Step-up' })).toBe('squat');
  });
});

describe('pose review fixes', () => {
  it('the rowing arm joins the shoulder', () => expect(POSES.row.lines).toContainEqual([1, 4]));
  it('names match whole words', () => {
    expect(poseFor({ id: 'x', name: 'Narrow-grip push-up' })).toBe('push-up');
    expect(poseFor({ id: 'x', name: 'Ball throw' })).not.toBe('row');
  });
});
