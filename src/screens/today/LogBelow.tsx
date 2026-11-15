import { useRef, useState } from 'react';
import { Icon } from '../../ui/Icon';
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

/** The foods usually logged at this meal, each with the portion usually eaten. One tap adds it (board three: Quick add). */
export function UsualChips({ items, onAdd }: { items: { id: string; name: string; portion: string }[]; onAdd: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="td-quick">
      {items.map((f) => (
        <button key={f.id} type="button" className="td-food" onClick={() => onAdd(f.id)} aria-label={`Add ${f.name}, ${f.portion}`}>
          <b>{f.name}</b>
          <span>{f.portion}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Today's meals in one filled panel (board three): a row each, protein and kcal on the right, "not yet" for an
 * empty one, which can repeat yesterday's when there is one. A row opens that meal on Food.
 */
export function MealTiles({ meals, onOpen, onRepeat }: { meals: { meal: Meal; kcal?: number; protein?: number; canRepeat: boolean }[]; onOpen: (m: Meal) => void; onRepeat: (m: Meal) => void }) {
  return (
    <div className="k-panel td-meals" style={{ '--ink': 'var(--protein)' } as React.CSSProperties}>
      {meals.map((m) => (
        <div key={m.meal} className="td-meal">
          <button type="button" className="td-meal-open" onClick={() => onOpen(m.meal)}>
            <span className="td-meal-name">{MEAL_NAME[m.meal]}</span>
            {m.kcal !== undefined ? (
              <span className="td-meal-v tn" aria-label={`${Math.round(m.protein ?? 0)} g protein, ${Math.round(m.kcal)} kcal`}>
                <span style={{ color: 'var(--protein)' }}>{Math.round(m.protein ?? 0)} g</span> · <span style={{ color: 'var(--kcal)' }}>{Math.round(m.kcal)}</span>
              </span>
            ) : (
              !m.canRepeat && <span className="td-meal-v k-q">not yet</span>
            )}
          </button>
          {m.kcal === undefined && m.canRepeat && (
            <button type="button" className="td-same" onClick={() => onRepeat(m.meal)}>
              Same as yesterday
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** One checklist row: press and hold to tick (about 0.65 s, with a fill under the finger), so a brush never ticks it. */
function HoldRow({ name, on, onToggle }: { name: string; on: boolean; onToggle: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <button
      type="button"
      className={`td-hold${on ? ' on' : ''}${holding ? ' holding' : ''}`}
      aria-pressed={on}
      aria-label={`${name}${on ? ', taken' : ', to do'}. Press and hold to ${on ? 'untick' : 'tick'}`}
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
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
    >
      <span className="td-hold-fill" aria-hidden="true" />
      <span className="td-hold-name">{name}</span>
      {on ? (
        <span className="td-hold-on"><Icon name="check" size={20} stroke={2.4} /><span className="sr-only"> · taken</span></span>
      ) : (
        <span className="td-hold-off">to do</span>
      )}
    </button>
  );
}

/** The checklist in one filled panel: a row per dose, ticked with a held press. */
export function ChecklistChips({ items, onToggle }: { items: { key: string; name: string; on: boolean }[]; onToggle: (key: string, on: boolean) => void }) {
  if (!items.length) return null;
  return (
    <div className="k-panel td-chips" style={{ '--ink': 'var(--ax-routine)' } as React.CSSProperties}>
      {items.map((i) => (
        <HoldRow key={i.key} name={i.name} on={i.on} onToggle={() => onToggle(i.key, !i.on)} />
      ))}
    </div>
  );
}
