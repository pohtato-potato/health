// Packs and the album (spec §10, §16). Pure and seeded: a pack's contents depend only on its id and what the
// album already holds when it's opened. Five items, mostly album cards, plus boosts and research. Packs never
// hold players (the card is the player). Each duplicate album card becomes research.
//
// Loans are layer 4. The loan slot is a seam: `drawLoan` returns nothing yet, and the slot is drawn again from
// its other weights, so a pack shows nothing of loans until layer 4 fills it in.
import { ALBUM, ALBUM_CARDS, DUPLICATE_RESEARCH } from '../content/album';
import { ALBUM_ODDS, BOOSTS, PACK_ITEMS, PACK_RESEARCH, PACK_SLOTS } from '../content/packs';
import { BOONS, BOUNTIES } from '../content/season';
import { POOLS, runningLow } from '../content/pools';
import { RARITIES, type AlbumCard, type AlbumSet, type Rarity } from '../content/types';
import { hashSeed, rng } from '../rng';
import type { PackEarned, PackItem, PackOpened, TreeUser } from './types';

/** A big pack (the track's day 28) holds three more album cards. */
export const BIG_EXTRA = 3;

type Slot = (typeof PACK_SLOTS)[number];
function weighted<K extends string>(r: () => number, w: Record<K, number>): K {
  const keys = (Object.keys(w) as K[]).filter((k) => w[k] > 0);
  const tot = keys.reduce((t, k) => t + w[k], 0);
  let x = r() * tot;
  for (const k of keys) { x -= w[k]; if (x < 0) return k; }
  return keys[keys.length - 1];
}

/** Layer 4 fills this in. Until then a loan slot holds nothing and is drawn again. */
export function drawLoan(_r: () => number): PackItem | null {
  return null;
}

/** The album cards already collected. */
export const collected = (user: TreeUser): Set<string> =>
  new Set(user.opened.flatMap((p) => p.items.filter((i) => i.kind === 'album' && !i.duplicate).map((i) => i.id!)));

function albumCard(r: () => number): AlbumCard {
  const rarity = weighted(r, ALBUM_ODDS) as Rarity;
  const pool = ALBUM_CARDS.filter((c) => c.rarity === rarity);
  const near = pool.length ? pool : ALBUM_CARDS.filter((c) => c.rarity === RARITIES[Math.max(0, RARITIES.indexOf(rarity) - 1)]);
  const from = near.length ? near : ALBUM_CARDS;
  return from[Math.floor(r() * from.length)];
}

/** Opens a pack: `items` is how many (5, or 6 with the Bigger packs boon). */
export function openPack(pack: Pick<PackEarned, 'id' | 'size'>, user: TreeUser, items = PACK_ITEMS): PackItem[] {
  const r = rng(hashSeed('pack', pack.id));
  const have = collected(user);
  const out: PackItem[] = [];
  const album = (): PackItem => {
    const c = albumCard(r);
    const dup = have.has(c.id);
    have.add(c.id);
    return dup ? { kind: 'album', id: c.id, rarity: c.rarity, duplicate: true, n: DUPLICATE_RESEARCH[c.rarity] } : { kind: 'album', id: c.id, rarity: c.rarity };
  };
  if (pack.size === 'single') return [album()];
  const slots: Slot[] = Array.from({ length: items }, (_, i) => PACK_SLOTS[Math.min(i, PACK_SLOTS.length - 1)]);
  if (pack.size === 'big') for (let k = 0; k < BIG_EXTRA; k++) slots.unshift(PACK_SLOTS[0]);
  for (const s of slots) {
    let kind = weighted(r, s);
    if (kind === 'loan') {
      const loan = drawLoan(r);
      if (loan) { out.push(loan); continue; }
      kind = weighted(r, { ...s, loan: 0 });
    }
    if (kind === 'album') out.push(album());
    else if (kind === 'boost') out.push({ kind: 'boost', id: BOOSTS[Math.floor(r() * BOOSTS.length)].id });
    else out.push({ kind: 'research', n: PACK_RESEARCH[Math.floor(r() * PACK_RESEARCH.length)] });
  }
  return out;
}

/** Research a duplicate gives (spec §16: Bronze 1 up to Icon 10; Legend 15). */
export const duplicateResearch = (rarity: Rarity) => DUPLICATE_RESEARCH[rarity];

export interface SetProgress { set: AlbumSet; have: number; of: number; done: boolean }
export function albumProgress(user: TreeUser): SetProgress[] {
  const have = collected(user);
  return ALBUM.map((set) => {
    const n = set.cards.filter((c) => have.has(c.id)).length;
    return { set, have: n, of: set.cards.length, done: n === set.cards.length };
  });
}
/** Set rewards earned: a kit trim, a stadium detail or a museum piece for each finished set. */
export const setRewards = (user: TreeUser) => albumProgress(user).filter((p) => p.done).map((p) => p.set.reward);

/** Boosts from packs that last one match and haven't been used. Kit trims keep for good. */
export function boostsWaiting(user: TreeUser, used: string[]): { key: string; id: string }[] {
  return user.opened.flatMap((p) => p.items.map((i, k) => ({ i, key: `${p.id}:${k}` })))
    .filter(({ i, key }) => i.kind === 'boost' && BOOSTS.find((b) => b.id === i.id)?.kind !== 'kit-trim' && !used.includes(key))
    .map(({ i, key }) => ({ key, id: i.id! }));
}
export const kitTrims = (user: TreeUser) =>
  [...new Set(user.opened.flatMap((p) => p.items).filter((i) => i.kind === 'boost' && BOOSTS.find((b) => b.id === i.id)?.kind === 'kit-trim').map((i) => i.id!))];

export type PoolId = 'loans' | 'album' | 'boons' | 'bounties';
/** How much of each limited pool has been collected (spec §16, running low). */
export function poolCounts(user: TreeUser, bountiesDone: string[]): Record<PoolId, { collected: number; size: number }> {
  const size = (p: PoolId) => POOLS.find((x) => x.pool === p)!.size;
  return {
    loans: { collected: 0, size: size('loans') }, // layer 4 counts loan players met
    album: { collected: collected(user).size, size: size('album') },
    boons: { collected: new Set(user.boons.map((b) => b.id).filter((id) => BOONS.some((x) => x.id === id))).size, size: size('boons') },
    bounties: { collected: new Set(bountiesDone.map((k) => k.split(':').slice(1).join(':')).filter((id) => BOUNTIES.some((x) => x.id === id))).size, size: size('bounties') },
  };
}
/** Pools whose running-low notice should show now (80–85% collected, once per pool size). */
export function runningLowNow(user: TreeUser, bountiesDone: string[]): PoolId[] {
  const c = poolCounts(user, bountiesDone);
  return (Object.keys(c) as PoolId[]).filter((p) => runningLow(c[p].collected, c[p].size, user.lowShown[p]));
}
export const POOL_WORD: Record<PoolId, string> = { loans: 'loan players', album: 'album cards', boons: 'boons', bounties: 'bounties' };
export const recordOpen = (pack: PackEarned, user: TreeUser, items: PackItem[], on: string): TreeUser =>
  ({ ...user, opened: [...user.opened, { id: pack.id, on, items } satisfies PackOpened] });
