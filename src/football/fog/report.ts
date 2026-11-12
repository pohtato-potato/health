// A scout comes back (p3-scout): what was found, known % before and after, what is still hidden, one line in the
// scout's voice. Pure; the words come through `fog/words.ts`.
import type { DayKey } from '../../domain/dates';
import { hashSeed } from '../rng';
import { FACTS, factList, scopeOf, type Fact, type ScoutEffect } from './fog';
import { CLUB_LORE, DIVISION_REPORTS, SCOUT_REPORT, SCOUT_THIN, STILL_HIDDEN, type Finding } from './words';

export interface ScoutReport {
  target: string;
  /** The club or the division, in words. */
  name: string;
  /** For a club: its id (crest, page), and its division this season (0 = abroad), when the store knows it. */
  club?: string;
  tier?: number;
  before: number;
  after: number;
  /** For a club: what this trip found, and what is still hidden after it. */
  found: Fact[];
  hidden: Fact[];
  /** For a division or abroad: how many clubs gave something up. */
  clubs: number;
  thin: boolean;
  /** The scout's line. */
  line: string;
  /** A loan target the trip turned up, kept for the loan market. */
  lead?: { club: string; clubName: string; player: string };
}

const FINDING: Record<Fact, Finding> = { kit: 'kit', rating: 'rating', style: 'style', weak: 'weak-side', known: 'style', hidden: 'hidden', manager: 'manager', history: 'history' };
const pick = (lines: string[], seed: number) => lines[seed % lines.length] ?? '';
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

/**
 * One report from a scout effect. `known`: what is known of the club now (for what is still hidden). `names` gives a
 * club's or a division's name; `player` a loan's name.
 */
export function reportOf(e: ScoutEffect, day: DayKey, o: { name: (target: string) => string; known: (club: string) => Set<Fact>; player: (loan: string) => string; lead?: { club: string; loan: string } }): ScoutReport {
  const sc = scopeOf(e.target);
  const seed = hashSeed('scout-report', day, e.target);
  const name = o.name(e.target);
  const lead = o.lead ? { club: o.lead.club, clubName: o.name(o.lead.club), player: o.player(o.lead.loan) } : undefined;
  if (sc.kind === 'club') {
    const found = FACTS.filter((f) => (e.reveal[sc.id] ?? []).includes(f));
    const now = o.known(sc.id);
    const hidden = FACTS.filter((f) => !now.has(f));
    const lore = CLUB_LORE[sc.id];
    const v = { club: name, before: e.before, after: e.after, manager: lore?.manager.name ?? 'their manager', found: factList(hidden.slice(0, 2)) };
    const best = found.length ? FINDING[found[found.length - 1]] : 'nothing-new';
    const line = e.thin ? pick(SCOUT_THIN, seed) : fill(pick(SCOUT_REPORT[best], seed), v);
    return { target: e.target, name, club: sc.id, before: e.before, after: e.after, found, hidden, clubs: 1, thin: Boolean(e.thin), line, lead };
  }
  const clubs = Object.values(e.reveal).filter((f) => f.length).length;
  const line = e.thin ? pick(SCOUT_THIN, seed) : fill(pick(DIVISION_REPORTS, seed), { division: name, before: e.before, after: e.after });
  return { target: e.target, name, before: e.before, after: e.after, found: [], hidden: [], clubs, thin: Boolean(e.thin), line, lead };
}

/** "Still hidden: their manager and history." in the scout's voice, or nothing when the club is known. */
export function stillHidden(r: ScoutReport, day: DayKey): string | undefined {
  if (!r.club || !r.hidden.length) return undefined;
  return fill(pick(STILL_HIDDEN, hashSeed('scout-hidden', day, r.target)), { found: factList(r.hidden.slice(0, 2)) });
}

/** The loan target's line, in the scout's voice. */
export function leadLine(r: ScoutReport, day: DayKey): string | undefined {
  if (!r.lead) return undefined;
  return fill(pick(SCOUT_REPORT['loan-target'], hashSeed('scout-lead', day, r.target)), { club: r.lead.clubName, player: r.lead.player });
}
