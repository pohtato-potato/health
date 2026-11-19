import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAllDays, useAllSets, useEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { addDays } from '../domain/dates';
import { fmt1, fmtClock, fmtDuration, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { regionAt } from '../domain/regions';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { kmFromSteps, positionAt } from '../domain/walk';
import { themeDayOn } from '../domain/calendar';
import { go } from '../router';
import { dayRings, nextUp } from '../state/derived';
import { ensureReveal } from '../state/reveal';
import '../styles/creatures.css';

export function nightLine(min: number): string {
  if (min >= 480) return 'A long, slow night.';
  if (min >= 420) return 'A good night.';
  if (min >= 360) return 'Not quite a full night.';
  return 'A short night.';
}

export interface DawnCard {
  id: string;
  body: ReactNode;
}

/** The morning reveal: tap to go on, one card at a time. Skip is always there, and the last card returns to Today. */
export function DawnPage() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const yesterdayKey = addDays(today, -1);
  const entries = useEntries(yesterdayKey);
  const [marked, setMarked] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    void ensureReveal(today).then(() => setMarked(true));
  }, [today]);

  const leave = () => go('/today');
  const ready = !!settings && !!days && !!sessions && !!sets && !!entries && marked;

  const cards = useMemo<DawnCard[]>(() => {
    if (!ready || !settings || !days || !sessions || !sets || !entries) return [];
    const day = days.find((d) => d.date === today);
    const out: DawnCard[] = [];
    const min = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : 0;
    out.push({
      id: 'night',
      body: (
        <>
          <span className="dawn-lab">Last night</span>
          <p className="dawn-big tn">{fmtDuration(min)}</p>
          <p className="dawn-note">{nightLine(min)}{day?.sleep ? ` ${fmtClock(day.sleep.asleep)} to ${fmtClock(day.sleep.woke)}${day.sleep.rested ? `, rested ${day.sleep.rested} of 5` : ''}.` : ''}</p>
        </>
      ),
    });
    const y = days.find((d) => d.date === yesterdayKey);
    if (y?.steps !== undefined) {
      const km = kmFromSteps(y.steps);
      const total = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
      const pos = positionAt(total);
      out.push({
        id: 'walk',
        body: (
          <>
            <span className="dawn-lab">The walk</span>
            <p className="dawn-big tn">{fmt1(km)} km</p>
            <p className="dawn-note">Yesterday’s steps carried you that far. You’re past {pos.from.name}.</p>
          </>
        ),
      });
    }
    const { totals, rings, targets } = dayRings(settings, yesterdayKey, y, entries);
    out.push({
      id: 'rings',
      body: (
        <>
          <span className="dawn-lab">Yesterday’s rings</span>
          <div className="dawn-rows">
            <div className="dawn-row"><span>Calories</span><b className="tn">{fmtInt(totals.kcal)}</b></div>
            <div className="dawn-row"><span>Protein</span><b className="tn">{Math.round(totals.protein)} g</b></div>
            <div className="dawn-row"><span>Steps</span><b className="tn">{fmtInt(totals.steps)}</b></div>
          </div>
          <p className="dawn-note">{rings.closed} of {rings.of} closed. The steps goal was {fmtInt(stepsGoal(targets, totals.eased))}.</p>
        </>
      ),
    });
    const km = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
    const calendarOn = (d: string) => themeDayOn(d, regionAt(km), { birthday: settings.birthday });
    const theme = calendarOn(today);
    const up = nextUp(settings, sessions, sets, days);
    const session = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name : undefined;
    out.push({
      id: 'ahead',
      body: (
        <>
          <span className="dawn-lab">The day ahead</span>
          <h2 className="dawn-name">{theme ? theme.name : session ?? 'An open day'}</h2>
          <p className="dawn-note">{theme ? theme.why : session ? 'Next up on the plan.' : 'Nothing on the plan to get to.'}</p>
        </>
      ),
    });
    return out;
    // Only the first read counts: the cards don't shuffle if the day changes underneath them.
  }, [!!ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="dawn" aria-busy="true"><DawnSky /></div>;
  if (!cards.length) {
    leave();
    return null;
  }
  return <DawnView cards={cards} i={i} onNext={() => setI(i + 1)} onLeave={leave} />;
}

/** The sky behind the cards: a dawn gradient and a sun that rises once. Decoration only. */
function DawnSky() {
  return (
    <div className="dawn-sky" aria-hidden="true">
      <span className="dawn-sun" />
    </div>
  );
}

/**
 * The morning reveal (board 23 `o23-dawn`): a sunrise behind the cards, one card at a time. "Tap to go on" and "Skip"
 * are buttons (a tap anywhere on the sky goes on too); the last card has "To today" in their place.
 */
export function DawnView({ cards, i, onNext, onLeave }: { cards: DawnCard[]; i: number; onNext: () => void; onLeave: () => void }) {
  if (!cards.length) return null;
  const at = Math.min(i, cards.length - 1);
  const card = cards[at];
  const last = at >= cards.length - 1;
  return (
    <div className="dawn" role="dialog" aria-label="The morning reveal" onClick={() => !last && onNext()}>
      <DawnSky />
      <div className="dawn-bar">
        <span className="dawn-pips" aria-hidden="true">
          {cards.map((c, k) => <i key={c.id} className={k === at ? 'on' : k < at ? 'seen' : ''} />)}
        </span>
        <span className="sr-only">Card {at + 1} of {cards.length}</span>
      </div>
      <div className="dawn-card" key={card.id} aria-live="polite">
        <div className="dawn-panel">{card.body}</div>
      </div>
      <div className="dawn-foot">
        {last ? (
          <button type="button" className="btn lg block dawn-done" onClick={onLeave}>
            To today
          </button>
        ) : (
          <div className="dawn-acts">
            <button type="button" className="dawn-next" onClick={(e) => { e.stopPropagation(); onNext(); }}>Tap to go on</button>
            <button type="button" className="dawn-skip" onClick={(e) => { e.stopPropagation(); onLeave(); }}>Skip</button>
          </div>
        )}
      </div>
    </div>
  );
}
