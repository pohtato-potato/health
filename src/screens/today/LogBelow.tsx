import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

export interface MealRow { meal: Meal; kcal?: number; protein?: number; canRepeat: boolean }

/**
 * The meals panel (board 6 `h6-c`), after Next: a row per meal that fills like a bowl with what was eaten (a third of
 * the day's calorie aim fills it; the surface ripples), its kcal and protein in words with a protein bar, or "Add"
 * for a meal not logged, and "Same as yesterday" when yesterday's can be repeated. A row opens that meal on Food.
 */
export function MealsPanel({ meals, kcalAim, proteinAim, onOpen, onRepeat }: { meals: MealRow[]; kcalAim: number; proteinAim: number; onOpen: (m: Meal) => void; onRepeat: (m: Meal) => void }) {
  const kcal = meals.reduce((n, m) => n + (m.kcal ?? 0), 0);
  const protein = meals.reduce((n, m) => n + (m.protein ?? 0), 0);
  const share = (v: number, aim: number) => `${Math.round(Math.min(1, aim > 0 ? v / (aim / 3) : 0) * 100)}%`;
  return (
    <TodayPanel id="meals" title="Meals" chip={`${Math.round(kcal).toLocaleString('en-GB')} kcal · ${Math.round(protein)} g`} className="td-mealsp">
      <ul className="td-ml">
        {meals.map((m, i) => (
          <li key={m.meal} className={`td-ml-row${m.kcal !== undefined ? ' in' : ''}`} style={{ '--h': m.kcal !== undefined ? share(m.kcal, kcalAim) : '0%', '--p': share(m.protein ?? 0, proteinAim), '--i': i } as CSSProperties}>
            {m.kcal !== undefined && <span className="td-ml-lq" aria-hidden="true"><i /></span>}
            <button type="button" className="td-ml-open" onClick={() => onOpen(m.meal)} aria-label={m.kcal !== undefined ? `${MEAL_NAME[m.meal]}: ${Math.round(m.kcal)} kcal, ${Math.round(m.protein ?? 0)} g protein` : `${MEAL_NAME[m.meal]}: add`}>
              <span className="td-ml-name">{MEAL_NAME[m.meal]}</span>
              {m.kcal !== undefined ? (
                <span className="td-ml-v">
                  <span><b className="tn">{Math.round(m.kcal)}</b> kcal</span>
                  <span className="td-ml-p">{Math.round(m.protein ?? 0)} g protein</span>
                  <i className="td-ml-pb" aria-hidden="true"><i /></i>
                </span>
              ) : (
                <span className="td-ml-add">Add</span>
              )}
            </button>
            {m.kcal === undefined && m.canRepeat && (
              <button type="button" className="td-same" onClick={() => onRepeat(m.meal)}>Same as yesterday</button>
            )}
          </li>
        ))}
      </ul>
    </TodayPanel>
  );
}

export interface Buckets {
  food: { kcal: number; aim: number };
  morning: { at?: number };
  checklist: { done: number; of: number };
  steps: { n?: number; of: number };
  session?: { name: string; done: boolean };
}
export interface BucketActions { food: () => void; morning: () => void; checklist: () => void; steps: () => void; session: () => void; more: () => void }

const pct = (v: number, of: number) => `${Math.round(Math.max(0, Math.min(1, of > 0 ? v / of : 0)) * 100)}%`;
const short = (n: number) => (n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString('en-GB'));

/**
 * The log (board 12 `h12-log`): one tile per bucket, each filling its own way, each with its number in words. Food
 * fills like a bowl; the morning's sun rises over a line once it is logged; the checklist's pills drop into an
 * organiser, one slot per item; footprints walk across as far as the steps reach; plates slide onto the bar for the
 * next session (Close the day is the moon button at the end of the page). The pictures play once; More and search sit under them.
 */
export function LogBuckets({ b, on }: { b: Buckets; on: BucketActions }) {
  const slots = Math.min(b.checklist.of, 7);
  const prints = b.steps.n === undefined ? 0 : Math.round(Math.min(1, b.steps.n / Math.max(1, b.steps.of)) * 8);
  return (
    <section className="td-lb" aria-labelledby="td-lb-h">
      <h2 id="td-lb-h" className="td-lb-h">Log</h2>
      <div className="td-lb-grid">
        <button type="button" className="td-bk k-food" style={{ '--f': pct(b.food.kcal, b.food.aim) } as CSSProperties} onClick={on.food} aria-label={`Food: ${Math.round(b.food.kcal)} of ${b.food.aim} kcal`}>
          <span className="td-bk-fill" aria-hidden="true" />
          <span className="td-bk-hd">Food</span>
          <b className="tn">{Math.round(b.food.kcal).toLocaleString('en-GB')}<small>of {b.food.aim.toLocaleString('en-GB')} kcal</small></b>
        </button>
        <button type="button" className={`td-bk k-morning${b.morning.at !== undefined ? ' on' : ''}`} onClick={on.morning} aria-label={b.morning.at !== undefined ? `Morning: logged at ${fmtTime(b.morning.at)}` : 'Morning: not logged'}>
          <span className="td-bk-scn" aria-hidden="true"><i className="hz" /><i className="sun" /></span>
          <span className="td-bk-hd">Morning</span>
          <b className="tn">{b.morning.at !== undefined ? fmtTime(b.morning.at) : '—'}<small>{b.morning.at !== undefined ? 'logged' : 'not yet'}</small></b>
        </button>
        <button type="button" className="td-bk k-check" onClick={on.checklist} aria-label={`Checklist: ${b.checklist.done} of ${b.checklist.of} ticked`}>
          <span className="td-bk-scn" aria-hidden="true">
            <span className="box" style={{ '--n': Math.max(1, slots) } as CSSProperties}>
              {Array.from({ length: slots }, (_, i) => <span key={i}>{i < b.checklist.done && <i style={{ '--d': `${i * 0.25}s` } as CSSProperties} />}</span>)}
            </span>
          </span>
          <span className="td-bk-hd">Checklist</span>
          <b className="tn">{b.checklist.done}<small>of {b.checklist.of} ticked</small></b>
        </button>
        <button type="button" className="td-bk k-steps" onClick={on.steps} aria-label={b.steps.n === undefined ? 'Steps: not logged' : `Steps: ${b.steps.n} of ${b.steps.of}`}>
          <span className="td-bk-scn feet" aria-hidden="true">
            {Array.from({ length: prints }, (_, i) => <i key={i} style={{ '--x': `${8 + i * 12}%`, '--y': i % 2 ? '10px' : '22px', '--d': `${(i * 0.18).toFixed(2)}s` } as CSSProperties} />)}
          </span>
          <span className="td-bk-hd">Steps</span>
          <b className="tn">{b.steps.n === undefined ? '—' : b.steps.n.toLocaleString('en-GB')}<small>of {short(b.steps.of)}</small></b>
        </button>
        {b.session && (
          <button type="button" className={`td-bk wide k-session${b.session.done ? ' on' : ''}`} onClick={on.session} aria-label={`${b.session.name}: ${b.session.done ? 'done today' : 'up next'}`}>
            <span className="td-bk-scn" aria-hidden="true"><span className="bar"><i className="l" /><i className="l2" /><i className="r" /><i className="r2" /></span></span>
            <span className="td-bk-col"><span className="td-bk-hd">{b.session.name}</span><b>{b.session.done ? 'Done' : 'Up next'}</b></span>
            <span className="td-bk-act">{b.session.done ? 'See it' : 'Start'}</span>
          </button>
        )}
      </div>
      <button type="button" className="td-more" onClick={on.more}>
        <span>More: drinks, night out, free meal, waist, status, check-in</span>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </section>
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
