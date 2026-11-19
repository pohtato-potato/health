import { useEffect, useRef, useState } from 'react';
import { fmtTime } from '../../domain/format';
import { TodayPanel } from './TodayLayout';
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
    <div className="k-panel td-meals" style={{ '--ink': 'var(--kcal)' } as React.CSSProperties}>
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

export interface CheckItem { key: string; name: string; on: boolean; at?: number }

const HOLD_MS = 650;

/**
 * One checklist row (board 7 `k7-live`, `k7-frames`): press and hold to tick, so a brush never ticks it. Press, and
 * the row dips and its ring starts; hold, and the ring runs round as the colour pours along the row; let go early and
 * it drains back. Done: the disc pops, the tick draws, eight sparks fly and the time settles in. Enter, Space or a
 * screen reader's activate toggles at once: the button alternative to the hold.
 */
function HoldRow({ item, hint, onToggle }: { item: CheckItem; hint: boolean; onToggle: () => void }) {
  const { name, on, at } = item;
  const [holding, setHolding] = useState(false);
  const [just, setJust] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };
  const done = () => {
    setHolding(false);
    if (!on) {
      setJust(true);
      setTimeout(() => setJust(false), 1400);
    }
    navigator.vibrate?.(12);
    onToggle();
  };
  const when = on && at !== undefined ? fmtTime(at) : undefined;
  return (
    <button
      type="button"
      className={`td-hold${on ? ' on' : ''}${holding ? ' holding' : ''}${just ? ' just' : ''}`}
      aria-pressed={on}
      aria-label={`${name}, ${on ? (when ? `ticked at ${when}` : 'ticked') : 'to do'}. Press and hold to ${on ? 'untick' : 'tick'}`}
      onPointerDown={() => {
        setHolding(true);
        timer.current = setTimeout(done, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.detail === 0 && onToggle()}
    >
      <span className="td-hold-fill" aria-hidden="true" />
      <svg className={`td-ck-ring${hint && !on ? ' hint' : ''}`} viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
        <circle cx={16} cy={16} r={13} className="td-ck-track" />
        <circle cx={16} cy={16} r={13} pathLength={100} className="td-ck-run" transform="rotate(-90 16 16)" />
        <circle cx={16} cy={16} r={11} className="td-ck-disc" />
        <path d="M10.5 16.5 L14.5 20.5 L21.5 12.5" pathLength={100} className="td-ck-tick" />
        <g className="td-ck-sparks">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
            <g key={d} transform={`rotate(${d} 16 16)`}>
              <line x1={16} y1={1} x2={16} y2={-3} />
            </g>
          ))}
        </g>
      </svg>
      <span className="td-hold-name">{name}</span>
      {on ? <span className="td-ck-when tn">{when ?? 'done'}</span> : <span className="td-ck-when hold">hold</span>}
    </button>
  );
}

const WORDS = ['', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** The chip when every item is done (board 7 `k7-all`): "All six", "All 14", or "Done" for a single item. */
export const allWord = (n: number) => (n === 1 ? 'Done' : `All ${WORDS[n] ?? n}`);

/**
 * The checklist panel on Home: a header bar with the count done, then a row per dose, ticked with a held press.
 * When the last one is ticked (board 7 `k7-all`) the edge turns gold, the chip says "All six" and a gold light runs
 * down the list once. Gold is kept for this state only.
 */
export function ChecklistPanel({ items, onToggle }: { items: CheckItem[]; onToggle: (key: string, on: boolean) => void }) {
  const done = items.filter((i) => i.on).length;
  const all = items.length > 0 && done === items.length;
  const [sweep, setSweep] = useState(false);
  const was = useRef(all);
  useEffect(() => {
    if (all && !was.current) {
      setSweep(true);
      const t = setTimeout(() => setSweep(false), 1600);
      was.current = all;
      return () => clearTimeout(t);
    }
    was.current = all;
  }, [all]);
  if (!items.length) return null;
  const next = items.find((i) => !i.on)?.key;
  return (
    <TodayPanel id="checklist" title="Checklist" chip={all ? allWord(items.length) : `${done} of ${items.length}`} chipInk={all ? 'var(--k-gold)' : 'var(--ax-routine)'} className={all ? `td-ck-all${sweep ? ' sweep' : ''}` : undefined}>
      <div className="td-chips">
        {items.map((i) => (
          <HoldRow key={i.key} item={i} hint={i.key === next} onToggle={() => onToggle(i.key, !i.on)} />
        ))}
      </div>
    </TodayPanel>
  );
}
