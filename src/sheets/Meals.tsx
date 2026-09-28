import { useState } from 'react';
import { fmtInt } from '../domain/format';
import { portionFor, valuesFor } from '../domain/foods';
import { MEAL_NAMES, type Food, type Meal, type SavedMeal } from '../domain/types';
import { addEntry, deleteEntry, patchSettings } from '../db/actions';
import { uid } from '../db/db';
import { useEntries, useFoods, useToday } from '../db/hooks';
import { closeSheet, useRoute } from '../router';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

export function mealTotals(meal: SavedMeal, foods: Food[]) {
  let kcal = 0;
  let protein = 0;
  const names: string[] = [];
  for (const it of meal.items) {
    const f = foods.find((x) => x.id === it.foodId);
    if (!f) continue;
    const v = valuesFor(f, it.amount);
    kcal += v.kcal;
    protein += v.protein;
    names.push(f.name);
  }
  return { kcal, protein, names };
}

/** Logs every food in a saved meal at once. */
export async function logMeal(meal: SavedMeal, foods: Food[], date: string, slot: Meal): Promise<string[]> {
  const ids: string[] = [];
  const at = Date.now();
  for (const it of meal.items) {
    const f = foods.find((x) => x.id === it.foodId);
    if (!f) continue;
    const v = valuesFor(f, it.amount);
    const e = await addEntry({ date, meal: slot, at, kind: 'food', foodId: f.id, name: f.name, amount: it.amount, portion: portionFor(f, it.amount), ...v });
    ids.push(e.id);
  }
  return ids;
}

/** Saves one meal from a day, e.g. today's lunch, to log again in one tap. */
export function SaveMealSheet() {
  const { params } = useRoute();
  const today = useToday();
  const date = params.get('d') ?? today;
  const slot = (params.get('meal') as Meal) || 'lunch';
  const entries = useEntries(date);
  const foods = useFoods();
  const toast = useToast();
  const [name, setName] = useState('');
  if (!entries || !foods) return <Sheet title="Save as a meal">{null}</Sheet>;
  const items = entries.filter((e) => e.meal === slot && e.foodId && e.kind === 'food');
  const kcal = items.reduce((n, e) => n + e.kcal, 0);
  const protein = items.reduce((n, e) => n + e.protein, 0);

  const save = async () => {
    const meal: SavedMeal = { id: uid(), name: name.trim() || `Usual ${MEAL_NAMES[slot].toLowerCase()}`, items: items.map((e) => ({ foodId: e.foodId!, amount: e.amount ?? 1 })), createdAt: Date.now() };
    await patchSettings((s) => ({ meals: [...(s.meals ?? []), meal] }));
    closeSheet();
    toast({ text: `${meal.name} saved`, sub: 'Find it under Meals when you add food.' });
  };

  return (
    <Sheet title="Save as a meal" sub={`${items.length} foods · ${fmtInt(kcal)} kcal · ${Math.round(protein)} g protein`}>
      <div className="list">
        {items.map((e) => (
          <div key={e.id} className="li">
            <span className="s">
              <span>{e.name}</span>
              <small>{e.portion}</small>
            </span>
            <span className="v tn">{fmtInt(e.kcal)}</span>
          </div>
        ))}
      </div>
      <label className="flabel">
        <span className="lbl">Name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Usual ${MEAL_NAMES[slot].toLowerCase()}`} autoFocus />
      </label>
      <button type="button" className="btn lg block" disabled={items.length < 2} onClick={save}>
        Save meal
      </button>
    </Sheet>
  );
}

/** A row in the Meals tab. */
export function MealRow({ meal, foods, date, slot, onRemove }: { meal: SavedMeal; foods: Food[]; date: string; slot: Meal; onRemove: () => void }) {
  const toast = useToast();
  const t = mealTotals(meal, foods);
  return (
    <div className="food-row">
      <div className="col gap2 grow" style={{ minWidth: 0 }}>
        <span className="t16">{meal.name}</span>
        <span className="t13 q" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.names.join(', ')}
        </span>
        <button type="button" className="t12 d" style={{ alignSelf: 'flex-start', textDecoration: 'underline' }} onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <div className="t14 tn right">
          {fmtInt(t.kcal)}
          <div className="t12 lav">{Math.round(t.protein)} g</div>
        </div>
        <button
          type="button"
          className="round sm"
          aria-label={`Add ${meal.name}`}
          onClick={async () => {
            const ids = await logMeal(meal, foods, date, slot);
            toast({ text: `${meal.name} · ${fmtInt(t.kcal)} kcal`, sub: `Added to ${MEAL_NAMES[slot].toLowerCase()}`, action: { label: 'Undo', run: () => ids.forEach((id) => deleteEntry(id)) } });
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
