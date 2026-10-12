import { useMemo, useRef, useState } from 'react';
import { addDays } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { mealForTime, portionFor, recentFoodIds, stepFor, unitLabel, usageOf, valuesFor } from '../domain/foods';
import { MEAL_NAMES, MEALS, type Food, type Meal } from '../domain/types';
import { addEntry, deleteEntry } from '../db/actions';
import { useAllDays, useEntriesBetween, useFoods, useSettings, useToday } from '../db/hooks';
import { MealRow } from './Meals';
import { patchSettings } from '../db/actions';
import { replaceSheet, useRoute } from '../router';
import { Seg, Stepper } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { askConfirm } from '../ui/Confirm';

type Tab = 'recent' | 'frequent' | 'mine' | 'meals';

export function AddFood() {
  const { params } = useRoute();
  const today = useToday();
  const date = params.get('d') ?? today;
  const foods = useFoods();
  const history = useEntriesBetween(addDays(today, -90), today);
  const days = useAllDays();
  const settings = useSettings();
  const toast = useToast();

  const [meal, setMeal] = useState<Meal>((params.get('meal') as Meal) || mealForTime());
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(params.get('food'));
  const [amount, setAmount] = useState<number | null>(null);

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
  } else if (activeTab === 'mine') {
    list = [...live].sort((a, b) => homeRank(a) - homeRank(b) || a.name.localeCompare(b.name));
  } else {
    list = [];
  }

  const picked = pickedId ? byId.get(pickedId) : undefined;
  const amt = picked ? amount ?? picked.defaultAmount : 0;

  const log = async (food: Food, a: number) => {
    const v = valuesFor(food, a);
    const e = await addEntry({ date, meal, at: Date.now(), kind: 'food', foodId: food.id, name: food.name, amount: a, portion: portionFor(food, a), ...v });
    toast({ text: `${food.name} · ${fmtInt(v.kcal)} kcal · ${Math.round(v.protein)} g`, sub: `Added to ${MEAL_NAMES[meal].toLowerCase()}`, action: { label: 'Undo', run: () => deleteEntry(e.id) } });
    setPickedId(null);
    setAmount(null);
  };

  return (
    <Sheet
      tall
      head={
        <div className="col" style={{ gap: 10 }}>
          <div className="h2" style={{ fontSize: 24 }}>
            Add food
          </div>
          <Seg options={MEALS.map((m) => ({ id: m, label: MEAL_NAMES[m] }))} value={meal} onChange={setMeal} />
        </div>
      }
    >
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

      {picked && (
        <div className="picked">
          <div className="row base">
            <div className="col gap2" style={{ minWidth: 0 }}>
              <div className="t17">{picked.name}</div>
              <div className="t13 q">{portionFor(picked, amt)}</div>
            </div>
            <div className="right tn">
              <div className="t16 apri">{fmtInt(valuesFor(picked, amt).kcal)} kcal</div>
              <div className="t13 lav">{Math.round(valuesFor(picked, amt).protein)} g protein</div>
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
          {picked.presets && picked.presets.length > 0 && (
            <div className="grid3" style={{ gap: 8 }}>
              {picked.presets.slice(0, 3).map((p) => (
                <button key={p} type="button" className={`chip sm${amt === p ? ' on' : ''}`} style={amt === p ? { background: 'transparent', color: 'var(--text)', borderColor: 'var(--text)', fontWeight: 400 } : { color: 'var(--quiet)' }} onClick={() => setAmount(p)}>
                  {p} {unitLabel(picked, p)}
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn ghost sm" onClick={() => setPickedId(null)}>
              Cancel
            </button>
            <button type="button" className="btn grow" disabled={amt <= 0} onClick={() => log(picked, amt)}>
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
                className="col gap2 grow"
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
                <button type="button" className="round sm" aria-label={`Add ${f.name}`} onClick={() => log(f, f.defaultAmount)}>
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
