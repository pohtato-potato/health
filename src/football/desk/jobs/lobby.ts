// Lobby before the congress (desk spec §3, §6; Fork 4): one die, no clock, only in the fortnight before a congress.
// It wins one club's vote on a motion, your way, at a shown risk of annoying another club: the one leaning hardest the
// other way. The chance shown is the chance used, drawn from the spend's seed. Vote first in the congress hall.
import { annoyedBy, LOBBY_ANNOY, lobbyKey, lobbyRisk, motionById, parseLobby, swingClubs, type Lobbied } from '../../congress/congress';
import { perkValue } from '../../cast/bonds';
import { qualityOf, type DeskView, type Die, type Effect, type JobDef, type Target } from '../types';

const nameOf = (v: DeskView, id: string) => v.congress?.clubs.find((c) => c.id === id)?.name ?? id;
const opinion = (v: DeskView) => (id: string) => v.congress?.clubs.find((c) => c.id === id)?.opinion ?? 0;
const ids = (v: DeskView) => (v.congress?.clubs ?? []).map((c) => c.id);
const voted = (v: DeskView) => (v.congress?.motions ?? []).filter((m) => m.brabo !== 'abstain');

function options(v: DeskView): Lobbied[] {
  const out: Lobbied[] = [];
  for (const m of voted(v)) {
    const def = motionById(m.id);
    if (!def) continue;
    const side = m.brabo as 'for' | 'against';
    for (const club of swingClubs(def, side, ids(v), opinion(v), v.congress!.lobbied)) out.push({ club, motion: m.id, side });
  }
  return out;
}

function plan(die: Die, v: DeskView, key: string) {
  const l = parseLobby(key)!;
  const m = motionById(l.motion)!;
  const pct = lobbyRisk(die.value, perkValue(v.perks ?? [], 'lobby-risk'));
  const other = annoyedBy(m, l.club, l.side, ids(v), v.congress!.lobbied.filter((x) => x.motion === l.motion).map((x) => x.club));
  const won: Effect = { kind: 'lobby', season: v.congress!.season, motion: l.motion, side: l.side, club: l.club };
  const annoy: Effect | undefined = other ? { kind: 'opinion', club: other, d: LOBBY_ANNOY, why: `You lobbied ${nameOf(v, l.club)} on ${m.name.toLowerCase()}`, move: 'lobby' } : undefined;
  return { l, m, pct: other ? pct : 0, other, won, annoy };
}

export const lobby: JobDef = {
  id: 'lobby',
  ink: '#ffd36b',
  open: (v) => Boolean(v.congress?.open),
  card: (v) => {
    const c = v.congress;
    const left = c?.daysLeft;
    return {
      title: 'Lobby before the congress', ask: 'Whose vote do you go after?',
      line: !c ? '' : voted(v).length
        ? `${c.motions.length} motions before season ${c.season}. ${c.lobbied.length} ${c.lobbied.length === 1 ? 'vote' : 'votes'} won so far.`
        : 'Cast your vote in the congress hall first, then win others to it.',
      chip: left !== undefined ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Congress soon',
    };
  },
  targets: (v): Target[] => options(v).map((o) => {
    const m = motionById(o.motion)!;
    const op = opinion(v)(o.club);
    return { id: lobbyKey(o), name: `${nameOf(v, o.club)}: ${o.side} ${m.name.toLowerCase()}`, line: `Opinion of you ${op > 0 ? '+' : ''}${op}` };
  }),
  blocked: (v) => (!voted(v).length ? 'Vote in the congress hall first' : options(v).length ? undefined : 'Every vote worth winning is won'),
  preview(die, v, target) {
    const key = target ?? (options(v)[0] ? lobbyKey(options(v)[0]) : undefined);
    if (!key || !parseLobby(key) || !v.congress) return { head: 'No one to lobby.', line: 'Vote in the congress hall first.', gain: '0', others: '', effects: [] };
    const p = plan(die, v, key);
    const q = qualityOf(die.value);
    return {
      head: q === 'well' ? 'Smooth.' : q === 'does' ? 'Done.' : 'Clumsy.',
      line: `${nameOf(v, p.l.club)} vote ${p.l.side} ${p.m.name.toLowerCase()} at the congress.`,
      gain: '+1 vote',
      others: q === 'well' ? `A lower die would risk more (${lobbyRisk(3)}% on a 3 or 4).` : `A 5 or 6 would risk only ${lobbyRisk(5, perkValue(v.perks ?? [], 'lobby-risk'))}%.`,
      effects: [p.won],
      ...(p.other ? { risk: { pct: p.pct, line: `${p.pct}% chance ${nameOf(v, p.other)} hear of it and cool on you (${LOBBY_ANNOY}).` } } : {}),
    };
  },
  spend(die, v, target, r) {
    const key = target ?? (options(v)[0] ? lobbyKey(options(v)[0]) : undefined);
    if (!key || !parseLobby(key) || !v.congress) return { effects: [] };
    const p = plan(die, v, key);
    if (!p.other) return { effects: [p.won] };
    const hit = r() * 100 < p.pct;
    return { effects: hit && p.annoy ? [p.won, p.annoy] : [p.won], risk: { pct: p.pct, line: `${nameOf(v, p.other)} might hear of it`, hit } };
  },
};

/** The votes won by lobbying for one congress, from the desk's log. */
export function lobbiesFor(spends: { effects: Effect[] }[], season: number): Lobbied[] {
  return spends.flatMap((s) => s.effects.flatMap((e) => (e.kind === 'lobby' && e.season === season ? [{ club: e.club, motion: e.motion, side: e.side }] : [])));
}
