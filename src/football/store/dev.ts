// Dev and test only: put Brabo in the Crown League and the Continental Cup field, to check the
// continental screens without five promotions; and (LG-4) move a test save into world 2 at a chosen division.
// The app only reaches this in development, through `window.fbDev` (Football.tsx); a production build leaves it out.
import { db } from '../../db/db';
import { OWN } from './season';
import { redrawWorld } from './redraw';
import type { FbClub, FbSeason } from './tables';

/** Swap Brabo with `with` (a Crown League club) everywhere in the season; Brabo takes their continental place too. */
export function crownSwap(season: FbSeason, clubs: FbClub[], withId: string): { season: FbSeason; clubs: FbClub[] } {
  const sw = (id: string) => (id === OWN ? withId : id === withId ? OWN : id);
  const pairs = (xs: [string, string][]) => xs.map(([h, a]) => [sw(h), sw(a)] as [string, string]);
  const s: FbSeason = JSON.parse(JSON.stringify(season));
  const [a, b] = [s.tierOf[OWN], s.tierOf[withId]];
  s.tierOf[OWN] = b; s.tierOf[withId] = a;
  for (const t of Object.keys(s.fixtures) as unknown as (keyof FbSeason['fixtures'])[]) s.fixtures[t] = s.fixtures[t].map(pairs);
  for (const t of Object.keys(s.results) as unknown as (keyof FbSeason['results'])[]) s.results[t] = s.results[t].map((p) => ({ ...p, home: sw(p.home), away: sw(p.away) }));
  if (s.continental) {
    const c = s.continental;
    const target = c.field.includes(withId) ? withId : c.field[3];
    const swc = (id: string) => (id === target ? OWN : id);
    c.field = c.field.map(swc);
    c.rounds = c.rounds.map((r) => r.map(([h, x]) => [swc(h), swc(x)] as [string, string]));
  }
  return { season: s, clubs: clubs.map((c) => (c.id === OWN ? { ...c, tier: b } : c.id === withId ? { ...c, tier: a } : c)) };
}

/** Dev only: apply crownSwap to the live save (run from the browser console via a dynamic import). */
export async function devCrownLeague(withId = 'bay') {
  const save = await db.fbSave.get('save');
  if (!save) return;
  const season = (await db.fbSeasons.get(save.season))!;
  const out = crownSwap(season, await db.fbClubs.toArray(), withId);
  await db.transaction('rw', db.fbSeasons, db.fbClubs, async () => {
    await db.fbSeasons.put(out.season);
    await db.fbClubs.bulkPut(out.clubs);
  });
}

/**
 * Dev and tests only (LG-4 step 6): move a world-1 test save into world 2 with Brabo in `division` (1–8), the way the
 * owner's move does it, but skipping the placing's choice. Returns the plan, or undefined for a save already moved.
 */
export async function devWorld2(division: number, now = Date.now()) {
  if (!Number.isInteger(division) || division < 1 || division > 8) throw new Error('division must be 1 to 8');
  return redrawWorld(now, { division });
}
