// The world in fog, read (desk spec §4, Fork 2). Nothing here writes: what is known is worked out from the save
// (fog/fog.ts), and the scout job writes only the desk's own log.
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { LOANS } from '../content/loans';
import { ABROAD } from '../data/continental';
import { clubById, tierName } from '../data/load';
import type { WorldView } from '../desk/types';
import { factsOf, fogged, knownPct, loanLeads, scopeOf, type Fact, type FogSource } from '../fog/fog';
import { reportOf, type ScoutReport } from '../fog/report';
import type { Tier } from '../types';
import { OWN } from './season';
import type { FbSave } from './tables';

/** Today's logging day: scout reports count from the morning after their trip. */
export const fogToday = (now = Date.now()) => dayOfLogging(now);

/** Every fogged club in reach: the league's by their tier this season, and the clubs abroad (tier 0). */
export function fogClubs(tierOf: Record<string, Tier> | undefined): { id: string; tier: number }[] {
  const league = Object.entries(tierOf ?? {}).filter(([id]) => id !== OWN && fogged(id)).map(([id, tier]) => ({ id, tier }));
  const have = new Set(league.map((c) => c.id));
  return [...league, ...ABROAD.filter((c) => !have.has(c.id)).map((c) => ({ id: c.id, tier: 0 }))];
}

/** What the scout job sees: every club with all it will know (a report still on its way counts: the desk plans with it). */
export function worldView(save: FbSave, tierOf: Record<string, Tier> | undefined): WorldView | undefined {
  if (!tierOf) return undefined;
  return {
    ownTier: tierOf[OWN] ?? 6,
    clubs: fogClubs(tierOf).map((c) => ({ id: c.id, name: clubById(c.id).name, tier: c.tier, facts: [...factsOf(save, c.id)] })),
  };
}

/** A target's name: a club, a division, or the clubs abroad. */
export const targetWords = (target: string) => {
  const sc = scopeOf(target);
  return sc.kind === 'abroad' ? 'The clubs abroad' : sc.kind === 'div' ? tierName(sc.tier as Tier) : clubById(sc.id).name;
};

/** The scout reports that came in this morning: trips that ended yesterday, and any loan target a 6 turned up. */
export function morningReports(save: FbSave, today: DayKey): { reports: ScoutReport[]; leads: { club: string; clubName: string; player: string }[] } {
  const y = addDays(today, -1);
  const reports: ScoutReport[] = [];
  const used = new Set<string>();
  for (const s of (save.desk?.spends ?? []).filter((x) => x.day === y)) {
    const lead = s.effects.find((e) => e.kind === 'lead');
    for (const e of s.effects) {
      if (e.kind !== 'scout') continue;
      if (lead?.kind === 'lead') used.add(`${s.id}`);
      reports.push(reportOf(e, y, {
        name: targetWords, known: (id) => factsOf(save, id, today), player: (l) => LOANS.find((x) => x.id === l)?.name ?? 'A player',
        lead: lead?.kind === 'lead' ? { club: lead.club, loan: lead.loan } : undefined,
      }));
    }
  }
  const leads = (save.desk?.spends ?? []).filter((s) => s.day === y && !used.has(s.id)).flatMap((s) => s.effects.flatMap((e) => (e.kind === 'lead' ? [{ club: e.club, clubName: clubById(e.club).name, player: LOANS.find((x) => x.id === e.loan)?.name ?? 'A player' }] : [])));
  return { reports, leads };
}

/** One club as the fog shows it today. */
export interface ClubFog { facts: Set<Fact>; pct: number; met: boolean }
export const clubFog = (save: FogSource, id: string, today = fogToday()): ClubFog => ({ facts: factsOf(save, id, today), pct: knownPct(save, id, today), met: save.met.includes(id) });

export { loanLeads };
