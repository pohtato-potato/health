import type { ReactNode } from 'react';
import { fmtInt } from '../../domain/format';
import type { MomentKind } from '../../domain/todayMoment';

export interface MomentData {
  closedRings: number;
  proteinGapG: number;
  /** The foods that would close the gap, e.g. "Greek yogurt and two eggs"; empty when there are none. */
  gapFoods: string;
  addLabel: string;
  stepsLeft: number;
  laps?: string;
  easedTo?: number;
}
export interface MomentActions {
  logMorning: () => void;
  closeDay: () => void;
  addGap: () => void;
  typeSteps: () => void;
}

/** The one lit card on Today. Its kind comes from momentFor; it keeps its place on the page whatever it shows. */
export function MomentCard({ kind, data, actions }: { kind: MomentKind; data: MomentData; actions: MomentActions }) {
  const card = (title: string, sub: string, acts: ReactNode, gold = false) => (
    <section className={`td-moment${gold ? ' gold' : ''}`} data-section="moment">
      <h2 className="td-moment-title">{title}</h2>
      {sub && <p className="td-moment-sub">{sub}</p>}
      {acts && <div className="td-moment-acts">{acts}</div>}
    </section>
  );
  const add = data.proteinGapG > 0 && data.gapFoods ? (
    <button type="button" className="btn ghost td-moment-btn" onClick={actions.addGap}>
      {data.addLabel}
    </button>
  ) : null;
  switch (kind) {
    case 'rest':
      return card('Rest is the plan', `${data.easedTo ? `Steps are eased to ${fmtInt(data.easedTo)}. ` : ''}Water, food, sleep. Nothing is missed.`, null);
    case 'closed':
      return card('Today, kept', `${data.closedRings} of 3 rings. Tap the day in Close the day to change anything.`, null);
    case 'morning':
      return card('Last night is waiting', 'Log weight and sleep to open the morning.', <button type="button" className="btn lg td-moment-btn" onClick={actions.logMorning}>Log the morning</button>);
    case 'perfect':
      return card('All three closed', 'Close it while it’s gold.', <button type="button" className="btn lg td-moment-btn gold" onClick={actions.closeDay}>Close the day</button>, true);
    case 'close':
      return card(
        'Ready to close the day?',
        `${data.closedRings} of 3 rings.${data.proteinGapG > 0 && data.gapFoods ? ` Protein is ${data.proteinGapG} g short: ${data.gapFoods} would do it.` : ''}`,
        <>
          <button type="button" className="btn lg td-moment-btn" onClick={actions.closeDay}>
            Close the day
          </button>
          {add}
        </>,
      );
    case 'protein':
      return card(`${data.proteinGapG} g protein to go`, data.gapFoods, add);
    case 'steps':
      return card(`${fmtInt(data.stepsLeft)} steps to go`, data.laps ? `About ${data.laps} laps of the loop.` : '', <button type="button" className="btn ghost td-moment-btn" onClick={actions.typeSteps}>Type steps</button>);
    case 'glance':
      return null;
  }
}
