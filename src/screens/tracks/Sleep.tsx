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
import { sleepWindows } from '../../domain/insights';
import { usualWake } from '../../domain/sleepRegularity';

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
  const office = settings.places?.find((p) => p.kind === 'office');
  const officeWake = office ? usualWake(all, office.id, today) : undefined;
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
      hero={<SleepBands days={all} range={range} officeWake={officeWake} />}
      insights={[
        regNow !== undefined && `Regularity ${regNow}${regThen !== undefined && regThen !== regNow ? `, ${regNow > regThen ? 'up' : 'down'} from ${regThen}` : ''}: how alike your sleep and wake times were night to night.`,
        drift !== undefined && Math.abs(drift) >= 15 && `Office nights: asleep ${fmtDuration(Math.abs(drift))} ${drift > 0 ? 'later' : 'earlier'} on average.`,
        'Steady times help as much as long nights: going to bed within the same half hour matters more than the odd lie-in.',
      ]}
      history={{ title: 'Night by night', rows: [...logged].reverse().slice(0, 30).map((d) => [fmtDayShort(d), fmtDuration(mins.get(d)!)]) }}
    >
      <div className="card">
        <div className="lbl" style={{ color: 'var(--sleep)' }}>
          Hours a night
        </div>
        <HeroChart
          label={`Sleep over ${range.length} nights`}
          color="var(--blue)"
          fmt={(n) => fmtDuration(Math.round(n))}
          target={t.sleepMin}
          band={usualRange(logged.map((d) => mins.get(d)!))}
          points={range.map((d) => ({ label: label(d), value: mins.get(d) ?? null, place: placeMarkOn(data, d) }))}
        />
      </div>
      <SleepExtras days={all} today={today} settings={settings} />
    </TrackShell>
  );
}

/** Sleep (s24): the window as a band per night. Gold: your office wake-up; dashed: not logged; rose: under 5 h. */
function SleepBands({ days, range, officeWake }: { days: TrackData['days'] extends Map<string, infer D> ? D[] : never; range: string[]; officeWake?: number }) {
  const nights = sleepWindows(days, range).slice(-21);
  const dates = range.slice(-21);
  const start = -180;
  const end = 660;
  const W = 320;
  const row = 11;
  const left = 30;
  const H = dates.length * row + 18;
  const x = (m: number) => left + ((Math.min(Math.max(m, start), end) - start) / (end - start)) * (W - left - 4);
  return (
    <div className="col gap8">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="When you slept, night by night">
        {officeWake !== undefined && <rect x={x(officeWake) - 3} y="0" width="6" height={H - 14} fill="var(--gold)" opacity="0.28" rx="2" />}
        {[-180, 0, 180, 360, 540].map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1="0" y2={H - 14} stroke="var(--divider)" />
            <text x={x(m)} y={H - 3} textAnchor="middle" fontSize="8.5" fill="var(--dim)" fontFamily="var(--sans)">
              {m === -180 ? '9 pm' : m === 0 ? '12 am' : m === 180 ? '3 am' : m === 360 ? '6 am' : '9 am'}
            </text>
          </g>
        ))}
        {dates.map((date, i) => {
          const n = nights[i];
          const y = i * row + 2;
          return (
            <g key={date}>
              <text x="0" y={y + 7.5} fontSize="7.5" fill="var(--dim)" fontFamily="var(--sans)">
                {Number(date.slice(8))}
              </text>
              {n ? (
                <rect x={x(n.from)} y={y} width={Math.max(2, x(n.to) - x(n.from))} height={row - 4} rx="3" fill={n.minutes < 300 ? 'var(--rose)' : 'var(--sleep)'} opacity={0.85} />
              ) : (
                <rect x={x(-30)} y={y} width={x(420) - x(-30)} height={row - 4} rx="3" fill="none" stroke="var(--btn-border)" strokeDasharray="2 2" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="t12 q">Gold band: your office wake-up · dashed: not logged · rose: under 5 h</div>
    </div>
  );
}
