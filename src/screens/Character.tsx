import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { xpFrom, levelOf } from '../domain/rewards';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { useUnlockedIds } from '../ui/Theme';
import { summaries } from '../state/Challenge';

export function useLevel() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const unlocked = useUnlockedIds();
  const checkins = useLiveQuery(() => db.checkins.count(), []);
  const today = useToday();
  if (!settings || !days || !entries || !sessions || !unlocked || checkins === undefined) return undefined;
  const all = summaries(settings, days, entries, days.reduce((m, d) => (d.date < m ? d.date : m), today), today);
  const xp = xpFrom([...unlocked], { perfect: all.filter((d) => d.perfect).length, sessions: sessions.filter((s) => s.status === 'done').length, checkins });
  return { ...levelOf(xp), unlocked, settings, days, entries, sessions, all };
}

/** The character sheet went; its titles joined the wall on Earned and its rewards the picker. */
export function CharacterPage() {
  useEffect(() => go('/earned', undefined, { replace: true }), []);
  return null;
}
