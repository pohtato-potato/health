import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import type { Stretch } from '../src/walk/content/types';
import { stretchEndToShow } from '../src/walk/road';

const steps = (km: number) => new Map([['2026-01-01', Math.round((km * 1000) / STRIDE_M)]]);
const stretch = (id: string, fromKm: number, toKm: number): Stretch => ({ id, name: id, plain: 'a to b', fromKm, toKm, page: ['a', 'b'], sources: [{ title: 's' }] });
const ROAD = [stretch('one', 230, 315), stretch('two', 315, 465), stretch('three', 465, 565)];

describe('the end of a stretch, shown once', () => {
  it('shows the latest unseen end and marks every ended stretch seen at once, before any close', () => {
    expect(stretchEndToShow(steps(470), ROAD, new Set())).toEqual({ show: ROAD[1], next: ROAD[2], markSeen: ['walk-stretch:one', 'walk-stretch:two'] });
  });
  it('shows nothing once seen, however the sheet was left', () => {
    expect(stretchEndToShow(steps(470), ROAD, new Set(['walk-stretch:one', 'walk-stretch:two']))).toEqual({ markSeen: [] });
  });
  it('shows nothing before the first end', () => {
    expect(stretchEndToShow(steps(250), ROAD, new Set())).toEqual({ markSeen: [] });
  });
});
