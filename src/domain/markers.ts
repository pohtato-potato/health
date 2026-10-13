import type { ChartMarker, Day, Settings, Status } from './types';

const STATUS_WORD: Record<Status, string> = { sick: 'ill', injured: 'injured', travelling: 'travelling', break: 'a break', occasion: 'an occasion' };

/**
 * Markers that come from the data on their own: a status starting, a night out, and the first
 * tick of each checklist item ("Started creatine").
 */
export function autoMarkers(days: Pick<Day, 'date' | 'status' | 'nightOut' | 'ticks'>[], settings: Pick<Settings, 'checklist'>): ChartMarker[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const out: ChartMarker[] = [];
  const started = new Set<string>();
  let prevStatus: Status | undefined;
  for (const d of sorted) {
    for (const key of Object.keys(d.ticks ?? {})) {
      const id = key.split(':')[0];
      if (started.has(id)) continue;
      started.add(id);
      const item = settings.checklist.find((c) => c.id === id);
      if (item) out.push({ id: `auto:start:${id}`, date: d.date, text: `Started ${item.name.toLowerCase()}`, auto: true });
    }
    if (d.status && d.status !== prevStatus) out.push({ id: `auto:status:${d.date}`, date: d.date, text: `Status: ${STATUS_WORD[d.status]}`, auto: true });
    prevStatus = d.status;
    if (d.nightOut) out.push({ id: `auto:night:${d.date}`, date: d.date, text: 'Night out', auto: true });
  }
  return out;
}
