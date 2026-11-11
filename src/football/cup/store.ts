// Cup runs' only writer: the run (for now, a single try match) in the cupRuns table, saved after every card.
// Layer 3 (the map, stops and market) adds its fields to CupRun; a try match has none of them.
import { db } from '../../db/db';
import { dayOfLogging, type DayKey } from '../../domain/dates';
import { clubById, rememberClubs } from '../data/load';
import { loanById } from '../globe/loans';
import { hashSeed } from '../rng';
import { loadHealth } from '../store/gather';
import { OWN } from '../store/season';
import { clubSpec } from './clubs';
import { dealDeck, type Deal } from './deck';
import { dealInputFor } from './gather';
import { newMatch, type MatchState } from './match';

export interface CupRun {
  /** 'current': one run in progress at a time (spec §2). */
  id: 'current';
  kind: 'try';
  /** The day it started; the deck is a copy from that morning and is kept until the run ends (spec §3.4). */
  date: DayKey;
  deal: Deal;
  match: MatchState;
  startedAt: number;
}

/** Today's deck, from the last seven days. Read-only. */
export async function dealToday(today: DayKey = dayOfLogging(Date.now())): Promise<Deal> {
  const [h, save] = await Promise.all([loadHealth(), db.fbSave.get('save')]);
  const loans = (save?.globe?.loans ?? [])
    .filter((l) => l.from <= today && today <= l.until)
    .map((l) => ({ id: l.loan, name: loanById(l.loan)?.name ?? 'Loan player', axis: l.unit }));
  return dealDeck(dealInputFor(h, today, loans));
}

/** A club from Brabo's own division, picked by the day and the try count, never Brabo. */
async function clubNearLevel(seed: number) {
  const save = await db.fbSave.get('save');
  const season = save ? await db.fbSeasons.get(save.season) : undefined;
  const tier = season?.tierOf[OWN] ?? 6;
  const stored = await db.fbClubs.toArray();
  rememberClubs(stored);
  const pool = stored.filter((c) => c.tier === tier && c.id !== OWN && !c.folded);
  const pick = pool[seed % Math.max(1, pool.length)];
  if (!pick) throw new Error('no clubs');
  const def = clubById(pick.id);
  // Scouted (spec §5.3): met in the league.
  const met = (await db.fbMatches.where('comp').equals('league').filter((m) => m.opp === pick.id).count()) > 0;
  return clubSpec({ id: pick.id, name: def.name, short: def.short, rating: pick.rating, tier, style: pick.style, colours: def.colours }, met);
}

export const loadRun = () => db.cupRuns.get('current');

/** Deals today's deck and kicks off a try match against a club near your level. */
export async function startTry(now = Date.now()): Promise<CupRun> {
  const date = dayOfLogging(now);
  const deal = await dealToday(date);
  const seed = hashSeed('cup-try', date, String(now));
  const club = await clubNearLevel(seed);
  const run: CupRun = { id: 'current', kind: 'try', date, deal, match: newMatch({ seed, deck: deal.cards, club }), startedAt: now };
  await db.cupRuns.put(run);
  return run;
}

/** Saves the match after every card. */
export async function saveMatch(match: MatchState): Promise<void> {
  await db.cupRuns.update('current', { match });
}
export const endRun = () => db.cupRuns.delete('current');
