import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { undoEdit } from '../db/edits';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { addDays, dayRange, type DayKey } from '../domain/dates';
import { fmtDayMonth, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { placeFor } from '../domain/places';
import { sleepMinutes } from '../domain/rings';
import { back, go, openSheet } from '../router';
import { checklistSlots } from '../state/derived';
import { Icon } from '../ui/Icon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** You › Diary (s38): any day, every field in one place, "not logged" shown honestly with a way to add it, and undo for every edit. */
export function DiaryPage() {
  const settings = useSettings();
  const entries = useAllEntries();
  const days = useAllDays();
  const today = useToday();
  const edits = useLiveQuery(async () => (await db.edits.toArray()).sort((a, b) => b.at - a.at).slice(0, 6), []);
  const [date, setDate] = useState<DayKey>(today);
  if (!settings || !entries || !days || !edits) return <div className="page bare" />;

  const first = [...days.map((d) => d.date), ...entries.map((e) => e.date)].sort()[0] ?? today;
  const strip = dayRange(first < addDays(today, -60) ? addDays(today, -60) : first, today);
  const day = days.find((d) => d.date === date);
  const es = entries.filter((e) => e.date === date);
  const kcal = es.reduce((n, e) => n + e.kcal, 0);
  const protein = es.reduce((n, e) => n + e.protein, 0);
  const drinks = es.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
  const slots = checklistSlots(settings, date);
  const ticked = slots.filter((s) => day?.ticks?.[s.key]).length;
  const missed = slots.filter((s) => day?.missed?.[s.key]).length;
  const place = placeFor(day, settings);
  const moves = (day?.placeChanges ?? []).map((c) => `${(settings.places?.find((p) => p.id === c.place)?.name ?? 'elsewhere').toLowerCase()} from ${fmtTime(c.at)}`);
  const d: Record<string, string> = date === today ? {} : { d: date };

  const row = (label: string, value: string, logged: boolean, open: () => void) => (
    <button type="button" className="diary-row" onClick={open}>
      <span className="t14 q">{label}</span>
      <span className={`t15${logged ? '' : ' q'}`}>{logged ? value : `${value} · add`}</span>
    </button>
  );

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <div className="row base">
        <h1 className="h1">Diary</h1>
        <span className="t14 q">{MONTHS[Number(date.slice(5, 7)) - 1]}</span>
      </div>

      <div className="day-strip" role="radiogroup" aria-label="Day" ref={(el) => { if (el && !el.dataset.placed) { el.scrollLeft = el.scrollWidth; el.dataset.placed = '1'; } }}>
        {strip.map((k) => {
          const has = entries.some((e) => e.date === k) || days.some((x) => x.date === k && (x.steps !== undefined || x.sleep || x.weightKg !== undefined));
          return (
            <button key={k} type="button" role="radio" aria-checked={k === date} className={`day-pill${k === date ? ' on' : ''}${has ? '' : ' empty'}`} onClick={() => setDate(k)}>
              <span className="t12">{WD[new Date(`${k}T12:00`).getDay()]}</span>
              <b className="tn">{Number(k.slice(8))}</b>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ gap: 0, padding: '4px 16px' }}>
        {row('Food', es.length ? `${fmtInt(kcal)} kcal · ${Math.round(protein)} g` : 'not logged', es.length > 0, () => go('/close', d))}
        {row('Steps', day?.steps !== undefined ? fmtInt(day.steps) : 'not logged', day?.steps !== undefined, () => openSheet('steps', d))}
        {row('Sleep', day?.sleep ? `${clock(day.sleep.asleep)} → ${clock(day.sleep.woke)} · ${fmtDuration(sleepMinutes(day.sleep.asleep, day.sleep.woke))}` : 'not logged', !!day?.sleep, () => openSheet('morning', d))}
        {row('Weight', day?.weightKg !== undefined ? `${day.weightKg.toFixed(1)} kg` : 'not weighed', day?.weightKg !== undefined, () => openSheet('morning', d))}
        {slots.length > 0 &&
          row(
            'Checklist',
            `${ticked} of ${slots.length}${slots.length - ticked - missed > 0 ? ` · ${slots.length - ticked - missed} not logged` : ''}${missed ? ` · ${missed} missed` : ''}`,
            ticked + missed > 0,
            () => openSheet('checklist', d),
          )}
        {row('Place', [place.name, ...moves].join(', then '), true, () => openSheet('morning', d))}
        {row('Drinks', drinks ? `${drinks}` : 'none', drinks > 0, () => openSheet('drink', d))}
      </div>
      <div className="t13 q lh">Tap any row to change it. Every change can be undone.</div>

      {es.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            What you ate, {fmtDayMonth(date)}
          </div>
          {es.map((e) => (
            <div key={e.id} className="sess" style={{ minHeight: 40 }}>
              <span className="t14">{e.kind === 'quick' ? e.name || 'Quick add' : e.name}</span>
              <span className="t13 q tn">{fmtInt(e.kcal)} kcal</span>
            </div>
          ))}
        </div>
      )}

      {edits.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Recent edits
          </div>
          {edits.map((x) => {
            const r = (x.after ?? x.before) as { name?: string; exercise?: string; date?: string } | undefined;
            const what = r?.name ?? r?.exercise ?? x.table;
            const verb = x.before === undefined ? 'Added' : x.after === undefined ? 'Deleted' : 'Changed';
            return (
              <div key={x.id} className="sess" style={{ minHeight: 48 }}>
                <span className="col gap2" style={{ minWidth: 0 }}>
                  <span className="t14">
                    {verb} {what}
                  </span>
                  <span className="t12 q">
                    {r?.date ? `${fmtDayMonth(r.date)} · ` : ''}
                    {fmtTime(x.at)}
                  </span>
                </span>
                <button type="button" className="chip sm" onClick={() => x.id !== undefined && void undoEdit(x.id)}>
                  Undo
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
