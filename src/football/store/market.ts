// The loan market and relations, read from the save (desk spec §5, Fork 3). Nothing here writes: talks and studies
// are desk spends (store/desk.ts `spendAt`), deals are folded at 4 am (desk/fold.ts).
import { db } from '../../db/db';
import type { DayKey } from '../../domain/dates';
import { clubById } from '../data/load';
import type { DeskState, MarketView } from '../desk/types';
import type { TalkRow } from '../market/market';
import { loanLeads } from '../fog/fog';
import { leadsFrom, marketSlot } from '../market/market';
import { CUP_COMPS, opinionOf, type RelationSource } from '../market/relations';
import type { FbSave, StoredMatch } from './tables';
import { globeOf } from './globe';
import { OWN } from './season';

const nameOf = (id: string) => { try { return clubById(id).name; } catch { return 'A club'; } };
const deskOf = (s: Pick<FbSave, 'desk'>): DeskState | undefined => s.desk;

/** Brabo's cup ties, for relations. */
export const cupTies = (matches: Pick<StoredMatch, 'opp' | 'date' | 'result' | 'comp'>[]) =>
  matches.filter((m) => CUP_COMPS.includes(m.comp)).map((m) => ({ opp: m.opp, date: m.date, result: m.result, comp: m.comp }));

/** What relations are worked out from. `matches`: Brabo's stored matches (only cup ties count). */
export function relationSourceOf(save: FbSave, matches: Pick<StoredMatch, 'opp' | 'date' | 'result' | 'comp'>[]): RelationSource {
  return { rivals: save.rivals.map((r) => r.clubId), desk: deskOf(save), ties: cupTies(matches), stays: globeOf(save).loans };
}
export async function loadRelations(save: FbSave): Promise<RelationSource> {
  return relationSourceOf(save, await db.fbMatches.where('comp').anyOf(CUP_COMPS).toArray());
}

/** Every round of talks in the desk's log, with its day. */
export const talkRows = (desk: DeskState | undefined): TalkRow[] =>
  (desk?.spends ?? []).flatMap((s) => s.effects.flatMap((e) => (e.kind === 'talk' ? [{ day: s.day, e }] : [])));

/** Deals struck and not yet folded in (their day hasn't played): they hold the market slot already. */
export function pendingDeals(save: FbSave): { loan: string; days: number; day: DayKey }[] {
  const stays = globeOf(save).loans;
  return (save.desk?.spends ?? []).flatMap((s) => s.effects.flatMap((e) =>
    e.kind === 'deal' && (save.lastPlayed === undefined || s.day > save.lastPlayed) && !stays.some((x) => x.key === `market:${e.talk}:${e.n}`) ? [{ loan: e.loan, days: e.days, day: s.day }] : []));
}

/**
 * The market as the desk's jobs see it. Targets show from the morning after the scout found them (the report comes
 * with the parcel), as Fork 2 tells them.
 */
export function marketViewOf(save: FbSave, date: DayKey, tierOf: Record<string, number> | undefined, rel: RelationSource): MarketView {
  const ownTier = tierOf?.[OWN] ?? 6;
  const leads = leadsFrom(loanLeads(save.desk).filter((l) => l.day < date)).map((l) => ({
    ...l, clubName: nameOf(l.club), opinion: opinionOf(rel, l.club), poach: (tierOf?.[l.club] ?? -1) === ownTier,
  }));
  return {
    ownTier, budget: save.budget, leads, talks: talkRows(save.desk),
    slot: marketSlot(globeOf(save).loans, pendingDeals(save), date),
    offers: (save.offers ?? []).map((o) => ({ slot: o.slot, brand: o.brand, what: o.what, risk: o.risk, perSeason: o.perSeason, seasons: o.seasons })),
  };
}
