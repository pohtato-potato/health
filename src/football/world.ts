// The world that moves without you (spec §8.10): ratings drift, and things happen to clubs.
import { pick } from './rng';
import { clamp, type Tier } from './types';

export interface WorldClub { id: string; name: string; rating: number; tier: Tier; kind: string; abilities?: string[]; style?: string }
export interface RatingChange { id: string; d: number; why: string }
export interface Headline { kind: 'world'; text: string; clubId: string }
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** One season's turn of the world: drift, then the named events, then club abilities that move ratings. */
export function worldTurn(clubs: WorldClub[], r: () => number): { changes: RatingChange[]; headlines: Headline[]; deductions: Record<string, number>; styles: Record<string, string> } {
  const others = clubs.filter((c) => c.kind !== 'own' && c.kind !== 'old');
  const changes: RatingChange[] = [], headlines: Headline[] = [];
  const deductions: Record<string, number> = {}, styles: Record<string, string> = {};
  const say = (c: WorldClub, text: string) => headlines.push({ kind: 'world', text, clubId: c.id });
  for (const c of others) {
    const d = Math.round(gauss(r) * 1.5);
    if (d) changes.push({ id: c.id, d, why: 'form' });
    if (r() < 1 / 6) { styles[c.id] = pick(r, ['press', 'possession', 'low-block', 'direct', 'counter', 'grit']); say(c, `${c.name} sack the manager. The new one wants a different game.`); }
  }
  const signings = 2 + Math.floor(r() * 3);
  for (let i = 0; i < signings; i++) { const c = pick(r, others); changes.push({ id: c.id, d: 3, why: 'record signing' }); say(c, `${c.name} break their transfer record.`); }
  { const c = pick(r, others); changes.push({ id: c.id, d: 4, why: 'takeover' }); say(c, `New money at ${c.name}. The fans have questions.`); }
  if (r() < 0.5) { const c = pick(r, others); changes.push({ id: c.id, d: -4, why: 'asset strippers' }); say(c, `${c.name}'s new owners sell the training ground. Protests outside.`); }
  { const c = pick(r, others); deductions[c.id] = 6 + Math.floor(r() * 7); say(c, `${c.name} in financial trouble: a ${deductions[c.id]}-point deduction next season.`); }
  for (const c of others) for (const a of c.abilities ?? []) {
    if (a === 'Lakeside money') changes.push({ id: c.id, d: 3, why: a });
    if (a === 'Fallen giant' && c.tier > (c.id === 's04' ? 2 : 1)) changes.push({ id: c.id, d: 4, why: a });
    if (a === 'Fallen seven-time champions' && c.tier > 2) changes.push({ id: c.id, d: 3, why: a });
    if (a === 'Academy' || a === 'Our own') changes.push({ id: c.id, d: a === 'Our own' ? 1 : 2, why: a });
    if (a === 'Galácticos budget') changes.push({ id: c.id, d: 3, why: a });
  }
  // Swabian thrift: never drops more than 2 a season
  const net = new Map<string, number>();
  for (const ch of changes) net.set(ch.id, (net.get(ch.id) ?? 0) + ch.d);
  for (const c of others) if (c.abilities?.includes('Swabian thrift') && (net.get(c.id) ?? 0) < -2) changes.push({ id: c.id, d: -2 - (net.get(c.id) ?? 0), why: 'Swabian thrift' });
  return { changes, headlines, deductions, styles };
}
export function applyChanges<T extends { id: string; rating: number }>(clubs: T[], changes: RatingChange[]): T[] {
  const net = new Map<string, number>();
  for (const ch of changes) net.set(ch.id, (net.get(ch.id) ?? 0) + ch.d);
  return clubs.map((c) => (net.has(c.id) ? { ...c, rating: clamp(c.rating + net.get(c.id)!, 25, 98) } : c));
}
