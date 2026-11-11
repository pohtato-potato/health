// Cup runs' only writer: the run in progress (cupRuns, saved after every card and every stop), the record book
// (cupBook) and finished runs (cupDone, summary only). A run never touches the league: the only writes outside these
// tables are the research and the album card a run pays (spec §11), into the tree as its own gain.
import { db } from '../../db/db';
import { dayOfLogging, type DayKey } from '../../domain/dates';
import { ABROAD } from '../data/continental';
import { CLUBS, clubById, rememberClubs } from '../data/load';
import { loanById } from '../globe/loans';
import { hashSeed } from '../rng';
import { loadHealth } from '../store/gather';
import { OWN } from '../store/season';
import { engineOf } from '../store/tree';
import { emptyBook, payFor, record, type CupBook, type Pay } from './book';
import { dealDeck, type Deal } from './deck';
import { dealInputFor } from './gather';
import { startRun, summary, type RunCtx, type RunState, type RunSummary } from './run';

export interface CupRun {
  /** 'current': one run in progress at a time (spec §2). */
  id: 'current';
  kind: 'run';
  /** The deck a run took at its start (spec §3.4), for "How your deck was dealt". */
  deal: Deal;
  run: RunState;
  /** Set once the run has ended and been settled: what it paid and which records it broke. */
  end?: { pay: Pay; news: string[] };
}
/** A finished run, summary only. */
export interface CupDone extends RunSummary { n?: number; paid: number; album: boolean; endedAt: number }

/** Today's deck, from the last seven days. Read-only. */
export async function dealToday(today: DayKey = dayOfLogging(Date.now())): Promise<Deal> {
  const [h, save] = await Promise.all([loadHealth(), db.fbSave.get('save')]);
  const loans = (save?.globe?.loans ?? [])
    .filter((l) => l.from <= today && today <= l.until)
    .map((l) => ({ id: l.loan, name: loanById(l.loan)?.name ?? 'Loan player', axis: l.unit }));
  return dealDeck(dealInputFor(h, today, loans));
}

/** The clubs a run may meet, at their league ratings, and the ones scouted (met in the league, spec §5.3). */
export async function runCtx(): Promise<RunCtx> {
  const save = await db.fbSave.get('save');
  const season = save ? await db.fbSeasons.get(save.season) : undefined;
  const stored = await db.fbClubs.toArray();
  rememberClubs(stored);
  const live = new Map(stored.map((c) => [c.id, c]));
  const clubs = [
    ...CLUBS.filter((c) => !live.get(c.id)?.folded).map((c) => {
      const d = clubById(c.id);
      const s = live.get(c.id);
      return { id: c.id, name: d.name, short: d.short, rating: s?.rating ?? c.rating ?? 40, tier: s?.tier ?? c.tier, style: s?.style ?? c.style, colours: d.colours, country: c.country, kind: c.kind };
    }),
    ...ABROAD.map((c) => ({ id: c.id, name: c.name, short: c.short, rating: c.rating ?? 70, tier: c.tier, style: c.style, colours: c.colours, country: c.country, kind: c.kind, abroad: true })),
  ];
  const met = new Set((await db.fbMatches.where('comp').equals('league').toArray()).map((m) => m.opp));
  return { clubs, scouted: [...met], ownTier: season?.tierOf[OWN] ?? 6 };
}

/** The run in progress (a layer-2 try match is dropped: it has no map). */
export async function loadRun(): Promise<CupRun | undefined> {
  const r = await db.cupRuns.get('current');
  if (r && (r as { kind: string }).kind !== 'run') { await db.cupRuns.delete('current'); return undefined; }
  return r;
}
export const loadBook = async (): Promise<CupBook> => (await db.cupBook.get('book')) ?? emptyBook();

/** Deals today's deck and starts a run of a cup. One run at a time: refuses if one is in progress. */
export async function startCupRun(cup: number, now = Date.now()): Promise<CupRun> {
  const cur = await loadRun();
  if (cur && !cur.run.over) throw new Error('a run is in progress');
  const date = dayOfLogging(now);
  const deal = await dealToday(date);
  const run = startRun({ cup, seed: hashSeed('cup-run', date, String(now)), date, now, deck: deal.cards });
  const rec: CupRun = { id: 'current', kind: 'run', deal, run };
  await db.cupRuns.put(rec);
  return rec;
}

/** Saves the run after every card and every stop; once it has ended, settles it once. */
export async function saveRun(run: RunState, now = Date.now()): Promise<CupRun['end'] | undefined> {
  return db.transaction('rw', [db.cupRuns, db.cupBook, db.cupDone, db.fbSave], async () => {
    const cur = await db.cupRuns.get('current');
    if (!cur) return undefined;
    if (cur.end) return cur.end;
    if (!run.over) { await db.cupRuns.update('current', { run }); return undefined; }
    const end = await settle(run, now);
    await db.cupRuns.put({ ...cur, run, end });
    return end;
  });
}

async function settle(run: RunState, now: number): Promise<NonNullable<CupRun['end']>> {
  const today = dayOfLogging(now);
  const s = summary(run);
  const book0 = (await db.cupBook.get('book')) ?? emptyBook();
  const pay = payFor(book0, s, today);
  const { book, news } = record(book0, s, today, pay.research > 0 || pay.album);
  await db.cupBook.put(book);
  await db.cupDone.add({ ...s, paid: pay.research, album: pay.album, endedAt: now });
  if (pay.research > 0 || pay.album) {
    const save = await db.fbSave.get('save');
    if (save) {
      const eng = structuredClone(engineOf(save));
      if (pay.research > 0) {
        eng.earned += pay.research;
        eng.gains = [...eng.gains, { on: today, n: pay.research, why: 'cup' as const, note: 'A cup run' }].slice(-60);
      }
      if (pay.album) eng.packs = [...eng.packs, { id: `cup-final:${today}:${eng.packs.length}`, on: today, source: 'cup-final', size: 'single', season: save.season }];
      await db.fbSave.put({ ...save, tree: eng });
    }
  }
  return { pay, news };
}

/** Leaves a finished run: the next one can start. */
export const clearRun = () => db.cupRuns.delete('current');
