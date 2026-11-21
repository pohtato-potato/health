import { caughtShare, pledgeOutcome } from '../domain/pledge';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { achievementById } from '../domain/achievements';
import { addDays, type DayKey } from '../domain/dates';
import { findExercise } from '../domain/plan';
import { monthName, monthRange, periodStats, type PeriodStats } from '../domain/period';
import { ROUTE } from '../domain/walk';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go, useRoute } from '../router';
import { journeyStart } from './Journey';
import { StoryFrame } from './you/StorySlide';
import { wrappedSlides } from './you/wrappedSlides';

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

  // Matchday §5: "Caught the window?" and the pledges, shown here only; neither ever feeds a match.
  const caught = caughtShare(days ?? [], s.from, s.to);
  const dayMap = new Map((days ?? []).map((d) => [d.date, d]));
  const settled = (days ?? []).filter((d) => d.date >= s.from && d.date < s.to).map((d) => pledgeOutcome(d, dayMap.get(addDays(d.date, 1)))).filter((o) => o === 'kept' || o === 'missed');
  const kept = { n: settled.length, yes: settled.filter((o) => o === 'kept').length };
  const slides = wrappedSlides(s, { title, place: place?.name, laps, names, caught, kept });
  const at = Math.min(i, slides.length - 1);
  const c = slides[at];
  return (
    <StoryFrame g={c.g} title={c.title} at={at} of={slides.length} big={c.big} say={c.say} wordy={c.wordy} road={c.road}
      extra={c.chips?.length ? <div className="yu-st-chips">{c.chips.map((x) => <span key={x}>{x}</span>)}</div> : undefined}
      onNext={() => setI(at + 1)} onBack={() => setI(at - 1)} onClose={() => back('/journey')} />
  );
}
