// The press office's line for the papers (ledger O40), read and answered. The answer is kept as a Story line,
// `${matchId}:papers`, so no stored match changes shape.
import { db } from '../../db/db';
import { clubById } from '../data/load';
import { papersDue, papersLines, papersNews, playerOfMatch, PRESS_BOX, PRESS_OFFICE_TECH } from '../papers';
import { builtOf, researchedOf } from './tree';
import { OWN } from './season';
import type { StoredMatch } from './tables';

export interface Papers { lines: [string, string, string]; answered?: number }

/** The three lines on offer after this match, and the one picked; null when the papers aren't waiting on it. */
export async function loadPapers(m: StoredMatch): Promise<Papers | null> {
  const save = await db.fbSave.get('save');
  if (!save || (m.home !== OWN && m.away !== OWN)) return null;
  const office = researchedOf(save).includes(PRESS_OFFICE_TECH);
  const box = builtOf(await db.fbBundles.toArray()).includes(PRESS_BOX);
  if (!papersDue(m, { office, box })) return null;
  const said = await db.fbNews.get(`${m.id}:papers`);
  return { lines: papersLines(m, { opp: clubById(m.opp)?.name ?? 'They', potm: playerOfMatch(m.credits) }), ...(said?.answered !== undefined ? { answered: said.answered } : {}) };
}

/** Picks the line once; Story prints it on the match's day. */
export async function answerPapers(matchId: string, i: 0 | 1 | 2): Promise<void> {
  await db.transaction('rw', [db.fbSave, db.fbBundles, db.fbNews, db.fbMatches], async () => {
    const m = await db.fbMatches.get(matchId);
    if (!m || (await db.fbNews.get(`${matchId}:papers`))) return;
    const p = await loadPapers(m);
    if (!p) return;
    await db.fbNews.put({ id: `${matchId}:papers`, date: m.date, kind: 'club', text: papersNews(p.lines[i]), matchId, answered: i });
  });
}
