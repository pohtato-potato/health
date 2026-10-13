import { useEffect } from 'react';
import { addDays } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { mealForTime, usageOf } from '../domain/foods';
import { bestFits, roomLeft } from '../domain/whatsleft';
import { addEntry, bump, deleteEntry, patchDay } from '../db/actions';
import { SwitchRow } from '../ui/controls';
import { useAllDays, useEntries, useEntriesBetween, useFoods, useSettings, useToday } from '../db/hooks';
import { closeSheet, replaceSheet } from '../router';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { dayRings, freeMealsThisWeek } from '../state/derived';
import { logMinutes } from '../domain/dates';

/** From this hour the sheet asks to close the day instead of suggesting food. */
const LATE_HOUR = 22;

export function WhatsLeft() {
  useEffect(() => {
    void bump('whatsleft');
  }, []);
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useEntries(today);
  const foods = useFoods();
  const history = useEntriesBetween(addDays(today, -60), today);
  const toast = useToast();
  if (!settings || !days || !entries || !foods || !history) return <Sheet title="What can I still eat?">{null}</Sheet>;

  const day = days.find((d) => d.date === today);
  const { totals, targets, rings } = dayRings(settings, today, day, entries);
  const room = roomLeft(totals, targets);
  const fits = bestFits(foods, room, totals, targets, { max: 4, home: day?.home, usage: usageOf(history) });
  const freeUsed = freeMealsThisWeek(history, today) > 0;

  const logFit = async (i: number) => {
    const meal = mealForTime();
    const ids: string[] = [];
    for (const it of fits[i].items) {
      const e = await addEntry({ date: today, meal, at: Date.now(), kind: 'food', foodId: it.food.id, name: it.food.name, amount: it.amount, portion: it.portion, kcal: it.kcal, protein: it.protein });
      ids.push(e.id);
    }
    closeSheet();
    toast({ text: `Logged ${fits[i].items.length} food${fits[i].items.length === 1 ? '' : 's'} · ${fmtInt(fits[i].kcal)} kcal`, action: { label: 'Undo', run: () => ids.forEach((id) => deleteEntry(id)) } });
  };

  // From 22:00 the question is whether the day is done, not what else to eat.
  if (logMinutes(Date.now()) >= LATE_HOUR * 60) {
    return (
      <Sheet title="It's late">
        <div className="t15 lh">Mark the day complete? Averages then count it as a full day of eating.</div>
        <div className="list">
          <SwitchRow title="Day complete" sub={`${fmtInt(totals.kcal)} kcal · ${Math.round(totals.protein)} g protein logged`} checked={!!day?.foodDone} onChange={(v) => void patchDay(today, { foodDone: v })} />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="What can I still eat?">
      <div className="grid2">
        <div className="col gap4" style={{ padding: '14px 16px', border: '1px solid var(--hairline)', borderRadius: 16 }}>
          <div className="lbl sm apri">Room left</div>
          <div className="num tn" style={{ fontSize: 24 }}>
            {room.kcalHi <= 0 ? '0' : `${room.kcalLo > 0 ? `${fmtInt(room.kcalLo)}–` : ''}${Number.isFinite(room.kcalHi) ? fmtInt(room.kcalHi) : 'open'}`}
          </div>
          <div className="t12 q">{room.kcalHi <= 0 ? 'at the top of your range' : room.kcalLo > 0 ? 'kcal to land in range' : 'kcal before the ceiling'}</div>
        </div>
        <div className="col gap4" style={{ padding: '14px 16px', border: '1px solid var(--hairline)', borderRadius: 16 }}>
          <div className="lbl sm lav">Protein left</div>
          <div className="num" style={{ fontSize: 24 }}>
            {Math.round(room.protein)} g
          </div>
          <div className="t12 q">{rings.protein.closed ? 'ring closed' : 'to close the ring'}</div>
        </div>
      </div>

      {room.kcalHi <= 0 ? (
        <div className="t14 q lh">You're at the top of your range for today. If you're genuinely hungry, eat: a day just over is fine, and the weekly picture is what counts.</div>
      ) : fits.length === 0 ? (
        <div className="t14 q lh">Save a few of the foods you eat often, and this page will suggest the best ones to finish the day with.</div>
      ) : (
        <>
          <div className="lbl" style={{ paddingTop: 4 }}>
            Best fits from your foods
          </div>
          {fits.map((f, i) => (
            <div key={i} className={`fit${i === 0 && f.inRange && f.closesProtein ? ' best' : ''}`}>
              <div className="row base">
                <span className="t15">{f.items.map((it) => (f.items.length > 1 ? `${it.food.name} (${it.portion})` : it.food.name)).join(', then ')}</span>
                {f.items.length === 1 && (
                  <span className="t13 tn" style={{ whiteSpace: 'nowrap' }}>
                    <span className="apri">{fmtInt(f.kcal)}</span> · <span className="lav">{f.protein} g</span>
                  </span>
                )}
              </div>
              {f.items.length > 1 && (
                <div className="row base">
                  <span className="t13 tn">
                    <span className="apri">{fmtInt(f.kcal)} kcal</span> · <span className="lav">{f.protein} g</span>
                  </span>
                  {f.inRange && f.closesProtein && <span className="t12 gold">Closes both rings</span>}
                </div>
              )}
              <div className="t13 q lh">{f.why}</div>
              {i === 0 && (
                <button type="button" className="btn sm" style={{ marginTop: 4 }} onClick={() => logFit(0)}>
                  I'm eating {f.items.length === 1 ? 'this' : 'these'} now
                </button>
              )}
            </div>
          ))}
        </>
      )}
      <div className="t12 d center lh">
        Only foods you've saved are suggested.{freeUsed ? '' : ' Your free meal for this week is still unused.'}{' '}
        <button type="button" className="d" style={{ textDecoration: 'underline' }} onClick={() => replaceSheet('addfood')}>
          Add food
        </button>
      </div>
    </Sheet>
  );
}
