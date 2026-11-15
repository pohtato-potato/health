// What a season's end means for Brabo (spec §5.7): promoted, relegated or staying, the playoff final, and the
// shown ratings in the new division.
import { shownRating } from './ratings';
import { stageIn } from './pyramid/shape';
import type { FbSeason } from './store/tables';
import { AXES, type Axis, type AxisValues, type Tier } from './types';

export const OWN_ID = 'bra';
export type Move = 'up' | 'down' | 'stay';
export interface SeasonChange {
  season: number;
  from: Tier;
  to: Tier;
  move: Move;
  /** World 1: a double promotion, up two divisions at once. */
  double?: boolean;
  /** World 2 (LG-4): the level check moved Brabo one extra step, up or down (spec §7). */
  level?: 'up' | 'down';
  /** Brabo's final position in the old tier. */
  pos: number;
  /** The clubs going up and down from Brabo's tier (Brabo included when it moves). */
  up: string[];
  down: string[];
  playoff?: { final: [string, string]; winner?: string };
  /** Each axis shown in the old tier and in the new one. */
  ratings: { axis: Axis; before: number; after: number }[];
}

export function seasonChange(s: FbSeason, values: AxisValues): SeasonChange | null {
  if (!s.final) return null;
  const from = s.tierOf[OWN_ID];
  const up = s.final.up[from] ?? [], down = s.final.down[from] ?? [];
  const move: Move = up.includes(OWN_ID) ? 'up' : down.includes(OWN_ID) ? 'down' : 'stay';
  const double = s.final.double?.id === OWN_ID;
  const level = s.final.level?.id === OWN_ID ? s.final.level : undefined;
  const to = (level ? level.to : double ? from - 2 : move === 'up' ? from - 1 : move === 'down' ? from + 1 : from) as Tier;
  const pos = (s.final.tables[from]?.findIndex((r) => r.id === OWN_ID) ?? -1) + 1;
  const po = s.playoffs[from];
  const playoff = po?.final && po.final.includes(OWN_ID) ? { final: po.final, winner: po.winner } : undefined;
  const ratings = AXES.map((axis) => ({ axis, before: shownRating(values[axis], stageIn(s, from)), after: shownRating(values[axis], stageIn(s, to)) }));
  return { season: s.id, from, to, move, ...(double ? { double } : {}), ...(level ? { level: level.dir } : {}), pos, up, down, playoff, ratings };
}
