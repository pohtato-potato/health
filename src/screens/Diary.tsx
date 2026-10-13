import { useState } from 'react';
import { weekday, type DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import type { FoodEntry } from '../domain/types';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { undoEdit } from '../db/edits';
import { dayRange } from '../domain/dates';
import { fmtTime } from '../domain/format';
import { placeFor } from '../domain/places';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { entryTime } from '../domain/foods';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const shift = (month: string, n: number) => {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** What a diary row calls an entry. */
const label = (e: FoodEntry) => (e.kind === 'quick' ? 'Quick add' : e.kind === 'free' ? e.name || 'Free meal' : e.name);

/** Every day's food, Letterboxd style: firsts marked, favourites counted. */
export function DiaryPage() {
  const entries = useAllEntries();
  const days = useAllDays();
  const settings = useSettings();
  const edits = useLiveQuery(async () => (await db.edits.toArray()).sort((a, b) => b.at - a.at).slice(0, 8), []);
  const today = useToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  if (!entries || !days || !settings || !edits) return <div className="page bare" />;
  const dayOf = new Map(days.map((d) => [d.date, d]));

  const firstSeen = new Map<string, DayKey>();
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date) || entryTime(a) - entryTime(b))) {
    if (e.kind === 'food' && !firstSeen.has(e.name)) firstSeen.set(e.name, e.date);
  }
  const mine = entries.filter((e) => e.date.startsWith(month));
  const byDay = new Map<DayKey, FoodEntry[]>();
  for (const e of [...mine].sort((a, b) => entryTime(a) - entryTime(b))) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const logged = [...byDay.keys()];
  const monthEnd = (() => {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0, 12);
    return `${month}-${String(last.getDate()).padStart(2, '0')}`;
  })();
  // Every day of the month so far, logged or not: a gap is shown as a gap, never hidden.
  const dates = dayRange(`${month}-01`, monthEnd < today ? monthEnd : today).reverse();
  const foods = mine.filter((e) => e.kind === 'food');
  const counts = new Map<string, number>();
  for (const e of foods) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const firsts = [...firstSeen.entries()].filter(([, d]) => d.startsWith(month));
  const earliest = entries.reduce<string | undefined>((m, e) => (!m || e.date < m ? e.date : m), undefined);

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <div className="row base">
        <h1 className="h1">Diary</h1>
        <div className="row" style={{ gap: 2 }}>
          <button type="button" className="icon-btn" aria-label="Previous month" disabled={!earliest || shift(month, -1) < earliest.slice(0, 7)} onClick={() => setMonth(shift(month, -1))}>
            <Icon name="left" size={18} stroke={1.8} />
          </button>
          <button type="button" className="icon-btn" aria-label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(shift(month, 1))}>
            <Icon name="right" size={18} stroke={1.8} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="lbl apri">
          {MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
        </div>
        <div className="row" style={{ justifyContent: 'flex-start', gap: 24 }}>
          <div className="col gap2">
            <span className="num" style={{ fontSize: 28 }}>
              {logged.length}
            </span>
            <span className="t12 q">days logged</span>
          </div>
          <div className="col gap2">
            <span className="num" style={{ fontSize: 28 }}>
              {counts.size}
            </span>
            <span className="t12 q">different foods</span>
          </div>
          <div className="col gap2">
            <span className="num" style={{ fontSize: 28 }}>
              {firsts.length}
            </span>
            <span className="t12 q">firsts</span>
          </div>
        </div>
        {top.length > 0 && (
          <div className="t13 q lh">
            Most logged: {top.map(([n, c]) => `${n} (${c})`).join(', ')}.
          </div>
        )}
      </div>

      {dates.length === 0 || (logged.length === 0 && month < today.slice(0, 7)) ? (
        <div className="t15 q">Nothing logged in this month.</div>
      ) : (
        <div className="card" style={{ gap: 0, padding: '6px 16px' }}>
          {dates.map((d) => {
            const es = byDay.get(d) ?? [];
            const day = dayOf.get(d);
            const place = placeFor(day, settings);
            const moves = (day?.placeChanges ?? []).map((c) => `${settings.places?.find((p) => p.id === c.place)?.name ?? 'elsewhere'} from ${fmtTime(c.at)}`);
            const where = [place.name, ...moves].join(' → ');
            if (!es.length)
              return (
                <div key={d} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--divider)' }}>
                  <span className="col" style={{ alignItems: 'center' }}>
                    <span className="sf q" style={{ fontSize: 26, lineHeight: 1 }}>
                      {Number(d.slice(8))}
                    </span>
                    <span className="t11 d">{DAYS[weekday(d)]}</span>
                  </span>
                  <span className="col gap2" style={{ minWidth: 0 }}>
                    <span className="t14 q">Food not logged</span>
                    <span className="t11 d">
                      {where}
                      {day?.steps !== undefined ? ` · ${fmtInt(day.steps)} steps` : ''}
                    </span>
                  </span>
                  <button type="button" className="chip sm" onClick={() => go('/close', d === today ? {} : { d })}>
                    Add
                  </button>
                </div>
              );
            const names = [...new Set(es.filter((e) => e.kind !== 'drink').map(label))];
            const kcal = es.reduce((n, e) => n + e.kcal, 0);
            const free = es.some((e) => e.kind === 'free');
            const drinks = es.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
            return (
              <button key={d} type="button" onClick={() => go('/close', d === today ? {} : { d })} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 12, alignItems: 'start', padding: '12px 0', borderTop: '1px solid var(--divider)', textAlign: 'left', width: '100%' }}>
                <span className="col" style={{ alignItems: 'center' }}>
                  <span className="sf" style={{ fontSize: 26, lineHeight: 1 }}>
                    {Number(d.slice(8))}
                  </span>
                  <span className="t11 d">{DAYS[weekday(d)]}</span>
                </span>
                <span className="t14 lh" style={{ minWidth: 0 }}>
                  {names.map((n, i) => (
                    <span key={n}>
                      {i > 0 && <span className="d"> · </span>}
                      {n}
                      {firstSeen.get(n) === d && <span className="t11 gold"> new</span>}
                    </span>
                  ))}
                  {names.length === 0 && <span className="q">Drinks only</span>}
                  <span className="t11 d" style={{ display: 'block' }}>
                    {where}
                    {day?.steps !== undefined ? ` · ${fmtInt(day.steps)} steps` : ''}
                  </span>
                </span>
                <span className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                  <span className="t14 tn">{fmtInt(kcal)}</span>
                  <span className="t11 q">
                    {free ? 'free meal' : ''}
                    {free && drinks ? ' · ' : ''}
                    {drinks ? `${drinks} drink${drinks === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {edits.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Recent edits
          </div>
          {edits.map((x) => {
            const row = (x.after ?? x.before) as { name?: string; exercise?: string; date?: string } | undefined;
            const what = row?.name ?? row?.exercise ?? x.table;
            const verb = x.before === undefined ? 'Added' : x.after === undefined ? 'Deleted' : 'Changed';
            return (
              <div key={x.id} className="sess" style={{ minHeight: 48 }}>
                <span className="col gap2" style={{ minWidth: 0 }}>
                  <span className="t14">
                    {verb} {what}
                  </span>
                  <span className="t11 q">
                    {row?.date ? `${row.date.slice(8)}/${row.date.slice(5, 7)} · ` : ''}
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
