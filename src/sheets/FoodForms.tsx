import { useEffect, useRef, useState } from 'react';
import { barcodeSupported, lookupBarcode, scanBarcode, type ScannedFood } from '../sources/barcode';
import { fmtInt, fmtTime } from '../domain/format';
import { atOn, minutesSinceMidnight } from '../domain/dates';
import { mealForTime, numbersPatch, per100FromTotal, portionFor, stepFor, unitLabel, valuesFor } from '../domain/foods';
import { impossibleDensity, isWeighedMeat, lightDishWarning, portionWarning, similarFood } from '../domain/foodChecks';
import { MEAL_NAMES, MEALS, type Food, type FoodEntry, type FoodUnit, type Meal, type Settings } from '../domain/types';
import { addEntry, archiveFood, deleteEntry, mergeFoods, patchSettings, saveFood, updateEntry } from '../db/actions';
import { askConfirm } from '../ui/Confirm';
import { okToAdd } from '../ui/doubleTap';
import { uid } from '../db/db';
import { db } from '../db/db';
import { useFoods, useSettings } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { closeSheet, replaceSheet, useRoute } from '../router';
import { DecField, Seg, Stepper, SwitchRow } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { QuickKcalForm, type QuickKcal as QuickKcalValues } from './QuickKcalForm';
import { useToast } from '../ui/Toasts';
import { DateChip, useLogDate } from '../ui/DateChip';

/** Create a food, or edit one with ?id=. */
export function FoodForm() {
  const { params } = useRoute();
  const foods = useFoods();
  const settings = useSettings();
  const id = params.get('id');
  if (!foods || !settings) return <Sheet title="Create a food">{null}</Sheet>;
  const existing = id ? foods.find((f) => f.id === id) : undefined;
  return <FoodFormInner key={id ?? 'new'} existing={existing} initialName={params.get('name') ?? ''} homes={settings.homes} meal={params.get('meal')} categories={settings.foodCategories ?? []} />;
}

type Category = NonNullable<Settings['foodCategories']>[number];
const DEFAULT_SIZES = { s: 0.7, m: 1, l: 1.4 };

function FoodFormInner({ existing, initialName, homes, meal, categories }: { existing?: Food; initialName: string; homes: { id: string; name: string }[]; meal: string | null; categories: Category[] }) {
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
  const [sized, setSized] = useState(!!existing?.sizes);
  const [cats, setCats] = useState<Set<string>>(() => new Set(categories.filter((c) => existing && c.foodIds.includes(existing.id)).map((c) => c.id)));
  const [newCat, setNewCat] = useState('');
  const [weighed, setWeighed] = useState<'raw' | 'cooked' | undefined>(existing?.weighed);
  // "For this amount": the totals for what was eaten; the app divides them into per 100.
  const [by, setBy] = useState<'label' | 'total'>('label');
  const [amt, setAmt] = useState<number | undefined>();
  const [totKcal, setTotKcal] = useState<number | undefined>();
  const [totProtein, setTotProtein] = useState<number | undefined>();

  const byWeight = unit === 'g' || unit === 'ml';
  const totals = byWeight && by === 'total';
  const fromTotal = totals && totKcal !== undefined ? per100FromTotal(amt ?? 0, totKcal, totProtein ?? 0) : undefined;
  const kcalV = totals ? fromTotal?.kcal : kcal;
  const proteinV = totals ? fromTotal?.protein : protein;
  const usualV = usual ?? (totals ? amt : undefined);
  const per = byWeight ? 100 : 1;
  const perLabel = unit === 'g' ? 'per 100 g' : unit === 'ml' ? 'per 100 ml' : unit === 'piece' ? `per ${unitName || 'piece'}` : 'per serving';
  const allFoods = useFoods();
  const draft = { name: name.trim(), unit, per, kcal: kcalV ?? 0, protein: proteinV ?? 0, defaultAmount: usualV ?? 0 };
  const impossible = kcalV !== undefined && impossibleDensity(draft);
  const large = kcalV !== undefined && (usualV ?? 0) > 0 ? portionWarning(draft) : null;
  const twin = name.trim() ? similarFood(name, (allFoods ?? []).filter((f) => f.id !== existing?.id)) : null;
  const light = kcalV !== undefined && lightDishWarning(draft);
  const meat = isWeighedMeat(draft);
  const ok = name.trim() && kcalV !== undefined && kcalV >= 0 && (proteinV ?? 0) >= 0 && (usualV ?? 0) > 0 && !impossible && (!meat || !!weighed);

  /** Turns a large gram or piece portion into one serving of the same calories. */
  const makeOneServing = () => {
    if (!large) return;
    const p = (proteinV ?? 0) * ((usualV ?? 0) / per);
    setServing(portionFor({ id: '', createdAt: 0, ...draft, unitName: unitName || 'piece' } as Food, usualV!));
    setUnit('serving');
    setBy('label');
    setKcal(large.kcal);
    setProtein(Math.round(p * 10) / 10);
    setUsual(1);
  };

  const save = async () => {
    if (!ok) return;
    const food = await saveFood({
      ...(existing ?? {}),
      name: name.trim(),
      unit,
      per,
      kcal: kcalV!,
      protein: proteinV ?? 0,
      defaultAmount: usualV!,
      unitName: unit === 'piece' ? unitName.trim() || 'piece' : undefined,
      servingDesc: unit === 'serving' ? serving.trim() || undefined : undefined,
      note: note.trim() || undefined,
      home,
      presets: byWeight ? Array.from(new Set([100, usualV!, usualV! * 2])).sort((a, b) => a - b).slice(0, 3) : existing?.presets,
      sizes: sized ? existing?.sizes ?? DEFAULT_SIZES : undefined,
      weighed: meat ? weighed : undefined,
    });
    const fresh = newCat.trim();
    await patchSettings((st) => {
      const all = [...(st.foodCategories ?? [])];
      if (fresh) all.push({ id: uid(), name: fresh, foodIds: [] });
      const wanted = new Set(cats);
      if (fresh) wanted.add(all[all.length - 1].id);
      return { foodCategories: all.map((c) => ({ ...c, foodIds: wanted.has(c.id) ? [...new Set([...c.foodIds, food.id])] : c.foodIds.filter((x) => x !== food.id) })) };
    });
    toast({ text: existing ? `${food.name} updated` : `${food.name} saved to your foods` });
    if (existing) closeSheet();
    else replaceSheet('addfood', { food: food.id, ...(meal ? { meal } : {}) });
  };

  const merge = async (into: Food) => {
    if (!existing) return;
    const ok = await askConfirm({ title: `Merge ${existing.name} into ${into.name}?`, body: `Past entries move to ${into.name} and keep the numbers they were logged with. ${existing.name} leaves your foods.`, yes: 'Merge' });
    if (!ok) return;
    const n = await mergeFoods(existing.id, into.id);
    toast({ text: `Merged into ${into.name}`, sub: `${n} past entr${n === 1 ? 'y' : 'ies'} moved` });
    closeSheet();
  };

  const remove = async () => {
    if (!existing) return;
    await archiveFood(existing.id);
    toast({ text: `${existing.name} removed from your foods`, sub: 'Past entries keep their numbers.', action: { label: 'Undo', run: () => archiveFood(existing.id, false) } });
    closeSheet();
  };

  return (
    <Sheet title={existing ? 'Edit food' : 'Create a food'} tall>
      {!existing && barcodeSupported() && (
        <BarcodeScan
          onFound={(f) => {
            setName(f.name);
            setUnit(f.unit);
            setKcal(f.kcal);
            setProtein(f.protein);
            setUsual(f.defaultAmount);
          }}
        />
      )}
      <label className="flabel">
        <span className="lbl">Name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer bhurji" autoFocus={!existing} spellCheck autoCapitalize="sentences" />
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

      {byWeight && (
        <div className="flabel">
          <span className="lbl">The numbers you have are</span>
          <Seg
            options={[
              { id: 'label', label: `Per 100 ${unit}` },
              { id: 'total', label: 'For an amount' },
            ]}
            value={by}
            onChange={(v) => {
              setBy(v);
              // Carry what's typed across, so switching never loses it.
              if (v === 'total' && amt === undefined && kcal !== undefined) {
                setAmt(100);
                setTotKcal(kcal);
                setTotProtein(protein);
              } else if (v === 'label' && fromTotal) {
                setKcal(fromTotal.kcal);
                setProtein(fromTotal.protein);
              }
            }}
          />
        </div>
      )}
      {totals ? (
        <>
          <label className="flabel">
            <span className="lbl">Amount you ate ({unit})</span>
            <DecField value={amt} onChange={setAmt} placeholder="e.g. 330" />
          </label>
          <div className="grid2">
            <label className="flabel">
              <span className="lbl apri">Total kcal</span>
              <DecField value={totKcal} onChange={setTotKcal} placeholder="0" />
            </label>
            <label className="flabel">
              <span className="lbl lav">Total protein g</span>
              <DecField value={totProtein} onChange={setTotProtein} placeholder="0" />
            </label>
          </div>
          <div className="t14 q lh" role="status">
            {fromTotal ? (
              <>
                Saves as <span className="apri">{fmtInt(fromTotal.kcal)} kcal</span> · <span className="lav">{fromTotal.protein} g protein</span> per 100 {unit}.
              </>
            ) : (
              `Type the amount and its totals; the app works out per 100 ${unit}.`
            )}
          </div>
        </>
      ) : (
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
      )}

      <label className="flabel">
        <span className="lbl">Your usual amount ({unit === 'g' ? 'g' : unit === 'ml' ? 'ml' : unit === 'piece' ? unitName || 'pieces' : 'servings'})</span>
        <DecField value={usual} onChange={setUsual} placeholder={totals && amt ? String(amt) : byWeight ? '100' : '1'} />
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

      {impossible && (
        <div className="notice warn t14 lh" role="alert">
          That's more than pure fat (900 kcal per 100 {unit}). Check the number.
        </div>
      )}
      {meat && (
        <div className="flabel">
          <span className="lbl">The numbers are for meat weighed</span>
          <Seg options={[{ id: 'raw', label: 'Raw' }, { id: 'cooked', label: 'Cooked' }]} value={weighed ?? ('' as 'raw')} onChange={setWeighed} />
          <span className="t13 q lh">Raw meat weighs about a third more than cooked. Logging asks which you weighed, and converts.</span>
        </div>
      )}
      {light && !impossible && (
        <div className="notice warn t14 lh" role="alert">
          {fmtInt(((kcalV ?? 0) / per) * 100)} kcal per 100 {unit} is a lot for {name.trim().toLowerCase()}: most are under 250. Check it's per 100 {unit}, not per bowl.
        </div>
      )}
      {large && !impossible && (
        <div className="notice t14 lh" role="status">
          {name.trim() || 'This'} at {portionFor({ id: '', createdAt: 0, ...draft, unitName: unitName || 'piece' } as Food, usualV!)} is {fmtInt(large.kcal)} kcal. Is that right?
          {unit !== 'serving' && (
            <button type="button" className="chip sm" style={{ marginTop: 8 }} onClick={makeOneServing}>
              Make it 1 serving
            </button>
          )}
        </div>
      )}
      {twin && (
        <div className="notice t14 lh" role="status">
          You already have {twin.name} ({fmtInt(twin.kcal)} kcal {twin.unit === 'g' || twin.unit === 'ml' ? `per 100 ${twin.unit}` : `per ${twin.unitName ?? twin.unit}`}).
          {existing ? (
            <button type="button" className="chip sm" style={{ marginTop: 8 }} onClick={() => void merge(twin)}>
              Merge into {twin.name}
            </button>
          ) : (
            <button type="button" className="chip sm" style={{ marginTop: 8 }} onClick={() => replaceSheet('addfood', { food: twin.id, ...(meal ? { meal } : {}) })}>
              Use that one
            </button>
          )}
        </div>
      )}

      <SwitchRow title="Comes in sizes" sub="Small, regular and large, for outside dishes" checked={sized} onChange={setSized} />

      <div className="flabel">
        <span className="lbl">Categories</span>
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip sm${cats.has(c.id) ? ' on' : ''}`}
              aria-pressed={cats.has(c.id)}
              onClick={() => {
                const n = new Set(cats);
                if (n.has(c.id)) n.delete(c.id);
                else n.add(c.id);
                setCats(n);
              }}
            >
              {c.name}
            </button>
          ))}
          <input className="field sm" style={{ flex: '1 1 140px', minHeight: 44 }} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" aria-label="New category" spellCheck autoCapitalize="sentences" />
        </div>
      </div>

      {ok && (
        <div className="t13 q">
          Usual portion: {portionFor({ id: '', createdAt: 0, name, unit, per, kcal: kcalV!, protein: proteinV ?? 0, unitName: unitName || 'piece', servingDesc: serving || undefined, note: note || undefined, defaultAmount: usualV! }, usualV!)} ·{' '}
          <span className="apri">{fmtInt(((kcalV ?? 0) * usualV!) / per)} kcal</span> · <span className="lav">{Math.round(((proteinV ?? 0) * usualV!) / per)} g</span>
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
  const toast = useToast();
  const [date, setDate] = useLogDate();
  const [meal, setMeal] = useState<Meal>((params.get('meal') as Meal) || mealForTime());
  const add = async (q: QuickKcalValues) => {
    if (!(await okToAdd({ date, name: q.name }))) return;
    const unknown = q.protein === 'unknown';
    const e = await addEntry({ date, meal, at: Date.now(), kind: 'quick', name: q.name, portion: 'Estimate', kcal: q.kcal, protein: unknown ? 0 : (q.protein as number), ...(unknown ? { proteinUnknown: true } : {}) });
    toast({ text: `${e.name} · ${fmtInt(e.kcal)} kcal`, sub: `Added to ${MEAL_NAMES[meal].toLowerCase()}`, action: { label: 'Undo', run: () => deleteEntry(e.id) } });
    closeSheet();
  };

  return (
    <Sheet title="Quick kcal" sub="Just the numbers">
      <DateChip value={date} onChange={setDate} />
      <MealPicker meal={meal} onChange={setMeal} />
      <QuickKcalForm onAdd={(q) => void add(q)} autoFocus />
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
  const [name, setName] = useState(entry.name);
  const [eaten, setEaten] = useState(() => {
    if (entry.eatenAt === undefined) return '';
    const minutes = minutesSinceMidnight(entry.eatenAt);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState<number>(entry.amount ?? 1);
  const [kcal, setKcal] = useState<number | undefined>(entry.kcal);
  const [protein, setProtein] = useState<number | undefined>(entry.proteinUnknown ? undefined : entry.protein);
  const [numbersEdited, setNumbersEdited] = useState(false);
  const scalable = !!food && entry.kind === 'food';
  // Own numbers: this entry's kcal and protein typed by hand; the saved food stays as it is.
  const [own, setOwn] = useState(scalable && !!entry.own);
  const v = scalable && !own ? valuesFor(food!, amount) : { kcal: kcal ?? 0, protein: protein ?? 0 };

  const save = async () => {
    await updateEntry(entry.id, {
      meal,
      ...(entry.bridgeMealId ? {
        name: name.trim() || entry.name,
        eatenAt: eaten ? atOn(entry.date, Number(eaten.slice(0, 2)) * 60 + Number(eaten.slice(3))) : undefined,
      } : {}),
      ...(scalable ? { amount, portion: portionFor(food!, amount) } : {}),
      ...(entry.bridgeMealId && !numbersEdited ? {} : scalable && !own
        ? { kcal: v.kcal, protein: v.protein, own: undefined }
        : // A quick add keeps "not sure" until a protein is typed.
          entry.proteinUnknown && protein === undefined
          ? { kcal: Math.round(kcal ?? 0) }
          : numbersPatch(kcal ?? 0, protein ?? 0, scalable)),
    });
    closeSheet();
  };
  const remove = async () => {
    const gone = await deleteEntry(entry.id);
    closeSheet();
    if (gone) toast({ text: `${gone.name} removed`, action: { label: 'Undo', run: () => addEntry(gone) } });
  };
  const numbers = (
    <div className="grid2">
      <label className="flabel">
        <span className="lbl apri">Kcal</span>
        <DecField value={kcal} onChange={(value) => { setKcal(value); setNumbersEdited(true); }} />
      </label>
      <label className="flabel">
        <span className="lbl lav">Protein g</span>
        <DecField value={protein} onChange={(value) => { setProtein(value); setNumbersEdited(true); }} placeholder={entry.proteinUnknown ? 'Not sure' : undefined} />
      </label>
    </div>
  );

  return (
    <Sheet title={entry.name} sub={entry.kind === 'free' ? 'Free meal' : entry.kind === 'drink' ? 'Drink' : entry.portion}>
      {entry.bridgeMealId && <>
        <label className="flabel"><span className="lbl">Name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="flabel">
          <span className="lbl">Eaten time (optional)</span>
          <input className="field" type="time" value={eaten} onChange={(e) => setEaten(e.target.value)} />
          <span className="t13 q">Logged in Bevel at {fmtTime(entry.at)}</span>
        </label>
      </>}
      <MealPicker meal={meal} onChange={setMeal} />
      {scalable ? (
        <>
          <Stepper value={amount} onChange={setAmount} step={stepFor(food!)} min={0} max={5000} decimals={food!.unit === 'serving' ? 1 : 0} unit={unitLabel(food!, amount)} size={30} label="Amount" />
          {own ? (
            <>
              {numbers}
              <span className="t14 q lh">Only this entry changes. {food!.name} in your foods stays as it is.</span>
              <button type="button" className="link" style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={() => setOwn(false)}>
                Use {food!.name}’s numbers again
              </button>
            </>
          ) : (
            <>
              <div className="row t15 tn" style={{ justifyContent: 'center', gap: 16 }}>
                <span className="apri">{fmtInt(v.kcal)} kcal</span>
                <span className="lav">{Math.round(v.protein)} g protein</span>
              </div>
              <button
                type="button"
                className="btn ghost block"
                onClick={() => {
                  setKcal(v.kcal);
                  setProtein(v.protein);
                  setOwn(true);
                }}
              >
                Change kcal or protein for this entry
              </button>
            </>
          )}
        </>
      ) : (
        numbers
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

/** Scan a packet's barcode and fill the form from Open Food Facts. Offered only online. */
function BarcodeScan({ onFound }: { onFound: (f: ScannedFood) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<AbortController | null>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'looking' | 'missing' | 'found'>('idle');
  useEffect(() => () => stop.current?.abort(), []);
  const start = async () => {
    stop.current = new AbortController();
    setState('scanning');
    try {
      const code = await scanBarcode(video.current!, stop.current.signal);
      if (!code) return setState('idle');
      setState('looking');
      const f = await lookupBarcode(code);
      if (f) {
        onFound(f);
        setState('found');
      } else setState('missing');
    } catch {
      setState('missing');
    }
  };
  return (
    <div className="col gap8">
      <video ref={video} className="scan-video" muted playsInline hidden={state !== 'scanning'} />
      {state === 'scanning' ? (
        <button type="button" className="btn ghost block" onClick={() => stop.current?.abort()}>
          Stop scanning
        </button>
      ) : (
        <button type="button" className="btn ghost block" onClick={start} disabled={state === 'looking'}>
          {state === 'looking' ? 'Looking it up…' : 'Scan a barcode'}
        </button>
      )}
      {state === 'missing' && <div className="t13 q">Not found. Type the numbers from the label instead.</div>}
      {state === 'found' && <div className="t13 q">Filled from Open Food Facts. Check the numbers against the label.</div>}
    </div>
  );
}
