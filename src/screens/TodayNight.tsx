import { addDays, type DayKey } from '../domain/dates';
import { fmtClock, fmtDayLong, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { findSession } from '../domain/plan';
import { type Rings as RingsState, type Totals } from '../domain/rings';
import { prefOn, type Day, type Settings, type TrainingSession } from '../domain/types';
import { voiceFor, voiceLine } from '../domain/voice';
import { kmFromSteps, positionAt } from '../domain/walk';
import { Icon } from '../ui/Icon';
import { targetsFor, type NextUp } from '../state/derived';

/** The usual wake time, from the last week of logged mornings. */
export function usualWake(days: Day[], today: DayKey): number | undefined {
  const wakes = days
    .filter((d) => d.sleep && d.date > addDays(today, -8) && d.date <= today)
    .map((d) => d.sleep!.woke)
    .sort((a, b) => a - b);
  return wakes.length >= 3 ? wakes[Math.floor(wakes.length / 2)] : undefined;
}

/** After 11 pm: dimmer, warmer, and only tonight and tomorrow. */
export function TodayNight({
  settings,
  today,
  days,
  totals,
  rings,
  up,
  trainedToday,
  onShowAll,
}: {
  settings: Settings;
  today: DayKey;
  days: Day[];
  totals: Totals;
  rings: RingsState;
  up?: NextUp;
  trainedToday: TrainingSession[];
  onShowAll: () => void;
}) {
  const now = Date.now();
  const t = targetsFor(settings, today);
  const wake = usualWake(days, today);
  const bedtime = wake !== undefined ? (wake - t.sleepMin + 1440) % 1440 : undefined;
  const recent = days.filter((d) => d.sleep && d.date > addDays(today, -7));
  const onTime = bedtime !== undefined ? recent.filter((d) => ((d.sleep!.asleep - bedtime + 1440 + 720) % 1440) - 720 <= 15).length : 0;
  const v = voiceFor(settings.voice, prefOn(settings.prefs, 'shuffleVoices'), today);
  // The morning log and walk belong to tomorrow's date once it's past midnight.
  const tomorrowKey = new Date().getHours() < 4 ? today : addDays(today, 1);
  const steps = days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const km = kmFromSteps(steps);
  const pos = positionAt(km);
  const def = up && settings.plan ? findSession(settings.plan, up.sessionId) : undefined;
  const tomorrowLogged = days.find((d) => d.date === tomorrowKey)?.morning;

  return (
    <div className="page" style={{ paddingTop: 'calc(40px + var(--safe-top))', gap: 18 }}>
      <div className="col gap8">
        <div className="lbl">
          {fmtDayLong(today).split(' · ')[0]} · {fmtTime(now)} · night mode
        </div>
        <h1 className="h1" style={{ fontSize: 32 }}>
          Good night{settings.name ? `, ${settings.name}` : ''}
        </h1>
        <div className="voice">{voiceLine(v, 'night', today)}</div>
      </div>

      <div className="card" style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', background: '#110f17', borderColor: '#26223a' }}>
        <Icon name="sleep" size={26} color="#8e95c9" />
        <div className="col gap6">
          <div className="lbl" style={{ color: '#8e95c9' }}>
            Tonight
          </div>
          {bedtime !== undefined && wake !== undefined ? (
            <>
              <div className="t17 lh">
                Asleep by {fmtClock(bedtime)} gets you {fmtDuration(t.sleepMin)} before your usual {fmtClock(wake)} wake-up.
              </div>
              <div className="t13 q">
                You've been asleep by {fmtClock(bedtime + 15)} on {onTime} of the last {recent.length} nights.
              </div>
            </>
          ) : (
            <div className="t17 lh">Aim for {fmtDuration(t.sleepMin)}. Log a few mornings and Health will work out your bedtime.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <svg width="64" height="64" viewBox="0 0 200 200" aria-label={`${rings.closed} of 3 rings closed`} style={{ flexShrink: 0, opacity: 0.8 }}>
          {[
            [84, 'var(--apricot)', rings.kcal.closed],
            [62, 'var(--lavender)', rings.protein.closed],
            [40, 'var(--sage)', rings.steps.closed],
          ].map(([r, c, on]) => (
            <circle key={String(r)} cx="100" cy="100" r={Number(r)} fill="none" stroke={String(c)} strokeOpacity={on ? 1 : 0.2} strokeWidth="16" />
          ))}
        </svg>
        <div className="col gap4">
          <div className="t16">{rings.perfect ? 'Perfect day' : `${rings.closed} of 3 rings`}</div>
          <div className="t13 q">
            {fmtInt(totals.kcal)} kcal · {Math.round(totals.protein)} g protein · {fmtInt(totals.steps)} steps.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="lbl">Tomorrow</div>
        <div className="col gap8 t15">
          {def && (
            <div className="row">
              <span>{trainedToday.length ? `Next: ${def.name}` : def.name}</span>
              <span className="q">{def.focus.toLowerCase()}</span>
            </div>
          )}
          <div className="row">
            <span>Morning log</span>
            <span className="q">{tomorrowLogged ? 'done' : 'waiting for you'}</span>
          </div>
          {pos.to && (
            <div className="row">
              <span>Walk across India</span>
              <span className="q">
                {pos.to.name} in {fmtInt(Math.ceil(pos.to.km - km))} km
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="t13 q center lh">After 11 pm Health dims, warms its colours and hides everything but tonight.</div>
      <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={onShowAll}>
        Show everything
      </button>
    </div>
  );
}
