import { checkInDue } from '../../domain/checkinSchedule';
import { dayKey, daysBetween, weekStart, weekday, type DayKey } from '../../domain/dates';
import { storyWeek } from '../../domain/weekly';
import type { Measurement, Settings } from '../../domain/types';
import { go } from '../../router';

export interface Due { id: 'medical' | 'waist'; title: string; sub: string; path: string; params?: Record<string, string> }


/**
 * What is due today, in the order it shows (R3 c-medical, R4 5): Medical day (the monthly check-in) and the Sunday
 * waist, which lives inside this week's story. Neither can be dismissed on its day: it must be unmissable.
 */
export function dueToday(i: { today: DayKey; settings: Pick<Settings, 'checkInDay' | 'createdAt'>; checkins: DayKey[]; measurements: Pick<Measurement, 'date' | 'waistStanding'>[] }): Due[] {
  const out: Due[] = [];
  const last = [...i.checkins].sort().pop();
  const medical = last ? checkInDue(i.today, i.settings.checkInDay ?? 1, last) : daysBetween(dayKey(new Date(i.settings.createdAt)), i.today) > 3;
  if (medical) out.push({ id: 'medical', title: 'Medical day', sub: 'Photos and the tape. It keeps Shape fresh for four weeks.', path: '/checkin' });
  if (weekday(i.today) === 6) {
    const ws = weekStart(i.today);
    const measured = i.measurements.some((m) => m.waistStanding !== undefined && m.date >= ws && m.date <= i.today);
    if (!measured) out.push({ id: 'waist', title: 'Sunday waist', sub: 'One number in inches, inside this week’s story.', path: '/reports/week', params: { w: storyWeek(i.today), card: 'waist' } });
  }
  return out;
}

/** The full-width due card at the top of Today. */
export function DueCard({ due }: { due: Due[] }) {
  if (!due.length) return null;
  return (
    <div className="td-due" data-section="due">
      {due.map((d) => (
        <button key={d.id} type="button" className={`td-duecard ${d.id}`} onClick={() => go(d.path, d.params)}>
          <svg className="td-dueic" viewBox="0 0 24 24" aria-hidden="true">
            {d.id === 'medical' ? <path d="M12 21 C5 16 3 12 3 8.5 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8.5 C21 12 19 16 12 21 Z M12 10 V15 M9.5 12.5 H14.5" /> : <path d="M3 9 H21 V15 H3 Z M7 9 V12 M11 9 V13 M15 9 V12 M19 9 V12" />}
          </svg>
          <span className="td-duet"><b>{d.title} ›</b><span>{d.sub}</span></span>
          <span className="td-duego">Due today</span>
        </button>
      ))}
    </div>
  );
}
