import { addEntries, deleteEntry } from '../../db/actions';
import { portionFor, valuesFor } from '../../domain/foods';
import type { DayKey } from '../../domain/dates';
import type { Food, Meal } from '../../domain/types';
import { useToast, type ToastInput } from '../../ui/Toasts';

/** Adds a usual food at its usual portion to a day's meal, and gives the toast that says so, with Undo. */
export async function addUsualFood(u: { food: Food; amount: number }, date: DayKey, meal: Meal, at = Date.now()): Promise<ToastInput> {
  const v = valuesFor(u.food, u.amount);
  const portion = portionFor(u.food, u.amount);
  const added = await addEntries([{ date, meal, at, kind: 'food', foodId: u.food.id, name: u.food.name, amount: u.amount, portion, kcal: v.kcal, protein: v.protein }]);
  return { text: `Added ${u.food.name}`, sub: `${portion} · your usual. Open the meal to change it.`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } };
}

/** One tap on a usual food adds it, on Today and in the + sheet alike. */
export function useAddUsual() {
  const toast = useToast();
  return async (u: { food: Food; amount: number }, date: DayKey, meal: Meal) => toast(await addUsualFood(u, date, meal));
}
