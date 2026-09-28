import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { buildStats, type AchInput, type AchStats } from '../domain/achStats';
import { ACHIEVEMENTS, CATEGORIES, text, type AchDef } from '../domain/achievements';
import { db } from '../db/db';
import { useToday } from '../db/hooks';
import { go } from '../router';
import { TIER_COLOR, TIER_NAME, useMoments } from '../ui/Moments';
import { setFastUndoHandler, useToast } from '../ui/Toasts';
import { bump } from '../db/actions';

/** Everything the achievement conditions read, in one live snapshot. */
export function useAchInput(today: string): AchInput | undefined {
  return useLiveQuery(async () => {
    const settings = await db.settings.get('app');
    if (!settings) return undefined;
    return {
      today,
      now: Date.now(),
      settings,
      days: await db.days.toArray(),
      entries: await db.entries.toArray(),
      foods: await db.foods.toArray(),
      sessions: await db.sessions.toArray(),
      sets: await db.sets.toArray(),
      measurements: await db.measurements.toArray(),
      wins: await db.wins.toArray(),
      checkins: await db.checkins.toArray(),
      occasions: settings.occasions ?? [],
      weekNotes: await db.weeks.toArray(),
      clips: await db.clips.count(),
      counters: await db.counters.toArray(),
      unlocked: await db.achievements.toArray(),
    } satisfies AchInput;
  }, [today]);
}

export function safeTest(a: AchDef, s: AchStats): boolean {
  try {
    return a.test(s);
  } catch {
    return false;
  }
}

const iconFor = (a: AchDef) => CATEGORIES.find((c) => c.id === a.cat)!.icon;

/**
 * Checks every locked achievement a moment after anything changes. The first
 * sweep over existing history unlocks quietly with one summary, so installing
 * the app never sets off a flood of celebrations.
 */
export function AchievementWatcher() {
  const today = useToday();
  const input = useAchInput(today);
  const toast = useToast();
  const { show } = useMoments();
  const running = useRef(false);

  useEffect(() => {
    setFastUndoHandler(() => void bump('undo-fast'));
  }, []);

  useEffect(() => {
    if (!input?.settings.setupDone) return;
    const timer = window.setTimeout(async () => {
      if (running.current) return;
      running.current = true;
      try {
        const stats = buildStats(input);
        const fresh = ACHIEVEMENTS.filter((a) => !stats.unlocked.has(a.id) && safeTest(a, stats));
        if (!fresh.length) return;
        const quiet = stats.unlocked.size === 0 && fresh.length > 2;
        const at = Date.now();
        await db.achievements.bulkPut(fresh.map((a) => ({ id: a.id, at, date: today, ...(quiet ? { quiet: true } : {}) })));
        if (quiet) {
          toast({
            kicker: 'Achievements',
            text: `${fresh.length} unlocked from your history`,
            sub: 'Tap to see them all.',
            tone: 'gold',
            ms: 7000,
            onTap: () => go('/achievements'),
          });
          return;
        }
        for (const a of fresh) {
          const desc = text(a.desc, stats);
          if (a.tier === 'g' || a.tier === 'p') {
            show({ kind: 'achievement', key: `ach:${a.id}`, id: a.id, tier: a.tier, name: a.name, desc, reward: a.reward, icon: iconFor(a) });
          } else if (a.cat === 'secret') {
            toast({ kicker: 'Secret found', text: a.name, sub: desc, dot: { color: 'var(--lavender)', dashed: true }, tone: 'lavender', ms: 6000, onTap: () => go('/achievements') });
          } else {
            toast({ kicker: `${TIER_NAME[a.tier]} · achievement`, text: a.name, sub: desc, dot: { color: TIER_COLOR[a.tier] }, ms: 5000, onTap: () => go('/achievements') });
          }
        }
      } finally {
        running.current = false;
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [input, today, toast, show]);

  return null;
}
