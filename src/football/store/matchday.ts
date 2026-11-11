// Matchday depth (spec 2026-11-12 §2.4–2.6): the owner's taps around the league match. The plan for a day (tempo,
// width, a tactic card; the tactic itself stays with `setTactic`) and the pick of three after a win.
import { db } from '../../db/db';
import { addDays, type DayKey } from '../../domain/dates';
import { CARD_MAX, type MatchdayPlan } from '../matchday';
import { engineOf } from './tree';

/** Sets tempo, width or a card for a day's match. Only the last fortnight of plans is kept. */
export async function setPlan(date: DayKey, patch: Omit<MatchdayPlan, 'tactic'>): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const keep = Object.fromEntries(Object.entries(s.plans ?? {}).filter(([d]) => d >= addDays(date, -14)));
    const next = { ...keep[date], ...patch };
    if (patch.card === undefined && 'card' in patch) delete next.card;
    await db.fbSave.put({ ...s, plans: { ...keep, [date]: next } });
  });
}

/** Takes one tile of the pick of three, once: a tactic card, a scouting lead or research. */
export async function choosePick(matchId: string, i: number): Promise<boolean> {
  return db.transaction('rw', [db.fbSave, db.fbMatches], async () => {
    const m = await db.fbMatches.get(matchId);
    const s = await db.fbSave.get('save');
    const t = m?.pick?.tiles[i];
    if (!m || !s || !t || m.pick!.chosen !== undefined) return false;
    const save = { ...s };
    if (t.kind === 'card') {
      if ((save.tacticCards ?? []).length >= CARD_MAX) return false;
      save.tacticCards = [...(save.tacticCards ?? []), t.axis];
    } else if (t.kind === 'scout') {
      save.scouted = [...new Set([...(save.scouted ?? []), t.club])];
    } else {
      const eng = structuredClone(engineOf(save));
      eng.earned += t.n;
      eng.gains = [...eng.gains, { on: m.date, n: t.n, why: 'pick' as const, note: 'Pick of three' }].slice(-60);
      save.tree = eng;
    }
    await db.fbSave.put(save);
    await db.fbMatches.put({ ...m, pick: { ...m.pick!, chosen: i } });
    return true;
  });
}
