import { useRef, useState } from 'react';
import type { FoodEntry, Meal } from '../../domain/types';

const MEAL_NAME: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };

/** Kcal and protein per meal for one day's entries. */
export function mealTotals(entries: Pick<FoodEntry, 'meal' | 'kcal' | 'protein'>[]): Partial<Record<Meal, { kcal: number; protein: number }>> {
  const out: Partial<Record<Meal, { kcal: number; protein: number }>> = {};
  for (const e of entries) {
    const t = (out[e.meal] ??= { kcal: 0, protein: 0 });
    t.kcal += e.kcal;
    t.protein += e.protein;
  }
  return out;
}

/** The foods usually logged at this meal, each with the portion usually eaten. One tap adds it. */
export function UsualChips({ items, onAdd }: { items: { id: string; name: string; portion: string }[]; onAdd: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="td-quick">
      {items.map((f) => (
        <button key={f.id} type="button" className="td-food" onClick={() => onAdd(f.id)}>
          <b>{f.name}</b>
          <span>{f.portion}</span>
        </button>
      ))}
    </div>
  );
}

/** Today's four meals as tiles: kcal on one line, protein on its own; an empty meal can repeat yesterday's when there is one. */
export function MealTiles({ meals, onOpen, onRepeat }: { meals: { meal: Meal; kcal?: number; protein?: number; canRepeat: boolean }[]; onOpen: (m: Meal) => void; onRepeat: (m: Meal) => void }) {
  return (
    <div className="td-meals">
      {meals.map((m) =>
        m.kcal !== undefined ? (
          <button key={m.meal} type="button" className="td-meal" onClick={() => onOpen(m.meal)}>
            <span className="td-meal-name">{MEAL_NAME[m.meal]}</span>
            <b className="tn">{Math.round(m.kcal)}</b>
            <span>kcal</span>
            <span className="tn">{Math.round(m.protein ?? 0)} g protein</span>
          </button>
        ) : (
          <div key={m.meal} className="td-meal empty">
            <button type="button" className="td-meal-open" onClick={() => onOpen(m.meal)}>
              <span className="td-meal-name">{MEAL_NAME[m.meal]}</span>
              <b>Empty</b>
            </button>
            {m.canRepeat && (
              <button type="button" className="td-same" onClick={() => onRepeat(m.meal)}>
                Same as yesterday
              </button>
            )}
          </div>
        ),
      )}
    </div>
  );
}

/** One checklist chip: press and hold to tick (about 0.65 s, with a fill under the finger), so a brush never ticks it. */
function HoldChip({ name, on, onToggle }: { name: string; on: boolean; onToggle: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <button
      type="button"
      className={`chip td-hold${on ? ' on' : ''}${holding ? ' holding' : ''}`}
      aria-pressed={on}
      aria-label={`${name}${on ? ', taken' : ''}. Press and hold to ${on ? 'untick' : 'tick'}`}
      onPointerDown={() => {
        setHolding(true);
        timer.current = setTimeout(() => {
          setHolding(false);
          onToggle();
        }, 650);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
    >
      <span className="td-hold-fill" aria-hidden="true" />
      {name}
      {on ? ' · taken' : ''}
    </button>
  );
}

export function ChecklistChips({ items, onToggle }: { items: { key: string; name: string; on: boolean }[]; onToggle: (key: string, on: boolean) => void }) {
  if (!items.length) return null;
  return (
    <div className="td-chips">
      {items.map((i) => (
        <HoldChip key={i.key} name={i.name} on={i.on} onToggle={() => onToggle(i.key, !i.on)} />
      ))}
    </div>
  );
}
