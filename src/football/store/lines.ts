// The night's words, picked once at kick-off: tomorrow's back page, the studio and the press question.
import { addDays, type DayKey } from '../../domain/dates';
import { clubById, tierName } from '../data/load';
import { pickLine, type Facts } from '../news';
import { hashSeed, rng } from '../rng';
import { bestAxis } from './gather';
import type { FbNews, StoredMatch } from './tables';
import type { Tier } from '../types';

export function situationOf(m: StoredMatch, opts: { rival: boolean; oldSelf: boolean; streak: number }): string {
  const tags = m.events.chances.map((c) => c.tag);
  if (tags.includes('SCREAMER') && m.result !== 'L') return 'screamer';
  if (tags.includes('HEARTBREAK') && m.result !== 'W') return 'heartbreak';
  if (opts.rival || m.derby) return 'rival';
  if (m.comp === 'bigcup' || m.comp === 'tiercup' || m.comp === 'playoff' || m.comp === 'continental' || m.comp === 'clubworld') return 'cup';
  if (m.comp === 'event' || m.comp === 'worldcup') return 'world';
  if (opts.oldSelf) return 'oldself';
  if (m.rotation) return 'rotation';
  if (m.auto) return 'fouram';
  if (opts.streak >= 3 && m.result === 'W') return 'streak';
  return m.result === 'W' ? 'win' : m.result === 'L' ? 'loss' : 'draw';
}

export function factsFor(m: StoredMatch, tier: Tier, streak: number, situation: string): Facts {
  const goals = m.events.chances.filter((c) => (c.side === 'atk' ? c.ok : !c.ok));
  const key = m.events.chances.find((c) => c.tag) ?? goals[goals.length - 1] ?? m.events.chances[0];
  return {
    club: 'Brabo United', opp: clubById(m.opp).name, score: `${m.score[0]}–${m.score[1]}`,
    minute: key?.minute ?? 90, pct: key?.pct ?? 50, streak: Math.max(streak, 1), axis: bestAxis(m.values), tier: tierName(tier),
    situation, result: m.result === 'W' ? 'win' : m.result === 'L' ? 'loss' : 'draw', date: m.date,
  };
}

export function matchLines(m: StoredMatch, facts: Facts, used: { id: string; date: DayKey }[]): FbNews[] {
  const r = rng(hashSeed('lines', m.id));
  const back = pickLine('back', facts, used, r);
  const studio = pickLine('studio', facts, used, r);
  const press = pickLine('press', facts, used, r);
  return [
    { id: `${m.id}:back`, date: addDays(m.date, 1), kind: 'back', text: back.text, lineId: back.id, matchId: m.id },
    { id: `${m.id}:studio`, date: m.date, kind: 'studio', text: studio.text, lineId: studio.id, matchId: m.id },
    { id: `${m.id}:press`, date: m.date, kind: 'press', text: press.parts[0], lineId: press.id, matchId: m.id },
  ];
}
