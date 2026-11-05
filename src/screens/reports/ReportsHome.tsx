import { useAllDays, useSessions, useToday } from '../../db/hooks';
import { fmtDayMonth } from '../../domain/format';
import { addDays } from '../../domain/dates';
import { monthLabel } from '../../domain/goTo';
import { monthsWithData } from '../../domain/monthReport';
import { weekNumber } from '../../domain/weekly';
import { weeksWithData } from '../../domain/weeklyStory';
import { back, go } from '../../router';
import { Icon } from '../../ui/Icon';
import { RegionFrameView } from '../../ui/live/RegionFrame';
import { HUE } from '../../ui/you/palette';
import type { CSSProperties } from 'react';

export function ReportsHome() {
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  if (!days || !sessions) return <div className="page" />;
  const week = weeksWithData(days, sessions, today)[0];
  const month = monthsWithData(days, today)[0];
  return (
    <RegionFrameView km={0} className="yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/you')}><Icon name="left" size={20} stroke={1.8} />You</button>
        <h1>Reports</h1>
        {!week && !month && <div className="yu-card"><b>Nothing to report yet</b><span className="yu-q">Your first story comes after your first full week.</span></div>}
        {week && (
          <button type="button" className="yu-card yu-tint yu-open" style={{ '--c': HUE.food } as CSSProperties} onClick={() => go('/reports/week', { w: week })}>
            <b>Week {weekNumber(week)}, the story</b>
            <span className="yu-q">{fmtDayMonth(week)} to {fmtDayMonth(addDays(week, 6))}. The road, who came by, and what is next.</span>
          </button>
        )}
        {month && (
          <>
            <button type="button" className="yu-card yu-tint yu-open" style={{ '--c': HUE.train } as CSSProperties} onClick={() => go('/reports/month', { m: month })}>
              <b>{monthLabel(month)}</b>
              <span className="yu-q">The whole month on one page, and how it went.</span>
            </button>
            <button type="button" className="btn ghost" onClick={() => go('/film', { m: month })}>Play {monthLabel(month)}'s film</button>
          </>
        )}
        <div className="yu-rows">
          <button type="button" onClick={() => go('/reports/archive')}><span>Every past week and month</span><Icon name="right" size={16} stroke={1.8} /></button>
          <button type="button" onClick={() => go('/reports/corrections')}><span>Corrections</span><Icon name="right" size={16} stroke={1.8} /></button>
        </div>
      </div>
    </RegionFrameView>
  );
}
