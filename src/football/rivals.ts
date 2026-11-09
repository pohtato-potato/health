// Rivals (spec §8.7): Antigoon always, up to three earned, each with the modifier its start gives it.
import { LIT } from './radar';
import { AXES, type Axis, type Comp, type Mod, type RivalTwist, type Side } from './types';

export const ANTIGOON = 'ant';
export const MAX_EARNED = 3;
export type RivalHow = 'legend' | 'cup' | 'final' | 'derby' | 'lastday' | 'three' | 'close';
/** Saves from before 9 Nov may hold 'fouram' (the retired "Night shift", which read when a match played: decision C3). */
export type StoredRivalHow = RivalHow | 'fouram';
export const HOW_TEXT: Record<RivalHow, string> = {
  legend: 'The legend: the giant the boy beat.', cup: 'Knocked you out of a cup.', final: 'Beat you in a final.',
  derby: 'Beat you in a derby.', lastday: 'Beat you on the last day.', three: 'Beat you three times running.', close: 'Beat you by a single goal.',
};
const lit = (side: Side, d: number, why: string): Mod[] => LIT[side].map((axis) => ({ axis, d, why, kind: 'rival' }));

/**
 * The rivalry's modifier, from how it started. `best` is your best axis at your last meeting; `weak` is your weakest
 * logged axis on the day they beat you (Rest for a rivalry migrated from the old "Night shift").
 */
export function rivalTwist(clubId: string, how: RivalHow, best: Axis = 'Pace', weak: Axis = 'Rest'): RivalTwist {
  const make = (name: string, text: string, mods: RivalTwist['mods']): RivalTwist => ({ id: `${clubId}:${how}`, name, text, mods });
  switch (how) {
    case 'legend': {
      return make("Giant's hand", 'Their first chance in each half is a big chance.', (() => {
        let seen1 = false, seen2 = false;
        return (minute: number, side: Side) => {
          if (side !== 'def') return [];
          if (minute <= 45 && !seen1) { seen1 = true; return lit('def', -2, "Giant's hand"); }
          if (minute > 45 && !seen2) { seen2 = true; return lit('def', -2, "Giant's hand"); }
          return [];
        };
      })());
    }
    case 'cup': return make('Bad blood', 'In the last ten minutes every chance, both ways, is a big chance.', (m, side) => (m >= 80 ? lit(side, side === 'atk' ? 2 : -2, 'Bad blood') : []));
    case 'final': return make('Old wound', 'In the first fifteen minutes your Routine shrinks by 2.', (m, side) => (m <= 15 && side === 'def' ? [{ axis: 'Routine', d: -2, why: 'Old wound', kind: 'rival' }] : []));
    case 'derby': return make('Same streets', 'They know every corner: your Shape is pressed by 1 all match.', (_m, side) => (side === 'def' ? [{ axis: 'Shape', d: -1, why: 'Same streets', kind: 'rival' }] : []));
    case 'lastday': return make('Long memory', 'After 80 minutes your side tightens: −1 on each lit axis.', (m, side) => (m >= 80 ? lit(side, -1, 'Long memory') : []));
    case 'three': return make('In step', 'They press on your best axis from your last meeting.', (_m, side) => (LIT[side].includes(best) ? [{ axis: best, d: -2, why: 'In step', kind: 'rival' }] : []));
    // Decision C3: reads what you logged (your weakest axis the day they won), never when anything happened.
    case 'close': return make('Found a gap', `They found your gap: when your ${weak} is in play, it shrinks by 2.`, (_m, side) => (LIT[side].includes(weak) ? [{ axis: weak, d: -2, why: 'Found a gap', kind: 'rival' }] : []));
  }
}
export const RIVAL_MODS: RivalHow[] = ['legend', 'cup', 'final', 'derby', 'lastday', 'three', 'close'];

export interface Meeting { clubId: string; result: 'W' | 'D' | 'L'; comp: Comp; final?: boolean; derby?: boolean; lastDay?: boolean; margin?: number }
export interface Rival { clubId: string; how: StoredRivalHow; since: string; best?: Axis; weak?: Axis }
/** A saved rival brought up to date: the retired 4 am "Night shift" becomes "Found a gap" on Rest, the axis it pressed. */
export function migrateRival(r: Rival): Rival & { how: RivalHow } {
  return r.how === 'fouram' ? { ...r, how: 'close', weak: r.weak ?? 'Rest' } : (r as Rival & { how: RivalHow });
}
/** Every saved rival brought up to date; returns the same array when nothing changed. */
export function migrateRivals(rs: Rival[]): Rival[] {
  return rs.some((r) => r.how === 'fouram') ? rs.map(migrateRival) : rs;
}
/** The modifier for a saved rival (old saves included). */
export function twistOf(r: Rival): RivalTwist {
  const x = migrateRival(r);
  return rivalTwist(x.clubId, x.how, x.best, x.weak);
}
/** How a saved rivalry started, in words (old saves included). */
export const howText = (r: Rival): string => HOW_TEXT[migrateRival(r).how];
/** Your weakest axis in a night's logged values (ties go to the first in axis order). */
export function weakestAxis(v: Record<Axis, number>): Axis {
  return AXES.reduce((w, a) => (v[a] < v[w] ? a : w), AXES[0]);
}
/** Does this loss make a rival? Checks the big night first, then three running, then a one-goal loss. */
export function rivalBorn(history: Meeting[], m: Meeting): RivalHow | null {
  if (m.result !== 'L') return null;
  if (m.final) return 'final';
  if (m.comp !== 'league' && m.comp !== 'friendly') return 'cup';
  if (m.derby) return 'derby';
  if (m.lastDay) return 'lastday';
  const prev = history.filter((h) => h.clubId === m.clubId).slice(-2);
  if (prev.length === 2 && prev.every((h) => h.result === 'L')) return 'three';
  if (m.margin === 1) return 'close';
  return null;
}
/** Five Brabo wins in a row against a rival fade it (Antigoon never fades). */
export function fades(history: Meeting[], clubId: string): boolean {
  if (clubId === ANTIGOON) return false;
  const last = history.filter((h) => h.clubId === clubId).slice(-5);
  return last.length === 5 && last.every((h) => h.result === 'W');
}
/** Add a rival if there is room among the three earned. */
export function addRival(rivals: Rival[], r: Rival): Rival[] {
  if (r.clubId === ANTIGOON || rivals.some((x) => x.clubId === r.clubId)) return rivals;
  if (rivals.filter((x) => x.clubId !== ANTIGOON).length >= MAX_EARNED) return rivals;
  return [...rivals, r];
}

/** After a match: a loss may start a rivalry (if there's room), five wins running fade one. */
export function afterMatch(rivals: Rival[], history: Meeting[], m: Meeting, date: string, best?: Axis, weak?: Axis): { rivals: Rival[]; born?: Rival & { how: RivalHow }; faded?: string } {
  const all = [...history, m];
  const existing = rivals.find((r) => r.clubId === m.clubId);
  if (existing && fades(all, m.clubId)) return { rivals: rivals.filter((r) => r.clubId !== m.clubId), faded: m.clubId };
  if (existing || m.clubId === ANTIGOON) return { rivals };
  const how = rivalBorn(history, m);
  if (!how) return { rivals };
  const r: Rival & { how: RivalHow } = how === 'close' ? { clubId: m.clubId, how, since: date, best, weak } : { clubId: m.clubId, how, since: date, best };
  const next = addRival(rivals, r);
  return next === rivals ? { rivals } : { rivals: next, born: r };
}
/** The rivals shown: Antigoon first, always, then the earned ones (never more than three). */
export function rivalList(rivals: Rival[]): Rival[] {
  const ant = rivals.find((r) => r.clubId === ANTIGOON) ?? { clubId: ANTIGOON, how: 'legend' as const, since: '' };
  return [ant, ...rivals.filter((r) => r.clubId !== ANTIGOON).slice(0, MAX_EARNED)];
}
