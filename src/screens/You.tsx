import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { dayKey, daysBetween } from '../domain/dates';
import { dataCheckup } from '../domain/checkup';
import { dueItems } from '../domain/dueLines';
import { fmtInt } from '../domain/format';
import { liftDeck } from '../domain/liftDeck';
import { seeded } from '../domain/creatures';
import { statDeck } from '../domain/shakeStats';
import { wornTitle } from '../domain/titles';
import { setStride } from '../domain/walk';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useSightings, useToday } from '../db/hooks';
import { go } from '../router';
import { Icon } from '../ui/Icon';
import { useLevel } from './Character';
import { shownTracks } from './Tracks';
import { lastFullWeek, weekNumber } from '../domain/weekly';

const COUNT_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
import { ClockChip } from './you/ClockCard';
import { Title } from '../ui/kit/Kit';
import { Doors } from './you/Doors';
import { DueLines, readStorySeen } from './you/DueLines';
import { FilmPoster } from './you/FilmPoster';
import { returnedAfterGap } from '../domain/slowDay';
import { spokenLine } from '../domain/voice';
import { HowsToday } from './you/HowsToday';
import { MomentumPanel } from './you/MomentumPanel';
import { FootballLine } from './you/FootballLine';
import { LiftDeck } from './you/TodaysLift';
import { TrophyCase } from './you/TrophyCase';
import { autoTrophies } from '../domain/trophies';

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
  const deck = useMemo(() => (browse && slow ? liftDeck(today, browse, slow) : []), [browse, slow, today]);
  const trophies = useMemo(() => (browse ? autoTrophies({ ...browse, sightings }) : []), [browse, sightings]);
  const bored = useMemo(() => {
    if (!browse || !days?.length) return undefined;
    const deck = statDeck(browse);
    return deck.length ? deck[Math.floor(seeded(`bored:${today}`)() * deck.length)] : undefined;
  }, [browse, days, today]);

  if (!browse || !momentum || !slow || !settings || !days || !checkins) return <div className="page bare k-page k-light you" />;

  setStride(settings.strideM);
  const start = dayKey(new Date(settings.createdAt));
  const title = lv ? wornTitle(settings, lv.unlocked, lv.level) : undefined;
  const dayN = daysBetween(start, today) + 1;
  const total = settings.goalDate ? daysBetween(start, settings.goalDate) + 1 : undefined;

  const lastCheckIn = checkins.map((c) => c.date).sort().pop();
  const checkupCount = dataCheckup({ today, settings, days, entries: momentum.entries, sessions: momentum.sessions }).length;
  // Medical day lives on Today's due card now (release 1), so the check-in leaves You.
  const due = dueItems({ today, settings, days, lastCheckIn, storySeenWeek: readStorySeen(), checkupCount }).filter((d) => d.id !== 'checkin');

  const shown = shownTracks(settings).length;
  const subs = {
    Reports: 'Weeks and months',
    Earned: lv ? `${fmtInt(lv.unlocked.size)} earned` : 'Titles, records',
    Body: 'Check-in, photos',
    Tracks: `${COUNT_WORDS[shown] ?? fmtInt(shown)} of them`,
    Insights: 'Ask your data',
  };

  // Look pass (board one, "You: proposed"): momentum leads over its chart, four trend tiles, the doors, then Today's lift.
  // Everything else that lived here stays, on the kit: what is due (the one glowing action), the film, the club's line,
  // the finding, the trophy case, Surprise me and How's today.
  return (
    <div className="page bare k-page k-light you yu-you">
      <header className="k-row" style={{ alignItems: 'flex-start' }}>
        <Title lg under={`${title ? `${title} · ` : ''}day ${fmtInt(dayN)}${total ? ` of ${fmtInt(total)}` : ''}`}>You</Title>
        <span className="k-row" style={{ gap: 0, alignItems: 'flex-start' }}>
          {settings.goalDate && <ClockChip start={start} end={settings.goalDate} today={today} />}
          <button type="button" className="k-help" aria-label="Settings" onClick={() => go('/settings')}><Icon name="more" size={24} /></button>
        </span>
      </header>
      <MomentumPanel today={today} input={momentum} />
      {returnedAfterGap(days, today) && <div className="voice">{spokenLine(settings, today, 'returned', today)}</div>}
      <DueLines items={due} today={today} />
      <FilmPoster today={today} days={days} sessions={browse.sessions} sets={browse.sets} />
      {/* Ledger O40: the family headings (Looking back, Earned, Body) take the place of the one "Look closer" label. */}
      <Doors subs={subs} counts={{ Reports: due.some((d) => d.id === 'story') ? `Week ${weekNumber(lastFullWeek(today))} is in` : undefined }} />
      <FootballLine />
      <LiftDeck cards={deck} />
      <TrophyCase trophies={trophies} />
      <HowsToday today={today} input={slow} stat={bored} />
    </div>
  );
}
