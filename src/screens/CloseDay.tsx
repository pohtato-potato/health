import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { addDays, atOn, parseDay } from '../domain/dates';
import { fmtDayLong, fmtInt, fmtTime } from '../domain/format';
import { mealTimesFor } from '../domain/foods';
import { slotStatus, slotTime } from '../domain/checklist';
import { placeFor } from '../domain/places';
import { MEAL_NAMES, MEALS, type FoodEntry, type Meal } from '../domain/types';
import { daySummary, usualDay, type DraftEntry } from '../domain/usualDay';
import { addEntries, closeDay, moveEntry, setMissed, setTick } from '../db/actions';
import { useAllDays, useEntries, useEntriesBetween, useSessions, useSettings, useToday } from '../db/hooks';
import { back, openSheet } from '../router';
import { checklistSlots, dayRings } from '../state/derived';
import { Check } from '../ui/Check';
import { DateChip, useLogDate } from '../ui/DateChip';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { DayClosed } from './DayClosed';
import { tonightTarget, usualWake } from '../domain/sleepRegularity';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The whole day on one screen, for any date: meals, checklist, steps, sleep, and Day complete. */
export function CloseDay() {
  const [date, setDate] = useLogDate();
  const settings = useSettings();
  const days = useAllDays();
  const entries = useEntries(date);
  const history = useEntriesBetween(addDays(date, -70), addDays(date, -1));
  const sessions = useSessions();
  const [closed, setClosed] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const today = useToday();
  if (!settings || !days || !entries || !history || !sessions) return <div className="page" />;

  const dayMap = new Map(days.map((d) => [d.date, d]));
  const day = dayMap.get(date);
  const place = placeFor(day, settings);
  const { targets } = dayRings(settings, date, day, entries);
  const slots = checklistSlots(settings, date);
  const draft = entries.length ? [] : usualDay(place.id, parseDay(date).getDay(), dayMap, history, date);
  const todays = sessions.filter((s) => s.date === date);
  const tomorrowPlace = dayMap.get(addDays(date, 1))?.place ?? place.id;
  const tonight = tonightTarget(usualWake(days, tomorrowPlace, date) ?? 450, targets.sleepMin);

  if (closed) {
    return <DayClosed date={date} summary={daySummary(day, entries, todays, targets, slots.length)} onDone={() => setClosed(false)} />;
  }

  const now = Date.now();
  const weekdayName = WEEKDAYS[parseDay(date).getDay()];
  const isToday = date === today;
  return (
    <div className="page" style={{ paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
      <button type="button" className="backlink" onClick={() => back('/today')}>
        <Icon name="left" size={20} stroke={1.8} />
        Back
      </button>
      <div className="row top">
        <div className="col gap4">
          <h1 className="h1">Close {weekdayName}</h1>
          <div className="t13 q">
            {place.name}
            {place.kind === 'office' ? ' day' : ''}
            {isToday ? ' · runs until 4 am' : ` · ${fmtDayLong(date)}`}
          </div>
        </div>
        {draft.length > 0 && (
          <button type="button" className={`chip sm${showDraft ? ' on' : ''}`} aria-expanded={showDraft} onClick={() => setShowDraft(!showDraft)}>
            Usual {weekdayName}
          </button>
        )}
      </div>
      <DateChip value={date} onChange={setDate} />

      {showDraft && draft.length > 0 && <UsualDraft key={date} draft={draft} date={date} label={`a usual ${weekdayName} at ${place.name}`} />}

      <MealBoard date={date} entries={entries} times={mealTimesFor(settings, place)} />

      {slots.length > 0 && (
        <div className="panel col" style={{ gap: 0 }}>
          {slots.map((sl) => {
            const st = slotStatus(day, sl.key);
            const due = atOn(date, slotTime(sl.slot, settings, day));
            return (
              <div key={sl.key} className="col" style={{ borderTop: '1px solid var(--divider)' }}>
                <div className="row" style={{ gap: 8, minHeight: 50 }}>
                  <Check
                    checked={st.kind === 'taken'}
                    missed={st.kind === 'missed'}
                    onChange={(on) => void (on && now - due > 2 * 3_600_000 ? setTick(date, sl.key, true, due, now) : setTick(date, sl.key, on))}
                    label={`${sl.name} · ${sl.slot.toLowerCase()}`}
                    detail={st.kind === 'taken' ? `${fmtTime(st.at)}${st.late ? ' · recorded late' : ''}` : st.kind === 'missed' ? 'missed' : `due ${fmtTime(due)}`}
                  />
                </div>
                {st.kind === 'not-logged' && due < now && (
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-start', paddingBottom: 10 }}>
                    <button type="button" className="chip sm" onClick={() => void setTick(date, sl.key, true, due, now - due > 2 * 3_600_000 ? now : undefined)}>
                      At {fmtTime(due)}
                    </button>
                    <button type="button" className="chip sm" onClick={() => void setTick(date, sl.key, true)}>
                      Now
                    </button>
                    <button type="button" className="chip sm" style={{ color: 'var(--rose)' }} onClick={() => void setMissed(date, sl.key, true)}>
                      Missed
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="panel row" style={{ gap: 12 }}>
        <Icon name="sleep" size={20} color="var(--sleep)" />
        <span className="t14 lh grow">{tonight.text}</span>
      </div>

      <div className="list">
        <button type="button" className="li" onClick={() => openSheet('steps', isToday ? {} : { d: date })}>
          <span className="s">
            <span>Steps</span>
            <small>{day?.steps !== undefined ? `${fmtInt(day.steps)}${day.stepsFinal ? ', final' : ' so far'}` : 'Not logged'}</small>
          </span>
          <Icon name="right" size={18} color="var(--dim)" />
        </button>
        {!day?.sleep && (
          <button type="button" className="li" onClick={() => openSheet('morning', isToday ? {} : { d: date })}>
            <span className="s">
              <span>Sleep</span>
              <small>The morning log was missed. Add last night's sleep</small>
            </span>
            <Icon name="right" size={18} color="var(--dim)" />
          </button>
        )}
      </div>

      {day?.foodDone ? (
        <button type="button" className="btn ghost lg block" onClick={() => void closeDay(date, false)}>
          Day closed · open it again
        </button>
      ) : (
        <button
          type="button"
          className="btn lg block close-btn"
          onClick={async () => {
            await closeDay(date, true);
            setClosed(true);
          }}
        >
          <Icon name="check" size={18} /> Close the day
        </button>
      )}
      <div className="t12 q center lh">Closing says everything eaten is in, so averages count it as a full day.</div>
    </div>
  );
}

/** Prefills a draft from a usual day; nothing is saved until "Add". */
function UsualDraft({ draft, date, label }: { draft: DraftEntry[]; date: string; label: string }) {
  const toast = useToast();
  const [keep, setKeep] = useState(() => new Set(draft.map((_, i) => i)));
  const chosen = draft.filter((_, i) => keep.has(i));
  const kcal = chosen.reduce((n, d) => n + d.kcal, 0);
  return (
    <div className="card">
      <div className="h3">Start from {label}</div>
      <div className="t13 q">Untick what you didn't have. You can edit amounts after.</div>
      <div className="col">
        {draft.map((d, i) => (
          <Check
            key={i}
            checked={keep.has(i)}
            onChange={(on) => {
              const n = new Set(keep);
              if (on) n.add(i);
              else n.delete(i);
              setKeep(n);
            }}
            label={d.name}
            detail={`${MEAL_NAMES[d.meal]} · ${d.portion} · ${fmtInt(d.kcal)} kcal`}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn block"
        disabled={!chosen.length}
        onClick={async () => {
          const at = Date.now();
          const added = await addEntries(chosen.map((d) => ({ date, meal: d.meal, at, kind: d.kind, foodId: d.foodId, name: d.name, amount: d.amount, portion: d.portion, kcal: d.kcal, protein: d.protein })));
          toast({ text: `${added.length} entries added · ${fmtInt(kcal)} kcal` });
        }}
      >
        Add {chosen.length} {chosen.length === 1 ? 'entry' : 'entries'}
      </button>
    </div>
  );
}

/** The four meals; drag an entry by its handle onto another meal, or tap the handle to choose. */
function MealBoard({ date, entries, times }: { date: string; entries: FoodEntry[]; times: Record<Meal, number> }) {
  const [moving, setMoving] = useState<string | null>(null);
  const [over, setOver] = useState<Meal | null>(null);
  const drag = useRef<{ id: string; from: Meal; moved: boolean } | null>(null);

  const mealAt = (x: number, y: number): Meal | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-meal]');
    return (el?.getAttribute('data-meal') as Meal | null) ?? null;
  };
  const onDown = (e: ReactPointerEvent, entry: FoodEntry) => {
    drag.current = { id: entry.id, from: entry.meal, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    drag.current.moved = true;
    setOver(mealAt(e.clientX, e.clientY));
  };
  const onUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setOver(null);
    if (!d) return;
    if (!d.moved) return setMoving(moving === d.id ? null : d.id);
    const to = mealAt(e.clientX, e.clientY);
    if (to && to !== d.from) void moveEntry(d.id, to);
  };

  return (
    <div className="meal-panel">
      {MEALS.map((meal) => {
        const es = entries.filter((e) => e.meal === meal);
        const kcal = es.reduce((n, e) => n + e.kcal, 0);
        const protein = es.reduce((n, e) => n + e.protein, 0);
        return (
          <section key={meal} data-meal={meal} className={`mealbox${over === meal ? ' over' : ''}`} aria-label={MEAL_NAMES[meal]}>
            <div className="meal-h">
              <span className="t15" style={{ fontWeight: 600 }}>
                {MEAL_NAMES[meal]}
              </span>
              <span className="t13 tn q">
                {fmtTime(atOn(date, times[meal]))}
                {es.length ? ` · ${fmtInt(kcal)} kcal · ${Math.round(protein)} g` : ' · not logged'}
              </span>
            </div>
            {es.map((e) => (
              <div key={e.id} className="col">
                <div className="mealbox-row">
                  <button
                    type="button"
                    className="grip"
                    aria-label={`Move ${e.name} to another meal`}
                    aria-expanded={moving === e.id}
                    onPointerDown={(ev) => onDown(ev, e)}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setMoving(moving === e.id ? null : e.id))}
                  >
                    <Icon name="more" size={18} color="var(--dim)" />
                  </button>
                  <button type="button" className="col gap2 grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => openSheet('entry', { id: e.id })}>
                    <span className="t15">{e.name}</span>
                    <span className="t12 q">{e.portion}</span>
                  </button>
                  <span className="t14 tn right">
                    {fmtInt(e.kcal)}
                    <span className="t12 lav" style={{ display: 'block' }}>
                      {Math.round(e.protein)} g
                    </span>
                  </span>
                </div>
                {moving === e.id && (
                  <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start', padding: '4px 0 8px 44px' }}>
                    {MEALS.filter((m) => m !== meal).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="chip sm"
                        onClick={() => {
                          setMoving(null);
                          void moveEntry(e.id, m);
                        }}
                      >
                        To {MEAL_NAMES[m].toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="item t14 q" onClick={() => openSheet('addfood', { meal, d: date })}>
              + Add to {MEAL_NAMES[meal].toLowerCase()}
            </button>
          </section>
        );
      })}
    </div>
  );
}
