// Projects and building stages as one list (spec §11.3, §16 "The club quarter"). Pure.
// The shipped ground bundles keep their own day (ground.ts `bundleDay`, played in play.ts). This adds the new
// stages and the journeys: each opens when its tech is researched and its building gates are met, takes the day's
// real-habit counts, and is paid for from the budget when its needs are met. Every open project grows at once,
// as the shipped ground does; the skyline shows each one glowing while it's built and dashed when it's next.
import type { DayKey } from '../../domain/dates';
import { PLACES, type Place } from '../ground';
import { PROJECTS } from '../content/projects';
import type { Metric, ProjectDef } from '../content/types';
import type { Tier } from '../types';
import type { DayMetrics } from './types';

export interface ProjectState { id: string; progress: Record<string, number>; done?: DayKey }
export interface Gates { tier: Tier; moved: boolean; done: string[]; researched: string[] }

/** Open to work on: added by its tech, its tier reached, the move made, the stages before it built. */
export function projectOpen(p: ProjectDef, g: Gates): boolean {
  if (g.done.includes(p.id)) return false;
  if (p.tech && !g.researched.includes(p.tech)) return false;
  if (p.tier !== undefined && g.tier > p.tier) return false;
  if (p.moved && !g.moved) return false;
  return (p.after ?? []).every((a) => g.done.includes(a));
}
/** The projects the tree runs (new stages and journeys); shipped bundles run in ground.ts. */
export const TREE_PROJECTS = PROJECTS.filter((p) => p.source !== 'ground');

/** Adds a day to a project. It completes once every need is met and the budget covers the money (no debt). */
export function projectDay(p: ProjectDef, s: ProjectState, m: DayMetrics, budget: number, date: DayKey): { state: ProjectState; spent: number } {
  if (s.done) return { state: s, spent: 0 };
  const progress = { ...s.progress };
  for (const n of p.needs) progress[n.what] = Math.min(n.count, Math.round(((progress[n.what] ?? 0) + (m[n.what as Metric] ?? 0)) * 10) / 10);
  const met = p.needs.every((n) => (progress[n.what] ?? 0) >= n.count);
  if (met && budget >= p.money) return { state: { ...s, progress, done: date }, spent: p.money };
  return { state: { ...s, progress }, spent: 0 };
}

/** Share done, 0–1, across its needs. */
export function progressOf(p: ProjectDef, s?: ProjectState): number {
  if (s?.done) return 1;
  if (!p.needs.length) return 0;
  return p.needs.reduce((t, n) => t + Math.min(1, (s?.progress[n.what] ?? 0) / n.count), 0) / p.needs.length;
}

export type StageLook = 'built' | 'building' | 'next' | 'sealed';
export interface PlaceLook { place: Place; name: string; stages: { p: ProjectDef; look: StageLook }[]; built: number; of: number; now?: ProjectDef }
/**
 * The skyline: each building's stages in order. Built: solid light. Building: open now (the moving gold line).
 * Next: the first stage that isn't open yet (dashed). Everything after it: sealed.
 */
export function skyline(g: Gates, isOpen: (p: ProjectDef) => boolean): PlaceLook[] {
  return PLACES.map((pl) => {
    const list = PROJECTS.filter((p) => p.place === pl.id).sort((a, b) => a.stage - b.stage);
    let nextGiven = false;
    const stages = list.map((p) => {
      if (g.done.includes(p.id)) return { p, look: 'built' as const };
      if (isOpen(p)) return { p, look: 'building' as const };
      if (!nextGiven) { nextGiven = true; return { p, look: 'next' as const }; }
      return { p, look: 'sealed' as const };
    });
    return { place: pl.id, name: pl.name, stages, built: stages.filter((s) => s.look === 'built').length, of: stages.length, now: stages.find((s) => s.look === 'building')?.p };
  });
}
export const journeys = () => PROJECTS.filter((p) => p.source === 'journey');
