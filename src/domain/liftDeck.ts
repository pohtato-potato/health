import type { BrowseInput } from './browse';
import { seeded } from './creatures';
import { dailyFinding } from './dailyFinding';
import { statDeck } from './shakeStats';
import { liftCandidates, type Lift, type SlowInput } from './slowDay';

export type LiftKind = 'know' | 'finding' | 'lift' | 'surprise';
export interface LiftCard { kind: LiftKind; head: string; sub?: string }

const MAX_CARDS = 9;
const KNOW_CARDS = 3;

function liftCard(l: Lift): LiftCard {
  if (l.kind === 'ago') return { kind: 'lift', head: l.text, sub: 'A month ago today' };
  if (l.kind === 'rank') return { kind: 'lift', head: `Better than ${l.beat} of your ${l.of} weeks`, sub: 'Last week’s steps' };
  return { kind: 'lift', head: l.value, sub: `${l.note}.` };
}

/** Today's lift as one deck (board W6): facts, the day's finding, the lifts and a surprise, taken in turn. Same all day. */
export function liftDeck(today: BrowseInput['today'], browse: BrowseInput, slow: SlowInput): LiftCard[] {
  const stats = browse.days.length ? statDeck(browse) : [];
  const rnd = seeded(`deck:${today}`);
  const order = stats.map((s) => ({ s, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.s);
  const know = order.slice(0, KNOW_CARDS).map((s): LiftCard => ({ kind: 'know', head: s.text, sub: s.sub }));
  const extra = order[KNOW_CARDS];
  const finding = dailyFinding(today, browse);
  const groups: LiftCard[][] = [
    know,
    finding ? [{ kind: 'finding', head: finding.text, sub: finding.working }] : [],
    liftCandidates(today, slow).map(liftCard),
    extra ? [{ kind: 'surprise', head: extra.text, sub: extra.sub }] : [],
  ];
  const out: LiftCard[] = [];
  for (let n = 0; out.length < MAX_CARDS && groups.some((g) => g.length > n); n++)
    for (const g of groups) if (g[n] && out.length < MAX_CARDS) out.push(g[n]);
  return out;
}
