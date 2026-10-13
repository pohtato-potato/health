import { useState } from 'react';
import { addDays, dayKey } from '../domain/dates';
import { fmtDayShort, fmtTime } from '../domain/format';
import { courseOn, dayDoses, dayTone, DEFAULT_MED_REWARDS, keptCount, refillBy } from '../domain/medicines';
import { slotTime } from '../domain/checklist';
import type { Appointment, ChecklistItem, MedRewards } from '../domain/types';
import { patchSettings } from '../db/actions';
import { useAllDays, useSettings, useToday } from '../db/hooks';
import { back, openSheet } from '../router';
import { SwitchRow } from '../ui/controls';
import { Icon } from '../ui/Icon';

const REWARD_ROWS: { id: keyof MedRewards; title: string; sub: string }[] = [
  { id: 'lantern', title: 'A lantern at camp', sub: "Lit at that night's camp on the Walk" },
  { id: 'keptWeek', title: 'A kept week', sub: 'A moment when every dose of the week was on time' },
  { id: 'perfectDay', title: 'Part of a perfect day', sub: 'Every dose on time also counts toward the night sky' },
  { id: 'keptCount', title: 'A kept count', sub: 'Per medicine; a miss pauses it, never resets it' },
];

const minutesLabel = (m: number) => fmtTime(new Date(2000, 0, 1, Math.floor(m / 60), m % 60).getTime());

/** You › Medicines: each medicine with its course, stock and kept count, appointments, rewards, and the last week. */
export function MedicinesPage() {
  const settings = useSettings();
  const days = useAllDays();
  const today = useToday();
  if (!settings || !days) return <div className="page bare" />;
  const meds = settings.checklist.filter((i) => i.active && i.med);
  const rewards = settings.medRewards ?? DEFAULT_MED_REWARDS;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7));
  const weekDays = week.map((date) => ({ date, s: dayDoses(meds, days.find((d) => d.date === date) ?? { date }, settings) }));
  const sum = weekDays.reduce((a, d) => ({ planned: a.planned + d.s.planned, onTime: a.onTime + d.s.onTime }), { planned: 0, onTime: 0 });
  const appts = (settings.appointments ?? []).filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <h1 className="h1">Medicines</h1>
      <div className="t14 q">{sum.planned ? `The last 7 days: ${sum.onTime} of ${sum.planned} on time` : 'Nothing logged in the last 7 days yet'}</div>

      {meds.length === 0 && (
        <div className="card">
          <div className="t15 lh">Add a medicine or supplement to the checklist, then mark it as one here to track its course, stock and on-time doses.</div>
          <button type="button" className="btn sm" onClick={() => openSheet('checklist')}>
            Open the checklist
          </button>
        </div>
      )}

      {meds.map((m) => (
        <MedCard key={m.id} item={m} today={today} days={days} settings={settings} showKept={rewards.keptCount} />
      ))}

      <OtherItems items={settings.checklist.filter((i) => i.active && !i.med)} />

      <div className="lbl">Last 7 days</div>
      <div className="med-week" role="list" aria-label="Doses over the last 7 days">
        {weekDays.map(({ date, s }) => {
          const tone = dayTone(s);
          return (
            <span key={date} role="listitem" className={`med-day ${tone}`} title={fmtDayShort(date)}>
              <span className="t12">{fmtDayShort(date).slice(0, 2)}</span>
              <span className="sr">{tone === 'none' ? 'nothing planned' : tone.replace('-', ' ')}</span>
            </span>
          );
        })}
      </div>
      <div className="t12 q">Sage on time · gold late · rose missed</div>

      <Appointments appts={appts} today={today} />

      <div className="lbl">What an on-time dose gives you</div>
      <div className="list">
        {REWARD_ROWS.map((r) => (
          <SwitchRow key={r.id} title={r.title} sub={r.sub} checked={rewards[r.id]} onChange={(v) => void patchSettings({ medRewards: { ...rewards, [r.id]: v } })} />
        ))}
      </div>
      <div className="t12 d lh">Reminders stay in the app: the next dose shows on Today two hours ahead. No phone notifications.</div>
    </div>
  );
}

function MedCard({ item, today, days, settings, showKept }: { item: ChecklistItem; today: string; days: NonNullable<ReturnType<typeof useAllDays>>; settings: NonNullable<ReturnType<typeof useSettings>>; showKept: boolean }) {
  const med = item.med!;
  const slots = courseOn(today, item);
  const next = (med.courses ?? []).filter((c) => c.from > today).sort((a, b) => a.from.localeCompare(b.from))[0];
  const kept = keptCount(item, days, settings, today);
  const refill = med.stock ? refillBy(med.stock, item, today) : undefined;
  const soon = refill && refill <= addDays(today, 3);
  const save = (patch: Partial<typeof med>) => patchSettings((s) => ({ checklist: s.checklist.map((i) => (i.id === item.id ? { ...i, med: { ...med, ...patch } } : i)) }));
  const times = (list: string[]) => list.map((x) => minutesLabel(slotTime(x, settings, undefined))).join(', ');

  return (
    <div className="card">
      <div className="row top">
        <span className="col gap2">
          <span className="t16">{item.name}</span>
          <span className="t13 q">{[med.kind === 'supplement' ? 'Supplement' : 'Medicine', med.form, med.dose].filter(Boolean).join(' · ')}</span>
        </span>
        {showKept && kept.count > 0 && (
          <span className={`kept-pill${kept.paused ? ' paused' : ''}`} title={kept.paused ? 'Paused by a miss; the next on-time dose starts it again' : undefined}>
            {kept.count} kept{kept.paused ? ' · paused' : ''}
          </span>
        )}
      </div>
      <div className="t14">{slots.length ? times(slots) : 'Course ended'}</div>
      {next && (
        <div className="t13 q">
          From {fmtDayShort(next.from)}: {next.slots.length ? times(next.slots) : 'stops'}
        </div>
      )}
      {med.stock && (
        <div className={`t13${soon ? '' : ' q'}`} style={soon ? { color: 'var(--gold)' } : undefined}>
          {med.stock.left} left · refill by {refill === today ? 'today' : fmtDayShort(refill!)}
        </div>
      )}
      <StockEditor left={med.stock?.left} onSave={(left) => void save({ stock: left === undefined ? undefined : { left, perDose: med.stock?.perDose ?? 1 } })} />
    </div>
  );
}

function StockEditor({ left, onSave }: { left?: number; onSave: (left?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(left === undefined ? '' : String(left));
  if (!open)
    return (
      <button type="button" className="chip sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
        {left === undefined ? 'Track how many are left' : 'Restocked'}
      </button>
    );
  return (
    <div className="row" style={{ gap: 8 }}>
      <input className="field" inputMode="numeric" aria-label="How many are left" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))} />
      <button
        type="button"
        className="btn sm"
        onClick={() => {
          onSave(v === '' ? undefined : Number(v));
          setOpen(false);
        }}
      >
        Save
      </button>
    </div>
  );
}

/** Checklist items not yet marked as a medicine. */
function OtherItems({ items }: { items: ChecklistItem[] }) {
  if (!items.length) return null;
  const mark = (i: ChecklistItem, kind: 'medicine' | 'supplement') => patchSettings((s) => ({ checklist: s.checklist.map((x) => (x.id === i.id ? { ...x, med: { kind } } : x)) }));
  return (
    <div className="card">
      <div className="lbl">On the checklist</div>
      {items.map((i) => (
        <div key={i.id} className="row" style={{ gap: 8 }}>
          <span className="t15 grow">{i.name}</span>
          <button type="button" className="chip sm" onClick={() => void mark(i, 'medicine')}>
            Medicine
          </button>
          <button type="button" className="chip sm" onClick={() => void mark(i, 'supplement')}>
            Supplement
          </button>
        </div>
      ))}
    </div>
  );
}

function Appointments({ appts, today }: { appts: Appointment[]; today: string }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(addDays(today, 7));
  const [note, setNote] = useState('');
  const save = (list: Appointment[]) => patchSettings({ appointments: list });
  return (
    <>
      <div className="lbl">Appointments</div>
      {appts.map((a) => (
        <div key={a.id} className="card">
          <div className="row">
            <span className="t16">{a.title}</span>
            <span className="t14 tn">
              {fmtDayShort(a.date)}
              {a.time !== undefined ? `, ${minutesLabel(a.time)}` : ''}
            </span>
          </div>
          {a.notes.length > 0 && (
            <ul className="t14 q lh" style={{ margin: 0, paddingLeft: 18 }}>
              {a.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <div className="row" style={{ gap: 8 }}>
            <input className="field" value={note} placeholder="A note to take along" onChange={(e) => setNote(e.target.value)} spellCheck autoCapitalize="sentences" />
            <button
              type="button"
              className="btn sm"
              disabled={!note.trim()}
              onClick={() => {
                void save(appts.map((x) => (x.id === a.id ? { ...x, notes: [...x.notes, note.trim()] } : x)));
                setNote('');
              }}
            >
              Add
            </button>
          </div>
          <button type="button" className="chip sm" style={{ alignSelf: 'flex-start' }} onClick={() => void save(appts.filter((x) => x.id !== a.id))}>
            Done, remove it
          </button>
        </div>
      ))}
      <div className="row" style={{ gap: 8 }}>
        <input className="field" value={title} placeholder="Eye check" aria-label="Appointment" onChange={(e) => setTitle(e.target.value)} spellCheck autoCapitalize="sentences" />
        <input className="field" type="date" aria-label="Appointment date" value={date} min={dayKey()} onChange={(e) => setDate(e.target.value)} />
        <button
          type="button"
          className="btn sm"
          disabled={!title.trim() || !date}
          onClick={() => {
            void save([...appts, { id: `ap${Date.now()}`, date, title: title.trim(), notes: [] }]);
            setTitle('');
          }}
        >
          Add
        </button>
      </div>
    </>
  );
}
