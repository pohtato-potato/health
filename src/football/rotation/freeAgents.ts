// Free agents and buy-back (spec §6). A player who leaves signs for another club in your division, chosen by need:
// the weakest club without one of ours in that unit yet. While it holds the player, its matching unit gets +1 against
// you. Buy-back never expires: re-add the exercise or habit, then pay the clause from the budget.
import type { DayKey } from '../../domain/dates';
import { buyBack } from '../content/money';
import { hashSeed } from '../rng';
import type { Tier } from '../types';
import type { FbPlayer, Unit } from '../players/types';
import type { FbNews } from '../store/tables';

export interface ClubSeat { id: string; name: string; rating: number }

/** Signs every departed player without a club yet. Old departures found at once share one news line. */
export function signFreeAgents(roster: Map<string, FbPlayer>, date: DayKey, clubs: ClubSeat[]): { roster: Map<string, FbPlayer>; news: FbNews[] } {
  const next = new Map(roster);
  const news: FbNews[] = [];
  const leaving = [...next.values()].filter((p) => p.status === 'left' && !p.freeAgent).sort((a, b) => (a.leftOn ?? '').localeCompare(b.leftOn ?? '') || a.id.localeCompare(b.id));
  if (!leaving.length || !clubs.length) return { roster: next, news };
  const held = (club: string, unit: Unit) => [...next.values()].filter((p) => p.freeAgent?.club === club && p.unit === unit).length;
  const signed: { p: FbPlayer; club: ClubSeat }[] = [];
  for (const p of leaving) {
    const club = [...clubs].sort((a, b) => held(a.id, p.unit) - held(b.id, p.unit) || a.rating - b.rating || (hashSeed(p.id, a.id) % 97) - (hashSeed(p.id, b.id) % 97))[0];
    next.set(p.id, { ...p, freeAgent: { club: club.id, on: date } });
    signed.push({ p, club });
  }
  if (signed.length <= 2) {
    for (const { p, club } of signed) news.push({ id: `${date}:agent:${p.id}`, date, kind: 'club', clubId: club.id, text: `${p.name} signs for ${club.name}. Their ${p.unit} is +1 against us while the player is there. The buy-back clause never expires.` });
  } else {
    news.push({ id: `${date}:agents`, date, kind: 'club', text: `${signed.length} former players have found new clubs: ${signed.map(({ p, club }) => `${p.name} (${club.name})`).join(', ')}. Every buy-back clause stays open.` });
  }
  return { roster: next, news };
}

/** The units in which a club holds one of our free agents, named for the nudge line. */
export function agentsAt(roster: Iterable<FbPlayer>, clubId: string): Partial<Record<Unit, string>> {
  const out: Partial<Record<Unit, string>> = {};
  for (const p of roster) if (p.freeAgent?.club === clubId && !out[p.unit]) out[p.unit] = p.name;
  return out;
}

/** The clause: wage units at today's division, by the card's best tier (content/money.ts). */
export const clauseFor = (p: Pick<FbPlayer, 'card'>, tier: Tier) => buyBack(p.card.tier, tier);

/** Whether the player can come home now, and why not when it can't. */
export function canBuyBack(p: FbPlayer, budget: number, tier: Tier): { ok: boolean; fee: number; why?: string } {
  const fee = clauseFor(p, tier);
  if (p.status !== 'left' || !p.freeAgent) return { ok: false, fee, why: 'Not a free agent.' };
  if (!p.freeAgent.readded) return { ok: false, fee, why: p.kind === 'exercise' ? 'Re-add it to the coach’s plan first.' : 'Turn the habit back on first.' };
  if (budget < fee) return { ok: false, fee, why: 'The budget can’t cover the clause yet. Buying waits until it can; there’s no debt.' };
  return { ok: true, fee };
}

/** Pays the clause: the player returns with its history, card and attributes as they were. */
export function bringHome(p: FbPlayer, date: DayKey): FbPlayer {
  const { freeAgent: _gone, ...rest } = p;
  return { ...rest, status: 'squad', leftOn: undefined, on: date };
}
