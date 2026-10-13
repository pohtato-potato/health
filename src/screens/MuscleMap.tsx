import { weekStart } from '../domain/dates';
import { daysSince, weeklyHardSets } from '../domain/muscles';
import { MUSCLES, type MuscleId, type SetEntry } from '../domain/types';
import type { PlanDef } from '../domain/plan';
import { useAllSets, useSettings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { BodyHeat } from '../ui/BodyMap';
import { Icon } from '../ui/Icon';

/** Muscle groups as the Train card shows them. */
export const GROUPS: { name: string; muscles: MuscleId[] }[] = [
  { name: 'Delts', muscles: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Back', muscles: ['upper-back', 'lats'] },
  { name: 'Chest', muscles: ['chest'] },
  { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { name: 'Core', muscles: ['abs'] },
];

const NAMES: Record<MuscleId, string> = {
  chest: 'Chest',
  'upper-back': 'Upper back',
  lats: 'Lats',
  'front-delts': 'Front delts',
  'side-delts': 'Side delts',
  'rear-delts': 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export function groupSummary(sets: SetEntry[], plan: PlanDef, today: string) {
  const hard = weeklyHardSets(sets, plan, weekStart(today));
  return GROUPS.map((g) => {
    const since = g.muscles.map((x) => daysSince(x, sets, plan, today)).filter((d): d is number => d !== undefined);
    return { name: g.name, hard: Math.round(g.muscles.reduce((n, x) => n + (hard[x] ?? 0), 0)), since: since.length ? Math.min(...since) : undefined };
  });
}

const ago = (d: number | undefined) => (d === undefined ? 'not yet' : d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`);

/** The card on Train: hard sets this week by muscle group, and when each was last worked. */
export function MuscleCard({ sets, plan, today }: { sets: SetEntry[]; plan: PlanDef; today: string }) {
  const rows = groupSummary(sets, plan, today).filter((g) => g.hard > 0 || g.since !== undefined);
  if (!rows.length) return null;
  return (
    <button type="button" className="card" style={{ gap: 8 }} onClick={() => go('/muscles')}>
      <div className="row base">
        <div className="lbl">This week, hard sets</div>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </div>
      {rows.map((g) => (
        <div key={g.name} className="row t14" style={{ minHeight: 28 }}>
          <span>{g.name}</span>
          <span className="tn q">
            {g.hard} · {ago(g.since)}
          </span>
        </div>
      ))}
    </button>
  );
}

export function MuscleMapPage() {
  const settings = useSettings();
  const sets = useAllSets();
  const today = useToday();
  if (!settings?.plan || !sets) return <div className="page bare" />;
  const plan = settings.plan;
  const hard = weeklyHardSets(sets, plan, weekStart(today));
  const most = Math.max(1, ...Object.values(hard).map((v) => v ?? 0));
  const heat = Object.fromEntries(Object.entries(hard).map(([k, v]) => [k, (v ?? 0) / most]));
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/train')}>
        <Icon name="left" size={20} stroke={1.8} />
        Train
      </button>
      <h1 className="h1">Muscles this week</h1>
      <BodyHeat heat={heat} label="Hard sets this week, brighter where there were more" />
      <div className="card" style={{ gap: 0 }}>
        {MUSCLES.map((x) => (
          <div key={x} className="row t14" style={{ minHeight: 40, borderTop: '1px solid var(--divider)' }}>
            <span>{NAMES[x]}</span>
            <span className="tn q">
              {Math.round((hard[x] ?? 0) * 10) / 10} hard · {ago(daysSince(x, sets, plan, today))}
            </span>
          </div>
        ))}
      </div>
      <div className="t12 d lh">A hard set is one taken to three reps or fewer from failure. A muscle helping out counts half.</div>
    </div>
  );
}
