import { useState } from 'react';
import { addDays, weekStart } from '../domain/dates';
import { fmt1, fmtInt, weekdayName } from '../domain/format';
import { DRINKS, FREE_MEAL_SIZES, mealForTime } from '../domain/foods';
import { prefOn } from '../domain/types';
import { addEntry, bump, deleteEntry, patchDay } from '../db/actions';
import { useEntriesBetween, useSettings, useToday } from '../db/hooks';
import { closeSheet } from '../router';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { freeMealSaved, targetsFor } from '../state/derived';
import { stepsGoal } from '../domain/rings';

/** A free meal and drinks in one go. Tomorrow eases off a little. */
export function NightOutSheet() {
  const settings = useSettings();
  const today = useToday();
  const toast = useToast();
  const ws = weekStart(today);
  const week = useEntriesBetween(ws, addDays(ws, 6));
  const [size, setSize] = useState<string | null>('big');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [who, setWho] = useState('');
  if (!settings || !week) return <Sheet title="Night out">{null}</Sheet>;

  const freeUsed = week.find((e) => e.kind === 'free');
  const meal = FREE_MEAL_SIZES.find((s) => s.id === size);
  const saveUp = prefOn(settings.prefs, 'freeMealSaveUp') ? freeMealSaved(settings, week, today) : 0;
  const drinks = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0), 0);
  const drinkKcal = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0) * d.kcal, 0);
  const std = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0) * d.std, 0);
  const total = (meal?.kcal ?? 0) + drinkKcal;
  const tomorrow = addDays(today, 1);
  const t = targetsFor(settings, tomorrow);

  const log = async () => {
    const at = Date.now();
    const ids: string[] = [];
    const m = mealForTime();
    if (meal) {
      const e = await addEntry({ date: today, meal: m, at, kind: 'free', name: who.trim() ? `Night out: ${who.trim()}` : 'Night out', portion: `${meal.name}, about ${fmtInt(meal.kcal)} kcal`, kcal: meal.kcal, protein: 0 });
      ids.push(e.id);
      if (saveUp >= 200) void bump('saveup-used');
    }
    for (const d of DRINKS) {
      const c = counts[d.id] ?? 0;
      if (!c) continue;
      const e = await addEntry({ date: today, meal: m, at, kind: 'drink', name: d.name, portion: `${c} × ${d.measure}`, kcal: c * d.kcal, protein: 0, drink: { type: d.id, count: c } });
      ids.push(e.id);
    }
    await patchDay(today, { nightOut: true });
    await patchDay(tomorrow, { eased: true });
    closeSheet();
    toast({
      kicker: 'Night out',
      text: 'Have a good one.',
      sub: `Logged quietly. Tomorrow's step goal is ${fmtInt(stepsGoal(t, true))}.`,
      tone: 'gold',
      action: {
        label: 'Undo',
        run: async () => {
          for (const id of ids) await deleteEntry(id);
          await patchDay(today, { nightOut: false });
          await patchDay(tomorrow, { eased: false });
        },
      },
    });
  };

  return (
    <Sheet title="Night out" sub={`${weekdayName(today)}${who ? ` · ${who}` : ''}`} tall>
      <label className="flabel">
        <span className="lbl">With who, or where? Optional</span>
        <input className="field" value={who} onChange={(e) => setWho(e.target.value)} placeholder="with friends" />
      </label>

      <div className="col gap8">
        <div className="lbl apri">Free meal</div>
        <div className="grid3" style={{ gap: 8 }}>
          {FREE_MEAL_SIZES.map((s) => (
            <button key={s.id} type="button" className={`chip sm${size === s.id ? ' on' : ''}`} onClick={() => setSize(size === s.id ? null : s.id)}>
              {s.name} · {fmtInt(s.kcal)}
            </button>
          ))}
        </div>
        <div className="t13 q lh">
          {freeUsed ? `This week's free meal went on ${weekdayName(freeUsed.date)}, but a night out still logs as one. ` : "Uses this week's free meal. "}
          Your calorie ring counts the day as closed, because the meal is part of the plan.
          {saveUp > 0 ? ` You've saved ${fmtInt(saveUp)} kcal this week for it.` : ''}
        </div>
      </div>

      <div className="col gap8">
        <div className="lbl gold">Drinks</div>
        <div className="list">
          {DRINKS.map((d) => {
            const c = counts[d.id] ?? 0;
            return (
              <div key={d.id} className="li">
                <span className="s">
                  <span>
                    {d.name}, {d.measure}
                  </span>
                  <small>about {d.kcal} kcal each</small>
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
      </div>

      <div className="card" style={{ gap: 6 }}>
        <div className="lbl">Tonight, roughly</div>
        <div className="num" style={{ fontSize: 34 }}>
          {fmtInt(total)} <span className="t16 q">kcal</span>
        </div>
        <div className="t13 q lh">
          {drinks ? `${drinks} drink${drinks === 1 ? '' : 's'}, about ${fmt1(std)} standard drink${std === 1 ? '' : 's'}.` : 'No drinks: Designated driver.'} Logged quietly, no streaks.
        </div>
      </div>

      <div className="col gap4" style={{ padding: '0 2px' }}>
        <div className="lbl">Tomorrow, Health eases off</div>
        <div className="t14 q lh">Your step goal drops to {fmtInt(stepsGoal(t, true))}, and if you miss it, no shield gets spent.</div>
      </div>

      <button type="button" className="btn lg block" disabled={!meal && !drinks} onClick={log}>
        Log night out
      </button>
    </Sheet>
  );
}
