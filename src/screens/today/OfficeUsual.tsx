import { addEntry, deleteEntry } from '../../db/actions';
import { useAllDays, useAllEntries, useSettings, useToday } from '../../db/hooks';
import { fmtInt } from '../../domain/format';
import { isOfficeDay, officeUsual } from '../../domain/officeUsual';
import { MEAL_NAMES, type Meal } from '../../domain/types';
import { useToast } from '../../ui/Toasts';

/** On an office day, the usual lunch (and breakfast, when it repeats) as one button each (y-office). */
export function OfficeUsual() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const today = useToday();
  const toast = useToast();
  if (!settings || !days || !entries) return null;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const places = settings.places ?? [];
  if (!isOfficeDay(byDate.get(today), places)) return null;
  const offers = (['breakfast', 'lunch'] as Meal[])
    .filter((m) => !entries.some((e) => e.date === today && e.meal === m))
    .map((m) => ({ meal: m, items: officeUsual(m, byDate, places, entries, today) }))
    .filter((o) => o.items.length);
  if (!offers.length) return null;
  const log = async (meal: Meal, items: ReturnType<typeof officeUsual>) => {
    const at = Date.now();
    const ids: string[] = [];
    for (const x of items) ids.push((await addEntry({ date: today, at, ...x })).id);
    const kcal = items.reduce((n, x) => n + x.kcal, 0);
    toast({ kicker: 'Office usual', text: `${MEAL_NAMES[meal]} in · ${fmtInt(kcal)} kcal`, action: { label: 'Undo', run: () => ids.forEach((id) => void deleteEntry(id)) } });
  };
  return (
    <section className="office-usual" aria-label="Office usual">
      {offers.map((o) => (
        <button key={o.meal} type="button" className="office-usual-btn" onClick={() => void log(o.meal, o.items)}>
          <span className="lbl">Office usual · {MEAL_NAMES[o.meal].toLowerCase()}</span>
          <b>{o.items.map((x) => x.name).join(' + ')}</b>
          <span className="t14 q">{fmtInt(o.items.reduce((n, x) => n + x.kcal, 0))} kcal · {Math.round(o.items.reduce((n, x) => n + x.protein, 0))} g protein · one tap</span>
        </button>
      ))}
    </section>
  );
}
