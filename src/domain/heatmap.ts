export type HeatMetric = 'steps' | 'protein' | 'sleep' | 'training' | 'readiness' | 'form';

/**
 * A day's square on the heatmap, 1 (faint) to 4 (full), against the target where there is one.
 * Null means not logged: drawn as an outline, never as a zero.
 */
export function heatmapLevel(metric: HeatMetric, value: number | undefined, target?: number): 1 | 2 | 3 | 4 | null {
  if (value === undefined) return null;
  if (metric === 'training') return value > 0 ? 4 : 1;
  if (metric === 'readiness') return value >= 75 ? 4 : value >= 60 ? 3 : value >= 45 ? 2 : 1;
  if (metric === 'form') return value >= 4.5 ? 4 : value >= 3.5 ? 3 : value >= 2.5 ? 2 : 1;
  const r = target ? value / target : 0;
  return r >= 1 ? 4 : r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1;
}

/** Each metric keeps its own ink on the heatmap. */
export const HEAT_INK: Record<HeatMetric, string> = {
  steps: 'var(--steps)',
  protein: 'var(--protein)',
  sleep: 'var(--sleep)',
  training: 'var(--gold)',
  readiness: 'var(--steps)',
  form: 'var(--f4)',
};
