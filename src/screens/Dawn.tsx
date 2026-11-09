import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useAllDays, useAllSets, useEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { addDays } from '../domain/dates';
import { fmt1, fmtDuration, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { regionAt } from '../domain/regions';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { kmFromSteps, positionAt } from '../domain/walk';
import { themeDayOn } from '../domain/calendar';
import { go } from '../router';
import { dayRings, nextUp } from '../state/derived';
import { ensureReveal } from '../state/reveal';
import { Aurora } from '../ui/live/Aurora';
import { auroraFor } from '../walk/page';
import '../styles/live.css';
import '../styles/creatures.css';

function nightLine(min: number): string {
  if (min >= 480) return 'A long, slow night.';
  if (min >= 420) return 'A good night.';
  if (min >= 360) return 'Not quite a full night.';
  return 'A short night.';
}

interface Card {
  id: string;
  sky?: CSSProperties;
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

  const cards = useMemo<Card[]>(() => {
    if (!ready || !settings || !days || !sessions || !sets || !entries) return [];
    const day = days.find((d) => d.date === today);
    const out: Card[] = [];
    const min = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : 0;
    out.push({
      id: 'night',
      body: (
        <>
          <span className="dawn-lab">Last night</span>
          <p className="dawn-big tn">{fmtDuration(min)}</p>
          <p className="dawn-note">{nightLine(min)}</p>
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
          <p className="dawn-note">{rings.closed} of 3 closed. The steps goal was {fmtInt(stepsGoal(targets, totals.eased))}.</p>
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

  if (!ready) return <div className="dawn lv" style={auroraFor('plains') as CSSProperties}><Aurora /></div>;
  if (!cards.length) {
    leave();
    return null;
  }
  const km = days ? kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0)) : 0;
  const card = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;
  return (
    <div className="dawn lv" role="dialog" aria-label="The morning reveal" style={card.sky ?? (auroraFor(regionAt(km)) as CSSProperties)} onClick={() => !last && setI(i + 1)}>
      <Aurora />
      <div className="dawn-bar">
        <span className="dawn-pips" aria-hidden="true">
          {cards.map((c, k) => <i key={c.id} className={k <= i ? 'on' : ''} />)}
        </span>
        <span className="sr-only">Card {i + 1} of {cards.length}</span>
        {!last && (
          <button type="button" className="dawn-skip" onClick={(e) => { e.stopPropagation(); leave(); }}>
            Skip
          </button>
        )}
      </div>
      <div className="dawn-card" key={card.id} aria-live="polite">
        {card.body}
      </div>
      <div className="dawn-foot">
        {last ? (
          <button type="button" className="btn lg block dawn-done" onClick={leave}>
            To today
          </button>
        ) : (
          <span>Tap to go on</span>
        )}
      </div>
    </div>
  );
}

