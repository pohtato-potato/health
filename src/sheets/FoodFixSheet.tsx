import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { fixFood, findFoodFor, pastEntryFixes, type FoodFix } from '../domain/foodFixes';
import { fmtInt } from '../domain/format';
import type { Food } from '../domain/types';
import { patchSettings, refixEntries, saveFood } from '../db/actions';
import { db } from '../db/db';
import { useFoods, useSettings } from '../db/hooks';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

const per = (f: Pick<Food, 'unit' | 'per' | 'unitName'>) => (f.unit === 'g' || f.unit === 'ml' ? `per ${fmtInt(f.per)} ${f.unit}` : `per ${f.unitName ?? f.unit}`);
const nums = (kcal: number, protein: number) => `${fmtInt(Math.round(kcal))} kcal · ${Math.round(protein * 10) / 10} g protein`;
/** Sums over many entries: whole numbers, with thousands marked. */
const sums = (kcal: number, protein: number) => `${fmtInt(Math.round(kcal))} kcal · ${fmtInt(Math.round(protein))} g protein`;

/**
 * Food fixes from a file: each one offered once. Use it changes the saved food; past entries
 * change only on a second yes, and each change lands in Edit history.
 */
export function FoodFixSheet({ fixes, from, onClose }: { fixes: FoodFix[]; from?: string; onClose: () => void }) {
  const foods = useFoods();
  const settings = useSettings();
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const toast = useToast();
  // After Use it: the fixed food, waiting for the past-entries answer.
  const [asking, setAsking] = useState<{ fix: FoodFix; food: Food } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!foods || !settings || !entries) return <Sheet title="Food fixes" onClose={onClose}>{null}</Sheet>;
  const seen = new Set(settings.foodFixesSeen ?? []);
  const open = fixes.filter((f) => !seen.has(f.id));
  const answered = fixes.filter((f) => seen.has(f.id));
  const markSeen = (id: string) => patchSettings((s) => ({ foodFixesSeen: [...new Set([...(s.foodFixesSeen ?? []), id])] }));

  const use = async (fix: FoodFix, food: Food) => {
    setBusy(true);
    try {
      const fixed = await saveFood(fixFood(food, fix));
      toast({ text: `${fixed.name} updated`, sub: `${nums(fixed.kcal, fixed.protein)} ${per(fixed)}` });
      if (pastEntryFixes(entries, fixed).length) setAsking({ fix, food: fixed });
      else await markSeen(fix.id);
    } finally {
      setBusy(false);
    }
  };
  const past = async (fix: FoodFix, food: Food, yes: boolean) => {
    setBusy(true);
    try {
      if (yes) {
        const n = await refixEntries(food, pastEntryFixes(entries, food).map((x) => x.id));
        toast({ text: `${n} past entr${n === 1 ? 'y' : 'ies'} fixed`, sub: 'Each one can be undone in Edit history.' });
      }
      await markSeen(fix.id);
      setAsking(null);
    } finally {
      setBusy(false);
    }
  };

  if (asking) {
    const list = pastEntryFixes(entries, asking.food);
    const sum = (k: 'kcal' | 'protein', was: boolean) => list.reduce((n, x) => n + (was ? x.was[k] : x[k]), 0);
    return (
      <Sheet title={`Past ${asking.food.name} entries`} onClose={onClose}>
        <p className="t15 lh">
          {list.length} past entr{list.length === 1 ? 'y was' : 'ies were'} logged at the old numbers: {sums(sum('kcal', true), sum('protein', true))} in all.
        </p>
        <p className="t15 lh">At the new numbers: {sums(sum('kcal', false), sum('protein', false))}.</p>
        <p className="t14 q lh">Entries you gave their own numbers keep them. Nothing changes unless you say so.</p>
        <button type="button" className="btn lg block" disabled={busy} onClick={() => void past(asking.fix, asking.food, true)}>
          Fix past entries
        </button>
        <button type="button" className="btn ghost block" disabled={busy} onClick={() => void past(asking.fix, asking.food, false)}>
          Keep them as logged
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Food fixes" sub={from ? `From ${from}` : undefined} onClose={onClose} tall>
      {open.length === 0 && <p className="t15 lh">Every fix in this file has been answered.</p>}
      {open.map((fix) => {
        const food = findFoodFor(fix, foods);
        const next = food && fixFood(food, fix);
        return (
          <div key={fix.id} className="card col gap8">
            <b className="t17">{food?.name ?? fix.food}</b>
            {food && next ? (
              <>
                <span className="t15 lh">
                  Now: {nums(food.kcal, food.protein)} {per(food)}
                  {food.note ? `, ${food.note}` : ''}.
                </span>
                <span className="t15 lh">
                  Fixed: {nums(fix.kcal, fix.protein)} per {fmtInt(fix.per)} {food.unit === 'ml' ? 'ml' : 'g'}
                  {fix.weighed ? `, weighed ${fix.weighed}` : ''}
                  {fix.per !== 100 && (food.unit === 'g' || food.unit === 'ml') ? ` (${nums(next.kcal, next.protein)} per 100 ${food.unit})` : ''}.
                </span>
              </>
            ) : (
              <span className="t15 lh">There’s no saved food called {fix.food}. Create it, then open this file again.</span>
            )}
            {fix.why && <span className="t14 q lh">{fix.why}</span>}
            {food && (
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn grow" disabled={busy} onClick={() => void use(fix, food)}>
                  Use it
                </button>
                <button type="button" className="btn ghost grow" disabled={busy} onClick={() => void markSeen(fix.id)}>
                  Skip
                </button>
              </div>
            )}
          </div>
        );
      })}
      {answered.length > 0 && <p className="t14 q lh">Already answered: {answered.map((f) => f.food).join(', ')}.</p>}
    </Sheet>
  );
}
