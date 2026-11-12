// The lights-out pledge (matchday §5, y-pledge A, t3-pledge): on the session finale, or as a card on Food after
// dinner on days without training. Three times near the sleepy window, and "Not tonight", which costs nothing.
// Also the morning's "Caught the window?" answer, which is kept for Reports and never feeds the match.
import { useState } from 'react';
import { setCaughtWindow, setPledge } from '../db/actions';
import { useAllDays, useEntries, useSessions } from '../db/hooks';
import { addDays, type DayKey } from '../domain/dates';
import type { Day } from '../domain/types';
import { PLEDGE_GRACE, pledgeOnFood, pledgeTimes, sleepyWindow, weekStrip } from '../domain/pledge';
import '../styles/matchday.css';

export const clockOf = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
/** The value scale for "Kept n of m" (five steps). */
const tierOf = (share: number) => (share >= 0.9 ? 'md-v1' : share >= 0.7 ? 'md-v2' : share >= 0.55 ? 'md-v3' : share >= 0.3 ? 'md-v4' : 'md-v5');

/** The picker itself: the three times, "Not tonight", the week's strip and the pledge button. */
function PledgeBody({ date, days, onDone, onPick }: { date: DayKey; days: Day[]; onDone?: () => void; onPick?: () => void }) {
  const map = new Map(days.map((d) => [d.date, d]));
  const times = pledgeTimes(sleepyWindow(days, date));
  const [pick, setPick] = useState<number | null>(times[1]);
  const strip = weekStrip(map, date);
  const made = map.get(date)?.pledge;
  if (made) {
    return (
      <>
        <p className="md-h" style={{ fontSize: 22 }}>{made.at === null ? 'Not tonight. That costs nothing.' : `Lights out by ${clockOf(made.at)}.`}</p>
        {made.at !== null && <p className="md-q">Kept means tomorrow’s morning log shows you asleep by {clockOf(made.at + PLEDGE_GRACE)}.</p>}
        {onDone && <button type="button" className="md-btn" onClick={onDone}>Done</button>}
      </>
    );
  }
  const n = strip.nights.length;
  return (
    <>
      <div className="md-opts" role="group" aria-label="Lights out at">
        {times.map((m) => <button key={m} type="button" aria-pressed={pick === m} onClick={() => setPick(m)}>{clockOf(m)}</button>)}
      </div>
      <button type="button" className="md-opt" aria-pressed={pick === null} onClick={() => setPick(null)}><span>Not tonight</span><span className="md-q">costs nothing</span></button>
      <div className="md-row"><span>Kept this week</span><b className={`md-h ${tierOf(n ? strip.kept / n : 0)}`} style={{ fontSize: 22 }}>{strip.kept} of {n}</b></div>
      {n > 0 && <div className="md-strip" role="img" aria-label={`${strip.kept} of ${n} pledges kept this week`}>{strip.nights.map((x) => <i key={x.date} className={x.kept ? 'on' : ''} />)}</div>}
      <p className="md-q">Kept means the morning log shows you asleep within 45 minutes of it. The keeper starts fresh and the academy grows.</p>
      <button type="button" className="md-btn" onClick={() => { onPick?.(); void setPledge(date, pick); }}>{pick === null ? 'Not tonight' : `Pledge ${clockOf(pick)}`}</button>
    </>
  );
}

/** The full page after the session finale (t3-pledge). */
export function PledgePage({ date, onDone }: { date: DayKey; onDone: () => void }) {
  const days = useAllDays();
  if (!days) return null;
  const now = new Date();
  return (
    <main className="md-page pledge">
      <div className="md-in">
        <div className="md-top"><span className="md-cap">Session done · {clockOf(now.getHours() * 60 + now.getMinutes())}</span></div>
        <h1 className="md-h">That was the last thing you had to do today.</h1>
        <p>The rest of the evening is yours. When are the lights going out?</p>
        <PledgeBody date={date} days={days} onDone={onDone} />
        <div className="md-fill" />
        <button type="button" className="md-btn ghost" onClick={onDone}>Skip for now</button>
      </div>
    </main>
  );
}

/** Whether the finale should lead into the pledge: none made yet today. */
export const needsPledge = (days: Day[] | undefined, date: DayKey) => !days?.find((d) => d.date === date)?.pledge;

/** On Food, after dinner on a day without training. */
export function FoodPledge({ date }: { date: DayKey }) {
  const days = useAllDays();
  const entries = useEntries(date);
  const sessions = useSessions();
  // Stays up for the confirmation once answered here; "Done" folds it away.
  const [stay, setStay] = useState<'open' | 'closed' | null>(null);
  if (!days || !entries || !sessions || stay === 'closed') return null;
  const due = pledgeOnFood(days.find((d) => d.date === date), entries, sessions.filter((s) => s.date === date));
  if (!due && stay !== 'open') return null;
  return (
    <section className="md-card" aria-label="Lights-out pledge">
      <span className="md-cap">After dinner</span>
      <h2 className="md-h" style={{ fontSize: 22 }}>The evening is yours. When are the lights going out?</h2>
      <PledgeBody date={date} days={days} onPick={() => setStay('open')} onDone={stay === 'open' ? () => setStay('closed') : undefined} />
    </section>
  );
}

/** The morning log's question (matchday §5): "Caught the window?" yes or no. Kept for Reports; never feeds a match. */
export function CaughtWindow({ date, days }: { date: DayKey; days: Day[] }) {
  const map = new Map(days.map((d) => [d.date, d]));
  const at = map.get(addDays(date, -1))?.pledge?.at;
  const win = sleepyWindow(days, addDays(date, -1));
  const v = map.get(date)?.caughtWindow;
  const said = typeof at === 'number' ? `You pledged ${clockOf(at)}.` : win !== undefined ? `Your sleepy window is around ${clockOf(win)}.` : 'When you felt sleepy, did you go?';
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="lbl">Caught the window?</span>
      <span className="t14 q">{said} Just for Reports; it never changes a match.</span>
      <div className="md-yn" role="group" aria-label="Caught the window?">
        <button type="button" aria-pressed={v === true} onClick={() => void setCaughtWindow(date, v === true ? undefined : true)}>Yes</button>
        <button type="button" aria-pressed={v === false} onClick={() => void setCaughtWindow(date, v === false ? undefined : false)}>No</button>
      </div>
    </div>
  );
}
