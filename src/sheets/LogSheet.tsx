import { addDays, weekStart } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { nextCheckInDate } from '../screens/Photos';
import { useAllDays, useEntries, useEntriesBetween, useMeasurements, useSettings, useToday } from '../db/hooks';
import { go, replaceSheet } from '../router';
import { Icon, type IconName } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useLogDate } from '../ui/DateChip';
import { freeMealsThisWeek } from '../state/derived';
import { StatusRow } from '../ui/StatusRow';

/**
 * + › More (s44; board 12 `h12-more`): the less frequent logs, each a row with the same line icon in a round badge and
 * its label, the theme carried by the row's border (a beer's foam, a neon sign, a thali's colours, a tape measure, the
 * check-in's tape band, a lantern's glow); and status, which relaxes targets while it lasts.
 */
export function MoreSheet() {
  const settings = useSettings();
  const today = useToday();
  const [date] = useLogDate();
  const entries = useEntries(date);
  const measurements = useMeasurements();
  const ws = weekStart(today);
  const weekEntries = useEntriesBetween(ws, addDays(ws, 6));
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const days = useAllDays();
  if (!settings || !entries || !measurements || !weekEntries || !checkins) return <Sheet title="More">{null}</Sheet>;
  const d: Record<string, string> = date === today ? {} : { d: date };
  const drinks = entries.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
  const freeUsed = freeMealsThisWeek(weekEntries, today);
  const lastWaist = [...measurements].reverse().find((m) => m.waistRelaxed !== undefined || m.waistStanding !== undefined);
  const due = nextCheckInDate(checkins);
  const row = (k: string, icon: IconName, title: string, sub: string, onClick: () => void) => (
    <li key={k}>
      <button type="button" className={`mr-row mr-${k}`} onClick={onClick}>
        <span className="mr-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
        <span className="mr-tx"><b>{title}</b><span>{sub}</span></span>
        <svg className="mr-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {k === 'drk' && <span className="mr-bub" aria-hidden="true"><i /><i /><i /></span>}
      </button>
    </li>
  );
  return (
    <Sheet title="More">
      <ul className="mr-list">
        {row('drk', 'drink', 'Drinks', drinks ? `${drinks} today, logged quietly` : 'None today. Logged quietly.', () => replaceSheet('drink', d))}
        {row('nit', 'night', 'Night out', 'A free meal and drinks in one go', () => replaceSheet('nightout', d))}
        {row('fre', 'free', 'Free meal', freeUsed ? 'Used this week' : '1 left this week', () => replaceSheet('free', d))}
        {row('wst', 'tape', 'Waist', lastWaist ? `${lastWaist.waistRelaxed ?? lastWaist.waistStanding} in ${lastWaist.waistRelaxed !== undefined ? 'relaxed' : 'tucked'}` : 'Relaxed, tucked, slouched, shoulders', () => replaceSheet('waist', d))}
        {row('chk', 'camera', 'Check-in', due ? (due <= today ? 'Due now' : `Due ${fmtDayMonth(due)}`) : 'Monthly: photos and the tape', () => go('/checkin'))}
        <li className="mr-row mr-sta">
          <span className="mr-ic" aria-hidden="true"><Icon name="sun" size={24} /></span>
          <span className="mr-tx"><b id="mr-sta-h">Status</b><span>A festival, a trip or a cold: targets go to maintenance</span></span>
          <div className="mr-sta-pick"><StatusRow today={today} current={days?.find((x) => x.date === today)?.status} /></div>
        </li>
      </ul>
      <p className="t14 q lh">Sick, injured, travelling or on a break: targets relax to maintenance and the rotation squad plays until you switch it off.</p>
    </Sheet>
  );
}
