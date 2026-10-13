import { addDays, dayRange, daysBetween, weekStart, type DayKey } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { lastFullWeek, weekNumber } from '../domain/weekly';
import { INDIA_OUTLINE, PLACE_COUNT, kmFromSteps, positionAt, statesReached } from '../domain/walk';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { dayRings, stepStreakFor, targetsFor, weeksFor } from '../state/derived';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Icon } from '../ui/Icon';
import { AchievementsCard } from './MapPage';
import { DeparturesCard } from './Departures';
import { ChallengeCard } from '../state/Challenge';
import { OnThisDayCard } from './OnThisDay';
import { ReviewSheet, reviewDue } from './Review';
import { useState } from 'react';
import type { Day, FoodEntry, Settings, TrainingSession } from '../domain/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The hub: where you are, how it's going, and everything to look back on. */
export function Journey() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  if (!settings || !days || !entries || !sessions) return <div className="page" />;

  const goal = settings.goalDate;
  const start = journeyStart(settings, days);
  const left = goal ? daysBetween(today, goal) : undefined;
  const phase = settings.plan?.phases?.find((p) => today >= p.from && today <= p.to);

  return (
    <div className="page">
      <div className="col gap6">
        <h1 className="h1">Journey</h1>
        {goal && left !== undefined && (
          <div className="t15 q">{left > 0 ? `${fmtInt(left)} days to ${fmtDayMonth(goal)}` : left === 0 ? 'Reveal day is today' : `Reveal day was ${fmtDayMonth(goal)}`}</div>
        )}
      </div>

      {goal && <JourneyClock start={start} end={goal} today={today} />}

      {phase && (
        <div className="card">
          <div className="lbl pearl">Where you are · {phase.title}</div>
          <div className="t15 lh">{phase.text}</div>
          <div className="t12 q">
            {fmtDayMonth(phase.from)} to {fmtDayMonth(phase.to)}
          </div>
        </div>
      )}

      <OnThisDayCard />

      <WalkCard days={days} />

      <DeparturesCard />

      <ChallengeCard />

      <AchievementsCard />

      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} onClick={() => go('/passport')}>
        <span style={{ width: 38, height: 50, borderRadius: '4px 7px 7px 4px', background: 'linear-gradient(160deg, #1c2a4a, #121c33)', border: '1px solid #2c3d63', flexShrink: 0 }} aria-hidden="true" />
        <span className="col gap2" style={{ flex: 1 }}>
          <span className="lbl" style={{ color: '#d9b45f' }}>
            Health Passport
          </span>
          <span className="t14 q">Stamps for every city, state and festival</span>
        </span>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </button>

      <Reports today={today} settings={settings} />

      <Heatmap settings={settings} start={start} end={goal ?? addDays(today, 60)} today={today} days={days} entries={entries} />

      <Streaks settings={settings} today={today} days={days} entries={entries} sessions={sessions} />

      {goal && <RevealCard goal={goal} today={today} />}
    </div>
  );
}

/** What waits on reveal day: sealed lines, first and last photos. */
function RevealCard({ goal, today }: { goal: DayKey; today: DayKey }) {
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  if (!checkins) return null;
  const lines = checkins.filter((c) => c.line?.trim()).length;
  const open = today >= goal;
  return (
    <button type="button" className="card" style={{ borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }} onClick={() => go('/reveal')}>
      <div className="row">
        <div className="lbl gold">Reveal day · {fmtDayMonth(goal)}</div>
        <Icon name={open ? 'right' : 'lock'} size={16} stroke={1.8} color="var(--gold)" />
      </div>
      <div className="t15 lh">
        {open
          ? 'It’s here. Your first and last photos, every line you wrote, and the whole year played back.'
          : `Sealed until then: ${lines ? `${lines} line${lines === 1 ? '' : 's'} from your check-ins, ` : ''}your first and last photos side by side, and the year played back as a timelapse.`}
      </div>
    </button>
  );
}

/** The journey starts at the earliest thing on record. */
export function journeyStart(settings: Settings, days: Day[]): DayKey {
  const created = new Date(settings.createdAt);
  const c = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
  const first = [...days].sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
  return first && first < c ? first : c;
}

const CLOCK_LINES: [number, string][] = [
  [6, 'Still dark. Early days: the habits are being built.'],
  [9, "You're up, the chai's done, and the day is just getting going."],
  [12, 'Mid-morning. The work is in full swing.'],
  [15, 'Early afternoon. Past halfway, and the hardest part is behind you.'],
  [18, "Late afternoon. The winter's work starts to show."],
  [21, 'Evening. The finish line is in sight.'],
  [24, 'Nearly midnight. Reveal day is almost here.'],
];

/** The whole journey squeezed into one day. */
function JourneyClock({ start, end, today }: { start: DayKey; end: DayKey; today: DayKey }) {
  const total = Math.max(1, daysBetween(start, end));
  const f = Math.min(1, Math.max(0, daysBetween(start, today) / total));
  const minutes = Math.round(f * 1440);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 || h === 24 ? 'am' : 'pm'}`;
  const line = CLOCK_LINES.find(([until]) => h < until)?.[1] ?? CLOCK_LINES[CLOCK_LINES.length - 1][1];
  const angle = f * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`Journey clock at ${label}`} style={{ flexShrink: 0 }}>
        <circle cx="42" cy="42" r="38" fill="none" stroke="var(--hairline)" strokeWidth="1.5" />
        <path d={arc(42, 42, 38, -Math.PI / 2, angle)} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
          const r1 = i % 6 === 0 ? 30 : 33;
          return <line key={i} x1={42 + r1 * Math.cos(a)} y1={42 + r1 * Math.sin(a)} x2={42 + 35 * Math.cos(a)} y2={42 + 35 * Math.sin(a)} stroke="var(--dim)" strokeWidth={i % 6 === 0 ? 1.5 : 0.8} />;
        })}
        <line x1="42" y1="42" x2={42 + 24 * Math.cos(angle)} y2={42 + 24 * Math.sin(angle)} stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="42" cy="42" r="3" fill="var(--text)" />
      </svg>
      <div className="col gap4">
        <div className="lbl gold">Journey clock</div>
        <div className="sf" style={{ fontSize: 24 }}>
          It's {label}.
        </div>
        <div className="t13 q lh">
          {MONTHS[Number(start.slice(5, 7)) - 1]} to {MONTHS[Number(end.slice(5, 7)) - 1]} squeezed into one day. {line}
        </div>
      </div>
    </div>
  );
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  if (a1 - a0 < 0.001) return '';
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
}

function WalkCard({ days }: { days: Day[] }) {
  const steps = days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const km = kmFromSteps(steps);
  const pos = positionAt(km);
  const route = pos.chapter.route;
  const walked = [...route.filter((s) => s.km <= km).map((s) => `${s.x} ${s.y}`), `${pos.x.toFixed(1)} ${pos.y.toFixed(1)}`];
  return (
    <button type="button" className="card" style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }} onClick={() => go('/map')}>
      <svg width="86" height="92" viewBox="0 0 300 322" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d={INDIA_OUTLINE} fill="#171B24" stroke="var(--pearl)" strokeOpacity="0.5" strokeWidth="3" />
        <path d={`M${route.map((s) => `${s.x} ${s.y}`).join(' L')}`} fill="none" stroke="var(--text)" strokeOpacity="0.35" strokeWidth="4" strokeDasharray="8 8" />
        <path d={`M${walked.join(' L')}`} fill="none" stroke="var(--sage)" strokeWidth="8" strokeLinecap="round" />
        <circle cx={pos.x} cy={pos.y} r="10" fill="var(--sage)" />
      </svg>
      <div className="col gap4" style={{ minWidth: 0 }}>
        <div className="lbl sage">Walk across India</div>
        <div className="num" style={{ fontSize: 30 }}>
          {fmtInt(km)} <span className="t14 q">km</span>
        </div>
        <div className="t13 q lh">
          {pos.to ? `Between ${pos.from.name} and ${pos.to.name}. ${pos.to.name} in ${fmtInt(Math.ceil(pos.to.km - km))} km.` : 'Every chapter walked.'}
        </div>
        <div className="t12 d">
          Chapter {pos.chapter.n} · {statesReached(km).length} of {PLACE_COUNT} states and territories
        </div>
      </div>
    </button>
  );
}

function Reports({ today, settings }: { today: DayKey; settings: Settings }) {
  const [review, setReview] = useState(false);
  const w = lastFullWeek(today);
  const monthName = MONTHS[(Number(today.slice(5, 7)) + 10) % 12];
  const row = (title: string, sub: string, onClick?: () => void, tag?: string) => (
    <button type="button" className="sess" onClick={onClick} disabled={!onClick} style={{ opacity: 1 }}>
      <span className="col gap2">
        <span className="t15">{title}</span>
        <span className="t12 q">{sub}</span>
      </span>
      <span className={`t12 ${tag === 'New' ? 'gold' : 'q'}`}>{tag ?? '›'}</span>
    </button>
  );
  return (
    <div className="card" style={{ gap: 0, paddingBottom: 8 }}>
      <div className="lbl" style={{ paddingBottom: 6 }}>
        Reports
      </div>
      {row(`Week ${weekNumber(w)} receipt`, `${fmtDayMonth(w)}–${fmtDayMonth(addDays(w, 6))}`, () => go('/receipt', { w }))}
      {row('Weekly recap', 'How last week went, and one thing for this one', () => go('/week', { w }))}
      {row(`${monthName} climate report`, 'Your month as a weather report', () => go('/climate'))}
      {row(`${monthName}, wrapped`, 'Your month in review, Spotify style', () => go('/wrapped'))}
      {row('The journey, wrapped', 'Every day since the start, in one place', () => go('/wrapped', { all: '1' }))}
      {row('Monthly review with Claude', 'A ready-made prompt and your workbook', () => setReview(true), reviewDue(settings, today) ? 'New' : undefined)}
      {review && <ReviewSheet onClose={() => setReview(false)} />}
    </div>
  );
}

/** Every day from the start of the journey to reveal day: a row for each month, a cell for each day. */
function Heatmap({ settings, start, end, today, days, entries }: { settings: Settings; start: DayKey; end: DayKey; today: DayKey; days: Day[]; entries: FoodEntry[] }) {
  const to = end > today ? end : today;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const byEntries = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) byEntries.set(e.date, [...(byEntries.get(e.date) ?? []), e]);
  const months: DayKey[] = [];
  for (let m = `${start.slice(0, 7)}-01`; m <= to; m = nextMonth(m)) months.push(m);
  const cell = 7;
  const step = 9;
  const left = 26;
  const W = left + 31 * step;
  const H = months.length * step;
  const colour = (d: DayKey) => {
    if (d < start || d > to) return undefined;
    if (d > today) return { fill: 'transparent', stroke: 'var(--hairline)' };
    const logged = (byEntries.get(d)?.length ?? 0) > 0 || byDate.get(d)?.steps !== undefined;
    if (!logged) return { fill: 'transparent', stroke: 'var(--divider)' };
    const { rings } = dayRings(settings, d, byDate.get(d), byEntries.get(d) ?? []);
    if (rings.closed === 3) return { fill: 'var(--gold)' };
    if (rings.closed === 2) return { fill: 'var(--text)', opacity: 0.55 };
    if (rings.closed === 1) return { fill: 'var(--text)', opacity: 0.25 };
    return { fill: 'var(--track)' };
  };
  return (
    <div className="card" style={{ gap: 10 }}>
      <div className="lbl">
        Every day, {MONTHS[Number(start.slice(5, 7)) - 1]} to {MONTHS[Number(to.slice(5, 7)) - 1]}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A cell for every day, coloured by rings closed">
        {months.map((m, i) => (
          <g key={m} transform={`translate(0 ${i * step})`}>
            <text x="0" y={cell} fill="var(--dim)" fontSize="7.5" fontFamily="var(--sans)">
              {MONTHS[Number(m.slice(5, 7)) - 1]}
            </text>
            {dayRange(m, addDays(nextMonth(m), -1)).map((d, k) => {
              const c = colour(d);
              if (!c) return null;
              return <rect key={d} x={left + k * step + 0.5} y="0.5" width={cell - 1} height={cell - 1} rx="1.5" fill={c.fill} stroke={c.stroke ?? 'none'} strokeWidth="0.8" opacity={c.opacity ?? 1} />;
            })}
          </g>
        ))}
      </svg>
      <div className="row t11 q" style={{ flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'flex-start' }}>
        {[
          ['var(--gold)', 1, 'Perfect day'],
          ['var(--text)', 0.55, '2 of 3'],
          ['var(--text)', 0.25, '1 of 3'],
        ].map(([c, o, t]) => (
          <span key={String(t)} className="row" style={{ gap: 5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, background: String(c), opacity: Number(o) }} />
            {t}
          </span>
        ))}
        <span className="row" style={{ gap: 5 }}>
          <i style={{ width: 9, height: 9, borderRadius: 2, border: '1px solid var(--hairline)' }} />
          Ahead
        </span>
      </div>
    </div>
  );
}

function nextMonth(m: DayKey): DayKey {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  return mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`;
}

function Streaks({ settings, today, days, entries, sessions }: { settings: Settings; today: DayKey; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[] }) {
  const streak = stepStreakFor(settings, days, today);
  const weeks = weeksFor(settings, sessions, today, days);
  const t = targetsFor(settings, today);
  const byEntries = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) byEntries.set(e.date, [...(byEntries.get(e.date) ?? []), e]);
  const perfectDays = [...new Set([...days.map((d) => d.date), ...byEntries.keys()])].filter((d) => d <= today && dayRings(settings, d, days.find((x) => x.date === d), byEntries.get(d) ?? []).rings.perfect);
  const thisWeek = perfectDays.filter((d) => d >= weekStart(today)).length;
  const row = (title: string, sub: string, value: number, unit: string) => (
    <div className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
      <span className="col gap2">
        <span className="t15">{title}</span>
        <span className="t12 q">{sub}</span>
      </span>
      <span className="num" style={{ fontSize: 26 }}>
        {value}
        <span className="t12 q"> {unit}</span>
      </span>
    </div>
  );
  return (
    <div className="card" style={{ gap: 0 }}>
      <div className="lbl" style={{ paddingBottom: 6 }}>
        Streaks
      </div>
      {row(`Steps at ${fmtInt(t.steps / 1000)}k+`, `${streak.shields} shield${streak.shields === 1 ? '' : 's'} banked · best ${streak.best}`, streak.current, 'days')}
      {row(`Training weeks at ${weeks.perWeek}+`, "Extra sessions don't count double", weeks.streak, 'weeks')}
      {row('Perfect days', `${thisWeek} this week`, perfectDays.length, 'so far')}
    </div>
  );
}

