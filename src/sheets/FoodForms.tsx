import { useState } from 'react';
import { fmtInt } from '../domain/format';
import { mealForTime, portionFor, stepFor, unitLabel, valuesFor } from '../domain/foods';
import { MEAL_NAMES, MEALS, type Food, type FoodEntry, type FoodUnit, type Meal } from '../domain/types';
import { addEntry, archiveFood, deleteEntry, saveFood, updateEntry } from '../db/actions';
import { db } from '../db/db';
import { useFoods, useSettings, useToday } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { closeSheet, replaceSheet, useRoute } from '../router';
import { DecField, Seg, Stepper } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

/** Create a food, or edit one with ?id=. */
export function FoodForm() {
  const { params } = useRoute();
  const foods = useFoods();
  const settings = useSettings();
  const id = params.get('id');
  if (!foods || !settings) return <Sheet title="Create a food">{null}</Sheet>;
  const existing = id ? foods.find((f) => f.id === id) : undefined;
  return <FoodFormInner key={id ?? 'new'} existing={existing} initialName={params.get('name') ?? ''} homes={settings.homes} meal={params.get('meal')} />;
}

function FoodFormInner({ existing, initialName, homes, meal }: { existing?: Food; initialName: string; homes: { id: string; name: string }[]; meal: string | null }) {
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? initialName);
  const [unit, setUnit] = useState<FoodUnit>(existing?.unit ?? 'g');
  const [kcal, setKcal] = useState<number | undefined>(existing?.kcal);
  const [protein, setProtein] = useState<number | undefined>(existing?.protein);
  const [usual, setUsual] = useState<number | undefined>(existing?.defaultAmount);
  const [unitName, setUnitName] = useState(existing?.unitName ?? '');
  const [serving, setServing] = useState(existing?.servingDesc ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [home, setHome] = useState<string | undefined>(existing?.home);

  const per = unit === 'g' || unit === 'ml' ? 100 : 1;
  const perLabel = unit === 'g' ? 'per 100 g' : unit === 'ml' ? 'per 100 ml' : unit === 'piece' ? `per ${unitName || 'piece'}` : 'per serving';
  const ok = name.trim() && kcal !== undefined && kcal >= 0 && (protein ?? 0) >= 0 && (usual ?? 0) > 0;

  const save = async () => {
    if (!ok) return;
    const food = await saveFood({
      ...(existing ?? {}),
      name: name.trim(),
      unit,
      per,
      kcal: kcal!,
      protein: protein ?? 0,
      defaultAmount: usual!,
      unitName: unit === 'piece' ? unitName.trim() || 'piece' : undefined,
      servingDesc: unit === 'serving' ? serving.trim() || undefined : undefined,
      note: note.trim() || undefined,
      home,
      presets: unit === 'g' || unit === 'ml' ? Array.from(new Set([100, usual!, usual! * 2])).sort((a, b) => a - b).slice(0, 3) : existing?.presets,
    });
    toast({ text: existing ? `${food.name} updated` : `${food.name} saved to your foods` });
    if (existing) closeSheet();
    else replaceSheet('addfood', { food: food.id, ...(meal ? { meal } : {}) });
  };

  const remove = async () => {
    if (!existing) return;
    await archiveFood(existing.id);
    toast({ text: `${existing.name} removed from your foods`, sub: 'Past entries keep their numbers.', action: { label: 'Undo', run: () => archiveFood(existing.id, false) } });
    closeSheet();
  };

  return (
    <Sheet title={existing ? 'Edit food' : 'Create a food'} tall>
      <label className="flabel">
        <span className="lbl">Name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer bhurji" autoFocus={!existing} />
      </label>

      <div className="flabel">
        <span className="lbl">You measure it in</span>
        <Seg
          options={[
            { id: 'g', label: 'Grams' },
            { id: 'piece', label: 'Pieces' },
            { id: 'serving', label: 'Servings' },
            { id: 'ml', label: 'ml' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>

      {unit === 'piece' && (
        <label className="flabel">
          <span className="lbl">One piece is called</span>
          <input className="field" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="piece, egg, bottle, roti" />
        </label>
      )}
      {unit === 'serving' && (
        <label className="flabel">
          <span className="lbl">One serving is</span>
          <input className="field" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="e.g. 2 roti, 1 katori dal" />
        </label>
      )}

      <div className="grid2">
        <label className="flabel">
          <span className="lbl apri">Kcal {perLabel}</span>
          <DecField value={kcal} onChange={setKcal} placeholder="0" />
        </label>
        <label className="flabel">
          <span className="lbl lav">Protein g {perLabel}</span>
          <DecField value={protein} onChange={setProtein} placeholder="0" />
        </label>
      </div>

      <label className="flabel">
        <span className="lbl">Your usual amount ({unit === 'g' ? 'g' : unit === 'ml' ? 'ml' : unit === 'piece' ? unitName || 'pieces' : 'servings'})</span>
        <DecField value={usual} onChange={setUsual} placeholder={unit === 'g' || unit === 'ml' ? '100' : '1'} />
      </label>

      <label className="flabel">
        <span className="lbl">Note, optional</span>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="cooked, homemade, with milk" />
      </label>

      {homes.length > 1 && (
        <div className="flabel">
          <span className="lbl">Mostly eaten at</span>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button type="button" className={`chip sm${!home ? ' on' : ''}`} onClick={() => setHome(undefined)}>
              Anywhere
            </button>
            {homes.map((h) => (
              <button key={h.id} type="button" className={`chip sm${home === h.id ? ' on' : ''}`} onClick={() => setHome(h.id)}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {ok && (
        <div className="t13 q">
          Usual portion: {portionFor({ id: '', createdAt: 0, name, unit, per, kcal: kcal!, protein: protein ?? 0, unitName: unitName || 'piece', servingDesc: serving || undefined, note: note || undefined, defaultAmount: usual! }, usual!)} ·{' '}
          <span className="apri">{fmtInt(((kcal ?? 0) * usual!) / per)} kcal</span> · <span className="lav">{Math.round(((protein ?? 0) * usual!) / per)} g</span>
        </div>
      )}

      <button type="button" className="btn lg block" disabled={!ok} onClick={save}>
        {existing ? 'Save changes' : 'Save food'}
      </button>
      {existing && (
        <button type="button" className="btn danger block" onClick={remove}>
          Remove from my foods
        </button>
      )}
    </Sheet>
  );
}

export function QuickKcal() {
  const { params } = useRoute();
  const today = useToday();
  const toast = useToast();
  const date = params.get('d') ?? today;
  const [meal, setMeal] = useState<Meal>((params.get('meal') as Meal) || mealForTime());
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState<number | undefined>();
  const [protein, setProtein] = useState<number | undefined>();

  const add = async () => {
    if (kcal === undefined) return;
    const e = await addEntry({ date, meal, at: Date.now(), kind: 'quick', name: name.trim() || 'Quick add', portion: 'Estimate', kcal: Math.round(kcal), protein: protein ?? 0 });
    toast({ text: `${e.name} · ${fmtInt(e.kcal)} kcal`, action: { label: 'Undo', run: () => deleteEntry(e.id) } });
    closeSheet();
  };

  return (
    <Sheet title="Quick kcal" sub="For when you just want the number in">
      <MealPicker meal={meal} onChange={setMeal} />
      <label className="flabel">
        <span className="lbl">What was it? Optional</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Office samosa" />
      </label>
      <div className="grid2">
        <label className="flabel">
          <span className="lbl apri">Kcal</span>
          <DecField value={kcal} onChange={setKcal} placeholder="0" autoFocus />
        </label>
        <label className="flabel">
          <span className="lbl lav">Protein g</span>
          <DecField value={protein} onChange={setProtein} placeholder="0" />
        </label>
      </div>
      <button type="button" className="btn lg block" disabled={kcal === undefined} onClick={add}>
        Add to {MEAL_NAMES[meal].toLowerCase()}
      </button>
    </Sheet>
  );
}

export function MealPicker({ meal, onChange }: { meal: Meal; onChange: (m: Meal) => void }) {
  return <Seg options={MEALS.map((m) => ({ id: m, label: MEAL_NAMES[m] }))} value={meal} onChange={onChange} />;
}

/** Change or remove a logged entry. */
export function EntrySheet() {
  const { params } = useRoute();
  const id = params.get('id') ?? '';
  const entry = useLiveQuery(async () => (await db.entries.get(id)) ?? null, [id]);
  const foods = useFoods();
  if (entry === undefined || !foods) return <Sheet title="Entry">{null}</Sheet>;
  if (entry === null) return <Sheet title="Entry">Already removed.</Sheet>;
  const food = entry.foodId ? foods.find((f) => f.id === entry.foodId) : undefined;
  return <EntryInner key={entry.id} entry={entry} food={food} />;
}

function EntryInner({ entry, food }: { entry: FoodEntry; food?: Food }) {
  const toast = useToast();
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [amount, setAmount] = useState<number>(entry.amount ?? 1);
  const [kcal, setKcal] = useState<number | undefined>(entry.kcal);
  const [protein, setProtein] = useState<number | undefined>(entry.protein);
  const scalable = !!food && entry.kind === 'food';
  const v = scalable ? valuesFor(food!, amount) : { kcal: kcal ?? 0, protein: protein ?? 0 };

  const save = async () => {
    await updateEntry(entry.id, {
      meal,
      ...(scalable ? { amount, portion: portionFor(food!, amount), kcal: v.kcal, protein: v.protein } : { kcal: Math.round(kcal ?? 0), protein: protein ?? 0 }),
    });
    closeSheet();
  };
  const remove = async () => {
    const gone = await deleteEntry(entry.id);
    closeSheet();
    if (gone) toast({ text: `${gone.name} removed`, action: { label: 'Undo', run: () => addEntry(gone) } });
  };

  return (
    <Sheet title={entry.name} sub={entry.kind === 'free' ? 'Free meal' : entry.kind === 'drink' ? 'Drink' : entry.portion}>
      <MealPicker meal={meal} onChange={setMeal} />
      {scalable ? (
        <>
          <Stepper value={amount} onChange={setAmount} step={stepFor(food!)} min={0} max={5000} decimals={food!.unit === 'serving' ? 1 : 0} unit={unitLabel(food!, amount)} size={30} label="Amount" />
          <div className="row t15 tn" style={{ justifyContent: 'center', gap: 16 }}>
            <span className="apri">{fmtInt(v.kcal)} kcal</span>
            <span className="lav">{Math.round(v.protein)} g protein</span>
          </div>
        </>
      ) : (
        <div className="grid2">
          <label className="flabel">
            <span className="lbl apri">Kcal</span>
            <DecField value={kcal} onChange={setKcal} />
          </label>
          <label className="flabel">
            <span className="lbl lav">Protein g</span>
            <DecField value={protein} onChange={setProtein} />
          </label>
        </div>
      )}
      <button type="button" className="btn lg block" onClick={save}>
        Save
      </button>
      <button type="button" className="btn danger block" onClick={remove}>
        Remove entry
      </button>
      {food && (
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => replaceSheet('food-new', { id: food.id })}>
          Edit {food.name} in my foods
        </button>
      )}
    </Sheet>
  );
}
