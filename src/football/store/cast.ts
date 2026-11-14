// The cast, read from the save (desk spec §7; Fork 4). Bonds are worked out from the desk's log and what the days
// folded in (`save.bonds`); perks follow from the ranks. Nothing here touches a rating or a match's odds.
import { db } from '../../db/db';
import type { DayKey } from '../../domain/dates';
import { askOpen, asksOf, bondsOf, castById, CAST_IDS, perksHeld, toneOf, type Bond, type HeldPerk } from '../cast/bonds';
import type { CastId } from '../content/desk/types';
import type { CastView } from '../desk/types';
import type { FbSave } from './tables';

type CastSave = Pick<FbSave, 'desk' | 'bonds'>;
export const bondsOfSave = (save: CastSave): Bond[] => bondsOf(save.desk, save.bonds);
export const perksOfSave = (save: CastSave): HeldPerk[] => perksHeld(bondsOfSave(save));

/** What the cast job sees. */
export function castViewOf(save: CastSave, date: DayKey): CastView {
  const bonds = bondsOfSave(save);
  const asks = asksOf(save.desk);
  return {
    members: bonds.map((b) => {
      const c = castById(b.id)!;
      return { id: b.id, name: c.name, role: c.role, points: b.points, rank: b.rank, toNext: b.toNext, tone: toneOf(b.id, save.bonds, save.desk, date), askOpen: asks.some((a) => a.member === b.id && askOpen(a, save.bonds, date)) };
    }),
  };
}

/** Rank scenes reached and not yet seen, oldest first: one member at a time, one rank at a time. */
export function scenesWaiting(save: CastSave & Pick<FbSave, 'castSeen'>): { member: CastId; rank: number }[] {
  const out: { member: CastId; rank: number }[] = [];
  for (const b of bondsOfSave(save)) for (let r = (save.castSeen?.[b.id] ?? 0) + 1; r <= b.rank; r++) out.push({ member: b.id, rank: r });
  return out;
}

/** A rank scene seen (a user key, so a match playing never loses it). */
export async function seeScene(member: CastId, rank: number): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s || (s.castSeen?.[member] ?? 0) >= rank) return;
    await db.fbSave.put({ ...s, castSeen: { ...s.castSeen, [member]: rank } });
  });
}
export { CAST_IDS };
