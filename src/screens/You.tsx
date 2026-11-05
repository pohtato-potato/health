import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { dailyFinding } from '../domain/dailyFinding';
import { addDays, dayKey, daysBetween } from '../domain/dates';
import { dataCheckup } from '../domain/checkup';
import { dueItems } from '../domain/dueLines';
import { fmtInt } from '../domain/format';
import { todaysLift } from '../domain/slowDay';
import { seeded } from '../domain/creatures';
import { statDeck } from '../domain/shakeStats';
import { autoTrophies } from '../domain/trophies';
import { trendRows } from '../domain/momentum';
import { wornTitle } from '../domain/titles';
import { kmFromSteps, setStride, strideM } from '../domain/walk';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useSightings, useToday } from '../db/hooks';
import { go } from '../router';
import { Icon } from '../ui/Icon';
import { RegionFrameView } from '../ui/live/RegionFrame';
import { useLevel } from './Character';
import { Browse } from './you/Browse';
import { ClockCard } from './you/ClockCard';
import { Doors } from './you/Doors';
import { DueLines, readStorySeen } from './you/DueLines';
import { FilmPoster } from './you/FilmPoster';
import { FindingCard } from './you/FindingCard';
import { returnedAfterGap } from '../domain/slowDay';
import { spokenLine } from '../domain/voice';
import { GoToBox } from './you/GoToBox';
import { HowsToday } from './you/HowsToday';
import { MomentumPanel } from './you/MomentumPanel';
import { TodaysLift } from './you/TodaysLift';
import { TrophyCase } from './you/TrophyCase';

/** The You tab. A thin page: every rule lives in its own domain module, every block in screens/you. */
export function You() {
  const settings = useSettings();
  const today = useToday();
  const lv = useLevel();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const measurements = useMeasurements();
  const sightings = useSightings();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);

  const ready = settings && days && entries && sessions && sets && measurements && sightings && checkins;
  const browse = useMemo(
    () => (ready ? { today, settings, days, entries, sessions, sets, measurements } : undefined),
    [ready, today, settings, days, entries, sessions, sets, measurements],
  );
  const momentum = useMemo(() => (browse ? { settings: browse.settings, days: browse.days, entries: browse.entries, sessions: browse.sessions } : undefined), [browse]);
  const slow = useMemo(() => (settings && days && sightings ? { settings, days, sightings } : undefined), [settings, days, sightings]);
  const finding = useMemo(() => (browse ? dailyFinding(today, browse) : undefined), [browse, today]);
  const lift = useMemo(() => (slow ? todaysLift(today, slow) : undefined), [slow, today]);
  const trophies = useMemo(() => (browse ? autoTrophies({ ...browse, sightings }) : []), [browse, sightings]);
  const bored = useMemo(() => {
    if (!browse || !days?.length) return undefined;
    const deck = statDeck(browse);
    return deck.length ? deck[Math.floor(seeded(`bored:${today}`)() * deck.length)] : undefined;
  }, [browse, days, today]);

  if (!browse || !momentum || !slow || !settings || !days || !checkins) return <div className="page" />;

  setStride(settings.strideM);
  const km = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const start = dayKey(new Date(settings.createdAt));
  const title = lv ? wornTitle(settings, lv.unlocked, lv.level) : undefined;
  const dayN = daysBetween(start, today) + 1;
  const total = settings.goalDate ? daysBetween(start, settings.goalDate) + 1 : undefined;

  const lastCheckIn = checkins.map((c) => c.date).sort().pop();
  const checkupCount = dataCheckup({ today, settings, days, entries: momentum.entries, sessions: momentum.sessions }).length;
  const due = dueItems({ today, settings, days, lastCheckIn, storySeenWeek: readStorySeen(), checkupCount });
  const steps = trendRows(today, momentum).find((r) => r.area === 'steps');
  const yesterday = days.find((d) => d.date === addDays(today, -1));
  const months = [...new Set(days.map((d) => d.date.slice(0, 7)))].sort().reverse();

  const subs = {
    Reports: due.some((d) => d.id === 'story') ? 'Last week is ready' : 'Your weeks and months',
    Earned: lv ? `${fmtInt(lv.unlocked.size)} earned so far` : 'What you have earned',
    Body: due.some((d) => d.id === 'checkin') ? 'Check-in due' : 'Check-ins and photos',
    Tracks: steps ? `Steps ${steps.word.toLowerCase()}` : 'Every measure',
    Diary: yesterday || dayN <= 1 ? 'Every day' : 'Yesterday not logged',
    Insights: finding ? 'One new finding' : 'Patterns over time',
  };

  return (
    <RegionFrameView km={km} className="yu-page">
      <div className="yu-stack">
        <header className="yu-top">
          <div>
            <h1>You</h1>
            <span className="yu-q">Day {fmtInt(dayN)}{total ? ` of ${fmtInt(total)}` : ''}{title ? ` · ${title}` : ''}</span>
          </div>
          <button type="button" className="icon-btn yu-settings" aria-label="Settings" onClick={() => go('/settings')}><Icon name="more" size={22} /></button>
        </header>
        <FilmPoster today={today} days={days} sessions={browse.sessions} sets={browse.sets} />
        {settings.goalDate && <ClockCard start={start} end={settings.goalDate} today={today} />}
        <MomentumPanel today={today} input={momentum} />
        <DueLines items={due} today={today} />
        {returnedAfterGap(days, today) && <div className="voice">{spokenLine(settings, today, 'returned', today)}</div>}
        <FindingCard finding={finding} />
        <TrophyCase trophies={trophies} />
        <Doors subs={subs} />
        <Browse input={browse} km={km} stride={strideM()} />
        <TodaysLift lift={lift} />
        <HowsToday today={today} input={slow} stat={bored} />
        <GoToBox months={months} />
      </div>
    </RegionFrameView>
  );
}
