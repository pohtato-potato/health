import type { Correction } from '../domain/corrections';
import { db } from './db';

export async function addCorrection(c: Omit<Correction, 'id' | 'at'>): Promise<void> {
  const at = Date.now();
  await db.corrections.put({ ...c, id: `${c.date}:${at}`, at });
}
