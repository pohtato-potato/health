import { useState } from 'react';
import { fmtInt } from '../domain/format';
import { mealForTime } from '../domain/foods';
import { labelPortion, labelTotals, type LabelInput } from '../domain/labelMode';
import { MEAL_NAMES, type Meal } from '../domain/types';
import { addEntry, deleteEntry } from '../db/actions';
import { okToAdd } from '../ui/doubleTap';
import { closeSheet, useRoute } from '../router';
import { DecField, Seg } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { DateChip, useLogDate } from '../ui/DateChip';
import { MealPicker } from './FoodForms';

/**
 * Label mode (l-label, 11 Nov): the form follows the label itself. What it says per 100 g or per serving, the pack
 * size, how much you ate; the sum shows before saving. One-off foods go in without joining your list.
 */
export function LabelForm() {
  const { params } = useRoute();
  const toast = useToast();
  const [date, setDate] = useLogDate();
  const [meal, setMeal] = useState<Meal>((params.get('meal') as Meal) || mealForTime());
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<LabelInput['basis']>('per100');
  const [kcal, setKcal] = useState<number | undefined>();
  const [protein, setProtein] = useState<number | undefined>();
  const [servingG, setServingG] = useState<number | undefined>();
  const [packG, setPackG] = useState<number | undefined>();
  const [eatenG, setEatenG] = useState<number | undefined>();
  const input: LabelInput = { basis, kcal: kcal ?? NaN, protein: protein ?? NaN, servingG, packG, eatenG: eatenG ?? 0 };
  const sum = labelTotals(input);
  const ready = !!sum && name.trim() !== '';

  const add = async () => {
    if (!ready || !sum) return;
    if (!(await okToAdd({ date, name: name.trim() }))) return;
    const e = await addEntry({
      date, meal, at: Date.now(), kind: 'quick', name: name.trim(), portion: labelPortion(input), kcal: sum.kcal, protein: sum.protein,
      label: { basis, kcal: kcal!, protein: protein!, servingG, packG, eatenG: eatenG! },
    });
    toast({ text: `${e.name} · ${fmtInt(e.kcal)} kcal · ${Math.round(e.protein)} g`, sub: `Added to ${MEAL_NAMES[meal].toLowerCase()}`, action: { label: 'Undo', run: () => deleteEntry(e.id) } });
    closeSheet();
  };

  const per = basis === 'per100' ? 'per 100 g' : 'per serving';
  return (
    <Sheet title="From the label" sub="Copy what the pack says; the app does the sum" tall>
      <DateChip value={date} onChange={setDate} />
      <MealPicker meal={meal} onChange={setMeal} />
      <label className="flabel">
        <span className="lbl">What is it?</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Protein bar" spellCheck autoCapitalize="sentences" />
      </label>
      <div className="label-card col gap8" role="group" aria-label="Nutrition label">
        <div className="lbl">The label counts</div>
        <Seg options={[{ id: 'per100', label: 'Per 100 g' }, { id: 'serving', label: 'Per serving' }]} value={basis} onChange={setBasis} />
        {basis === 'serving' && (
          <label className="flabel">
            <span className="lbl">One serving, in grams</span>
            <DecField value={servingG} onChange={setServingG} placeholder="e.g. 32" />
          </label>
        )}
        <div className="grid2" style={{ gap: 10 }}>
          <label className="flabel">
            <span className="lbl apri">Energy, kcal {per}</span>
            <DecField value={kcal} onChange={setKcal} placeholder="0" />
          </label>
          <label className="flabel">
            <span className="lbl lav">Protein, g {per}</span>
            <DecField value={protein} onChange={setProtein} placeholder="0" />
          </label>
        </div>
        <label className="flabel">
          <span className="lbl">Pack size, grams (optional)</span>
          <DecField value={packG} onChange={setPackG} placeholder="e.g. 200" />
        </label>
      </div>
      <label className="flabel">
        <span className="lbl">How much you ate, in grams</span>
        <DecField value={eatenG} onChange={setEatenG} placeholder="0" />
      </label>
      {packG ? (
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {([['Whole pack', 1], ['Half', 0.5], ['A quarter', 0.25]] as const).map(([l, f]) => (
            <button key={l} type="button" className={`chip sm${eatenG === Math.round(packG * f) ? ' on' : ''}`} onClick={() => setEatenG(Math.round(packG * f))}>
              {l}
            </button>
          ))}
        </div>
      ) : null}
      <div className="card" style={{ gap: 4 }} aria-live="polite">
        <div className="lbl">That comes to</div>
        {sum ? (
          <div className="num" style={{ fontSize: 30 }}>
            {fmtInt(sum.kcal)} <span className="t16 q">kcal</span> · {sum.protein} <span className="t16 q">g protein</span>
          </div>
        ) : (
          <div className="t14 q">Fill in the label and how much you ate.</div>
        )}
      </div>
      <button type="button" className="btn lg block" disabled={!ready} onClick={add}>
        Add to {MEAL_NAMES[meal].toLowerCase()}
      </button>
    </Sheet>
  );
}
