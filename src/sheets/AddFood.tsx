import { useMemo, useRef, useState } from 'react';
import { addDays, atOn, parseDay } from '../domain/dates';
import { fmtInt, fmtTime } from '../domain/format';
import { eatenAtFor, mealForTime, mealTimesFor, portionFor, recentFoodIds, stepFor, unitLabel, usageOf, valuesFor } from '../domain/foods';
import { MEAL_NAMES, MEALS, type Food, type Meal } from '../domain/types';
import { addEntries, addEntry, deleteEntry, saveFood } from '../db/actions';
import { isWeighedMeat, toFoodBasis } from '../domain/foodChecks';
import { okToAdd } from '../ui/doubleTap';
import { placeFor } from '../domain/places';
import { SIZE_NAMES, sizeAmount, sizeValues, usualsFor } from '../domain/usuals';
import { useAllDays, useEntriesBetween, useFoods, useSettings, useToday } from '../db/hooks';
import { MealRow } from './Meals';
import { patchSettings } from '../db/actions';
import { replaceSheet, useRoute } from '../router';
import { Seg, Stepper, TimeTile } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { askConfirm } from '../ui/Confirm';
import { DateChip, useLogDate } from '../ui/DateChip';

/** Each own category tab in its own colour. */
const CAT_INKS = ['var(--protein)', 'var(--kcal)', 'var(--steps)', 'var(--blue)', 'var(--gold)', 'var(--pearl)'];

type Tab = 'recent' | 'frequent' | 'mine' | 'meals' | `cat:${string}`;

export function AddFood() {
  const { params } = useRoute();
  const today = useToday();
  const [date, setDate] = useLogDate();
  const foods = useFoods();
  const history = useEntriesBetween(addDays(today, -90), today);
  const days = useAllDays();
  const settings = useSettings();
  const toast = useToast();

  const [meal, setMeal] = useState<Meal>((params.get('meal') as Meal) || mealForTime());
  const [query, setQuery] = useState('');
  const [eaten, setEaten] = useState<number | undefined>();
  const [changeTime, setChangeTime] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(params.get('food'));
  const [amount, setAmount] = useState<number | null>(null);
  // Meat: what the scale weighed, raw or cooked. Defaults to the food's own basis.
  const [weighedAs, setWeighedAs] = useState<'raw' | 'cooked' | null>(null);
  // Plate mode: several foods, each with its own amount, added in one go.
  const [plate, setPlate] = useState<Map<string, number> | null>(null);

  const usage = useMemo(() => usageOf(history ?? []), [history]);
  const recent = useMemo(() => recentFoodIds(history ?? [], 15), [history]);
  // Pick the opening tab once, so adding a food doesn't flip the list under your thumb.
  const firstTab = useRef<Tab | null>(null);
  if (history && firstTab.current === null) firstTab.current = recent.length ? 'recent' : 'mine';

  if (!foods || !history || !days || !settings) return <Sheet title="Add food">{null}</Sheet>;

  const home = days.find((d) => d.date === date)?.home;
  const live = foods.filter((f) => !f.archived);
  const byId = new Map(live.map((f) => [f.id, f]));
  const activeTab: Tab = tab ?? firstTab.current ?? 'mine';
  const homeRank = (f: Food) => (!f.home ? 1 : f.home === home ? 0 : 2);
  let list: Food[];
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    list = live.filter((f) => f.name.toLowerCase().includes(q)).sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  } else if (activeTab === 'recent') {
    list = recent.map((id) => byId.get(id)).filter((f): f is Food => !!f);
  } else if (activeTab === 'frequent') {
    list = [...live].filter((f) => usage.get(f.id)).sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0)).slice(0, 20);
  } else if (activeTab.startsWith('cat:')) {
    const cat = (settings.foodCategories ?? []).find((c) => `cat:${c.id}` === activeTab);
    list = (cat?.foodIds ?? []).map((id) => byId.get(id)).filter((f): f is Food => !!f);
  } else if (activeTab === 'mine') {
    list = [...live].sort((a, b) => homeRank(a) - homeRank(b) || a.name.localeCompare(b.name));
  } else {
    list = [];
  }

  const dayMap = new Map(days.map((d) => [d.date, d]));
  const place = placeFor(dayMap.get(date), settings);
  const usuals = usualsFor(meal, place.id, parseDay(date).getDay(), history, live, dayMap, date);
  const picked = pickedId ? byId.get(pickedId) : undefined;
  const amt = picked ? amount ?? picked.defaultAmount : 0;
  const meat = !!picked && isWeighedMeat(picked);
  const weighed = weighedAs ?? picked?.weighed ?? 'cooked';
  // The amount in the food's own basis: 200 g weighed raw of a cooked-basis food logs as 150 g.
  const basisAmt = picked && meat ? toFoodBasis(picked, amt, weighed) : amt;

  const log = async (food: Food, a: number, weighedNote?: string) => {
    if (!(await okToAdd({ date, foodId: food.id, name: food.name }))) return;
    const v = valuesFor(food, a);
    const e = await addEntry({ date, meal, at: Date.now(), kind: 'food', foodId: food.id, name: food.name, amount: a, portion: portionFor(food, a) + (weighedNote ?? ''), ...v, ...(eaten !== undefined ? { eatenAt: atOn(date, eaten) } : {}) });
    toast({ text: `${food.name} · ${fmtInt(v.kcal)} kcal · ${Math.round(v.protein)} g`, sub: `Added to ${MEAL_NAMES[meal].toLowerCase()}`, action: { label: 'Undo', run: () => deleteEntry(e.id) } });
    setPickedId(null);
    setAmount(null);
    setWeighedAs(null);
  };

  /** In plate mode a tap puts the food on the plate; otherwise it is logged at its usual amount. */
  const tapAdd = (food: Food) => {
    if (!plate) return void log(food, food.defaultAmount);
    const next = new Map(plate);
    next.set(food.id, (next.get(food.id) ?? 0) + food.defaultAmount);
    setPlate(next);
  };
  const plateItems = plate ? [...plate].map(([id, a]) => ({ food: byId.get(id)!, amount: a })).filter((x) => x.food) : [];
  const plateTotal = plateItems.reduce(
    (t, x) => {
      const v = valuesFor(x.food, x.amount);
      return { kcal: t.kcal + v.kcal, protein: t.protein + v.protein };
    },
    { kcal: 0, protein: 0 },
  );
  const setPlateAmount = (id: string, v: number) => {
    const n = new Map(plate);
    if (v <= 0) n.delete(id);
    else n.set(id, v);
    setPlate(n);
  };
  const logPlate = async () => {
    const at = Date.now();
    const added = await addEntries(plateItems.map(({ food, amount: a }) => ({ date, meal, at, kind: 'food' as const, foodId: food.id, name: food.name, amount: a, portion: portionFor(food, a), ...valuesFor(food, a), ...(eaten !== undefined ? { eatenAt: atOn(date, eaten) } : {}) })));
    toast({ text: `${added.length} food${added.length === 1 ? '' : 's'} · ${fmtInt(plateTotal.kcal)} kcal · ${Math.round(plateTotal.protein)} g`, sub: `Added to ${MEAL_NAMES[meal].toLowerCase()}`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
    setPlate(null);
  };

  return (
    <Sheet
      tall
      head={
        <div className="col" style={{ gap: 10 }}>
          <div className="h2" style={{ fontSize: 24 }}>
            Add food
          </div>
          <DateChip value={date} onChange={setDate} />
          <Seg options={MEALS.map((m) => ({ id: m, label: MEAL_NAMES[m] }))} value={meal} onChange={setMeal} />
        </div>
      }
    >
      <div className="row base t13">
        <span className="q">
          eaten <span style={{ color: 'var(--kcal)' }}>{fmtTime(eaten !== undefined ? atOn(date, eaten) : eatenAtFor(date, meal, place, settings))}</span>
        </span>
        <button type="button" className="link t13" style={{ minHeight: 32 }} aria-expanded={changeTime} onClick={() => setChangeTime(!changeTime)}>
          change
        </button>
      </div>
      {changeTime && <TimeTile label="Eaten at" minutes={eaten ?? mealTimesFor(settings, place)[meal]} onChange={setEaten} />}
      {!query && usuals.length > 0 && (
        <div className="col gap8">
          <div className="lbl" style={{ color: 'var(--kcal)' }}>
            Usual for {MEAL_NAMES[meal].toLowerCase()} at {place.name}
          </div>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
            {usuals.map((f) => (
              <button key={f.id} type="button" style={{ color: (f.protein * 4) / Math.max(f.kcal, 1) >= 0.25 ? 'var(--protein)' : 'var(--kcal)', borderColor: 'color-mix(in srgb, currentColor 40%, transparent)' }} className="chip sm" aria-label={`${plate ? 'Put on the plate' : 'Add'}: ${f.name}, ${portionFor(f, f.defaultAmount)}`} onClick={() => tapAdd(f)}>
                + {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {plate && (
        <div className="plate">
          <div className="row base">
            <div className="lbl">On the plate</div>
            <div className="t14 tn">
              <span className="apri">{fmtInt(plateTotal.kcal)}</span> · <span className="lav">{Math.round(plateTotal.protein)} g</span>
            </div>
          </div>
          {plateItems.length === 0 && <div className="t13 q">Tap foods below to put them on the plate.</div>}
          {plateItems.map(({ food, amount: a }) => (
            <div key={food.id} className="col gap4">
              <div className="row base">
                <span className="t15">{food.name}</span>
                <span className="t12 q">{portionFor(food, a)}</span>
              </div>
              <Stepper value={a} onChange={(v) => setPlateAmount(food.id, v)} step={stepFor(food)} min={0} max={5000} decimals={food.unit === 'serving' ? 1 : 0} unit={unitLabel(food, a)} size={22} label={`Amount of ${food.name}`} />
            </div>
          ))}
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn ghost sm" onClick={() => setPlate(null)}>
              Cancel
            </button>
            <button type="button" className="btn grow" disabled={!plateItems.length} onClick={logPlate}>
              Add plate to {MEAL_NAMES[meal].toLowerCase()}
            </button>
          </div>
        </div>
      )}

      <label className="search">
        <span className="sr">Search your foods</span>
        <Icon name="search" size={18} stroke={1.8} color="var(--dim)" />
        <input className="field" placeholder="Search your foods" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {!query && (
        <Seg
          options={[
            { id: 'recent', label: 'Recent' },
            { id: 'frequent', label: 'Frequent' },
            { id: 'mine', label: 'My foods' },
            { id: 'meals', label: 'Meals' },
          ]}
          value={activeTab}
          onChange={setTab}
        />
      )}
      {!query && (
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {(settings.foodCategories ?? []).map((c, i) => (
            <button key={c.id} type="button" className={`chip sm${activeTab === `cat:${c.id}` ? ' on' : ''}`} style={activeTab === `cat:${c.id}` ? { background: CAT_INKS[i % CAT_INKS.length], borderColor: CAT_INKS[i % CAT_INKS.length] } : { color: CAT_INKS[i % CAT_INKS.length] }} aria-pressed={activeTab === `cat:${c.id}`} onClick={() => setTab(`cat:${c.id}`)}>
              {c.name}
            </button>
          ))}
          {!plate && (
            <button type="button" className="chip sm" onClick={() => setPlate(new Map())}>
              Plate: add several
            </button>
          )}
        </div>
      )}

      {picked && (
        <div className="picked">
          <div className="row base">
            <div className="col gap2" style={{ minWidth: 0 }}>
              <div className="t17">{picked.name}</div>
              <div className="t13 q">{portionFor(picked, amt)}</div>
            </div>
            <div className="right tn">
              <div className="t16 apri">{fmtInt(valuesFor(picked, basisAmt).kcal)} kcal</div>
              <div className="t13 lav">{Math.round(valuesFor(picked, basisAmt).protein)} g protein</div>
            </div>
          </div>
          <Stepper
            value={amt}
            onChange={setAmount}
            step={stepFor(picked)}
            min={0}
            max={5000}
            decimals={picked.unit === 'serving' ? 1 : 0}
            unit={unitLabel(picked, amt)}
            size={30}
            label={`Amount of ${picked.name}`}
          />
          {picked.sizes && (
            <div className="grid3" style={{ gap: 8 }} role="radiogroup" aria-label="Size">
              {(['s', 'm', 'l'] as const).map((z) => {
                const a = sizeAmount(picked, z);
                return (
                  <button key={z} type="button" role="radio" aria-checked={amt === a} className={`chip sm${amt === a ? ' on' : ''}`} onClick={() => setAmount(a)}>
                    {SIZE_NAMES[z]} · {fmtInt(sizeValues(picked, z).kcal)}
                  </button>
                );
              })}
            </div>
          )}
          {!picked.sizes && picked.presets && picked.presets.length > 0 && (
            <div className="grid3" style={{ gap: 8 }}>
              {picked.presets.slice(0, 3).map((p) => (
                <button key={p} type="button" className={`chip sm${amt === p ? ' on' : ''}`} style={amt === p ? { background: 'transparent', color: 'var(--text)', borderColor: 'var(--text)', fontWeight: 400 } : { color: 'var(--quiet)' }} onClick={() => setAmount(p)}>
                  {p} {unitLabel(picked, p)}
                </button>
              ))}
            </div>
          )}
          {meat && !picked.weighed && (
            <div className="notice t14 lh" role="group" aria-label="Raw or cooked">
              Are {picked.name}’s numbers for raw or cooked weight? Raw meat weighs about a third more, so it changes the count.
              <div className="row" style={{ gap: 8, marginTop: 8, justifyContent: 'flex-start' }}>
                <button type="button" className="chip sm" onClick={() => void saveFood({ ...picked, weighed: 'raw' })}>
                  Raw
                </button>
                <button type="button" className="chip sm" onClick={() => void saveFood({ ...picked, weighed: 'cooked' })}>
                  Cooked
                </button>
              </div>
            </div>
          )}
          {meat && picked.weighed && (
            <div className="col gap6">
              <span className="lbl">You weighed it</span>
              <Seg options={[{ id: 'raw', label: 'Raw' }, { id: 'cooked', label: 'Cooked' }]} value={weighed} onChange={setWeighedAs} />
              {basisAmt !== amt && (
                <span className="t13 q lh">
                  {amt} g {weighed} ≈ {basisAmt} g {picked.weighed}, which is what its numbers are for.
                </span>
              )}
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn ghost sm" onClick={() => setPickedId(null)}>
              Cancel
            </button>
            <button type="button" className="btn grow" disabled={amt <= 0} onClick={() => log(picked, basisAmt, basisAmt !== amt ? ` (weighed ${amt} g ${weighed})` : undefined)}>
              Add to {MEAL_NAMES[meal].toLowerCase()}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'meals' && !query && (
        <div className="col">
          {(settings.meals ?? []).map((m) => (
            <MealRow
              key={m.id}
              meal={m}
              foods={live}
              date={date}
              slot={meal}
              onRemove={async () => {
                if (await askConfirm({ title: `Remove the saved meal “${m.name}”?`, body: 'Logged entries stay.', yes: 'Remove' })) void patchSettings((s) => ({ meals: (s.meals ?? []).filter((x) => x.id !== m.id) }));
              }}
            />
          ))}
          {!(settings.meals ?? []).length && <div className="t14 q lh" style={{ padding: '10px 2px' }}>No saved meals yet. On Food today, tap “Save as a meal” under any meal with two or more foods.</div>}
        </div>
      )}

      <div className="col" style={activeTab === 'meals' && !query ? { display: 'none' } : undefined}>
        {list.map((f) => {
          const v = valuesFor(f, f.defaultAmount);
          return (
            <div key={f.id} className="food-row">
              <button
                type="button"
                className="col gap2 grow tap44"
                style={{ textAlign: 'left' }}
                onClick={() => {
                  setPickedId(f.id);
                  setAmount(null);
                }}
              >
                <span className="t16">{f.name}</span>
                <span className="t13 q">{portionFor(f, f.defaultAmount)}</span>
              </button>
              <div className="row" style={{ gap: 14 }}>
                <div className="t14 tn right">
                  {fmtInt(v.kcal)}
                  <div className="t12 lav">{Math.round(v.protein)} g</div>
                </div>
                <button type="button" className="round sm" aria-label={`${plate ? 'Put on the plate' : 'Add'}: ${f.name}`} onClick={() => tapAdd(f)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="t14 q lh" style={{ padding: '10px 2px' }}>
            {query
              ? `No saved food called “${query}”.`
              : activeTab === 'mine'
                ? 'No saved foods yet. Create the ones you eat most; after that they’re one tap away.'
                : 'Nothing here yet. Foods you log show up here.'}
          </div>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 28 }}>
        <button type="button" className="link" onClick={() => replaceSheet('food-new', { ...(query ? { name: query } : {}), meal, d: date })}>
          Create a food
        </button>
        <button type="button" className="link" onClick={() => replaceSheet('quick', { meal, d: date })}>
          Quick kcal
        </button>
      </div>
    </Sheet>
  );
}
