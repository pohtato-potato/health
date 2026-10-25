import { addDays, weekStart } from '../domain/dates';
import { fmtDayMonth, fmtInt, fmtLitres, fmtTime } from '../domain/format';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { nextCheckInDate } from '../screens/Photos';
import { findSession } from '../domain/plan';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { go, replaceSheet } from '../router';
import { Icon, type IconName } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { LogSearch } from './LogSearch';
import { DateChip, useLogDate } from '../ui/DateChip';
import { checklistSlots, dayRings, freeMealsThisWeek, nextUp } from '../state/derived';
import { prefOn } from '../domain/types';
import { StatusRow } from '../ui/StatusRow';
import { usualFoods } from '../domain/usual';
import { mealForTime, portionFor } from '../domain/foods';
import { UsualChips } from '../screens/today/LogBelow';

/** The + sheet (s2), in Today's order: one search box for anything, your usual foods, the drawn tiles, then More. */
export function LogSheet() {
  const settings = useSettings();
  const today = useToday();
  const [date, setDate] = useLogDate();
  const days = useAllDays();
  const entries = useEntries(date);
  const sessions = useSessions();
  const sets = useAllSets();
  const active = useActiveSession();
  const foods = useFoods();
  const monthEntries = useEntriesBetween(addDays(today, -60), today);

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !foods || !monthEntries) return <Sheet title="Log">{null}</Sheet>;
  const mealNow = mealForTime();
  const usual = usualFoods(monthEntries, foods, mealNow, today);

  const day = days.find((d) => d.date === date);
  const { totals, targets } = dayRings(settings, date, day, entries);
  const up = nextUp(settings, sessions, sets, days);
  const plan = settings.plan;
  const slots = checklistSlots(settings, date);
  const ticked = slots.filter((s) => day?.ticks?.[s.key]).length;
  const sessionName = active ? findSession(plan!, active.session)?.name ?? 'Session' : findSession(plan ?? { sessions: [] } as never, up?.sessionId ?? '')?.name;
  const d: Record<string, string> = date === today ? {} : { d: date };

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
    <Sheet title="Log">
      <DateChip value={date} onChange={setDate} />
      <LogSearch foods={foods} onAction={(a) => (a.sheet ? replaceSheet(a.sheet) : go(a.route!))} onFood={(f) => replaceSheet('addfood', { ...d, food: f.id })} onQuick={() => replaceSheet('quick', d)} />
      {usual.length > 0 && (
        <section className="col gap2" aria-label={`Your usual ${mealNow}`}>
          <span className="t14 q">Your usual {mealNow}</span>
          <UsualChips items={usual.map((u) => ({ id: u.food.id, name: u.food.name, portion: portionFor(u.food, u.amount) }))} onAdd={(id) => replaceSheet('addfood', { ...d, food: id })} />
        </section>
      )}
      <div className="log-grid">
        {tile('food', 'var(--kcal)', 'Food', totals.entries ? `${fmtInt(totals.kcal)} kcal` : 'Nothing yet', () => replaceSheet('addfood', d))}
        {tile('sun', 'var(--gold)', 'Morning log', day?.morning ? `Done ${fmtTime(day.morning.at)}` : 'Weight, sleep', () => replaceSheet('morning', d))}
        {slots.length > 0
          ? tile('pill', 'var(--pearl)', 'Checklist', `${ticked} of ${slots.length}`, () => replaceSheet('checklist', d))
          : tile('pill', 'var(--pearl)', 'Checklist', 'Set up', () => go('/medicines'))}
        {tile('steps', 'var(--steps)', 'Steps', day?.steps !== undefined ? fmtInt(day.steps) : 'Not logged', () => replaceSheet('steps', d))}
        {plan && (active || up)
          ? tile('train', 'var(--protein)', sessionName ?? 'Session', active ? 'In progress' : 'Start', () => (active ? go('/session') : go('/session', { start: up!.sessionId })))
          : tile('train', 'var(--protein)', 'Session', 'No plan yet', () => go('/plan'))}
        {tile('check', 'var(--gold)', 'Close the day', day?.foodDone ? 'Closed' : 'Meals, checklist', () => go('/close', d))}
        {prefOn(settings.prefs, 'water') && tile('water', 'var(--blue)', 'Water', `${fmtLitres(totals.waterMl)} of ${fmtLitres(targets.waterMl)} L`, () => replaceSheet('water', d))}
      </div>
      <button type="button" className="wide" onClick={() => replaceSheet('more', d)}>
        <span className="col gap2">
          <span className="t15">More</span>
          <span className="t14 q">Drinks, night out, free meal, waist, status, check-in</span>
        </span>
        <Icon name="right" size={18} stroke={1.8} color="var(--quiet)" />
      </button>
    </Sheet>
  );
}

/** + › More (s44): the less frequent logs, and status, which relaxes targets and pauses streaks. */
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
      <button type="button" className="link t13" style={{ alignSelf: 'flex-start', minHeight: 36 }} onClick={() => replaceSheet('occasion')}>
        Name an occasion or set dates
      </button>
      <div className="t13 q lh">A status relaxes targets to maintenance and pauses streaks until you switch it off.</div>
    </Sheet>
  );
}
