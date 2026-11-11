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
import { AXES, type Axis, type AxisValues, type MatchEvents, type Tier } from '../../src/football/types';

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

// Matchday depth (spec 2026-11-12 §2.7): calls left to the assistant, the read, and the best calls possible.
//   ENGINE_SIM=1 TZ=UTC npx vitest run tests/football/engine-sim.test.ts -t matchday
describe.skipIf(!process.env.ENGINE_SIM)('matchday simulation', () => {
  type Extra = Partial<engine.MatchInput>;
  const M = Number(process.env.ENGINE_SIM_N ?? 3000);
  function wins(n: Night, tier: Tier, extra: (i: number) => Extra, count = M) {
    const clubs = CLUBS.filter((c) => c.tier === tier && c.kind !== 'own' && c.rating != null);
    let w = 0, d = 0, g = 0;
    for (let i = 0; i < count; i++) {
      const ev = playMatch({ seed: 1000 + i * 7919 + tier, values: n.values, opp: opponentFor(clubs[i % clubs.length]), home: i % 2 === 0, captain: 'Pace', stack: 0, abilities: [], bench: [], pre: [], conds: [], ...(n.fog ? { fog: n.fog } : {}), ...(n.typical ? { typical: n.typical } : {}), ...extra(i) });
      const [a, b] = ev.score;
      g += a + b; if (a > b) w++; else if (a === b) d++;
    }
    return { w: (100 * w) / count, d: (100 * d) / count, g: g / count };
  }
  /** Best calls with hindsight: at each call in turn, the option that ends with the best goal difference. */
  function best(base: engine.MatchInput): MatchEvents {
    const picks: engine.CallPick[] = [];
    let ev = playMatch({ ...base, calls: picks });
    for (let k = 0; k < (ev.calls?.length ?? 0); k++) {
      let top: { gd: number; ev: MatchEvents; p: engine.CallPick } | undefined;
      for (const p of ['take', 'shoot', 'keep'] as engine.CallPick[]) {
        const e = playMatch({ ...base, calls: [...picks, p] });
        const gd = e.score[0] - e.score[1];
        if (!top || gd > top.gd) top = { gd, ev: e, p };
      }
      picks.push(top!.p); ev = top!.ev;
    }
    return ev;
  }
  it('prints the matchday report', () => {
    const out: string[] = [`Matchday simulation, ${M} matches per night and division. Win % without calls → with calls left to the assistant (best odds). Goals per match likewise.`];
    let g0 = 0, g1 = 0, n = 0, worst = 0;
    for (const [name, night] of Object.entries(NIGHTS)) {
      const row: string[] = [];
      for (const t of TIER_ORDER) {
        const a = wins(night, t, () => ({})), b = wins(night, t, () => ({ calls: [] }));
        g0 += a.g; g1 += b.g; n++; worst = Math.max(worst, Math.abs(b.w - a.w));
        row.push(`T${t} ${a.w.toFixed(0)}→${b.w.toFixed(0)}`);
      }
      out.push(`  ${name}: ${row.join('  ')}`);
    }
    out.push(`Goals per match: ${(g0 / n).toFixed(2)} without calls, ${(g1 / n).toFixed(2)} with the assistant's calls. Largest win-rate change in any night and division: ${worst.toFixed(1)} points.`);
    // The read and one good log, on the mixed night against Division Six and Division Three (calls to the assistant).
    const mixed = NIGHTS['mixed night'];
    out.push('', 'The read against one good log (mixed night, assistant calls): win % in Div 6 / Div 3');
    const cases: [string, (i: number) => Extra, Night][] = [
      ['neutral read', () => ({ calls: [] }), mixed],
      ['one right read (+1 Fuel)', () => ({ calls: [], plan: { all: [{ axis: 'Fuel', d: 1, why: 'read', kind: 'plan' }] } }), mixed],
      ['perfect read (+1 Fuel, +1 Pace)', () => ({ calls: [], plan: { all: [{ axis: 'Fuel', d: 1, why: 'read', kind: 'plan' }, { axis: 'Pace', d: 1, why: 'read', kind: 'plan' }] } }), mixed],
      ['one good log instead (Pace 16→19)', () => ({ calls: [] }), { values: { ...mixed.values, Pace: 19 } }],
      ['one good log instead (Rest 9→12)', () => ({ calls: [] }), { values: { ...mixed.values, Rest: 12 } }],
      ['quick tempo', () => ({ calls: [], plan: { tempo: 'quick' } }), mixed],
      ['patient tempo', () => ({ calls: [], plan: { tempo: 'patient' } }), mixed],
    ];
    for (const [label, ex, night] of cases) out.push(`  ${label}: ${([6, 3] as Tier[]).map((t) => wins(night, t, ex).w.toFixed(1)).join(' / ')}`);
    // Best possible calls against the assistant's, in a close division for each night shape.
    out.push('', 'Best possible calls (hindsight) against the assistant: win % in the closest division for the night');
    const B = Math.min(M, 1500);
    for (const name of ['all 11', 'all 14', 'mixed night', 'all 17']) {
      const night = NIGHTS[name];
      let closest: Tier = 6, gap = 1e9;
      for (const t of TIER_ORDER) { const x = Math.abs(wins(night, t, () => ({ calls: [] }), 400).w - 45); if (x < gap) { gap = x; closest = t; } }
      const clubs = CLUBS.filter((c) => c.tier === closest && c.kind !== 'own' && c.rating != null);
      let wa = 0, wb = 0;
      for (let i = 0; i < B; i++) {
        const base: engine.MatchInput = { seed: 1000 + i * 7919 + closest, values: night.values, opp: opponentFor(clubs[i % clubs.length]), home: i % 2 === 0, captain: 'Pace', stack: 0, abilities: [], bench: [], pre: [], conds: [] };
        const a = playMatch({ ...base, calls: [] }), b = best(base);
        if (a.score[0] > a.score[1]) wa++;
        if (b.score[0] > b.score[1]) wb++;
      }
      out.push(`  ${name}, Div ${closest}: assistant ${((100 * wa) / B).toFixed(1)}%, best calls ${((100 * wb) / B).toFixed(1)}%, gap ${((100 * (wb - wa)) / B).toFixed(1)} points`);
    }
    const text = out.join('\n');
    console.log(text);
    if (process.env.ENGINE_SIM_OUT) writeFileSync(process.env.ENGINE_SIM_OUT.replace(/(\.\w+)?$/, '-matchday$1'), `${text}\n`);
  }, 1_800_000);
});

