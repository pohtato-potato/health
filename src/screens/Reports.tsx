import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { achievementById } from '../domain/achievements';
import { pickChallenge } from '../domain/challenges';
import { summaries } from '../state/Challenge';
import { checklistSlots } from '../state/derived';
import { addDays, type DayKey } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtDuration, fmtInt, lowerFirst } from '../domain/format';
import { WEEKDAY_NAMES } from '../domain/insights';
import { findExercise } from '../domain/plan';
import { monthName, monthRange, periodStats, type PeriodStats } from '../domain/period';
import { ROUTE } from '../domain/walk';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { journeyStart } from './Journey';

function usePeriod(from: DayKey | undefined, to: DayKey | undefined): PeriodStats | undefined {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const measurements = useMeasurements();
  const unlocks = useLiveQuery(() => db.achievements.toArray(), []);
  if (!settings || !days || !entries || !sessions || !sets || !measurements || !unlocks || !from || !to) return undefined;
  const plan = settings.plan;
  return periodStats(settings, from, to, { days, entries, sessions, sets, measurements, unlocks, pairs: (id) => !!plan && findExercise(plan, id)?.load === 'pair' });
}

/** Last month by default; ?m=YYYY-MM for another. */
function useMonthParam(): string {
  const { params } = useRoute();
  const today = useToday();
  return params.get('m') ?? addDays(`${today.slice(0, 7)}-01`, -1).slice(0, 7);
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const ICONS: Record<string, ReactNode> = {
  sun: (
    <Svg>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Svg>
  ),
  wind: (
    <Svg>
      <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />
    </Svg>
  ),
  rain: (
    <Svg>
      <path d="M7 15a4.5 4.5 0 1 1 1-8.9A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 17 15.8" />
      <path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" />
    </Svg>
  ),
  temp: (
    <Svg>
      <path d="M10 14.5V4.5a2 2 0 1 1 4 0v10a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </Svg>
  ),
  pressure: (
    <Svg>
      <path d="M4.5 17a8 8 0 1 1 15 0" />
      <path d="M12 13l4-4" />
      <circle cx="12" cy="13" r="1" />
    </Svg>
  ),
  front: (
    <Svg>
      <path d="M2.5 16c3-4 6-4 9.5 0s6.5 4 9.5 0" />
      <path d="M6 12.5l1.5-3 1.5 3zM15 12.5l1.5-3 1.5 3z" fill="currentColor" />
    </Svg>
  ),
};

const share = (a: number, b: number) => (b ? a / b : 0);

/** The month as a weather report. */
export function ClimatePage() {
  const month = useMonthParam();
  const today = useToday();
  const settings = useSettings();
  const [from, to0] = monthRange(month);
  const to = to0 < today ? to0 : addDays(today, -1);
  const s = usePeriod(from, to);
  const allDays = useAllDays();
  const allEntries = useAllEntries();
  if (!s || !settings || !allDays || !allEntries) return <div className="page bare" />;
  const sleepShare = share(s.sleepNights, s.sleepLogged);
  const sky = sleepShare >= 0.7 ? 'Mostly sunny' : sleepShare >= 0.4 ? 'Bright spells' : 'Overcast';
  const windShare = share(s.stepTarget, s.days);
  const wind = windShare >= 0.8 ? 'steady winds' : windShare >= 0.5 ? 'a fresh breeze' : 'light airs';
  const change = s.trendStart !== undefined && s.trendEnd !== undefined ? s.trendEnd - s.trendStart : undefined;
  const nextMonth = addDays(to0, 1).slice(0, 7);
  const histTo = addDays(`${nextMonth}-01`, -1) < today ? addDays(`${nextMonth}-01`, -1) : addDays(today, -1);
  const outlook = pickChallenge(nextMonth, summaries(settings, allDays, allEntries, addDays(`${nextMonth}-01`, -30), histTo), { checklist: checklistSlots(settings).length > 0 });
  const tiles = [
    { icon: 'sun', name: 'Sunshine', what: 'Sleep', value: s.sleepAvg ? `${fmtDuration(Math.round(s.sleepAvg))} a night` : '—', cond: sky, line: s.sleepLogged ? `On target ${s.sleepNights} of ${s.sleepLogged} nights.${s.bestNight ? ` Longest: ${fmtDuration(s.bestNight.minutes)} on ${fmtDayMonth(s.bestNight.date)}.` : ''}` : 'No nights logged.' },
    { icon: 'wind', name: 'Winds', what: 'Steps', value: s.stepsAvg ? `${fmtInt(s.stepsAvg)} a day` : '—', cond: wind.charAt(0).toUpperCase() + wind.slice(1), line: s.bestSteps ? `Gusting to ${fmtInt(s.bestSteps.steps)} on ${fmtDayMonth(s.bestSteps.date)}. Target reached on ${s.stepTarget} days.` : 'No steps logged.' },
    { icon: 'rain', name: 'Rainfall', what: 'Water', value: s.waterAvg ? `${fmt1(s.waterAvg)} L a day` : '—', cond: share(s.waterDays, s.days) >= 0.6 ? 'Wet' : share(s.waterDays, s.days) >= 0.3 ? 'Showers' : 'Dry spell', line: `Target reached on ${s.waterDays} days.` },
    { icon: 'temp', name: 'Temperature', what: 'Calories', value: s.kcalAvg ? `${fmtInt(s.kcalAvg)} kcal` : '—', cond: share(s.inRange, s.foodDays) >= 0.7 ? 'Mild' : 'Changeable', line: s.foodDays ? `Within the range on ${s.inRange} of ${s.foodDays} logged days.` : 'No food logged.' },
    { icon: 'pressure', name: 'Pressure', what: 'Training', value: `${s.sessions} session${s.sessions === 1 ? '' : 's'}`, cond: s.sessions >= 12 ? 'High' : s.sessions >= 6 ? 'Moderate' : 'Low', line: `${fmtInt(s.sets)} sets and ${fmtInt(s.kgMoved)} kg moved${s.records.length ? `, with records on ${s.records.map(lowerFirst).join(', ')}` : ''}.` },
    {
      icon: 'front',
      name: 'Fronts',
      what: 'Weight trend',
      value: change !== undefined ? `${change <= 0 ? '−' : '+'}${fmt1(Math.abs(change))} kg` : '—',
      cond: change === undefined ? 'No readings' : change <= -0.3 ? 'Cool front' : change >= 0.3 ? 'Warm front' : 'Settled',
      line: s.waistStart !== undefined && s.waistEnd !== undefined && s.waistEnd !== s.waistStart ? `Waist ${s.waistEnd < s.waistStart ? 'down' : 'up'} ${fmt1(Math.abs(s.waistEnd - s.waistStart))} in.` : 'Waist unchanged, or not measured.',
    },
  ];

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/journey')}>
        <Icon name="left" size={20} stroke={1.8} />
        Journey
      </button>
      <div className="col gap6">
        <div className="lbl blue">Climate report</div>
        <h1 className="h1">
          {monthName(month)} {month.slice(0, 4)}
        </h1>
        <div className="t16 lh">
          {sky}, with {wind}. {s.perfect ? `${s.perfect} perfect day${s.perfect === 1 ? '' : 's'}` : 'No perfect days this time'}
          {s.cities.length ? `, and you walked into ${s.cities.join(' and ')}` : ''}.
        </div>
      </div>
      <div className="grid2">
        {tiles.map((t) => (
          <div key={t.name} className="card" style={{ gap: 6, padding: 14 }}>
            <div className="row" style={{ color: 'var(--blue)' }}>
              {ICONS[t.icon]}
              <span className="t11 q">{t.what}</span>
            </div>
            <div className="lbl">{t.name}</div>
            <div className="t15">{t.value}</div>
            <div className="t13 gold">{t.cond}</div>
            <div className="t12 q lh">{t.line}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="lbl">Outlook for {monthName(nextMonth)}</div>
        <div className="t15 lh">
          {outlook.title}: {lowerFirst(outlook.text)}
        </div>
      </div>
      <button type="button" className="btn lg ghost block" onClick={() => go('/wrapped', { m: month })}>
        {monthName(month)}, wrapped
      </button>
    </div>
  );
}

/** Spotify-style: the month, or the whole journey, as a stack of bold cards. */
export function WrappedPage() {
  const { params } = useRoute();
  const month = useMonthParam();
  const today = useToday();
  const settings = useSettings();
  const days = useAllDays();
  const year = params.get('all') === '1';
  const start = settings && days ? journeyStart(settings, days) : undefined;
  const end = settings?.goalDate && settings.goalDate < today ? settings.goalDate : addDays(today, -1);
  const [mFrom, mTo0] = monthRange(month);
  const from = year ? start : mFrom;
  const to = year ? end : mTo0 < today ? mTo0 : addDays(today, -1);
  const s = usePeriod(from, to);
  const [i, setI] = useState(0);
  if (!s || !settings) return <div className="page bare" />;
  const title = year ? (settings.goalDate && today >= settings.goalDate ? 'Your year' : 'The journey so far') : monthName(month);
  const place = [...ROUTE].reverse().find((r) => r.km <= s.km && r.km > 0);
  const laps = settings.loopSteps ? Math.round(s.steps / settings.loopSteps) : undefined;
  const names = s.unlocked.map((id) => achievementById(id)?.name).filter(Boolean) as string[];

  const cards: { bg: string; ink: string; kicker: string; big: ReactNode; body?: ReactNode }[] = [
    { bg: 'linear-gradient(160deg,#3b1f5e,#8a2f6b)', ink: '#ffe3f1', kicker: `${title}, wrapped`, big: `${s.logged} days`, body: `logged between ${fmtDayMonth(s.from)} and ${fmtDayMonth(s.to)}.` },
    {
      bg: 'linear-gradient(160deg,#12443a,#2f8a63)',
      ink: '#dcfff0',
      kicker: 'You walked',
      big: `${fmtInt(s.km)} km`,
      body: `${fmtInt(s.steps)} steps${place ? `: about Delhi to ${place.name}` : ''}${laps ? `, or ${fmtInt(laps)} laps of home` : ''}.`,
    },
    {
      bg: 'linear-gradient(160deg,#5e2f12,#c2622f)',
      ink: '#fff0e3',
      kicker: 'Your top foods',
      big: s.topFoods[0]?.name ?? 'Still to come',
      body: s.topFoods.length ? (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {s.topFoods.map((f) => (
            <li key={f.name}>
              {f.name} <span style={{ opacity: 0.7 }}>· {f.n}×</span>
            </li>
          ))}
        </ol>
      ) : undefined,
    },
    { bg: 'linear-gradient(160deg,#16244f,#3a5bb5)', ink: '#e3ecff', kicker: 'You slept', big: s.sleepAvg ? `${fmtDuration(Math.round(s.sleepAvg))}` : '—', body: s.bestNight ? `a night on average. The longest: ${fmtDuration(s.bestNight.minutes)}, on ${fmtDayMonth(s.bestNight.date)}.` : undefined },
    {
      bg: 'linear-gradient(160deg,#3d3212,#9c7c2a)',
      ink: '#fff6dc',
      kicker: 'You trained',
      big: `${s.sessions} sessions`,
      body: `${fmtInt(s.kgMoved)} kg moved over ${fmtInt(s.sets)} sets.${s.records.length ? ` Records on ${s.records.map(lowerFirst).join(', ')}.` : ''}`,
    },
    {
      bg: 'linear-gradient(160deg,#2d2150,#6b55b5)',
      ink: '#efe8ff',
      kicker: 'Perfect days',
      big: String(s.perfect),
      body: `all three rings closed.${s.busiestWeekday !== undefined ? ` ${WEEKDAY_NAMES[s.busiestWeekday]} were your busiest days on foot.` : ''}`,
    },
    ...(names.length
      ? [{ bg: 'linear-gradient(160deg,#1f3a44,#4a8a9c)', ink: '#e3f8ff', kicker: 'Unlocked', big: `${names.length} achievement${names.length === 1 ? '' : 's'}`, body: names.slice(0, 6).join(' · ') + (names.length > 6 ? ` and ${names.length - 6} more` : '') }]
      : []),
    ...(s.trendStart !== undefined && s.trendEnd !== undefined
      ? [{ bg: 'linear-gradient(160deg,#20262f,#4a5566)', ink: '#eef2f6', kicker: 'The trend', big: `${s.trendEnd <= s.trendStart ? '−' : '+'}${fmt1(Math.abs(s.trendEnd - s.trendStart))} kg`, body: s.waistStart !== undefined && s.waistEnd !== undefined ? `and ${fmt1(Math.abs(s.waistEnd - s.waistStart))} in ${s.waistEnd <= s.waistStart ? 'off' : 'on'} the waist.` : undefined }]
      : []),
  ];

  const c = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;
  return (
    <div className="film wrapped-story" style={{ background: c.bg, color: c.ink }} onClick={() => (last ? undefined : setI(i + 1))}>
      <div className="film-bars" aria-hidden="true">
        {cards.map((_, k) => (
          <i key={k} className={k <= i ? 'on' : undefined} />
        ))}
      </div>
      <button
        type="button"
        className="icon-btn film-close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          back('/journey');
        }}
      >
        <Icon name="close" size={22} />
      </button>
      <div className="film-body" aria-live="polite">
        <div className="w-k">{c.kicker}</div>
        <div className="w-big">{c.big}</div>
        {c.body && <div className="w-body">{c.body}</div>}
      </div>
      {last ? (
        <div className="col gap8 film-foot">
          <div className="t13 center lh" style={{ opacity: 0.8 }}>
            {year ? 'Every day since the start, in one place.' : `See you in ${monthName(addDays(mTo0, 1).slice(0, 7))}.`}
          </div>
          <button
            type="button"
            className="btn ghost block"
            onClick={(e) => {
              e.stopPropagation();
              setI(0);
            }}
          >
            Again
          </button>
        </div>
      ) : (
        <div className="t12 film-foot center" style={{ opacity: 0.7 }}>
          Tap for the next one
        </div>
      )}
    </div>
  );
}
