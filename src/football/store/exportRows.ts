// Stored matches as rows for the workbook's Matches sheet.
import type { MatchRow } from '../../export/workbook';
import { CLUBS } from '../data/load';
import { NATIONS } from '../events';
import type { StoredMatch } from './tables';

const COMP: Record<string, string> = { league: 'League', bigcup: 'Big Cup', tiercup: 'Tier cup', playoff: 'Playoffs', event: 'Event', worldcup: 'World Cup', continental: 'Continental Cup', clubworld: 'Club World Cup', friendly: 'Friendly' };
const nameOf = (id: string) => CLUBS.find((c) => c.id === id)?.name ?? NATIONS.find((n) => n.id === id)?.name ?? id;
export function matchRows(ms: StoredMatch[]): MatchRow[] {
  return [...ms].sort((a, b) => a.id.localeCompare(b.id)).map((m) => ({
    date: m.date, season: m.season, round: m.round ?? '', competition: COMP[m.comp] ?? m.comp, opponent: nameOf(m.opp),
    homeAway: m.round?.endsWith('Final') ? 'Neutral' : m.braboHome ? 'Home' : 'Away',
    score: `${m.score[0]}–${m.score[1]}${m.pens ? ` (${m.pens[0]}–${m.pens[1]} pens)` : ''}`, result: m.result, values: m.values,
  }));
}
