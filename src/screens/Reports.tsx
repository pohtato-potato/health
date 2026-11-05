import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { achievementById } from '../domain/achievements';
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

/** Only the Walk's journey Wrapped stays; a month's link goes to the month's report. */
export function WrappedPage() {
  const { params } = useRoute();
  useEffect(() => {
    if (params.get('all') !== '1') go('/reports/month', params.get('m') ? { m: params.get('m')! } : undefined, { replace: true });
  }, [params]);
  return params.get('all') === '1' ? <JourneyWrapped /> : null;
}

function JourneyWrapped() {
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
