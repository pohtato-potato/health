import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties } from 'react';
import { db } from '../../db/db';
import { lastMonth } from '../../domain/film';
import { fmtDayMonth, fmtDuration, fmtInt } from '../../domain/format';
import { monthLabel } from '../../domain/goTo';
import { assessment, monthSpread, sleepProfile, topFives, tryNext } from '../../domain/monthReport';
import { back, go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
import { RegionFrameView } from '../../ui/live/RegionFrame';
import { CountUp } from '../../ui/you/CountUp';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { HUE } from '../../ui/you/palette';
import { Reveal } from '../../ui/you/Reveal';
import { CorrectionNotes } from './CorrectionNotes';
import { Grades } from './Grades';
import { useMonthInput } from './useMonthInput';

const DAYS = 'MTWTFSS';
const BAR_MAX = 56;

function Stat({ value, label, c, c2, vals }: { value: string; label: string; c: string; c2: string; vals: number[] }) {
  return (
    <div>
      <b style={{ color: c }}>{value}</b><span>{label}</span>
      {vals.length > 1 && <DrawnLine vals={vals} c={c} c2={c2} h={44} last={false} />}
    </div>
  );
}

/** The whole month on one dense page, then the marks, then what to try. */
export function MonthPage() {
  const { params } = useRoute();
  const input = useMonthInput();
  const corrections = useLiveQuery(() => db.corrections.toArray(), []);
  if (!input || !corrections) return <div className="page" />;
  const month = params.get('m') ?? lastMonth(input.today);
  const s = monthSpread(month, input);
  const grades = assessment(month, input);
  const top = topFives(month, input);
  const sleep = sleepProfile(month, input);
  const next = tryNext(grades);
  const peak = Math.max(1, ...s.perWeekday);
  const empty = !grades.length && !s.sets;
  return (
    <RegionFrameView km={0} className="yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/reports')}><Icon name="left" size={20} stroke={1.8} />Reports</button>
        <h1>{monthLabel(month)}</h1>
        {empty && <div className="yu-card"><b>Nothing was logged this month</b><span className="yu-q">A report needs at least one day.</span></div>}
        {!empty && (
          <>
            <Reveal className="yu-spread">
              <div className="yu-sp1">
                <div className="yu-sp-big"><CountUp to={s.sets} fmt={fmtInt} /></div>
                <span>sets, across {s.sessions} session{s.sessions === 1 ? '' : 's'}</span>
                <div className="yu-wk" role="img" aria-label={`Sessions by weekday: ${s.perWeekday.join(', ')}, Monday first`}>
                  {s.perWeekday.map((n, i) => <span key={i} style={{ '--h': `${Math.round((n / peak) * BAR_MAX)}px`, '--i': i } as CSSProperties}><i /><small>{DAYS[i]}</small></span>)}
                </div>
              </div>
              {s.stepsAvg !== undefined && <Stat value={fmtInt(s.stepsAvg)} label="steps a day" c={HUE.steps} c2={HUE.walk} vals={s.stepsSeries} />}
              {s.proteinAvg !== undefined && <Stat value={`${fmtInt(s.proteinAvg)} g`} label="protein a day" c={HUE.food} c2="#ff7db8" vals={s.proteinSeries} />}
              {s.sleepAvg !== undefined && <Stat value={fmtDuration(s.sleepAvg)} label="asleep a night" c={HUE.sleep} c2={HUE.train} vals={s.sleepSeries} />}
            </Reveal>
            <button type="button" className="btn ghost" onClick={() => go('/film', { m: month })}>Play the month's film</button>
          </>
        )}
        {grades.length > 0 && <section className="yu-sec"><h2>Assessed</h2><div className="yu-card"><Grades grades={grades} /></div></section>}
        {next && <section className="yu-sec"><h2>Try next</h2><div className="yu-card"><span>{next}</span></div></section>}
        {top.steps.length > 0 && (
          <section className="yu-sec"><h2>Biggest step days</h2>
            <div>{top.steps.map((d) => <div key={d.date} className="yu-dated"><span>{fmtDayMonth(d.date)}</span><span className="tn">{fmtInt(d.steps)}</span></div>)}</div>
          </section>
        )}
        {top.lifts.length > 0 && (
          <section className="yu-sec"><h2>Most-trained lifts</h2>
            <div>{top.lifts.map((l) => <div key={l.name} className="yu-dated"><span className="tn">{l.sets} sets</span><span>{l.name}</span></div>)}</div>
          </section>
        )}
        {sleep && (
          <section className="yu-sec"><h2>Sleep profile</h2>
            <div className="yu-card yu-tint" style={{ '--c': HUE.sleep } as CSSProperties}>
              <b>{fmtDuration(sleep.avg)} on a usual night</b>
              <span className="yu-q">Shortest {fmtDuration(sleep.shortest.min)} on {fmtDayMonth(sleep.shortest.date)}. Longest {fmtDuration(sleep.longest.min)} on {fmtDayMonth(sleep.longest.date)}. {sleep.nights} nights logged.</span>
            </div>
          </section>
        )}
        <CorrectionNotes from={`${month}-01`} to={`${month}-31`} list={corrections} />
      </div>
    </RegionFrameView>
  );
}
