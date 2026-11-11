import { useAllEntries, useSettings, useToday } from '../../db/hooks';
import { addDays } from '../../domain/dates';
import { maintenanceRead } from '../../domain/maintenanceRead';
import { targetsFor } from '../../state/derived';

/** One or two lines after an over day or week (y-maint): where it sits against maintenance. */
export function MaintenanceRead() {
  const settings = useSettings();
  const entries = useAllEntries();
  const today = useToday();
  if (!settings || !entries) return null;
  const byDay = new Map<string, number>();
  for (const e of entries) if (e.date < today && e.date >= addDays(today, -7)) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.kcal);
  const yesterday = byDay.get(addDays(today, -1));
  const week = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, k]) => k);
  const lines = maintenanceRead({ maintenance: settings.maintenance?.kcal, kcalMax: targetsFor(settings, addDays(today, -1)).kcalMax, yesterday, week });
  if (!lines.length) return null;
  return (
    <section className="maint-read" aria-label="Against maintenance">
      <span className="lbl">Against maintenance</span>
      {lines.map((l) => <p key={l} className="t15 lh">{l}</p>)}
    </section>
  );
}
