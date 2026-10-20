import { db } from '../db/db';
import { recentTwin } from '../domain/foodChecks';
import { askConfirm } from './Confirm';

/** True to go ahead: no twin in the last two minutes, or the owner said "Add again". */
export async function okToAdd(e: { date: string; foodId?: string; name: string }, now = Date.now()): Promise<boolean> {
  const same = await db.entries.where('date').equals(e.date).toArray();
  const twin = recentTwin(same, e, now);
  if (!twin) return true;
  const secs = Math.max(1, Math.round((now - twin.at) / 1000));
  return askConfirm({ title: `Add ${e.name} again?`, body: `It was added ${secs < 60 ? `${secs} s` : `${Math.round(secs / 60)} min`} ago (${twin.portion}).`, yes: 'Add again', no: 'No, once is right' });
}
