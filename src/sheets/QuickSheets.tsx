import { usualWater } from '../domain/water';
import { useEffect, useState } from 'react';
import { addDays, atOn, dayKey, weekStart } from '../domain/dates';
import { fmtDayMonth, fmtInt, fmtLitres, fmtTime, weekdayName } from '../domain/format';
import { DRINKS, FREE_MEAL_SIZES, mealForTime } from '../domain/foods';
import type { ChecklistItem, Meal } from '../domain/types';
import { addEntry, addWater, bump, deleteEntry, deleteMeasurement, patchDay, patchSettings, saveMeasurement, setMissed, setSteps, setTick } from '../db/actions';
import { uid } from '../db/db';
import { isLateTick, slotStatus, slotTime } from '../domain/checklist';
import { Check } from '../ui/Check';
import { stepsGoal } from '../domain/rings';
import { useAllDays, useEntriesBetween, useMeasurements, useSettings, useToday } from '../db/hooks';
import { closeSheet, go } from '../router';
import { DecField, IntField, TimeTile } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { dayRings, freeMealSaved, targetsFor } from '../state/derived';
import { isEased, placeFor } from '../domain/places';
import { prefOn } from '../domain/types';
import { MealPicker } from './FoodForms';
import { DateChip, useLogDate } from '../ui/DateChip';
import { courseOn } from '../domain/medicines';
import { undoEdit } from '../db/edits';

export function WaterSheet() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  if (!settings || !days) return <Sheet title="Water">{null}</Sheet>;
  const ml = days.find((d) => d.date === today)?.waterMl ?? 0;
  const target = targetsFor(settings, today).waterMl;
  const usual = usualWater(days, today) ?? target;
  return (
    <Sheet title="Water" sub={`Aim: ${fmtLitres(target)} L a day`}>
      <div className="col gap8" style={{ alignItems: 'center', padding: '8px 0' }}>
        <div className="num" style={{ fontSize: 56 }}>
          {fmtLitres(ml)}
          <span className="t17 q"> L</span>
        </div>
        <div className="t14 q">
          {Math.round(ml / 250)} glasses · {ml >= target ? 'aim reached' : `${fmtLitres(target - ml)} L to go`}
        </div>
        <div className="bar" style={{ width: '100%', height: 8 }}>
          <i style={{ width: `${Math.min(ml / target, 1) * 100}%`, background: 'var(--blue)' }} />
        </div>
      </div>
      {ml < usual && (
        <button type="button" className="btn lg block" onClick={() => addWater(today, usual - ml)}>
          A usual day · {fmtLitres(usual)} L
        </button>
      )}
      <div className="grid3">
        <button type="button" className="btn ghost" onClick={() => addWater(today, -250)} disabled={ml <= 0}>
          −250 ml
        </button>
        <button type="button" className="btn" onClick={() => addWater(today, 250)}>
          +250 ml
        </button>
        <button type="button" className="btn ghost" onClick={() => addWater(today, 500)}>
          +500 ml
        </button>
      </div>
      <OtherAmount onAdd={(v) => addWater(today, v)} />
    </Sheet>
  );
}

function OtherAmount({ onAdd }: { onAdd: (ml: number) => void }) {
  const [ml, setMl] = useState<number | undefined>();
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="grow">
        <IntField value={ml} onChange={setMl} placeholder="Other amount, ml" label="Other amount in ml" />
      </div>
      <button
        type="button"
        className="btn ghost"
        disabled={!ml}
        onClick={() => {
          if (ml) onAdd(ml);
          setMl(undefined);
        }}
      >
        Add
      </button>
    </div>
  );
}

export function StepsSheet() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const [date, setDate] = useLogDate();
  if (!settings || !days) return <Sheet title="Steps">{null}</Sheet>;
  const day = days.find((d) => d.date === date);
  return <StepsForm key={date} date={date} today={today} initial={day?.steps} at={day?.stepsAt} target={stepsGoal(dayRings(settings, date, day, []).targets, isEased(day, placeFor(day, settings)))} loop={settings.loopSteps} outdoors={!!day?.outdoors} onDate={setDate} />;
}

function StepsForm({ date, today, initial, at, target, loop, outdoors: wasOutdoors, onDate }: { date: string; today: string; initial?: number; at?: number; target: number; loop?: number; outdoors: boolean; onDate: (d: string) => void }) {
  const toast = useToast();
  const [steps, setStepsV] = useState<number | undefined>(initial);
  const [estimate, setEstimate] = useState<boolean | undefined>(undefined);
  // A number exactly at the target, or a round thousand, is usually typed from memory.
  const looksTyped = steps !== undefined && steps > 0 && (steps === target || steps % 1000 === 0);
  const estimated = estimate ?? looksTyped;
  const [outdoors, setOutdoors] = useState(wasOutdoors);
  const save = async () => {
    if (steps === undefined) return;
    const editId = await setSteps(date, steps, date < today, estimated);
    if (outdoors !== wasOutdoors) await patchDay(date, { outdoors });
    closeSheet();
    const left = target - steps;
    const undo = { label: 'Undo', run: () => void undoEdit(editId) };
    toast(left <= 0 ? { kicker: 'Steps ring closed', text: `${fmtInt(steps)} steps`, tone: 'sage', action: undo } : { text: `Steps changed to ${fmtInt(steps)} · ${fmtInt(left)} to go`, action: undo });
  };
  return (
    <Sheet title="Steps" sub={date === today ? 'Today, from Samsung Health' : fmtDayMonth(date)}>
      <DateChip value={date} onChange={onDate} />
      <label className="flabel">
        <span className="lbl sage">{date === today ? 'Steps so far' : 'Final steps'}</span>
        <IntField value={steps} onChange={setStepsV} placeholder="0" autoFocus label="Steps" />
        <span className="t13 q lh">
          {initial !== undefined && at ? `Last logged ${fmtInt(initial)} at ${fmtTime(at)}. ` : ''}
          {steps !== undefined && loop ? `That's about ${fmtInt(Math.round(steps / loop))} laps of your loop. ` : ''}
          Aim: {fmtInt(target)}.
        </span>
      </label>
      <label className="row" style={{ minHeight: 48 }}>
        <span className="col gap2">
          <span className="t15">An estimate</span>
          <span className="t12 q">Not read off the phone. Averages leave estimates out.</span>
        </span>
        <input type="checkbox" className="sw" checked={estimated} onChange={(e) => setEstimate(e.target.checked)} />
      </label>
      <label className="row" style={{ minHeight: 48 }}>
        <span className="t15">Some of it outdoors</span>
        <input type="checkbox" className="sw" checked={outdoors} onChange={(e) => setOutdoors(e.target.checked)} />
      </label>
      <button type="button" className="btn lg block" disabled={steps === undefined} onClick={save}>
        Save
      </button>
    </Sheet>
  );
}

export function ChecklistSheet() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const [date, setDate] = useLogDate();
  const [late, setLate] = useState<string | null>(null);
  const [other, setOther] = useState<number | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  if (!settings || !days) return <Sheet title="Checklist">{null}</Sheet>;
  const day = days.find((d) => d.date === date);
  const items = settings.checklist.filter((i) => i.active);

  const saveItems = (next: ChecklistItem[]) => patchSettings((s) => ({ checklist: s.checklist.map((i) => next.find((n) => n.id === i.id) ?? i).concat(next.filter((n) => !s.checklist.some((i) => i.id === n.id))) }));
  const tick = (key: string, slot: string, on: boolean) => {
    if (on && isLateTick(date, slotTime(slot, settings, day), Date.now())) {
      // A batch of ticks at night is a record, not the dose time: default to the planned time.
      void setTick(date, key, true, atOn(date, slotTime(slot, settings, day)), Date.now());
      setLate(key);
      setOther(undefined);
      return;
    }
    setLate(null);
    void setTick(date, key, on);
  };


  return (
    <Sheet title="Checklist" sub={date === today ? 'Today' : fmtDayMonth(date)}>
      <DateChip value={date} onChange={setDate} />
      {items.length === 0 && <div className="t14 q lh">Nothing on your checklist yet. Add a supplement or medicine below.</div>}
      {items.map((item) => {
        const on = courseOn(date, item);
        // A course that has ended (its last change has no times) is off the checklist.
        if (!on.length && item.med?.courses?.some((c) => c.from <= date)) return null;
        const slots = on.length ? on : ['Daily'];
        return (
          <div key={item.id} className="panel col" style={{ gap: 0 }}>
            <div className="row base" style={{ paddingBottom: 6 }}>
              {editing === item.id ? (
                <input
                  className="field inline-name"
                  defaultValue={item.name}
                  aria-label="Item name"
                  spellCheck
                  autoCapitalize="sentences"
                  autoFocus
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== item.name) void saveItems([{ ...item, name: v }]);
                    setEditing(null);
                  }}
                />
              ) : (
                <button type="button" className="t16 tap44" style={{ textAlign: 'left', minHeight: 36 }} onClick={() => setEditing(item.id)} aria-label={`Rename ${item.name}`}>
                  {item.name}
                </button>
              )}
              {item.med?.dose && <span className="t12 q">{item.med.dose}</span>}
            </div>
            {slots.map((slot, n) => {
              const key = `${item.id}:${n}`;
              const st = slotStatus(day, key);
              const planned = slotTime(slot, settings, day);
              const due = atOn(date, planned);
              return (
                <div key={key} className="col" style={{ borderTop: '1px solid var(--divider)' }}>
                  <div className="row" style={{ gap: 8, minHeight: 52 }}>
                    <Check checked={st.kind === 'taken'} missed={st.kind === 'missed'} onChange={(on) => tick(key, slot, on)} label={slot} detail={st.kind === 'taken' ? `taken ${fmtTime(st.at)}${st.late ? ' · recorded late' : ''}` : st.kind === 'missed' ? 'missed' : due > Date.now() ? `due ${fmtTime(due)}` : 'not logged'} />
                    <button type="button" className={`chip sm${st.kind === 'missed' ? ' on' : ''}`} aria-pressed={st.kind === 'missed'} onClick={() => void setMissed(date, key, st.kind !== 'missed')}>
                      Missed
                    </button>
                  </div>
                  {late === key && (
                    <div className="notice" role="group" aria-label="When did you take it?">
                      <div className="t14">Recorded late, so it's saved at the planned {fmtTime(due)}. Taken at another time?</div>
                      <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start', marginTop: 8 }}>
                        <button type="button" className="chip sm on" onClick={() => setLate(null)}>
                          At {fmtTime(due)}
                        </button>
                        <button type="button" className="chip sm" onClick={() => { setLate(null); void setTick(date, key, true); }}>
                          Just now
                        </button>
                      </div>
                      <div className="row" style={{ gap: 8, marginTop: 8, width: '100%' }}>
                        <TimeTile label="Other time" minutes={other} onChange={setOther} />
                        <button type="button" className="btn" disabled={other === undefined} onClick={() => { setLate(null); void setTick(date, key, true, atOn(date, other!), Date.now()); }}>
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn ghost grow" onClick={() => saveItems([{ id: uid(), name: 'New item', slots: ['Morning'], active: true }])}>
          Add an item
        </button>
        <button type="button" className="btn ghost grow" onClick={() => go('/medicines')}>
          Schedule in Medicines
        </button>
      </div>
      <div className="t12 d lh">No streaks or confetti here. It's a plain record you can show your doctor.</div>
    </Sheet>
  );
}

export function WaistSheet() {
  const measurements = useMeasurements();
  const [date, setDate] = useLogDate();
  const toast = useToast();
  const [relaxed, setRelaxed] = useState<number | undefined>();
  const [tucked, setTucked] = useState<number | undefined>();
  const [slouched, setSlouched] = useState<number | undefined>();
  const [shoulders, setShoulders] = useState<number | undefined>();
  const [more, setMore] = useState(false);
  if (!measurements) return <Sheet title="Waist">{null}</Sheet>;
  const latest = (k: 'waistRelaxed' | 'waistStanding' | 'waistSlouched' | 'shoulders') => [...measurements].sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at).reverse().find((m) => m[k] !== undefined);
  const lastRelaxed = latest('waistRelaxed');
  const lastTucked = latest('waistStanding');
  const lastSlouched = latest('waistSlouched');
  const lastShoulders = latest('shoulders');

  const save = async () => {
    const m = await saveMeasurement({ date, waistRelaxed: relaxed, waistStanding: tucked, waistSlouched: slouched, shoulders });
    closeSheet();
    const diff = relaxed !== undefined && lastRelaxed?.waistRelaxed !== undefined ? relaxed - lastRelaxed.waistRelaxed : tucked !== undefined && lastTucked?.waistStanding !== undefined ? tucked - lastTucked.waistStanding : undefined;
    const since = relaxed !== undefined && lastRelaxed ? lastRelaxed : lastTucked;
    toast({
      kicker: 'Waist',
      text: relaxed !== undefined ? `${relaxed} in relaxed` : tucked !== undefined ? `${tucked} in tucked` : 'Measurement saved',
      sub: diff !== undefined && diff !== 0 && since ? `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff * 10) / 10)} in since ${fmtDayMonth(since.date)}` : undefined,
      action: { label: 'Undo', run: () => deleteMeasurement(m.id) },
    });
  };

  return (
    <Sheet title="Waist" sub="At the navel, same time of day, tape snug not tight">
      <DateChip value={date} onChange={setDate} />
      <label className="flabel">
        <span className="lbl pearl">Waist, relaxed</span>
        <DecField value={relaxed} onChange={setRelaxed} placeholder={lastRelaxed?.waistRelaxed ? String(lastRelaxed.waistRelaxed) : 'inches'} autoFocus />
        <span className="t13 q lh">Stand normally, breathe out, and let the stomach go: don’t pull it in. Waist-to-height uses this one.</span>
      </label>
      <label className="flabel">
        <span className="lbl">Stomach tucked, optional</span>
        <DecField value={tucked} onChange={setTucked} placeholder={lastTucked?.waistStanding ? String(lastTucked.waistStanding) : 'inches'} />
        <span className="t13 q lh">Keeps the older trend line going.{lastTucked ? ` Last ${lastTucked.waistStanding} in, ${fmtDayMonth(lastTucked.date)}.` : ''}</span>
      </label>
      {more ? (
        <div className="grid2">
          <label className="flabel">
            <span className="lbl">Slouched</span>
            <DecField value={slouched} onChange={setSlouched} placeholder={lastSlouched?.waistSlouched ? String(lastSlouched.waistSlouched) : 'inches'} />
          </label>
          <label className="flabel">
            <span className="lbl">Shoulders, widest point</span>
            <DecField value={shoulders} onChange={setShoulders} placeholder={lastShoulders?.shoulders ? String(lastShoulders.shoulders) : 'inches'} />
          </label>
        </div>
      ) : (
        <button type="button" className="link" onClick={() => setMore(true)}>
          + Slouched and shoulders
        </button>
      )}
      <button type="button" className="btn lg block" disabled={relaxed === undefined && tucked === undefined && slouched === undefined && shoulders === undefined} onClick={save}>
        Save
      </button>
    </Sheet>
  );
}

export function DrinkSheet() {
  const [date, setDate] = useLogDate();
  const toast = useToast();
  const [meal, setMeal] = useState<Meal>(mealForTime());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const total = DRINKS.reduce((s, d) => s + (counts[d.id] ?? 0) * d.kcal, 0);
  const n = Object.values(counts).reduce((a, b) => a + b, 0);

  const save = async () => {
    const ids: string[] = [];
    for (const d of DRINKS) {
      const c = counts[d.id] ?? 0;
      if (!c) continue;
      const e = await addEntry({ date, meal, at: Date.now(), kind: 'drink', name: d.name, portion: `${c} × ${d.measure}`, kcal: c * d.kcal, protein: 0, drink: { type: d.id, count: c } });
      ids.push(e.id);
    }
    closeSheet();
    toast({ text: `${n} drink${n === 1 ? '' : 's'} logged · ${fmtInt(total)} kcal`, sub: 'Logged quietly.', action: { label: 'Undo', run: () => ids.forEach((id) => deleteEntry(id)) } });
  };

  return (
    <Sheet title="Drinks" sub="Rough calories, in the measures they come in">
      <DateChip value={date} onChange={setDate} />
      <MealPicker meal={meal} onChange={setMeal} />
      <div className="list">
        {DRINKS.map((d) => {
          const c = counts[d.id] ?? 0;
          return (
            <div key={d.id} className="li">
              <span className="s">
                <span>{d.name}</span>
                <small>
                  {d.measure} · about {d.kcal} kcal
                </small>
              </span>
              <span className="row" style={{ gap: 10 }}>
                <button type="button" className="round sm" aria-label={`One less ${d.name}`} disabled={!c} onClick={() => setCounts((cs) => ({ ...cs, [d.id]: Math.max(0, (cs[d.id] ?? 0) - 1) }))}>
                  −
                </button>
                <span className="t16 tn" style={{ width: 16, textAlign: 'center' }}>
                  {c}
                </span>
                <button type="button" className="round sm" aria-label={`One more ${d.name}`} onClick={() => setCounts((cs) => ({ ...cs, [d.id]: (cs[d.id] ?? 0) + 1 }))}>
                  +
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn lg block" disabled={!n} onClick={save}>
        {n ? `Log ${n} · ${fmtInt(total)} kcal` : 'Log drinks'}
      </button>
    </Sheet>
  );
}

export function FreeMealSheet() {
  const settings = useSettings();
  const today = useToday();
  const [date, setDate] = useLogDate();
  useEffect(() => {
    void bump('free-open', { day: dayKey() });
  }, []);
  const toast = useToast();
  const ws = weekStart(today);
  const week = useEntriesBetween(ws, addDays(ws, 6));
  const [size, setSize] = useState('big');
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<Meal>(mealForTime());
  if (!week) return <Sheet title="Free meal">{null}</Sheet>;
  const used = week.find((e) => e.kind === 'free');
  const pick = FREE_MEAL_SIZES.find((s) => s.id === size)!;
  const saved = settings && prefOn(settings.prefs, 'freeMealSaveUp') ? freeMealSaved(settings, week, today) : 0;

  const save = async () => {
    const e = await addEntry({ date, meal, at: Date.now(), kind: 'free', name: name.trim() || 'Free meal', portion: `${pick.name}, about ${fmtInt(pick.kcal)} kcal`, kcal: pick.kcal, protein: 0 });
    if (saved >= 200) void bump('saveup-used');
    closeSheet();
    toast({ kicker: 'Free meal', text: 'Enjoy it. Tomorrow is an ordinary day.', tone: 'gold', action: { label: 'Undo', run: () => deleteEntry(e.id) } });
  };

  return (
    <Sheet title="Free meal" sub="One a week. The calorie ceiling lifts for today.">
      <DateChip value={date} onChange={setDate} />
      {used && <div className="banner">This week's free meal was on {weekdayName(used.date)}. You can still log another; it just won't be free.</div>}
      {saved > 0 && !used && (
        <div className="banner" style={{ borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }}>
          You've saved {fmtInt(saved)} kcal this week by landing under your ceiling. Spend it here.
        </div>
      )}
      <MealPicker meal={meal} onChange={setMeal} />
      <div className="grid3">
        {FREE_MEAL_SIZES.map((s) => (
          <button key={s.id} type="button" className={`card sm${size === s.id ? ' gold' : ''}`} onClick={() => setSize(s.id)} style={{ minHeight: 104 }}>
            <div className="t15">{s.name}</div>
            <div className="num" style={{ fontSize: 22 }}>
              {fmtInt(s.kcal)}
            </div>
            <div className="t11 q">{s.hint}</div>
          </button>
        ))}
      </div>
      <label className="flabel">
        <span className="lbl">What was it? Optional</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Biryani with friends" />
      </label>
      <button type="button" className="btn lg block" onClick={save}>
        Log free meal
      </button>
    </Sheet>
  );
}
