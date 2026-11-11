// The cup map (spec §6): fourteen or fifteen stops on any path, in rows of three, with lines showing which stops lead
// where. Built from the run's seed, so a saved run is always the same run. Rules: the first row is all matches; no
// rest stop in the first three rows; the stall sits in the middle third; the row before the final is a rest stop or an
// event; an elite club never follows another directly. The FA Cup puts an elite row before the final (its guard);
// the Champions League has two finals.
import { hashSeed, int, rng, shuffle } from '../rng';
import { twists } from './ladder';

export type StopKind = 'match' | 'elite' | 'rest' | 'market' | 'event' | 'final';
export interface MapNode { id: number; row: number; col: number; kind: StopKind; next: number[] }
export interface CupMap { rows: number; nodes: MapNode[]; labels: string[] }

const ROUNDS = ['Round one', 'Round two', 'Round three', 'Last 32', 'Last 16', 'Quarter-final', 'Semi-final'];
const COLS = 3;

/** Row themes for the body (every row before the final), meeting the placement rules. */
function themes(body: number, r: () => number): StopKind[] {
  const matches = body >= 14 ? 7 : 6;
  const events = body - 5 - matches;
  const middle: StopKind[] = ['elite', 'elite', 'rest', 'rest', 'market', ...Array<StopKind>(events).fill('event'), ...Array<StopKind>(matches - 1).fill('match')];
  // The row before the final: a rest stop or an event.
  const lastKind: StopKind = r() < 0.5 ? 'rest' : 'event';
  middle.splice(middle.indexOf(lastKind), 1);
  const third = [Math.floor(body / 3), Math.floor((2 * body) / 3)];
  for (let tries = 0; tries < 2000; tries++) {
    const t: StopKind[] = ['match', ...shuffle(r, middle), lastKind];
    const ok = t.every((k, i) =>
      (k !== 'rest' || i >= 3) && (k !== 'market' || (i >= third[0] && i <= third[1])) && !(k === 'elite' && t[i - 1] === 'elite') && !(k === 'rest' && t[i - 1] === 'rest'));
    if (ok) return t;
  }
  throw new Error('no map');
}
/** The one kind a row offers besides its theme, so every row is a choice. */
function alt(k: StopKind, row: number, eventRow: boolean): StopKind {
  if (k === 'match') return eventRow ? 'event' : 'match';
  if (k === 'rest') return 'event';
  if (k === 'event') return row >= 3 ? 'rest' : 'match';
  return 'match';
}

export function makeMap(seed: number, cup: number): CupMap {
  const r = rng(hashSeed('cup-map', String(seed)));
  const tw = twists(cup);
  const stops = int(r, 14, 15);
  const body = stops - 1;
  const t = themes(body, r);
  // One match row (at most) offers an event instead, so no path dodges more than one match.
  const matchRows = t.map((k, i) => (k === 'match' && i > 0 ? i : -1)).filter((i) => i > 0);
  const eventRow = matchRows[Math.floor(r() * matchRows.length)] ?? -1;
  const rowsKinds: StopKind[][] = t.map((k, i) => {
    if (i === 0) return ['match', 'match', 'match'];
    const odd = Math.floor(r() * COLS);
    return Array.from({ length: COLS }, (_, c) => (c === odd ? alt(k, i, i === eventRow) : k));
  });
  if (tw.finalGuard) rowsKinds.push(['elite', 'elite', 'elite']);
  rowsKinds.push(['final']);
  if (tw.twoFinals) rowsKinds.push(['final']);
  const nodes: MapNode[] = [];
  const at: number[][] = [];
  rowsKinds.forEach((ks, row) => {
    at[row] = ks.map((kind, i) => {
      const col = ks.length === 1 ? 1 : i;
      nodes.push({ id: nodes.length, row, col, kind, next: [] });
      return nodes.length - 1;
    });
  });
  for (let row = 0; row < rowsKinds.length - 1; row++) {
    const here = at[row], there = at[row + 1];
    if (there.length === 1 || here.length === 1) { for (const a of here) for (const b of there) nodes[a].next.push(b); continue; }
    let crossed = -1;
    for (let c = 0; c < COLS; c++) {
      const n = nodes[here[c]];
      n.next.push(there[c]);
      // A diagonal now and then, never two that cross.
      if (r() < 0.45) {
        const d = r() < 0.5 ? -1 : 1;
        const to = c + d;
        if (to >= 0 && to < COLS && !(d === -1 && crossed === c - 1)) {
          n.next.push(there[to]);
          if (d === 1) crossed = c;
        }
      }
    }
  }
  const labels = rowsKinds.map((ks, row) => {
    if (ks[0] === 'final') return tw.twoFinals ? (row === rowsKinds.length - 1 ? 'Second final' : 'First final') : 'Final';
    if (tw.finalGuard && row === rowsKinds.length - (tw.twoFinals ? 3 : 2)) return 'The guard';
    return ROUNDS[Math.min(ROUNDS.length - 1, Math.floor((row * ROUNDS.length) / body))];
  });
  return { rows: rowsKinds.length, nodes, labels };
}

/** Every path from the first row to the last final, as lists of kinds (for tests and the simulation). */
export function paths(m: CupMap): StopKind[][] {
  const out: StopKind[][] = [];
  const walk = (id: number, acc: StopKind[]) => {
    const n = m.nodes[id];
    const a = [...acc, n.kind];
    if (!n.next.length) out.push(a); else for (const x of n.next) walk(x, a);
  };
  for (const n of m.nodes.filter((x) => x.row === 0)) walk(n.id, []);
  return out;
}
