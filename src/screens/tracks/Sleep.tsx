import { useState } from 'react';
import { addDays } from '../../domain/dates';
import { fmtDayShort, fmtDuration } from '../../domain/format';
import { sleepMinutes } from '../../domain/rings';
import { sri } from '../../domain/sleepRegularity';
import { bedDrift, todayAndChange, usualRange } from '../../domain/trackStats';
import { targetsFor } from '../../state/derived';
import { SleepExtras } from '../TrackExtras';
import { dayLabel, kindOn, placeMarkOn, spanDays, type TrackData } from './data';
import { changeText, HeroChart, TrackShell } from './Template';

/** Sleep, kept minimal: nightly duration, regularity, office-night drift, tonight's target and one tip. */
export function SleepTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState('14');
  const { settings, today } = data;
  const t = targetsFor(settings, today);
  const range = spanDays(today, span);
  const label = dayLabel(range.length);
  const all = [...data.days.values()];
  const mins = new Map(all.filter((d) => d.sleep).map((d) => [d.date, sleepMinutes(d.sleep!.asleep, d.sleep!.woke)]));
  const logged = range.filter((d) => mins.has(d));
  const avg = logged.length ? logged.reduce((n, d) => n + mins.get(d)!, 0) / logged.length : undefined;
  const ch = todayAndChange(mins, today);
  const week = (end: string) => sri(all.filter((d) => d.date <= end && d.date > addDays(end, -7)));
  const regNow = week(today);
  const regThen = week(addDays(today, -7));
  const kinds = kindOn(data);
  const drift = bedDrift(all.filter((d) => d.date >= range[0]), (d) => kinds(d) === 'office');

  return (
    <TrackShell
      title="Sleep"
      color="var(--blue)"
      value={avg !== undefined ? fmtDuration(Math.round(avg)) : '—'}
      sub={`average · need ${fmtDuration(t.sleepMin)}`}
      change={changeText(ch.delta, (n) => fmtDuration(Math.round(n)), true)}
      span={span}
      spans={['14', '30', '90']}
      unit="n"
      onSpan={setSpan}
      hero={
        <HeroChart
          label={`Sleep over ${range.length} nights`}
          color="var(--blue)"
          fmt={(n) => fmtDuration(Math.round(n))}
          target={t.sleepMin}
          band={usualRange(logged.map((d) => mins.get(d)!))}
          points={range.map((d) => ({ label: label(d), value: mins.get(d) ?? null, place: placeMarkOn(data, d) }))}
        />
      }
      insights={[
        regNow !== undefined && `Regularity ${regNow}${regThen !== undefined && regThen !== regNow ? `, ${regNow > regThen ? 'up' : 'down'} from ${regThen}` : ''}: how alike your sleep and wake times were night to night.`,
        drift !== undefined && Math.abs(drift) >= 15 && `Office nights: asleep ${fmtDuration(Math.abs(drift))} ${drift > 0 ? 'later' : 'earlier'} on average.`,
        'Steady times help as much as long nights: going to bed within the same half hour matters more than the odd lie-in.',
      ]}
      history={{ title: 'Night by night', rows: [...logged].reverse().slice(0, 30).map((d) => [fmtDayShort(d), fmtDuration(mins.get(d)!)]) }}
    >
      <SleepExtras days={all} today={today} settings={settings} />
    </TrackShell>
  );
}
