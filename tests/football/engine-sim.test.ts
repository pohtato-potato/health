// The league engine simulation (ledger O29): thousands of seeded matches for a set of made-up nights against the
// clubs of every division, so a change to the engine can be measured before it ships. Skipped in the normal run.
//   ENGINE_SIM=1 TZ=UTC npx vitest run tests/football/engine-sim.test.ts
// Set ENGINE_SIM_OUT=<file> to also write the report to a file. ENGINE_SIM_N sets matches per night and division.
// The nights are round, invented values (no one's real data): bare nights with the captain on Pace, no stack, no
// bench, no tactics, tree, traits or loans.
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import * as engine from '../../src/football/engine';
import { NOT_LOGGED } from '../../src/football/axes';
import { CLUBS } from '../../src/football/data/load';
import { opponentFor } from '../../src/football/opponent';
import { AXES, type Axis, type AxisValues, type Tier } from '../../src/football/types';

const { playMatch, parityRating } = engine;
const V = (Pace: number, Power: number, Fuel: number, Rest: number, Routine: number, Shape: number): AxisValues => ({ Pace, Power, Fuel, Rest, Routine, Shape });
const all = (x: number) => V(x, x, x, x, x, x);

interface Night { values: AxisValues; fog?: Axis[]; typical?: AxisValues }
/** The twelve nights of the 11 Nov baseline, in its order. "Mixed night" is a rounded, invented stand-in. */
export const NIGHTS: Record<string, Night> = {
  'nothing logged': { values: all(NOT_LOGGED), fog: [...AXES] },
  'all 8': { values: all(8) }, 'all 11': { values: all(11) }, 'all 14': { values: all(14) }, 'all 17': { values: all(17) }, 'all 20': { values: all(20) },
  'mixed night': { values: V(16, 16, 15, 9, 13, 14) },
  'mixed, rest day': { values: V(16, 13, 15, 9, 13, 14) },
  'mixed, better sleep (Rest 9→15)': { values: V(16, 16, 15, 15, 13, 14) },
  'mixed, fewer steps (Pace 16→8)': { values: V(8, 16, 15, 9, 13, 14) },
  'great attack, no defence': { values: V(19, 18, 19, 5, 5, 6) },
  'great defence, no attack': { values: V(5, 4, 5, 18, 19, 18) },
};
const TIER_ORDER: Tier[] = [6, 5, 4, 3, 2, 1];
const N = Number(process.env.ENGINE_SIM_N ?? 3000);

interface Stat { w: number; d: number; l: number; gf: number; ga: number; atkN: number; defN: number; atkPct: number; defPct: number; tagged: number; lo: number; hi: number }
function run(n: Night, tier: Tier, count = N): Stat {
  const clubs = CLUBS.filter((c) => c.tier === tier && c.kind !== 'own' && c.rating != null);
  const s: Stat = { w: 0, d: 0, l: 0, gf: 0, ga: 0, atkN: 0, defN: 0, atkPct: 0, defPct: 0, tagged: 0, lo: 100, hi: 0 };
  for (let i = 0; i < count; i++) {
    const club = clubs[i % clubs.length];
    // `fog` and `typical` are read by the rebalanced engine and ignored by older ones, so one script runs on both.
    const ev = playMatch({ seed: 1000 + i * 7919 + tier, values: n.values, opp: opponentFor(club), home: i % 2 === 0, captain: 'Pace', stack: 0, abilities: [], bench: [], pre: [], conds: [], ...(n.fog ? { fog: n.fog } : {}), ...(n.typical ? { typical: n.typical } : {}) } as engine.MatchInput);
    const [a, b] = ev.score;
    s.gf += a; s.ga += b;
    if (a > b) s.w++; else if (a === b) s.d++; else s.l++;
    if (ev.chances.some((c) => c.tag)) s.tagged++;
    for (const c of ev.chances) {
      if (c.side === 'atk') { s.atkPct += c.pct; s.atkN++; } else { s.defPct += c.pct; s.defN++; }
      s.lo = Math.min(s.lo, c.pct); s.hi = Math.max(s.hi, c.pct);
    }
  }
  return s;
}
const pc = (x: number, n = N) => Math.round((100 * x) / n);
const line = (s: Stat, n = N) => `${pc(s.w, n)}/${pc(s.d, n)}/${pc(s.l, n)} g${(s.gf / n).toFixed(1)}-${(s.ga / n).toFixed(1)} a${Math.round(s.atkPct / s.atkN)}% s${Math.round(s.defPct / s.defN)}% n${(s.atkN / n).toFixed(1)}v${(s.defN / n).toFixed(1)} tagged${pc(s.tagged, n)}%`;

describe.skipIf(!process.env.ENGINE_SIM)('engine simulation', () => {
  it('prints the report', () => {
    const out: string[] = [`Engine simulation, ${N} matches per night and division. W/D/L %, goals for-against, average scoring %, average saving %, chances yours v theirs, share of matches with a tagged moment.`];
    const wins: Record<string, Partial<Record<Tier, number>>> = {};
    let goals = 0, games = 0;
    for (const [name, n] of Object.entries(NIGHTS)) {
      out.push('', `${name}  (plays like a club rated ${Math.round(parityRating(n.values))})`);
      wins[name] = {};
      for (const t of TIER_ORDER) {
        const s = run(n, t);
        wins[name][t] = pc(s.w);
        goals += s.gf + s.ga; games += N;
        out.push(`  T${t}: ${line(s)}  range ${s.lo}–${s.hi}%`);
      }
    }
    out.push('', `Average total goals per match over every night and division: ${(goals / games).toFixed(2)}`);

    // One axis moved by 6 from an all-11 night: does defence count as much as attack?
    out.push('', 'One axis moved by 6 from all 11 (win % change): Div 6 / Div 3 / Crown');
    const base = Object.fromEntries(([6, 3, 1] as Tier[]).map((t) => [t, pc(run({ values: all(11) }, t).w)]));
    for (const a of AXES) for (const d of [6, -6]) {
      const v = { ...all(11), [a]: 11 + d };
      out.push(`  ${a} ${d > 0 ? '+' : ''}${d}: ${([6, 3, 1] as Tier[]).map((t) => { const x = pc(run({ values: v }, t).w) - base[t]; return `${x > 0 ? '+' : ''}${x}`; }).join(' / ')}`);
    }

    // With a 28-day typical shape (the mixed night): a better night than usual should score and save more.
    const typical = NIGHTS['mixed night'].values;
    out.push('', 'Against a 28-day typical shape (the mixed night), Div 6 / Div 3 / Crown wins %');
    const hist: Record<string, AxisValues> = {
      'typical night': typical, 'Rest 9→15': { ...typical, Rest: 15 }, 'Pace 16→8': { ...typical, Pace: 8 },
      'Routine 13→19': { ...typical, Routine: 19 }, 'Power 16→10': { ...typical, Power: 10 }, 'Rest 9→5': { ...typical, Rest: 5 },
    };
    for (const [name, values] of Object.entries(hist)) out.push(`  ${name}: ${([6, 3, 1] as Tier[]).map((t) => pc(run({ values, typical }, t).w)).join(' / ')}`);

    // How good each kind of chance is (all-14 nights, Division Three), and how often each tag fires there.
    out.push('', 'Each kind of chance on an all-14 night in Division Three: average % (yours to score; yours to save)');
    const by = new Map<string, number[]>();
    const tags = new Map<string, number>();
    const clubs3 = CLUBS.filter((c) => c.tier === 3 && c.kind !== 'own' && c.rating != null);
    for (let i = 0; i < N; i++) {
      const ev = playMatch({ seed: 5000 + i * 7919, values: all(14), opp: opponentFor(clubs3[i % clubs3.length]), home: i % 2 === 0, captain: 'Pace', stack: 0, abilities: [], bench: [], pre: [], conds: [] });
      for (const c of ev.chances) { by.set(`${c.side} ${c.type}`, [...(by.get(`${c.side} ${c.type}`) ?? []), c.pct]); if (c.tag) tags.set(c.tag, (tags.get(c.tag) ?? 0) + 1); }
    }
    for (const [k, xs] of by) out.push(`  ${k}: ${Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)}% (${(xs.length / N).toFixed(1)} a match)`);
    out.push(`  tags per match: ${[...tags].map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(', ') || 'none'}`);

    const bands: Record<number, number[]> = {};
    for (const c of CLUBS) if (c.rating != null) (bands[c.tier] ??= []).push(c.rating);
    out.push('', `Club ratings by division: ${Object.entries(bands).map(([t, xs]) => `${t}: ${Math.min(...xs)}–${Math.max(...xs)}`).join(', ')}`);
    const text = out.join('\n');
    console.log(text);
    if (process.env.ENGINE_SIM_OUT) writeFileSync(process.env.ENGINE_SIM_OUT, `${text}\n`);
  }, 600_000);
});
