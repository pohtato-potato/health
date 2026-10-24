import type { DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import type { Day, Status } from '../domain/types';
import { ALL_STOPS, crossings, kmFromSteps, positionAt } from '../domain/walk';
import { mix, type RegionId } from '../ui/light';
import { STOP_WORDS, type SmallStop } from './content/types';
import { HINDI } from './hindi';

/** Within this many km of a place, you're near it. */
export const NEAR_KM = 20;

export type WhereNow = { kind: 'near'; place: string } | { kind: 'between'; from: string; to: string } | { kind: 'end'; place: string };

/** Near the stop behind or ahead (within 20 km), between them otherwise, or at the end of the road. */
export function whereNow(km: number): WhereNow {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return { kind: 'end', place: pos.from.name };
  if (km - pos.from.km <= NEAR_KM) return { kind: 'near', place: pos.from.name };
  if (pos.to.km - km <= NEAR_KM) return { kind: 'near', place: pos.to.name };
  return { kind: 'between', from: pos.from.name, to: pos.to.name };
}

export function whereLine(w: WhereNow): string {
  if (w.kind === 'end') return `${w.place}, the end of the road`;
  return w.kind === 'near' ? `Near ${w.place}` : `Between ${w.from} and ${w.to}`;
}

/** Days a usual day is drawn from, and the fewest that make it worth saying. */
const SAMPLE_DAYS = 28;
const MIN_DAYS = 7;

/**
 * A usual day and a big day, in km: the median and the 90th percentile (nearest rank) of the last 28 days before
 * today with measured steps. With fewer than 7 such days, 10 km and 15 km.
 */
export function usualAndBig(days: Pick<Day, 'date' | 'steps' | 'stepsEstimated'>[], today: DayKey): { usualKm: number; bigKm: number; known: boolean } {
  // Steps typed as a guess stay out, as they do from every step average.
  const recent = days
    .filter((d) => d.date < today && d.steps !== undefined && !d.stepsEstimated)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SAMPLE_DAYS)
    .map((d) => d.steps!)
    .sort((a, b) => a - b);
  if (recent.length < MIN_DAYS) return { usualKm: 10, bigKm: 15, known: false };
  const m = Math.floor(recent.length / 2);
  const median = recent.length % 2 ? recent[m] : (recent[m - 1] + recent[m]) / 2;
  const p90 = recent[Math.ceil(0.9 * recent.length) - 1];
  return { usualKm: kmFromSteps(median), bigKm: kmFromSteps(p90), known: true };
}

/** "about 6 weeks": a distance at your usual pace. */
export function timeAtPace(km: number, kmADay: number): string {
  const days = Math.max(1, Math.round(km / Math.max(kmADay, 0.1)));
  if (days < 14) return `about ${days} day${days === 1 ? '' : 's'}`;
  if (days < 75) return `about ${Math.round(days / 7)} weeks`;
  if (days < 540) return `about ${Math.round(days / 30)} months`;
  return `about ${(days / 365).toFixed(1)} years`;
}

/** What a usual day, and a big one, reach tomorrow. */
export function tomorrowLine(km: number, usualKm: number, bigKm: number): string | undefined {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return undefined;
  const next = pos.to;
  if (km + usualKm >= next.km) return `Tomorrow: a usual day reaches ${next.name}.`;
  const usual = `Tomorrow: a usual day takes you to ${fmtInt(Math.ceil(next.km - km - usualKm))} km from ${next.name}.`;
  return km + bigKm >= next.km ? `${usual} A big day reaches it.` : usual;
}

/** The milestone at the road's edge: the next stop, in Hindi on its cap, and the whole km left. */
export function stoneFor(km: number): { name: string; hindi: string; km: number } | undefined {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return undefined;
  return { name: pos.to.name, hindi: HINDI[pos.to.name] ?? pos.to.name, km: Math.ceil(pos.to.km - km) };
}


export interface StatusLine {
  kind: 'arrival' | 'stop' | 'person' | 'rest';
  text: string;
  /** Where tapping the line goes, if anywhere. */
  open?: string;
}

/** A small stop as a status line: its kind in words and its name, opening its card. */
export function stopLine(stop: SmallStop): StatusLine {
  return { kind: 'stop', text: `${STOP_WORDS[stop.kind]} · ${stop.name}`, open: `/stop?id=${stop.id}` };
}

/** A rest or travel day, in kind words; nothing for an occasion or an ordinary day. */
export function restLine(status: Status | undefined, near: string): string | undefined {
  if (status === 'sick' || status === 'injured') return `Resting at camp outside ${near}. The road waits.`;
  if (status === 'break') return `A day off at camp outside ${near}. The road waits.`;
  if (status === 'travelling') return 'Travelling today. The road keeps your steps as usual.';
  return undefined;
}

/** Up to three short lines under the title, each kind at most once: an arrival, a small stop, a person met, a rest day. */
export function statusLines(i: { arrival?: string; stop?: StatusLine; person?: { name: string; who: string; line: string }; status?: Status; near: string }): StatusLine[] {
  const out: StatusLine[] = [];
  if (i.arrival) out.push({ kind: 'arrival', text: `Arrived in ${i.arrival} today.` });
  if (i.stop) out.push(i.stop);
  if (i.person) out.push({ kind: 'person', text: `Met ${i.person.name}, ${i.person.who}. ${i.person.line}` });
  const rest = restLine(i.status, i.near);
  if (rest) out.push({ kind: 'rest', text: rest });
  return out.slice(0, 3);
}

/** The last city reached on this day, if any: a city met again later in the walk counts again; the start doesn't. */
export function arrivedToday(stepsByDay: Map<DayKey, number>, today: DayKey): string | undefined {
  return crossings(stepsByDay, ALL_STOPS.filter((s) => s.km > 0))
    .filter((s) => s.date === today)
    .at(-1)?.name;
}

/** The place you're nearest: the one you're near, or the nearer of the two you're between. */
export function nearestPlace(km: number): string {
  const w = whereNow(km);
  if (w.kind !== 'between') return w.place;
  const pos = positionAt(km);
  return km - pos.from.km <= pos.to!.km - km ? w.from : w.to;
}

/** The night ground the aurora sits on. */
const GROUND = '#0c0e1d';

/**
 * The aurora for each region, as the approved board drew it: plum over the ravines, sea blue on the coast, green in
 * the ghats, each deep but keeping its hue (a land ink sunk into the night turns muddy brown). The accent is the
 * small warm light; never gold, which is for what you earned.
 */
const AURORA: Record<RegionId, [string, string]> = {
  plains: ['#34385f', '#c9b8e8'],
  desert: ['#55304a', '#e3a27c'],
  ravines: ['#4a2a4f', '#e3a27c'],
  deccan: ['#4a3156', '#e3a27c'],
  ghats: ['#2f4a4a', '#a8d39a'],
  coast: ['#263d63', '#9fd3e6'],
  east: ['#2e4a48', '#a8d39a'],
  northeast: ['#2a4a44', '#a8d39a'],
  himalaya: ['#2c3966', '#c3d6f2'],
};

export type AuroraTint = { '--lv-a': string; '--lv-b': string; '--lv-accent': string };

export function auroraFor(region: RegionId): AuroraTint {
  const [a, accent] = AURORA[region];
  return { '--lv-a': a, '--lv-b': GROUND, '--lv-accent': accent };
}

/** A route's pages take their aurora from the route's own ink, sunk deep into the night. */
export function auroraForInk(ink: string): AuroraTint {
  return { '--lv-a': mix(ink, GROUND, 0.7), '--lv-b': GROUND, '--lv-accent': ink };
}
