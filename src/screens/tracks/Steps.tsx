import { useState } from 'react';
import { fmtDayShort, fmtInt } from '../../domain/format';
import { bestWeekday, eveningTopUps, placeSplit, todayAndChange, usualRange } from '../../domain/trackStats';
import { openSheet } from '../../router';
import { stepStreakFor, targetsFor } from '../../state/derived';
import { loadedSteps } from '../../walk/journal';
import { StepsExtras } from '../TrackExtras';
import { dayLabel, kindOn, placeMarkOn, spanDays, type Span, type TrackData } from './data';
import { changeText, HeroChart, TrackShell } from './Template';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Steps: office days hatched against the goal, loaded steps in gold, then office against home, evening top-ups and the best weekday. */
export function StepsTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState<Span>('30');
  const { settings, today } = data;
  const t = targetsFor(settings, today);
  const range = spanDays(today, span);
  const label = dayLabel(range.length);
  const all = [...data.days.values()];
  const steps = new Map(all.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const loaded = loadedSteps(data.sets);
  const logged = range.filter((d) => steps.has(d));
  const avg = logged.length ? logged.reduce((n, d) => n + steps.get(d)!, 0) / logged.length : undefined;
  const ch = todayAndChange(steps, today);
  const kinds = kindOn(data);
  const split = placeSplit(logged, (d) => steps.get(d), kinds);
  const tops = eveningTopUps(range.map((d) => data.days.get(d)).filter((d) => !!d), t.steps);
  const best = bestWeekday(new Map([...steps].filter(([d]) => d >= range[0])));
  const band = usualRange(logged.map((d) => steps.get(d)!));
  const streak = stepStreakFor(settings, all, today);

  return (
    <TrackShell
      title="Steps"
      color="var(--sage)"
      value={avg !== undefined ? fmtInt(avg) : '—'}
      sub={`daily average · ${logged.length} of ${range.length} days`}
      change={changeText(ch.delta, fmtInt, true)}
      span={span}
      onSpan={(s) => setSpan(s as Span)}
      hero={
        <HeroChart
          label={`Steps over ${range.length} days`}
          color="var(--sage)"
          fmt={(n) => fmtInt(n)}
          target={t.steps}
          band={band}
          points={range.map((d) => ({ label: label(d), value: steps.get(d) ?? null, extra: loaded.get(d), hatch: kinds(d) === 'office', place: placeMarkOn(data, d), nightOut: !!data.days.get(d)?.nightOut }))}
        />
      }
      insights={[
        split.diff !== undefined && Math.abs(split.diff) >= 300 && `Office days: ${fmtInt(Math.abs(split.diff))} ${split.diff < 0 ? 'fewer' : 'more'} than home.`,
        tops.tried > 0 && `Evening top-ups reached the goal ${tops.reached} of ${tops.tried} times.`,
        best && logged.length >= 7 && `Best weekday: ${WEEKDAYS[best.weekday]}, about ${fmtInt(best.avg)}.`,
      ]}
      history={{ title: 'Day by day', rows: [...logged].reverse().slice(0, 30).map((d) => [fmtDayShort(d), `${fmtInt(steps.get(d)!)}${loaded.get(d) ? ` · ${fmtInt(loaded.get(d)!)} loaded` : ''}`]) }}
    >
      {[...loaded.keys()].some((d) => d >= range[0]) && <div className="t13 q lh">Gold on a bar: steps walked carrying weight, which count extra on the Walk.</div>}
      <div className="card">
        <div className="row t15">
          <span>Step streak</span>
          <span className="tn">
            {streak.current} day{streak.current === 1 ? '' : 's'} · best {streak.best}
          </span>
        </div>
        <div className="row t15">
          <span>Shields</span>
          <span className="tn">{streak.shields} of 2</span>
        </div>
        <div className="t13 q lh">A shield for every 7 days in a row, spent automatically on a missed day.</div>
      </div>
      <StepsExtras days={all} today={today} range={range} settings={settings} />
      <button type="button" className="btn block" onClick={() => openSheet('steps')}>
        Log steps
      </button>
    </TrackShell>
  );
}
