import { useAllDays, useSessions, useToday } from '../../db/hooks';
import { addDays } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { monthLabel } from '../../domain/goTo';
import { monthsWithData } from '../../domain/monthReport';
import { weekNumber } from '../../domain/weekly';
import { weeksWithData } from '../../domain/weeklyStory';
import { back, go } from '../../router';
import { PageHead } from '../../ui/kit/Kit';
import { ArchTiles } from './ArchTiles';

/** Every past week and month, opening as it was. */
export function Archive() {
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  if (!days || !sessions) return <div className="page bare k-page k-light you" />;
  const weeks = weeksWithData(days, sessions, today);
  const months = monthsWithData(days, today);
  // The same days monthsWithData counts: a step count or a night logged.
  const logged = (m: string) => days.filter((d) => d.date.startsWith(m) && (d.steps !== undefined || d.sleep)).length;
  return (
    <div className="page bare k-page k-light you yu-page">
      <div className="k-page">
        <PageHead back="Reports" onBack={() => back('/reports')} title="The archive" family="back" />
        <p className="dc-sub">Every past week and month, opening as it was.</p>
        {!weeks.length && !months.length && <div className="yu-card"><b>Nothing here yet</b><span className="yu-q">Finished weeks and months collect here.</span></div>}
        <ArchTiles title="Months" tiles={months.map((m) => {
          const n = logged(m);
          return { id: m, name: monthLabel(m), sub: `${n} day${n === 1 ? '' : 's'} logged`, onOpen: () => go('/reports/month', { m }) };
        })} />
        <ArchTiles title="Weeks" from={2} tiles={weeks.map((w) => ({ id: w, name: `Week ${weekNumber(w)}`, sub: `${fmtDayMonth(w)} to ${fmtDayMonth(addDays(w, 6))}`, onOpen: () => go('/reports/week', { w }) }))} />
      </div>
    </div>
  );
}
