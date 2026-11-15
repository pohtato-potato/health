import { useAllDays, useSessions, useToday } from '../../db/hooks';
import { addDays } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { monthLabel } from '../../domain/goTo';
import { monthsWithData } from '../../domain/monthReport';
import { weekNumber } from '../../domain/weekly';
import { weeksWithData } from '../../domain/weeklyStory';
import { back, go } from '../../router';
import { Icon } from '../../ui/Icon';
import { PageHead } from '../../ui/kit/Kit';

/** Every past week and month, opening as it was. */
export function Archive() {
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  if (!days || !sessions) return <div className="page bare k-page k-light you" />;
  const weeks = weeksWithData(days, sessions, today);
  const months = monthsWithData(days, today);
  return (
    <div className="page bare k-page k-light you yu-page">
      <div className="k-page">
        <PageHead back="Reports" onBack={() => back('/reports')} title="The archive" />
        {!weeks.length && !months.length && <div className="yu-card"><b>Nothing here yet</b><span className="yu-q">Finished weeks and months collect here.</span></div>}
        {months.length > 0 && (
          <section className="yu-sec"><h2>Months</h2>
            <div className="yu-rows">{months.map((m) => <button key={m} type="button" onClick={() => go('/reports/month', { m })}><span>{monthLabel(m)}</span><Icon name="right" size={16} stroke={1.8} /></button>)}</div>
          </section>
        )}
        {weeks.length > 0 && (
          <section className="yu-sec"><h2>Weeks</h2>
            <div className="yu-rows">{weeks.map((w) => <button key={w} type="button" onClick={() => go('/reports/week', { w })}><span>Week {weekNumber(w)}</span><span className="yu-q">{fmtDayMonth(w)} to {fmtDayMonth(addDays(w, 6))}</span></button>)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
