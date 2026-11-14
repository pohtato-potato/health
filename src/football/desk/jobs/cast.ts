// Time with the cast (desk spec §3, §7; Fork 4): one die, no clock. Bond points with one member: 3 on a 5 or 6, 2 on
// a 3 or 4, 1 on a 1 or 2. Sometimes they ask for something (a shown chance, drawn from the spend's seed); met by a
// real habit, the ask brings more. Their greeting is warm or cool by tone; a cool tone never costs a point.
import type { CastId } from '../../content/desk/types';
import { ASK_CHANCE, castById, DESK_POINTS, rankOf, RANK_AT } from '../../cast/bonds';
import { hashSeed, rng } from '../../rng';
import { qualityOf, type DeskView, type Die, type Effect, type JobDef, type Target } from '../types';

const members = (v: DeskView) => v.cast?.members ?? [];
const memberOf = (v: DeskView, id?: string) => members(v).find((m) => m.id === id) ?? members(v)[0];

/** Their greeting today, warm or cool by tone, seeded by the day so it holds still while you choose. */
export function greeting(id: CastId, tone: 'warm' | 'cool', date: string): string {
  const lines = castById(id)?.greet[tone] ?? [];
  return lines.length ? lines[Math.floor(rng(hashSeed('cast-greet', id, date))() * lines.length)] : '';
}

function plan(die: Die, v: DeskView, id?: string) {
  const m = memberOf(v, id)!;
  const n = DESK_POINTS[qualityOf(die.value)];
  const after = m.points + n;
  const asks = castById(m.id)?.asks ?? [];
  const ask = m.askOpen || !asks.length ? undefined : Math.floor(rng(hashSeed('cast-ask', m.id, v.date))() * asks.length);
  return { m, n, after, up: rankOf(after) > m.rank, ask };
}

export const cast: JobDef = {
  id: 'cast',
  ink: '#f4aedb',
  open: (v) => members(v).length > 0,
  card: (v) => {
    const top = [...members(v)].sort((a, b) => b.rank - a.rank || b.points - a.points)[0];
    return {
      title: 'Time with the cast', ask: 'Who do you sit down with?',
      line: top ? `${members(v).length} people around the club. Closest so far: ${top.name}, rank ${top.rank}.` : '',
      chip: 'One die',
    };
  },
  targets: (v): Target[] => members(v).map((m) => ({
    id: m.id, name: `${m.name}, ${m.role.toLowerCase()}`,
    line: m.rank >= 10 ? 'Rank 10' : `Rank ${m.rank} · ${m.toNext} to rank ${m.rank + 1}${m.askOpen ? ' · an ask is open' : ''}`,
  })),
  preview(die, v, target) {
    if (!members(v).length) return { head: 'No one in.', line: '', gain: '0', others: '', effects: [] };
    const p = plan(die, v, target);
    const effects: Effect[] = [{ kind: 'bond', member: p.m.id, n: p.n }];
    const next = p.m.rank < 10 ? RANK_AT[p.m.rank] : undefined;
    return {
      head: greeting(p.m.id, p.m.tone, v.date),
      line: p.up ? `Rank ${p.m.rank + 1} with ${p.m.name}: a new scene.` : next ? `${p.m.name}: ${p.after} of ${next} toward rank ${p.m.rank + 1}.` : `${p.m.name}: rank 10, and still glad of the company.`,
      gain: `+${p.n}`,
      others: p.n === 3 ? 'A 3 or 4 would give 2, a 1 or 2 would give 1.' : p.n === 2 ? 'A 5 or 6 would give 3.' : 'A 3 or more would give more.',
      effects,
      ...(p.ask !== undefined ? { risk: { pct: ASK_CHANCE, line: `${ASK_CHANCE}% chance ${p.m.name} asks you for something. Meeting it brings 4 more; missing it costs nothing.` } } : {}),
    };
  },
  spend(die, v, target, r) {
    if (!members(v).length) return { effects: [] };
    const p = plan(die, v, target);
    const effects: Effect[] = [{ kind: 'bond', member: p.m.id, n: p.n }];
    if (p.ask === undefined) return { effects };
    const hit = r() * 100 < ASK_CHANCE;
    if (hit) effects.push({ kind: 'ask', member: p.m.id, ask: p.ask });
    return { effects, risk: { pct: ASK_CHANCE, line: `${p.m.name} might ask for something`, hit } };
  },
};
