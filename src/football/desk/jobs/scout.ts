// Send a scout (desk spec §3–4, Fork 2): a die on a clock, 2 segments for a club, 4 for a division or the clubs
// abroad. When the clock is full the scout comes back with the morning parcel and the fog lifts (fog/fog.ts).
// Honest dice: a 6 has a shown chance to turn up a loan target (kept for Fork 3's market), and a 1 or 2 that ends a
// trip has a shown chance of a thin report (one find fewer). Both are drawn from the spend's seeded `r`.
import { LOANS } from '../../content/loans';
import { tierName } from '../../data/load';
import { beforeAfter, clockSize, factList, LEAD_PCT, pctOf, revealFor, scopeOf, THIN_PCT, type Fact } from '../../fog/fog';
import type { Tier } from '../../types';
import { segmentsFor, type Clock, type DeskView, type Die, type Effect, type JobDef, type Risk, type Target } from '../types';

type Club = { id: string; name: string; tier: number; facts: Set<Fact> };
const clubsOf = (v: DeskView): Club[] => (v.world?.clubs ?? []).map((c) => ({ ...c, facts: new Set(c.facts) }));
/** The clubs a target covers. */
function covered(v: DeskView, target: string): Club[] {
  const sc = scopeOf(target), all = clubsOf(v);
  return sc.kind === 'club' ? all.filter((c) => c.id === sc.id) : all.filter((c) => c.tier === (sc.kind === 'div' ? sc.tier : 0));
}
export const targetName = (v: DeskView, target: string) => {
  const sc = scopeOf(target);
  return sc.kind === 'abroad' ? 'the clubs abroad' : sc.kind === 'div' ? tierName(sc.tier as Tier) : v.world?.clubs.find((c) => c.id === sc.id)?.name ?? 'a club';
};
const seenOf = (cs: Club[]) => (cs.length ? Math.round(cs.reduce((t, c) => t + pctOf(c.facts), 0) / cs.length) : 100);
/** Still something to find: a club not fully known, or a division with a club whose surface is fogged. */
const findable = (v: DeskView, target: string) => Object.values(revealFor(target, covered(v, target))).some((f) => f.length > 0);

const scoutClocks = (v: DeskView) => v.clocks.filter((c) => c.job === 'scout');
const openClock = (v: DeskView, target: string) => scoutClocks(v).find((c) => c.target === target && c.filled < c.size);
/** The clock a die on this target fills: the open one, or a new one (a club can be scouted again until it is known). */
function clockFor(v: DeskView, target: string): Omit<Clock, 'opened'> & { filled: number; fresh: boolean } {
  const open = openClock(v, target);
  if (open) return { ...open, fresh: false };
  const n = scoutClocks(v).filter((c) => c.target === target).length;
  return { id: `scout:${target}:${n + 1}`, job: 'scout', target, name: `Scout: ${targetName(v, target)}`, size: clockSize(target), filled: 0, fresh: true };
}

interface Plan { clock: ReturnType<typeof clockFor>; n: 1 | 2; done: boolean; thin: boolean; risk?: Risk & { kind: 'lead' | 'thin' }; reveal: Record<string, Fact[]>; ba: [number, number] }
function plan(die: Die, v: DeskView, target: string, thin = false): Plan {
  const clock = clockFor(v, target), n = segmentsFor(die.value), done = clock.filled + n >= clock.size;
  const cs = covered(v, target);
  const reveal = done ? revealFor(target, cs, thin) : {};
  const sc = scopeOf(target);
  const where = sc.kind === 'club' ? targetName(v, target) : `a club in ${targetName(v, target)}`;
  const risk = die.value === 6 ? { kind: 'lead' as const, pct: LEAD_PCT, line: `a 6 can turn up a loan target at ${where}.` }
    : done && die.value <= 2 ? { kind: 'thin' as const, pct: THIN_PCT, line: 'a thin report: one find fewer.' } : undefined;
  return { clock, n, done, thin: done && thin, risk, reveal, ba: beforeAfter(cs, reveal) };
}

export const scout: JobDef = {
  id: 'scout',
  ink: '#8fdcb6',
  open: (v) => Boolean(v.world?.clubs.length),
  card: (v) => {
    const open = scoutClocks(v).find((c) => c.filled < c.size);
    return {
      title: 'Send a scout', ask: 'Where does the scout go?',
      line: open ? `${open.name.replace(/^Scout: /, '')}: ${open.filled} of ${open.size}. A club takes 2, a division 4.` : `World seen: ${seenOf(clubsOf(v))}%. A club takes 2, a division 4.`,
      chip: open ? `${open.filled} of ${open.size}` : 'New',
      ring: open ? { filled: open.filled, size: open.size } : undefined,
    };
  },
  targets(v) {
    const out: Target[] = [];
    if (!v.world) return out;
    const add = (id: string, line: string) => { if (!out.some((t) => t.id === id) && findable(v, id)) out.push({ id, name: targetName(v, id), line }); };
    for (const c of scoutClocks(v).filter((x) => x.filled < x.size)) add(c.target, `${c.filled} of ${c.size} done · on the road`);
    const all = clubsOf(v);
    const wide = (t: number) => add(`div:${t}`, `Every club's crest, rating and style · seen ${seenOf(all.filter((c) => c.tier === t))}% · 4 to fill`);
    wide(v.world.ownTier);
    const mine = all.filter((c) => c.tier === v.world!.ownTier).sort((a, b) => pctOf(a.facts) - pctOf(b.facts) || a.name.localeCompare(b.name));
    for (const c of mine) add(c.id, `Your division · known ${pctOf(c.facts)}% · 2 to fill`);
    for (const t of [1, 2, 3, 4, 5, 6].filter((x) => x !== v.world!.ownTier)) wide(t);
    add('abroad', `The clubs in Europe's cups · seen ${seenOf(all.filter((c) => c.tier === 0))}% · 4 to fill`);
    for (const c of all.filter((x) => x.tier !== v.world!.ownTier).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))) add(c.id, `${c.tier ? tierName(c.tier as Tier) : 'Abroad'} · known ${pctOf(c.facts)}% · 2 to fill`);
    return out;
  },
  blocked: (v) => (scout.targets!(v).length ? undefined : 'Every club is known'),
  preview(die, v, target) {
    const t = target ?? scout.targets!(v)[0]?.id;
    if (!t) return { head: 'Nothing left to find.', line: 'Every club is known.', gain: '0', others: '', effects: [] };
    const p = plan(die, v, t);
    const name = targetName(v, t), club = scopeOf(t).kind === 'club';
    const found = club ? factList(p.reveal[t] ?? []) : 'every crest, rating and style still hidden';
    return {
      head: die.value >= 5 ? 'Great.' : 'Done.',
      line: p.done
        ? `The scout comes back tomorrow from ${name} with ${found}: ${p.ba[0]}% to ${p.ba[1]}% ${club ? 'known' : 'seen'}.`
        : `${name}: ${p.clock.filled + p.n} of ${p.clock.size} on the road. The report comes when it is full.`,
      gain: `+${p.n}`,
      others: p.n === 2 ? 'A 1 to 4 would fill one.' : die.value <= 2 && p.done ? 'A 3 or 4 would end the trip with no chance of a thin report; a 5 or 6 fills two.' : 'A 5 or 6 would fill two.',
      effects: effectsOf(p, t),
      ...(p.risk ? { risk: { pct: p.risk.pct, line: p.risk.line } } : {}),
    };
  },
  spend(die, v, target, r) {
    const t = target ?? scout.targets!(v)[0]?.id;
    if (!t) return { effects: [] };
    const first = plan(die, v, t);
    const hit = first.risk ? r() * 100 < first.risk.pct : false;
    const p = first.risk?.kind === 'thin' && hit ? plan(die, v, t, true) : first;
    const effects = effectsOf(p, t);
    if (first.risk?.kind === 'lead' && hit) {
      const cs = covered(v, t);
      const club = cs[Math.floor(r() * cs.length)]?.id ?? t;
      effects.push({ kind: 'lead', club, loan: LOANS[Math.floor(r() * LOANS.length)].id });
    }
    const { clock } = p;
    return {
      effects,
      ...(first.risk ? { risk: { pct: first.risk.pct, line: first.risk.line, hit } } : {}),
      ...(clock.fresh ? { opens: [{ id: clock.id, job: 'scout' as const, target: t, name: clock.name, size: clock.size }] } : {}),
    };
  },
};

function effectsOf(p: Plan, target: string): Effect[] {
  const out: Effect[] = [{ kind: 'clock', clock: p.clock.id, n: p.n }];
  if (p.done) out.push({ kind: 'scout', target, reveal: p.reveal, before: p.ba[0], after: p.ba[1], ...(p.thin ? { thin: true } : {}) });
  return out;
}
