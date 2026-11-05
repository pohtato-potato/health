import { db } from '../db/db';
import { creatureThemeOn, drawVisitors, firstVisitor, type NightState, type Sighting } from '../domain/creatures';
import { CREATURES } from '../domain/creatureRoster';
import { addDays, type DayKey } from '../domain/dates';
import { realSets } from '../domain/plan';
import { regionAt } from '../domain/regions';
import { sleepMinutes } from '../domain/rings';
import { kmFromSteps } from '../domain/walk';
import { dayRings } from './derived';

export { creatureThemeOn, firstVisitor };

/** Who came for this morning: stored the first time, so a reload or a replay never changes it. */
export async function ensureReveal(date: DayKey, now = Date.now()): Promise<Sighting[]> {
  return db.transaction('rw', [db.days, db.sightings, db.settings, db.entries, db.sets], async () => {
    const day = await db.days.get(date);
    const stored = await db.sightings.where('date').equals(date).toArray();
    if (day?.revealedAt) return stored.sort((a, b) => a.at - b.at);
    if (!day?.sleep) return [];
    const yesterday = addDays(date, -1);
    const [settings, y, entries, sets, days, sightings] = await Promise.all([
      db.settings.get('app'),
      db.days.get(yesterday),
      db.entries.where('date').equals(yesterday).toArray(),
      db.sets.where('date').equals(yesterday).toArray(),
      db.days.toArray(),
      db.sightings.toArray(),
    ]);
    if (!settings) return [];
    const night: NightState = {
      perfect: dayRings(settings, yesterday, y, entries).rings.perfect,
      records: realSets(sets).filter((s) => s.mark === '!!').length,
      sleepMin: sleepMinutes(day.sleep.asleep, day.sleep.woke),
    };
    const visitors = drawVisitors({ ...night, date, asleep: day.sleep.asleep, region: regionAt(kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0))), sightings, roster: CREATURES, at: now });
    await db.sightings.bulkPut(visitors);
    await db.days.put({ ...day, revealedAt: now });
    return visitors;
  });
}
