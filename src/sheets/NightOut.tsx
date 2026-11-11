import { useState } from 'react';
import { addDays, weekStart } from '../domain/dates';
import { fmt1, fmtInt, weekdayName } from '../domain/format';
import { DRINKS, mealForTime } from '../domain/foods';
import { OUT_ORDER, OUT_SIZES, dayRange, outItem, type OutSize } from '../domain/nightOut';
import { prefOn } from '../domain/types';
import { addEntry, bump, deleteEntry, patchDay } from '../db/actions';
import { useEntriesBetween, useSettings } from '../db/hooks';
import { closeSheet } from '../router';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { freeMealSaved, targetsFor } from '../state/derived';
import { stepsGoal } from '../domain/rings';
import { DateChip, useLogDate } from '../ui/DateChip';

/**
 * A night out, item by item (l-away, 11 Nov): name each thing, pick light, medium or heavy, and the app keeps an
 * honest range. Drinks as before. Tomorrow eases off a little.
 */
export function NightOutSheet() {
  const settings = useSettings();
  const [today, setDate] = useLogDate();
  const toast = useToast();
  const ws = weekStart(today);
  const week = useEntriesBetween(ws, addDays(ws, 6));
  const [items, setItems] = useState<{ name: string; size: OutSize }[]>([]);
  const [draft, setDraft] = useState('');
  const [asFree, setAsFree] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [who, setWho] = useState('');
  if (!settings || !week) return <Sheet title="Night out">{null}</Sheet>;

  const freeUsed = week.find((e) => e.kind === 'free');
  const saveUp = prefOn(settings.prefs, 'freeMealSaveUp') ? freeMealSaved(settings, week, today) : 0;
  const drinks = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0), 0);
  const drinkKcal = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0) * d.kcal, 0);
  const std = DRINKS.reduce((n, d) => n + (counts[d.id] ?? 0) * d.std, 0);
  const range = dayRange(items.map((x) => outItem(x.name, x.size)));
  const useFree = asFree ?? !freeUsed;
  const addItem = (size: OutSize) => {
    setItems((xs) => [...xs, { name: draft.trim() || `Plate ${xs.length + 1}`, size }]);
    setDraft('');
  };
  const tomorrow = addDays(today, 1);
  const t = targetsFor(settings, tomorrow);

  const log = async () => {
    const at = Date.now();
    const ids: string[] = [];
    const m = mealForTime();
    for (const x of items) {
      const o = outItem(x.name, x.size);
      const e = await addEntry({ date: today, meal: m, at, kind: useFree ? 'free' : 'quick', ...o, name: who.trim() ? `${o.name} (${who.trim()})` : o.name });
      ids.push(e.id);
    }
    if (items.length && useFree && saveUp >= 200) void bump('saveup-used');
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
      <DateChip value={today} onChange={setDate} />
      <label className="flabel">
        <span className="lbl">With who, or where? Optional</span>
        <input className="field" value={who} onChange={(e) => setWho(e.target.value)} placeholder="with friends" />
      </label>

      <div className="col gap8">
        <div className="lbl apri">What you ate, one thing at a time</div>
        <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Butter chicken, naan, a dessert" aria-label="What it was" />
        <div className="grid3" style={{ gap: 8 }}>
          {OUT_ORDER.map((z) => (
            <button key={z} type="button" className="chip sm" onClick={() => addItem(z)} aria-label={`Add as ${OUT_SIZES[z].name.toLowerCase()}: ${OUT_SIZES[z].hint}`}>
              {OUT_SIZES[z].name}
            </button>
          ))}
        </div>
        <div className="t14 q lh">Light is a starter or a side, medium a normal main, heavy rich, fried or big. Each one keeps a range, not a made-up exact number.</div>
        {items.length > 0 && (
          <div className="list">
            {items.map((x, k) => (
              <div key={k} className="li">
                <span className="s">
                  <span>{x.name}</span>
                  <small>{OUT_SIZES[x.size].name} · {OUT_SIZES[x.size].kcal[0]}–{OUT_SIZES[x.size].kcal[1]} kcal</small>
                </span>
                <button type="button" className="round sm" aria-label={`Remove ${x.name}`} onClick={() => setItems((xs) => xs.filter((_, i) => i !== k))}>
                  −
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="li" style={{ minHeight: 56 }}>
          <span className="s">
            <span>Count it as this week&apos;s free meal</span>
            <small>{freeUsed ? `This week's went on ${weekdayName(freeUsed.date)}.` : 'Your calorie ring counts the day as closed.'}{saveUp > 0 ? ` You've saved ${fmtInt(saveUp)} kcal for it.` : ''}</small>
          </span>
          <input type="checkbox" className="sw" checked={useFree} onChange={(e) => setAsFree(e.target.checked)} />
        </label>
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
          {fmtInt(range.kcal[0] + drinkKcal)}–{fmtInt(range.kcal[1] + drinkKcal)} <span className="t16 q">kcal</span>
        </div>
        {items.length > 0 && <div className="t14 q">Protein {range.protein[0]}–{range.protein[1]} g. Football plays Fuel on slightly wider dice for it, and the match report says so.</div>}
        <div className="t13 q lh">
          {drinks ? `${drinks} drink${drinks === 1 ? '' : 's'}, about ${fmt1(std)} standard drink${std === 1 ? '' : 's'}.` : 'No drinks: Designated driver.'} Logged quietly.
        </div>
      </div>

      <div className="col gap4" style={{ padding: '0 2px' }}>
        <div className="lbl">Tomorrow, Health eases off</div>
        <div className="t14 q lh">Your step goal drops to {fmtInt(stepsGoal(t, true))}.</div>
      </div>

      <button type="button" className="btn lg block" disabled={!items.length && !drinks} onClick={log}>
        Log night out
      </button>
    </Sheet>
  );
}
