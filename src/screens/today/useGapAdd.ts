import { addEntries, deleteEntry } from '../../db/actions';
import { mealForTime, portionFor } from '../../domain/foods';
import type { GapPick } from '../../domain/proteinGap';
import type { Food } from '../../domain/types';
import { useToast } from '../../ui/Toasts';

/** Adds the protein gap's picks to the current meal in one tap, with an Undo toast. */
export function useGapAdd(today: string, foods: Food[] | undefined) {
  const toast = useToast();
  return async (picks: GapPick[]) => {
    if (!foods || !picks.length) return;
    const at = Date.now();
    const meal = mealForTime();
    const byId = new Map(foods.map((f) => [f.id, f]));
    const added = await addEntries(
      picks.map((p) => {
        const f = byId.get(p.foodId)!;
        return { date: today, meal, at, kind: 'food' as const, foodId: f.id, name: f.name, amount: p.amount, portion: portionFor(f, p.amount), kcal: p.kcal, protein: p.proteinG };
      }),
    );
    toast({ text: `Added ${added.map((e) => e.name).join(' and ')}`, sub: `+${Math.round(picks.reduce((n, p) => n + p.proteinG, 0))} g protein`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
  };
}
