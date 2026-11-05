import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { patchDay } from '../db/actions';
import { db } from '../db/db';
import { undoEdit } from '../db/edits';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import type { AskInput } from '../domain/askData';
import { addDays, dayRange, type DayKey } from '../domain/dates';
import { dayCard, searchDiary } from '../domain/dayCard';
import { fmtDayMonth, fmtInt, fmtTime } from '../domain/format';
import { drinksAnswer } from '../domain/trackRules';
import { back, go, openSheet, useRoute } from '../router';
import { useToast } from '../ui/Toasts';
import { checklistSlots } from '../state/derived';
import { Icon } from '../ui/Icon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STRIP_DAYS = 60;
const MAX_HITS = 40;
const MISSING_LABEL: Record<string, string> = { steps: 'Steps', sleep: 'Sleep', weight: 'Weight', food: 'Food', drinks: 'Drinks' };

function NoteBox({ date }: { date: DayKey }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  if (!open) return (
    <div className="yu-sec">
      {saved && <span className="yu-q" role="status">Note saved.</span>}
      <button type="button" className="yu-why" onClick={() => { setOpen(true); setSaved(false); }}>Something off? Leave a note</button>
    </div>
  );
  return (
    <form className="yu-card yu-form" onSubmit={(e) => {
      e.preventDefault();
      if (!text.trim()) return;
      void db.auditNotes.add({ at: Date.now(), screen: 'diary', text: `${date}: ${text.trim()}` }).then(() => { setText(''); setOpen(false); setSaved(true); });
    }}>
      <label>What looks wrong on {fmtDayMonth(date)}?<textarea className="yu-note" rows={2} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <div className="yu-seg"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit" aria-pressed="true">Save note</button></div>
    </form>
  );
}

function MonthGrid({ month, date, today, has, pick }: { month: string; date: DayKey; today: DayKey; has: (d: DayKey) => boolean; pick: (d: DayKey) => void }) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  return (
    <div className="yu-month" role="group" aria-label={`${MONTHS[m - 1]} ${y}`}>
      {WD_INITIAL.map((w, i) => <span key={i} aria-hidden="true">{w}</span>)}
      {Array.from({ length: lead }, (_, i) => <i key={i} />)}
      {Array.from({ length: last }, (_, i) => {
        const k = `${month}-${String(i + 1).padStart(2, '0')}`;
        if (k > today) return <button key={k} type="button" disabled>{i + 1}</button>;
        const logged = has(k);
        return <button key={k} type="button" className={`${logged ? 'has' : ''}${k === date ? ' on' : ''}`} aria-current={k === date ? 'date' : undefined} aria-label={`${fmtDayMonth(k)}, ${logged ? 'logged' : 'not logged'}`} onClick={() => pick(k)}>{i + 1}</button>;
      })}
    </div>
  );
}

/** A past day can still answer "none", so a blank never has to stand in for it. */
function NoDrinksDay({ date, answer }: { date: DayKey; answer: ReturnType<typeof drinksAnswer> }) {
  if (typeof answer === 'number') return null;
  return (
    <div className="yu-seg">
      <button type="button" aria-pressed={answer === 'none'} onClick={() => void patchDay(date, { noDrinks: answer !== 'none' })}>No drinks this day</button>
    </div>
  );
}

/** Every day, in words: what was logged, what wasn't, and a way to add it. Every edit can be undone. */
export function DiaryPage() {
  const settings = useSettings();
  const entries = useAllEntries();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const today = useToday();
  const toast = useToast();
  const { params } = useRoute();
  const edits = useLiveQuery(async () => (await db.edits.toArray()).sort((a, b) => b.at - a.at).slice(0, 6), []);
  const asked = params.get('d');
  const [date, setDate] = useState<DayKey>(asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today);
  const [view, setView] = useState<'days' | 'month'>('days');
  const [month, setMonth] = useState(date.slice(0, 7));
  const [q, setQ] = useState('');
  if (!settings || !entries || !days || !edits || !sessions || !sets) return <div className="page bare" />;

  const input: AskInput = { today, settings, days, entries, sessions, sets };
  const first = [...days.map((d) => d.date), ...entries.map((e) => e.date)].sort()[0] ?? today;
  const strip = dayRange(first < addDays(today, -STRIP_DAYS) ? addDays(today, -STRIP_DAYS) : first, today);
  const logged = new Set([...entries.map((e) => e.date), ...days.filter((x) => x.steps !== undefined || x.sleep || x.weightKg !== undefined).map((x) => x.date)]);
  const card = dayCard(date, input);
  const es = entries.filter((e) => e.date === date);
  const slots = checklistSlots(settings, date);
  const day = days.find((d) => d.date === date);
  const ticked = slots.filter((s) => day?.ticks?.[s.key]).length;
  const missed = slots.filter((s) => day?.missed?.[s.key]).length;
  const hits = searchDiary(q, input);
  const d: Record<string, string> = date === today ? {} : { d: date };
  const OPEN: Record<string, () => void> = {
    Food: () => go('/close', d),
    Steps: () => openSheet('steps', d),
    Sleep: () => openSheet('morning', d),
    Weight: () => openSheet('morning', d),
    Place: () => openSheet('morning', d),
    Drinks: () => openSheet('drink', d),
  };
  const pick = (k: DayKey) => { setDate(k); setMonth(k.slice(0, 7)); };
  const moveMonth = (by: number) => {
    const [y, m] = month.split('-').map(Number);
    const t = new Date(y, m - 1 + by, 1);
    setMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`);
  };

  const row = (label: string, value: React.ReactNode) => OPEN[label]
    ? <button key={label} type="button" className="yu-diary-row" onClick={OPEN[label]}><span>{label}</span><span>{value}</span></button>
    : <div key={label} className="yu-diary-row"><span>{label}</span><span>{value}</span></div>;

  return (
    <div className="page bare yu-page yu-stack">
      <button type="button" className="backlink" onClick={() => back('/you')}><Icon name="left" size={20} stroke={1.8} />You</button>
      <h1>Diary</h1>
      <input className="yu-note" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, food, exercises" aria-label="Search the diary" />
      {q.trim() ? (
        <section className="yu-sec">
          <h2>{hits.length ? `${fmtInt(hits.length)} day${hits.length === 1 ? '' : 's'} found` : 'Nothing found'}</h2>
          {hits.length > 0 && (
            <div className="yu-card">
              {hits.slice(0, MAX_HITS).map((h) => <button key={h.date} type="button" className="yu-diary-row" onClick={() => { pick(h.date); setQ(''); }}><span>{fmtDayMonth(h.date)}</span><span>{h.text}</span></button>)}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="yu-seg">
            <button type="button" aria-pressed={view === 'days'} onClick={() => setView('days')}>Days</button>
            <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
          </div>
          {view === 'days' ? (
            <div className="day-strip" role="radiogroup" aria-label="Day" ref={(el) => { if (el && !el.dataset.placed) { el.scrollLeft = el.scrollWidth; el.dataset.placed = '1'; } }}>
              {strip.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={k === date} className={`day-pill${k === date ? ' on' : ''}${logged.has(k) ? '' : ' empty'}`} onClick={() => pick(k)}>
                  <span>{WD[new Date(`${k}T12:00`).getDay()]}</span>
                  <b className="tn">{Number(k.slice(8))}</b>
                </button>
              ))}
            </div>
          ) : (
            <section className="yu-sec">
              <div className="yu-month-head">
                <button type="button" className="btn ghost sm" disabled={month <= first.slice(0, 7)} onClick={() => moveMonth(-1)}>Earlier</button>
                <b>{MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}</b>
                <button type="button" className="btn ghost sm" disabled={month >= today.slice(0, 7)} onClick={() => moveMonth(1)}>Later</button>
              </div>
              <MonthGrid month={month} date={date} today={today} has={(k) => logged.has(k)} pick={pick} />
              <span className="yu-q">Bold days with a dot have something logged.</span>
            </section>
          )}

          <section className="yu-sec">
            <h2>{date === today ? 'Today' : fmtDayMonth(date)}</h2>
            <div className="yu-card">
              {card.lines.map(([label, value]) => row(label, value.replace(/(\d) ([hm])\b/g, '$1\u00a0$2').replace(/h (\d)/, 'h\u00a0$1')))}
              {slots.length > 0 && (
                <button type="button" className="yu-diary-row" onClick={() => openSheet('checklist', d)}>
                  <span>Checklist</span>
                  <span>{ticked + missed === 0 ? <em>not logged · add</em> : `${ticked} of ${slots.length}${slots.length - ticked - missed > 0 ? ` · ${slots.length - ticked - missed} not logged` : ''}${missed ? ` · ${missed} missed` : ''}`}</span>
                </button>
              )}
              {card.missing.map((m) => row(MISSING_LABEL[m], <em>not logged · add</em>))}
            </div>
            <span className="yu-q">Tap any row to change it. Every change can be undone.</span>
          </section>

          {es.length > 0 && (
            <section className="yu-sec">
              <h2>What you ate</h2>
              <div className="yu-card">
                {es.map((e) => <div key={e.id} className="yu-diary-row"><span>{fmtInt(e.kcal)} kcal</span><span>{e.kind === 'quick' ? e.name || 'Quick add' : e.name}</span></div>)}
              </div>
            </section>
          )}
          <NoDrinksDay date={date} answer={drinksAnswer(date, days.find((d) => d.date === date), entries)} />
          <NoteBox date={date} />
        </>
      )}

      {edits.length > 0 && (
        <section className="yu-sec">
          <h2>Recent edits</h2>
          <div className="yu-card">
            {edits.map((x) => {
              const r = (x.after ?? x.before) as { name?: string; exercise?: string; date?: string } | undefined;
              const verb = x.before === undefined ? 'Added' : x.after === undefined ? 'Deleted' : 'Changed';
              return (
                <div key={x.id} className="yu-diary-row" style={{ gridTemplateColumns: '1fr auto' }}>
                  <span className="yu-q">{verb} {r?.name ?? r?.exercise ?? x.table}<br />{r?.date ? `${fmtDayMonth(r.date)}, ` : ''}{fmtTime(x.at)}</span>
                  <button type="button" className="btn ghost sm" onClick={async () => {
                    if (x.id !== undefined && !(await undoEdit(x.id))) toast({ text: 'That was changed again since, so it stays as it is.' });
                  }}>Undo</button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
