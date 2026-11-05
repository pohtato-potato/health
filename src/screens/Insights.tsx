import { addDays } from '../domain/dates';
import { useAllDays, useAllSets, useEntriesBetween, useSessions, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { Heatmap } from './Heatmap';

/** For now, the heatmap's home. Part 5 builds the rest of this page. */
export function Insights() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useEntriesBetween(addDays(today, -62), today);
  if (!settings || !days || !sessions || !sets || !entries) return <div className="page" />;
  return (
    <div className="page">
      <button type="button" className="btn ghost" onClick={() => back('/you')}>Back to You</button>
      <h1 className="h1">Insights</h1>
      <Heatmap settings={settings} today={today} days={days} entries={entries} sessions={sessions} sets={sets} />
    </div>
  );
}
