import type { ReactNode } from 'react';
import { fmtInt } from '../../domain/format';
import type { MomentKind } from '../../domain/todayMoment';

export interface MomentData {
  closedRings: number;
  /** How many rings count today (4 since sleep joined). */
  ringsOf?: number;
  proteinGapG: number;
  /** The foods that would close the gap, e.g. "Greek yogurt and two eggs"; empty when there are none. */
  gapFoods: string;
  addLabel: string;
  stepsLeft: number;
  laps?: string;
  easedTo?: number;
  /** The meal that comes next, for the glance hours: its name and the usual foods logged at it. */
  food?: { meal: string; usual: string };
}
export interface MomentActions {
  logMorning: () => void;
  closeDay: () => void;
  addGap: () => void;
  typeSteps: () => void;
  addFood?: () => void;
}

/** What the lit panel shows: the moment's kind, or the weigh-in still to come, or the next meal in the quiet hours. */
export type NextKind = MomentKind | 'weighin';

/**
 * The one lit panel on Today (board five): the next thing to log, filled in its own colour, with the page's one
 * glowing action. Closing the day is the moon button's job, so the panel never repeats it. A gold panel on a
 * perfect day. Nothing when there is nothing to say.
 */
export function MomentCard({ kind, data, actions, sheen }: { kind: NextKind; data: MomentData; actions: MomentActions; sheen?: boolean }) {
  const card = (ink: string, title: string, sub: string, act?: ReactNode, gold = false) => (
    <section className={`k-panel flat td-moment${gold ? ' gold' : ''}${gold && sheen ? ' sheen' : ''}`} style={{ '--ink': ink } as React.CSSProperties} data-section="moment">
      <span className="td-moment-text">
        <b className="td-moment-title">{title}</b>
        {sub && <span className="k-q td-moment-sub">{sub}</span>}
      </span>
      {act}
    </section>
  );
  const act = (label: string, run: () => void) => (
    <button type="button" className="k-act sm td-moment-btn" onClick={run}>
      {label}
    </button>
  );
  const add = data.proteinGapG > 0 && data.gapFoods ? act(data.addLabel, actions.addGap) : undefined;
  switch (kind) {
    case 'rest':
      return card('var(--k-pearl)', 'Rest is the plan', `${data.easedTo ? `Steps are eased to ${fmtInt(data.easedTo)}. ` : ''}Water, food, sleep. Nothing is missed.`);
    case 'closed':
      return card('var(--sleep)', 'Today, kept', `${data.closedRings} of ${data.ringsOf ?? 4} rings. Open Close the day to change anything.`);
    case 'morning':
      return card('var(--sleep)', 'Last night is waiting', 'Sleep, the weigh-in and the morning checklist.', act('Log the morning', actions.logMorning));
    case 'weighin':
      return card('var(--k-pearl)', 'Weigh-in to come', 'The morning log is saved. Only this is left.', act('Add it', actions.logMorning));
    case 'perfect':
      return card('var(--k-gold)', `All ${data.ringsOf === 3 ? 'three' : 'four'} closed`, 'Close it while it’s gold.', undefined, true);
    case 'close':
      return card(
        'var(--sleep)',
        'Ready to close the day?',
        `${data.closedRings} of ${data.ringsOf ?? 4} rings.${data.proteinGapG > 0 && data.gapFoods ? ` Protein is ${data.proteinGapG} g short: ${data.gapFoods} would do it.` : ''}`,
        add,
      );
    case 'protein':
      return card('var(--protein)', `${data.proteinGapG} g protein to go`, data.gapFoods, add);
    case 'steps':
      return card('var(--steps)', `${fmtInt(data.stepsLeft)} steps to go`, data.laps ? `About ${data.laps} laps of the loop.` : '', act('Type steps', actions.typeSteps));
    case 'stepsMissing':
      return card('var(--steps)', 'Steps not logged yet', 'Copy today’s total from Samsung Health when you can.', act('Type steps', actions.typeSteps));
    case 'glance':
      if (!data.food || !actions.addFood) return null;
      return card('var(--kcal)', `${data.food.meal} next`, data.food.usual ? `Your usual: ${data.food.usual}.` : 'Log it as you go.', act('Add food', actions.addFood));
  }
}
