// The congress, read and voted (desk spec §6; Fork 4). Brabo's ballot is a user key (`save.ballot`), so a tap is
// never lost to a match playing. The congress itself sits in play.ts as a new season begins.
import { db } from '../../db/db';
import { SEASON_DAYS } from '../calendar';
import { ballotFor, braboVotes, lobbyDaysLeft, lobbyOpen, seatLean, tally, twistsOf, type CongressRecord, type Vote } from '../congress/congress';
import { clubById } from '../data/load';
import type { CongressView } from '../desk/types';
import { lobbiesFor } from '../desk/jobs/lobby';
import { opinionOf, type RelationSource } from '../market/relations';
import type { FbSave } from './tables';

const nameOf = (id: string) => { try { return clubById(id).name; } catch { return id; } };
/** The congress ahead: before the next season. */
export const nextCongress = (save: Pick<FbSave, 'season'>) => save.season + 1;

export async function congressViewOf(save: FbSave, rel: RelationSource): Promise<CongressView> {
  const season = nextCongress(save);
  const clubs = (await db.fbClubs.toArray()).filter((c) => !c.folded && c.id !== 'bra').map((c) => ({ id: c.id, name: nameOf(c.id), opinion: opinionOf(rel, c.id) }));
  const ballot = save.ballot?.[season] ?? {};
  return {
    season,
    open: lobbyOpen(save.phase, save.day, SEASON_DAYS),
    daysLeft: lobbyDaysLeft(save.phase, save.day, SEASON_DAYS),
    motions: ballotFor(season).map((m) => ({ id: m.id, name: m.name, brabo: ballot[m.id] ?? 'abstain' })),
    clubs,
    lobbied: lobbiesFor(save.desk?.spends ?? [], season),
  };
}

/** The hall: each motion with its count as things stand (seats, friends, lobbies) and Brabo's vote. */
export interface HallMotion { id: string; brabo: Vote; for: number; against: number; abstain: number; passing: boolean; lobbied: number; leanFor: number; leanAgainst: number }
export function hallOf(v: CongressView): HallMotion[] {
  const ids = v.clubs.map((c) => c.id);
  const op = (id: string) => v.clubs.find((c) => c.id === id)?.opinion ?? 0;
  return ballotFor(v.season).map((m) => {
    const brabo = v.motions.find((x) => x.id === m.id)?.brabo ?? 'abstain';
    const t = tally(m, ids, op, brabo, v.lobbied, braboVotes());
    return { id: m.id, brabo, for: t.for, against: t.against, abstain: t.abstain, passing: t.passed, lobbied: t.lobbied.length,
      leanFor: ids.filter((c) => seatLean(m, c) > 0).length, leanAgainst: ids.filter((c) => seatLean(m, c) < 0).length };
  });
}

/** The last congress, and the twists in force this season. */
export const lastCongress = (save: Pick<FbSave, 'congress' | 'season'>): CongressRecord | undefined => save.congress?.find((c) => c.season === save.season);
export const twistsNow = (save: Pick<FbSave, 'congress' | 'season'>) => twistsOf(save.congress, save.season);

/** Brabo's vote on a motion before the congress. Changeable until the congress sits. */
export async function castVote(season: number, motion: string, vote: Vote): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s || season <= s.season) return;
    await db.fbSave.put({ ...s, ballot: { ...s.ballot, [season]: { ...s.ballot?.[season], [motion]: vote } } });
  });
}
