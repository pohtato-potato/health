import { useState, type ReactNode } from 'react';
import { addDays, dayRange, daysBetween, weekday, weekStart, type DayKey } from '../domain/dates';
import { fmt1, fmtClock, fmtDayMonth, fmtDayShort, fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import { WEEKDAYS, WEEKDAY_NAMES, bedtimeFor, drinkNights, morningAfter, raceLastWeek, sleepPayoff, sleepWindows, sources, strengthScores, tshirtVsLast, weekdayPattern, type Strength } from '../domain/insights';
import type { CheckIn, Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../domain/types';
import { flagEvents, targetsFor } from '../state/derived';
import { usualWake } from './TodayNight';
import { Spark } from '../ui/Charts';
import { Icon } from '../ui/Icon';
import { go, openSheet } from '../router';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Card({ title, color, children, right }: { title: string; color?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="card">
      <div className="row base">
        <div className="lbl" style={color ? { color } : undefined}>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────── */

export function StepsExtras({ days, today, settings }: { days: Day[]; today: DayKey; range?: DayKey[]; settings: Settings }) {
  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const race = raceLastWeek(steps, today);
  const pattern = weekdayPattern(steps, today);
  const max = Math.max(...pattern.avg.map((v) => v ?? 0), targetsFor(settings, today).steps);

  return (
    <>
      {(race.last[6] > 0 || race.now[race.day] > 0) && (
        <Card title="Race your past self" color="var(--sage)">
          <RaceChart now={race.now} last={race.last} />
          <div className="t14 lh">
            {race.ahead === undefined
              ? `A new week. Last week's total to beat: ${fmtInt(race.last[6])} steps.`
              : race.ahead >= 0
                ? `${fmtInt(race.ahead)} steps ahead of last week at this point.`
                : `${fmtInt(-race.ahead)} steps behind last week, as of yesterday. Today can close it.`}
          </div>
          <div className="row t12 q" style={{ justifyContent: 'flex-start', gap: 14 }}>
            <span className="row" style={{ gap: 6 }}>
              <i style={{ width: 14, height: 2.5, borderRadius: 2, background: 'var(--sage)' }} />
              This week
            </span>
            <span className="row" style={{ gap: 6 }}>
              <i style={{ width: 14, borderTop: '1.5px dashed var(--quiet)' }} />
              Last week
            </span>
          </div>
        </Card>
      )}

      {pattern.avg.some((v) => v !== null) && (
        <Card title="Your week, by day" right={<span className="t12 q">last 8 weeks</span>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6, alignItems: 'end', height: 96 }}>
            {pattern.avg.map((v, i) => (
              <div key={i} className="col" style={{ alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
                <span className="t11 q tn">{v !== null ? `${fmt1(v / 1000)}k` : ''}</span>
                <div style={{ width: '70%', height: `${v !== null ? Math.max(4, (v / max) * 64) : 4}px`, borderRadius: 3, background: v === null ? 'var(--track)' : i === pattern.low ? 'var(--apricot)' : 'var(--sage)', opacity: i === pattern.high || i === pattern.low ? 1 : 0.6 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
            {WEEKDAYS.map((w) => (
              <span key={w} className="t11 d center">
                {w}
              </span>
            ))}
          </div>
          {pattern.low !== undefined && pattern.high !== undefined && (
            <div className="t13 q lh">
              {WEEKDAY_NAMES[pattern.high]} are your busiest, about {fmtInt(pattern.avg[pattern.high]!)} steps. {WEEKDAY_NAMES[pattern.low]} are the quietest, about {fmtInt(pattern.avg[pattern.low]!)}.
            </div>
          )}
        </Card>
      )}

    </>
  );
}

function RaceChart({ now, last }: { now: number[]; last: number[] }) {
  const W = 300;
  const H = 110;
  const max = Math.max(...now, ...last, 1);
  const x = (i: number) => 14 + (i / 6) * (W - 28);
  const y = (v: number) => H - 18 - (v / max) * (H - 30);
  const path = (xs: number[]) => xs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Steps this week against last week">
      <path d={path(last)} fill="none" stroke="var(--quiet)" strokeWidth="1.5" strokeDasharray="4 4" />
      {now.length > 1 && <path d={path(now)} fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {now.length > 0 && <circle cx={x(now.length - 1)} cy={y(now[now.length - 1])} r="4" fill="var(--sage)" />}
      {WEEKDAYS.map((w, i) => (
        <text key={w} x={x(i)} y={H - 3} textAnchor="middle" fontSize="9" fill="var(--dim)" fontFamily="var(--sans)">
          {w.slice(0, 1)}
        </text>
      ))}
    </svg>
  );
}

/* ── Sleep ─────────────────────────────────────────────────────────── */

export function SleepExtras({ days, today, settings }: { days: Day[]; today: DayKey; settings: Settings }) {
  const t = targetsFor(settings, today);
  const range = dayRange(addDays(today, -13), today);
  const nights = sleepWindows(days, range);
  const wake = usualWake(days, today);
  const payoff = sleepPayoff(days, t.sleepMin, today);
  const bed = wake !== undefined ? bedtimeFor(wake, t.sleepMin) : undefined;
  const logged = nights.filter(Boolean) as NonNullable<(typeof nights)[number]>[];
  const avgFrom = logged.length ? logged.reduce((n, x) => n + x.from, 0) / logged.length : undefined;
  const spread = logged.length >= 4 ? Math.max(...logged.map((x) => x.from)) - Math.min(...logged.map((x) => x.from)) : undefined;

  return (
    <>
      {bed !== undefined && (
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Icon name="sleep" size={26} color="var(--blue)" />
          <div className="col gap2">
            <div className="lbl blue">Tonight</div>
            <div className="t16">Asleep by {fmtClock(bed)}</div>
            <div className="t13 q">
              You usually wake at {fmtClock(wake!)}, and your target is {fmtDuration(t.sleepMin)}.
            </div>
          </div>
        </div>
      )}

      {logged.length > 0 && (
        <Card title="Your sleep window" color="var(--blue)" right={<span className="t12 q">last 14 nights</span>}>
          <SleepWindowChart nights={nights} bed={bed} />
          {avgFrom !== undefined && (
            <div className="t13 q lh">
              You fall asleep around {fmtClock((Math.round(avgFrom) + 1440) % 1440)} on average
              {spread !== undefined ? `, give or take ${fmtDuration(Math.round(spread / 2))}. A steadier bedtime usually means steadier energy.` : '.'}
            </div>
          )}
        </Card>
      )}

      {payoff && payoff.steps.good > payoff.steps.short && (
        <div className="t14 q lh">
          From your own {payoff.nights.good + payoff.nights.short} nights: about {fmtInt(payoff.steps.good - payoff.steps.short)} more steps the day after a full {fmtDuration(t.sleepMin)}.
        </div>
      )}
    </>
  );
}

function SleepWindowChart({ nights, bed }: { nights: ReturnType<typeof sleepWindows>; bed?: number }) {
  // From 9 pm to 11 am.
  const start = -180;
  const end = 660;
  const W = 300;
  const row = 12;
  const left = 30;
  const H = nights.length * row + 16;
  const x = (m: number) => left + ((Math.min(Math.max(m, start), end) - start) / (end - start)) * (W - left - 4);
  const bedRel = bed !== undefined ? (bed > 720 ? bed - 1440 : bed) : undefined;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="When you slept, night by night">
      {[-180, 0, 180, 360, 540].map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1="0" y2={H - 14} stroke="var(--divider)" />
          <text x={x(m)} y={H - 3} textAnchor="middle" fontSize="8.5" fill="var(--dim)" fontFamily="var(--sans)">
            {m === -180 ? '9p' : m === 0 ? '12a' : m === 180 ? '3a' : m === 360 ? '6a' : '9a'}
          </text>
        </g>
      ))}
      {bedRel !== undefined && <line x1={x(bedRel)} x2={x(bedRel)} y1="0" y2={H - 14} stroke="var(--blue)" strokeDasharray="3 3" strokeOpacity="0.7" />}
      {nights.map((n, i) => {
        const y = i * row + 2;
        return (
          <g key={i}>
            {n && (
              <>
                <text x="0" y={y + 8} fontSize="8" fill="var(--dim)" fontFamily="var(--sans)">
                  {fmtDayMonth(n.date).split(' ')[0]}
                </text>
                <rect x={x(n.from)} y={y} width={Math.max(2, x(n.to) - x(n.from))} height={row - 4} rx="3" fill="var(--blue)" opacity={n.rested !== undefined ? 0.45 + n.rested * 0.11 : 0.75} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Waist and shape ───────────────────────────────────────────────── */

export function WaistExtras({ checkins }: { measurements?: Measurement[]; settings?: Settings; checkins: CheckIn[] }) {
  const tee = tshirtVsLast(checkins);
  return (
    <>
      {tee && (
        <Card title="The t-shirt test" color="var(--pearl)" right={<span className="t12 q">{tee.since ? 'vs last month' : 'first rating'}</span>}>
          <div className="grid3">
            {(['shoulders', 'arms', 'stomach'] as const).map((k) => {
              const ch = tee.change?.[k] ?? 0;
              return (
                <span key={k} className="col" style={{ alignItems: 'center', gap: 2 }}>
                  <b className="serif tn" style={{ fontSize: 24 }}>
                    {tee.latest[k]}
                    {ch !== 0 && <span className={`t14 ${ch > 0 ? 'sage' : 'apri'}`}> {ch > 0 ? '↑' : '↓'}</span>}
                  </b>
                  <span className="t12 q">{k}</span>
                </span>
              );
            })}
          </div>
          <div className="t13 q lh">Rated at each monthly check-in, in the same t-shirt{tee.since ? `; the arrows compare with ${fmtDayMonth(tee.since)}` : ''}.</div>
        </Card>
      )}
    </>
  );
}

/* ── Calories and protein ──────────────────────────────────────────── */

export function SourcesCard({ entries, range, kind }: { entries: FoodEntry[]; range: DayKey[]; kind: 'kcal' | 'protein' }) {
  const s = sources(entries, range[0], range[range.length - 1], kind);
  if (!s.rows.length) return null;
  const color = kind === 'kcal' ? 'var(--apricot)' : 'var(--lavender)';
  const fmtV = (v: number) => (kind === 'kcal' ? `${fmtInt(v)} kcal` : `${fmtInt(v)} g`);
  return (
    <Card title={kind === 'kcal' ? 'Where the calories came from' : 'Where the protein came from'} color={color} right={<span className="t12 q">{range.length} days</span>}>
      {[...s.rows, ...(s.rest ? [{ name: 'Everything else', value: s.rest.value, share: s.rest.share }] : [])].map((r) => (
        <div key={r.name} className="col gap4">
          <div className="row base t14">
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span className="tn q" style={{ flexShrink: 0 }}>
              {fmtV(r.value)} · {Math.round(r.share * 100)}%
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${r.share * 100}%`, background: color, opacity: r.name === 'Everything else' ? 0.4 : 1 }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

/* ── Water ─────────────────────────────────────────────────────────── */

export function WaterExtras({ days, range }: { days: Day[]; range: DayKey[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  // Only days logged since the app started noting the time of day.
  const logged = range.map((d) => byDate.get(d)).filter((d): d is Day => !!d && (d.waterMl ?? 0) > 0 && d.waterParts !== undefined);
  if (logged.length < 3) return null;
  const parts = [
    { bit: 1, name: 'Morning' },
    { bit: 2, name: 'Afternoon' },
    { bit: 4, name: 'Evening' },
  ].map((p) => ({ ...p, n: logged.filter((d) => ((d.waterParts ?? 0) & p.bit) !== 0).length }));
  const spread = logged.filter((d) => (d.waterParts ?? 0) === 7).length;
  const avg = logged.reduce((n, d) => n + (d.waterMl ?? 0), 0) / logged.length;
  return (
    <Card title="Across the day" color="var(--blue)">
      {parts.map((p) => (
        <div key={p.name} className="col gap4">
          <div className="row base t14">
            <span>{p.name}</span>
            <span className="tn q">
              {p.n} of {logged.length} days
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${(p.n / logged.length) * 100}%`, background: 'var(--blue)' }} />
          </div>
        </div>
      ))}
      <div className="t13 q lh">
        Water in all three parts of the day on {spread} of {logged.length} days, {fmtLitres(Math.round(avg / 50) * 50)} L on average. Spread out, it’s easier to reach the target without a late-night catch-up.
      </div>
    </Card>
  );
}

/* ── Drinks ────────────────────────────────────────────────────────── */

export function DrinksExtras({ entries, days, today }: { entries: FoodEntry[]; days: Day[]; today: DayKey }) {
  const [offset, setOffset] = useState(0);
  const nights = drinkNights(entries);
  const byDate = new Map(nights.map((n) => [n.date, n]));
  const [y, m] = today.split('-').map(Number);
  const first = new Date(y, m - 1 - offset, 1, 12);
  const monthStart: DayKey = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1, 12);
  const monthEnd = addDays(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`, -1);
  const monthDays = dayRange(monthStart, monthEnd);
  const pad = weekday(monthStart);
  const inMonth = nights.filter((n) => n.date >= monthStart && n.date <= monthEnd);
  const types: Record<string, number> = {};
  for (const n of inMonth) for (const [t, c] of Object.entries(n.types)) types[t] = (types[t] ?? 0) + c;
  const after = morningAfter(nights, days, today);
  const firstEver = nights[0]?.date;

  return (
    <>
      <Card
        title={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`}
        color="var(--gold)"
        right={
          <span className="row" style={{ gap: 4 }}>
            <button type="button" className="icon-btn" aria-label="Previous month" disabled={!firstEver || monthStart <= firstEver} onClick={() => setOffset(offset + 1)}>
              <Icon name="left" size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Next month" disabled={offset === 0} onClick={() => setOffset(offset - 1)}>
              <Icon name="right" size={18} />
            </button>
          </span>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
          {WEEKDAYS.map((w) => (
            <span key={w} className="t11 d center">
              {w.slice(0, 1)}
            </span>
          ))}
          {Array.from({ length: pad }, (_, i) => (
            <span key={`p${i}`} />
          ))}
          {monthDays.map((d) => {
            const n = byDate.get(d);
            return (
              <button
                key={d}
                type="button"
                className="col"
                disabled={d > today}
                aria-label={`Add drinks to ${fmtDayMonth(d)}`}
                onClick={() => openSheet('drink', d === today ? {} : { d })}
                style={{ alignItems: 'center', gap: 2, padding: '4px 0', minHeight: 40, borderRadius: 8, background: n ? 'var(--gold-bg)' : undefined, opacity: d > today ? 0.35 : 1 }}
              >
                <span className={`t12 ${n ? 'gold' : 'q'}`}>{Number(d.slice(8))}</span>
                <span style={{ height: 6, display: 'flex', gap: 2 }}>
                  {n && Array.from({ length: Math.min(n.count, 4) }, (_, i) => <i key={i} style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--gold)' }} />)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="t13 q lh">
          {inMonth.length
            ? `${inMonth.length} night${inMonth.length === 1 ? '' : 's'} with drinks: ${Object.entries(types)
                .sort((a, b) => b[1] - a[1])
                .map(([t, c]) => `${c} ${t.toLowerCase()}`)
                .join(', ')}.`
            : 'Nothing logged this month. Tap a day to add.'}
        </div>
        {!inMonth.length && offset === 0 && (() => {
          // The last Saturday (or Friday) night, for the night out that was never logged.
          let sat = today;
          while (weekday(sat) !== 5 && sat > addDays(today, -7)) sat = addDays(sat, -1);
          return (
            <div className="col gap8">
              <div className="t14 lh">Had drinks on Saturday night? Add them to that day and the morning after updates.</div>
              <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => openSheet('drink', { d: sat })}>
                Add to {fmtDayShort(sat)}
              </button>
            </div>
          );
        })()}
      </Card>

      {!(after.sleep || after.steps || after.rested) && (
        <Card title="The morning after, once there's data">
          <div className="row t14">
            <span>Steps</span>
            <span className="q">compared with your normal days</span>
          </div>
          <div className="row t14">
            <span>Sleep and readiness</span>
            <span className="q">the night after and the next session</span>
          </div>
        </Card>
      )}

      {(after.sleep || after.steps || after.rested) && (
        <Card title="The morning after">
          {after.sleep && (
            <div className="row t15">
              <span>Sleep</span>
              <span className="tn">
                {fmtDuration(Math.round(after.sleep.after))} <span className="q">vs {fmtDuration(Math.round(after.sleep.other))} usually</span>
              </span>
            </div>
          )}
          {after.rested && (
            <div className="row t15">
              <span>How rested</span>
              <span className="tn">
                {fmt1(after.rested.after)} <span className="q">vs {fmt1(after.rested.other)}</span>
              </span>
            </div>
          )}
          {after.steps && (
            <div className="row t15">
              <span>Steps</span>
              <span className="tn">
                {fmtInt(after.steps.after)} <span className="q">vs {fmtInt(after.steps.other)}</span>
              </span>
            </div>
          )}
          <div className="t13 q lh">The day after a night with drinks, against your other days. Just a record, so you know what a night costs and can plan around it.</div>
        </Card>
      )}
    </>
  );
}

/* ── Training ──────────────────────────────────────────────────────── */

export function StrengthCard({ sets, today }: { sets: SetEntry[]; today: DayKey }) {
  const scores = strengthScores(sets, today);
  if (!scores.length) return null;
  const fmtS = (s: Strength, v: number) => (s.kind === 'kg' ? `${fmt1(v)} kg` : s.kind === 'seconds' ? `${Math.round(v)} s` : `${Math.round(v)} reps`);
  return (
    <div className="card" style={{ gap: 0 }}>
      <div className="lbl" style={{ paddingBottom: 6 }}>
        Strength scores
      </div>
      {scores.map((s) => {
        const change = s.before ? (s.now - s.before) / s.before : undefined;
        return (
          <div key={s.exerciseId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 54px auto', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
            <div className="col gap2" style={{ minWidth: 0 }}>
              <span className="t15" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <span className="t12 q">{s.kind === 'kg' ? 'Estimated best single, per dumbbell' : s.kind === 'seconds' ? 'Longest hold' : 'Best set'}</span>
            </div>
            <Spark values={s.series.slice(-12)} color="var(--text)" width={54} height={22} />
            <div className="col gap2" style={{ alignItems: 'flex-end' }}>
              <span className="t15 tn">{fmtS(s, s.now)}</span>
              {change !== undefined && Math.abs(change) >= 0.005 && <span className={`t12 tn ${change > 0 ? 'sage' : 'q'}`}>{`${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}% in 4 wk`}</span>}
            </div>
          </div>
        );
      })}
      <div className="t12 q lh" style={{ paddingTop: 8 }}>
        The best set of each session. For weights it’s turned into an estimated one-rep max, so more reps at the same weight count too.
      </div>
    </div>
  );
}

/* ── Knee and wrist ────────────────────────────────────────────────── */

export function JointsBody({ settings, sessions, days, today }: { settings: Settings; sessions: TrainingSession[]; days: Day[]; today: DayKey }) {
  const plan = settings.plan;
  if (!plan || !plan.flags.length) return <div className="t15 q lh">Your plan has no joint checks. They arrive with a plan that names them.</div>;
  const events = flagEvents(plan, sessions, days);
  const groups = [...new Set(plan.flags.map((f) => f.group))];
  const from = addDays(weekStart(today), -7 * 12);
  const strip = dayRange(from, addDays(weekStart(today), 6));
  const checked = new Map<DayKey, Set<string>>();
  for (const d of days) {
    for (const [id, yes] of Object.entries(d.answers ?? {})) {
      if (yes) continue;
      const g = plan.flags.find((f) => f.id === id)?.group;
      if (g) checked.set(d.date, new Set([...(checked.get(d.date) ?? []), g]));
    }
  }
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    // A finished session with no flags counts as a check that came back clear.
    for (const g of groups) if (!(s.flags ?? []).some((id) => plan.flags.find((f) => f.id === id)?.group === g)) checked.set(s.date, new Set([...(checked.get(s.date) ?? []), g]));
  }
  const lastAny = events[events.length - 1];
  return (
    <>
      <div className="col gap6">
        <div className="num" style={{ fontSize: 44 }}>
          {lastAny ? daysBetween(lastAny.date, today) : '—'}
          <span className="t16 q"> {lastAny ? `day${daysBetween(lastAny.date, today) === 1 ? '' : 's'} since a flag` : ''}</span>
        </div>
        <div className="t14 q lh">{lastAny ? `Last: ${lastAny.flag.label.toLowerCase()} on ${fmtDayMonth(lastAny.date)}.` : 'Nothing flagged yet. Every session and morning check so far has come back clear.'}</div>
      </div>
      {groups.map((g) => {
        const evs = events.filter((e) => e.flag.group === g);
        const flagged = new Set(evs.map((e) => e.date));
        const last = evs[evs.length - 1];
        const recent = evs.filter((e) => e.date >= addDays(today, -89)).length;
        return (
          <Card key={g} title={g} color="var(--apricot)" right={<span className="t12 q">{recent ? `${recent} flag${recent === 1 ? '' : 's'} in 90 days` : 'Clear for 90 days'}</span>}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 7px)', gridAutoFlow: 'column', gridAutoColumns: '7px', gap: 3 }} role="img" aria-label={`${g}: the last 13 weeks`}>
              {strip.map((d) => (
                <i
                  key={d}
                  style={{
                    borderRadius: 2,
                    background: d > today ? 'transparent' : flagged.has(d) ? 'var(--apricot)' : checked.get(d)?.has(g) ? 'var(--sage)' : 'var(--track)',
                    opacity: flagged.has(d) ? 1 : checked.get(d)?.has(g) ? 0.55 : 1,
                  }}
                />
              ))}
            </div>
            <div className="row t12 q" style={{ justifyContent: 'flex-start', gap: 12 }}>
              <span className="row" style={{ gap: 5 }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--apricot)' }} />
                Flagged
              </span>
              <span className="row" style={{ gap: 5 }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--sage)', opacity: 0.55 }} />
                Checked, clear
              </span>
            </div>
            {last ? (
              <div className="t13 q lh">
                Last flagged {fmtDayMonth(last.date)}: {last.flag.label.toLowerCase()}.{last.flag.advice ? ` ${last.flag.advice}` : ''}
              </div>
            ) : (
              <div className="t13 q lh">No flags yet.</div>
            )}
          </Card>
        );
      })}
      <button type="button" className="btn ghost block" onClick={() => go('/physio')}>
        Summary for your physio
      </button>
      <div className="t12 d lh">Flags come from the questions after each session and in the morning log. Any flag in the last couple of days switches every voice in the app to plain speech.</div>
    </>
  );
}
