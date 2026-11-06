// League tables.
import type { Result } from './types';

export interface Row { id: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; form: Result[]; deduct?: number }
export interface Played { home: string; away: string; score: [number, number] }

/** Standings sorted by points, goal difference, goals for, then id. `deduct` takes points off (financial trouble). */
export function standings(results: Played[], ids: string[], deduct: Record<string, number> = {}): Row[] {
  const rows = new Map(ids.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] as Result[], deduct: deduct[id] || undefined }]));
  for (const m of results) {
    const h = rows.get(m.home), a = rows.get(m.away);
    if (!h || !a) continue;
    const [x, y] = m.score;
    h.p++; a.p++; h.gf += x; h.ga += y; a.gf += y; a.ga += x;
    const rh: Result = x > y ? 'W' : x < y ? 'L' : 'D';
    const ra: Result = rh === 'W' ? 'L' : rh === 'L' ? 'W' : 'D';
    for (const [row, res] of [[h, rh], [a, ra]] as const) {
      if (res === 'W') { row.w++; row.pts += 3; } else if (res === 'D') { row.d++; row.pts += 1; } else row.l++;
      row.form = [...row.form, res].slice(-5);
    }
  }
  for (const r of rows.values()) r.pts -= r.deduct ?? 0;
  return [...rows.values()].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.id.localeCompare(b.id));
}
export const position = (table: Row[], id: string) => table.findIndex((r) => r.id === id) + 1;
