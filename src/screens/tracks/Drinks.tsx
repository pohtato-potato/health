import { fmtDayShort } from '../../domain/format';
import { readinessAfter } from '../../domain/trackStats';
import { DrinksExtras } from '../TrackExtras';
import { foodByDay, type TrackData } from './data';
import { TrackShell } from './Template';

/** Drinks: the calendar and the morning after (steps, sleep and readiness), logged quietly with no rings. */
export function DrinksTrack({ data }: { data: TrackData }) {
  const { today } = data;
  const food = foodByDay(data.entries);
  const nights = [...food].filter(([, v]) => v.drinks > 0).map(([d]) => d);
  const month = nights.filter((d) => d >= today.slice(0, 8) + '01');
  const ready = readinessAfter(new Set(nights), data.sessions);
  return (
    <TrackShell
      title="Drinks"
      color="var(--gold)"
      value={month.length ? `${month.length} night${month.length === 1 ? '' : 's'}` : 'None'}
      sub="this month"
      insights={[
        ready && `Readiness the day after: ${ready.after}, against ${ready.other} on other days (${ready.sessions} session${ready.sessions === 1 ? '' : 's'}).`,
        'Logged quietly. No rings, no judgement: just a record.',
      ]}
      history={{ title: 'Nights', rows: [...nights].sort().reverse().slice(0, 20).map((d) => [fmtDayShort(d), `${food.get(d)!.drinks} drink${food.get(d)!.drinks === 1 ? '' : 's'}`]) }}
    >
      <DrinksExtras entries={data.entries} days={[...data.days.values()]} today={today} />
    </TrackShell>
  );
}
