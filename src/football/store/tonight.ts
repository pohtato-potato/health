// What Brabo plays next, read from the save and the season (no writes).
import { addDays, type DayKey } from '../../domain/dates';
import { seasonDays, SEASON_DAYS } from '../calendar';
import { contNight } from '../continental';
import { EVENTS } from '../events';
import { physio, cards } from '../discipline';
import type { Comp, Mod, Tier } from '../types';
import { medsTaken, type Health } from './gather';
import { OWN } from './season';
import type { FbSave, FbSeason } from './tables';

export interface Fixture {
  day: number;
  comp: Comp;
  /** "Day 19 of 42", the day of the season (league and cup nights both count), or the event's day. */
  label: string;
  round?: string;
  /** Empty when the opponent is drawn on the night (friendlies, events, playoffs). */
  home: string;
  away: string;
  opp: string;
  braboHome: boolean;
}

/** The continental match on a double-header night, when Brabo are in the field: "The Continental Cup, league phase 3 of 8, away at Benfica". */
export function contTonight(save: FbSave, season: FbSeason, name: (id: string) => string): string | undefined {
  if (save.phase !== 'season') return undefined;
  const night = contNight(save.day), c = season.continental;
  if (!night || !c?.field.includes(OWN)) return undefined;
  let pair: [string, string] | undefined, label = '';
  if (night.stage === 'phase') { pair = c.rounds[night.round - 1]?.find(([h, a]) => h === OWN || a === OWN); label = `league phase ${night.round} of 8`; }
  else {
    const r = c.ko?.rounds[night.stage === 'qf' ? 0 : night.stage === 'sf' ? 1 : 2];
    const t = r?.ties.find((x) => (x.home === OWN || x.away === OWN) && x.away);
    if (t) pair = [t.home, t.away!];
    label = r?.name.toLowerCase() ?? '';
  }
  if (!pair) return undefined;
  const opp = pair[0] === OWN ? pair[1] : pair[0];
  return `Also tonight: The Continental Cup, ${label}, ${night.stage === 'final' ? 'v' : pair[0] === OWN ? 'home to' : 'away at'} ${name(opp)}.`;
}

export function fixtureFor(save: FbSave, season: FbSeason): Fixture | undefined {
  if (save.phase === 'event') {
    const ev = save.event ? EVENTS[save.event.id] : undefined;
    return { day: save.day, comp: 'event', label: `${ev?.name ?? 'Event'}, day ${save.day} of ${save.event?.days ?? 1}`, home: '', away: '', opp: '', braboHome: true };
  }
  if (save.day > SEASON_DAYS) return undefined;
  const plan = seasonDays()[save.day - 1];
  const label = `Day ${save.day} of ${SEASON_DAYS}`;
  const tier = season.tierOf[OWN] as Tier;
  if (plan.kind === 'league') {
    const pair = season.fixtures[tier]?.[plan.matchday! - 1]?.find(([h, a]) => h === OWN || a === OWN);
    if (!pair) return undefined;
    const [home, away] = pair;
    return { day: save.day, comp: 'league', label, round: `Matchday ${plan.matchday}`, home, away, opp: home === OWN ? away : home, braboHome: home === OWN };
  }
  const brackets = [season.bigcup, ...Object.values(season.tiercups)];
  for (const b of brackets) for (const r of b.rounds) {
    if (r.day !== plan.day) continue;
    const t = r.ties.find((x) => (x.home === OWN || x.away === OWN) && x.away && !x.winner);
    if (t) return { day: save.day, comp: b.id === 'bigcup' ? 'bigcup' : 'tiercup', label, round: `${b.name}, ${r.name}`, home: t.home, away: t.away!, opp: t.home === OWN ? t.away! : t.home, braboHome: t.home === OWN && r.name !== 'Final' };
  }
  const po = season.playoffs[tier];
  if (plan.kind === 'finals2' && po?.final && po.final.includes(OWN)) {
    const [home, away] = po.final;
    return { day: save.day, comp: 'playoff', label, round: 'Playoff final', home, away, opp: home === OWN ? away : home, braboHome: false };
  }
  if (plan.kind === 'finals1') return { day: save.day, comp: 'playoff', label, round: 'Playoff semi-finals, if you make them', home: '', away: '', opp: '', braboHome: true };
  return { day: save.day, comp: 'friendly', label, round: 'Reserves friendly', home: OWN, away: '', opp: '', braboHome: true };
}

/** Knocks and cards that will play tonight (from yesterday's logs). */
export function tonightKnocks(h: Health, date: DayKey, physioRoom: boolean): Mod[] {
  const meds = Array.from({ length: 9 }, (_, i) => addDays(date, -(i + 1))).map((d) => ({ date: d, allTaken: medsTaken(h, d) }));
  const out = [...physio(meds, date, physioRoom).mods];
  const nightOuts = [...h.days.values()].filter((d) => d.nightOut).map((d) => d.date);
  const c = cards(nightOuts, date);
  if (c.red) out.push({ axis: 'Rest', d: 0, why: 'Red card: Rest plays at half value', kind: 'card' });
  else if (c.yellow) out.push({ axis: 'Rest', d: 0, why: 'Yellow card', kind: 'card' });
  return out;
}
