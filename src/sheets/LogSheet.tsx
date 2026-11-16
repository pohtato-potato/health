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

/** + › More (s44): the less frequent logs, and status, which relaxes targets while it lasts. */
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
  const tile = (icon: IconName, color: string, title: string, sub: string, onClick: () => void) => (
    <button type="button" className="log-tile" onClick={onClick} style={{ ['--tint' as string]: color }}>
      <span className="log-ic">
        <Icon name={icon} size={22} color={color} />
      </span>
      <b>{title}</b>
      <span>{sub}</span>
    </button>
  );
  return (
    <Sheet title="More">
      <div className="log-grid">
        {tile('drink', 'var(--gold)', 'Drinks', drinks ? `${drinks} today` : 'None today', () => replaceSheet('drink', d))}
        {tile('night', 'var(--gold)', 'Night out', 'Meal and drinks', () => replaceSheet('nightout', d))}
        {tile('free', 'var(--kcal)', 'Free meal', freeUsed ? 'Used this week' : '1 left this week', () => replaceSheet('free', d))}
        {tile('tape', 'var(--pearl)', 'Waist', lastWaist ? `${lastWaist.waistRelaxed ?? lastWaist.waistStanding} in ${lastWaist.waistRelaxed !== undefined ? 'relaxed' : 'tucked'}` : 'Relaxed', () => replaceSheet('waist', d))}
        {tile('camera', 'var(--pearl)', 'Check-in', due ? (due <= today ? 'Due now' : `due ${fmtDayMonth(due)}`) : 'Photos and tape', () => go('/checkin'))}
      </div>
      <div className="lbl">Status</div>
      <StatusRow today={today} current={days?.find((x) => x.date === today)?.status} />
      <div className="t14 q lh">Sick, injured, travelling or on a break: targets relax to maintenance and the rotation squad plays until you switch it off.</div>
    </Sheet>
  );
}
