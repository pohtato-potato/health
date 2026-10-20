import { useState } from 'react';
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
import { DateChip, useLogDate } from '../ui/DateChip';
import { checklistSlots, dayRings, freeMealsThisWeek, nextUp } from '../state/derived';
import { prefOn } from '../domain/types';
import { StatusRow } from '../ui/StatusRow';

/** Words that open a log directly from the search box. */
const ACTIONS: { words: string[]; label: string; icon: IconName; color: string; open: () => void }[] = [
  { words: ['weight', 'kg', 'weigh', 'sleep', 'morning'], label: 'Morning log', icon: 'sun', color: 'var(--gold)', open: () => replaceSheet('morning') },
  { words: ['step', 'walk'], label: 'Steps', icon: 'steps', color: 'var(--steps)', open: () => replaceSheet('steps') },
  { words: ['waist', 'tape', 'inch'], label: 'Waist', icon: 'tape', color: 'var(--pearl)', open: () => replaceSheet('waist') },
  { words: ['drink', 'beer', 'wine', 'whisky', 'alcohol'], label: 'Drinks', icon: 'drink', color: 'var(--gold)', open: () => replaceSheet('drink') },
  { words: ['night out', 'party', 'friends'], label: 'Night out', icon: 'night', color: 'var(--gold)', open: () => replaceSheet('nightout') },
  { words: ['free', 'cheat', 'treat'], label: 'Free meal', icon: 'free', color: 'var(--kcal)', open: () => replaceSheet('free') },
  { words: ['pill', 'medicine', 'creatine', 'drops', 'tablet', 'checklist'], label: 'Checklist', icon: 'pill', color: 'var(--pearl)', open: () => replaceSheet('checklist') },
  { words: ['photo', 'check-in', 'checkin'], label: 'Check-in', icon: 'camera', color: 'var(--pearl)', open: () => go('/checkin') },
  { words: ['sick', 'ill', 'injured', 'travel', 'status', 'break'], label: 'Status', icon: 'calendar', color: 'var(--gold)', open: () => replaceSheet('more') },
  { words: ['close', 'done', 'day'], label: 'Close the day', icon: 'check', color: 'var(--gold)', open: () => go('/close') },
];

/** The + sheet (s2): six drawn tiles tinted by their metric, More, and one search box for anything. */
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
  const [q, setQ] = useState('');

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !foods) return <Sheet title="Log">{null}</Sheet>;

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

  const query = q.trim().toLowerCase();
  const actions = query ? ACTIONS.filter((a) => a.words.some((w) => w.startsWith(query) || query.includes(w)) || a.label.toLowerCase().includes(query)) : [];
  const foodHits = query ? foods.filter((f) => !f.archived && f.name.toLowerCase().includes(query)).slice(0, 5) : [];

  return (
    <Sheet title="Log">
      <DateChip value={date} onChange={setDate} />
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
          <span className="t12 q">Drinks, night out, free meal, waist, status, check-in</span>
        </span>
        <Icon name="right" size={18} stroke={1.8} color="var(--quiet)" />
      </button>
      <label className="log-search">
        <Icon name="search" size={18} color="var(--quiet)" />
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Log anything: “chai”, “waist”…" aria-label="Log anything" />
      </label>
      {(actions.length > 0 || foodHits.length > 0) && (
        <div className="list">
          {actions.map((a) => (
            <button key={a.label} type="button" className="li" onClick={a.open}>
              <span className="row" style={{ gap: 10 }}>
                <Icon name={a.icon} size={18} color={a.color} />
                <span>{a.label}</span>
              </span>
              <Icon name="right" size={16} color="var(--dim)" />
            </button>
          ))}
          {foodHits.map((f) => (
            <button key={f.id} type="button" className="li" onClick={() => replaceSheet('addfood', { ...d, food: f.id })}>
              <span className="row" style={{ gap: 10 }}>
                <Icon name="food" size={18} color="var(--kcal)" />
                <span>{f.name}</span>
              </span>
              <span className="t12 q tn">{fmtInt(f.kcal)} kcal</span>
            </button>
          ))}
        </div>
      )}
      {query && actions.length === 0 && foodHits.length === 0 && (
        <button type="button" className="link t14" onClick={() => replaceSheet('quick', d)}>
          Nothing called “{q.trim()}” yet. Quick-add its calories instead
        </button>
      )}
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
