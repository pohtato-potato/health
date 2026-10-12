import { addDays, weekStart } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtDuration, fmtInt, fmtLitres, fmtTime } from '../domain/format';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { nextCheckInDate } from '../screens/Photos';
import { findSession } from '../domain/plan';
import { sleepMinutes } from '../domain/rings';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { go, replaceSheet } from '../router';
import { Icon, type IconName } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { checklistSlots, dayRings, freeMealsThisWeek, nextUp } from '../state/derived';
import { occasionOn } from '../domain/occasions';

export function LogSheet() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useEntries(today);
  const sessions = useSessions();
  const sets = useAllSets();
  const active = useActiveSession();
  const measurements = useMeasurements();
  const ws = weekStart(today);
  const weekEntries = useEntriesBetween(ws, addDays(ws, 6));
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !measurements || !weekEntries) return <Sheet title="Log">{null}</Sheet>;

  const day = days.find((d) => d.date === today);
  const { totals, targets } = dayRings(settings, today, day, entries);
  const up = nextUp(settings, sessions, sets, days);
  const plan = settings.plan;
  const slots = checklistSlots(settings);
  const ticked = slots.filter((s) => day?.ticks?.[s.key]).length;
  const lastWaist = [...measurements].reverse().find((m) => m.waistStanding !== undefined);
  const drinks = entries.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
  const freeUsed = freeMealsThisWeek(weekEntries, today);
  const lastSleep = day?.sleep;
  const checkinDue = checkins ? nextCheckInDate(checkins) : undefined;

  const tile = (icon: IconName, color: string, title: string, sub: string, onClick: () => void) => (
    <button type="button" className="tile" onClick={onClick}>
      <Icon name={icon} color={color} />
      <div className="col gap2">
        <b>{title}</b>
        <span>{sub}</span>
      </div>
    </button>
  );

  return (
    <Sheet title="Log">
      <div className="col gap8">
        <button type="button" className="wide" onClick={() => replaceSheet('morning')}>
          <span className="col gap2">
            <span className="t15">Morning log</span>
            <span className="t12 q">{day?.morning ? `Done at ${fmtTime(day.morning.at)} · tap to edit` : 'Weight, sleep and yesterday’s steps'}</span>
          </span>
          {day?.morning?.seconds !== undefined ? (
            <span className={`t12 ${settings.morningBest === day.morning.seconds ? 'gold' : 'q'}`}>{day.morning.seconds.toFixed(1)} s</span>
          ) : (
            <Icon name="right" size={18} stroke={1.8} color="var(--quiet)" />
          )}
        </button>
        {plan && (
          <button type="button" className="wide" onClick={() => (active ? go('/session') : up && go('/session', { start: up.sessionId }))}>
            <span className="col gap2">
              <span className="t15">{active ? `Resume ${findSession(plan, active.session)?.name ?? 'session'}` : `Start ${findSession(plan, up?.sessionId ?? '')?.name ?? 'session'}`}</span>
              <span className="t12 q">{active ? 'In progress' : findSession(plan, up?.sessionId ?? '')?.focus}</span>
            </span>
            <Icon name="right" size={18} stroke={1.8} color="var(--quiet)" />
          </button>
        )}
      </div>

      <div className="grid3">
        {tile('food', 'var(--apricot)', 'Food', totals.entries ? `${fmtInt(totals.kcal)} kcal today` : 'Nothing yet', () => replaceSheet('addfood'))}
        {tile('check', 'var(--gold)', 'Close the day', day?.foodDone ? 'Closed' : 'Meals, checklist, steps', () => go('/close'))}
        {tile('water', 'var(--blue)', 'Water', `${fmtLitres(totals.waterMl)} of ${fmtLitres(targets.waterMl)} L`, () => replaceSheet('water'))}
        {tile('steps', 'var(--sage)', 'Steps', day?.steps !== undefined ? `${fmtInt(day.steps)} so far` : 'Not logged', () => replaceSheet('steps'))}
        {tile('weight', 'var(--pearl)', 'Weight', day?.weightKg !== undefined ? `${fmt1(day.weightKg)} kg today` : 'In the morning log', () => replaceSheet('morning'))}
        {tile('sleep', 'var(--blue)', 'Sleep', lastSleep ? fmtDuration(sleepMinutes(lastSleep.asleep, lastSleep.woke)) : 'In the morning log', () => replaceSheet('morning'))}
        {tile('tape', 'var(--pearl)', 'Waist', lastWaist?.waistStanding !== undefined ? `${lastWaist.waistStanding} in last time` : 'Standing, slouched', () => replaceSheet('waist'))}
        {tile('drink', 'var(--gold)', 'Drink', drinks ? `${drinks} today` : 'None today', () => replaceSheet('drink'))}
        {tile('night', 'var(--gold)', 'Night out', 'Meal and drinks', () => replaceSheet('nightout'))}
        {tile('free', 'var(--apricot)', 'Free meal', freeUsed ? 'Used this week' : '1 left this week', () => replaceSheet('free'))}
        {slots.length > 0
          ? tile('pill', 'var(--quiet)', 'Checklist', `${ticked} of ${slots.length} done`, () => replaceSheet('checklist'))
          : tile('pill', 'var(--quiet)', 'Checklist', 'Set up in Settings', () => go('/settings', { at: 'checklist' }))}
        {tile('win', 'var(--gold)', 'Win', 'Into the jar', () => replaceSheet('win'))}
        {(settings.customTracks ?? []).some((t) => t.active) && tile('tracks', 'var(--pearl)', 'Your tracks', `${(settings.customTracks ?? []).filter((t) => t.active).length} to fill in`, () => replaceSheet('mytracks'))}
        {tile('calendar', 'var(--gold)', 'Occasion', occasionOn(settings, today) ? `${occasionOn(settings, today)!.name} is on` : 'Festival, wedding, trip', () => replaceSheet('occasion'))}
        {tile('camera', 'var(--pearl)', 'Check-in', checkinDue ? (checkinDue <= today ? 'Due now' : `Due ${fmtDayMonth(checkinDue)}`) : 'Photos and tape', () => go('/checkin'))}
      </div>

      <div className="t13 q center" style={{ paddingTop: 4 }}>
        Tip: long-press the Health icon on your home screen to jump straight to these.
      </div>
    </Sheet>
  );
}
