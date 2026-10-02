import { db } from '../db/db';
import { getSettings } from '../db/actions';
import { kmFromSteps } from '../domain/walk';
import { buildPostcard, daysToSend, putPostcards, type Postcard } from './postcard';

/* Leaves a postcard on the shelf for each finished day that has something in it. Days with nothing logged send nothing.
   Safe to run often: a day's postcard is simply replaced with a fresh one. Never throws; Health carries on either way. */
export async function sendPostcards(now = new Date()): Promise<string[]> {
  try {
    const days = daysToSend(now), settings = await getSettings(), cards: Postcard[] = [];
    const allDays = await db.days.toArray();
    for (const date of days) {
      const day = allDays.find(d => d.date === date), sessions = await db.sessions.where('date').equals(date).toArray(), checkins = await db.checkins.where('date').equals(date).toArray();
      if (!day?.steps && !day?.sleep && !sessions.some(s => s.status === 'done')) continue;
      const stepsToDate = allDays.filter(d => d.date <= date).reduce((a, d) => a + (d.steps ?? 0), 0);
      cards.push(buildPostcard(date, day, sessions, checkins, settings.targets, kmFromSteps(stepsToDate), now.getTime()));
    }
    await putPostcards(cards);
    return cards.map(c => c.day);
  } catch { return []; }
}
