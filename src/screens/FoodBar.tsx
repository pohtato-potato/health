import { fmtInt } from '../domain/format';
import { MEAL_NAMES, MEALS, type Meal } from '../domain/types';

/**
 * The meal bar (board 22 `h22-food`, from board 4 `f4-bar`): the day's calories built from its meals, one segment each,
 * over the aim band, with a letter and number for each meal under it. `fill` is the poured width in percent.
 */
export function FoodBar({ kcal, byMeal, aimMin, aimMax, scale, fill }: { kcal: number; byMeal: Record<Meal, number>; aimMin: number; aimMax: number; scale: number; fill: number }) {
  const lo = (aimMin / scale) * 100;
  const hi = (aimMax / scale) * 100;
  const said = MEALS.map((m) => `${MEAL_NAMES[m].toLowerCase()} ${byMeal[m] > 0 ? fmtInt(byMeal[m]) : 'not logged'}`).join(', ');
  return (
    <>
      <div className="fd-cal" role="img" aria-label={`${fmtInt(kcal)} kcal: ${said}. The aim is ${fmtInt(aimMin)} to ${fmtInt(aimMax)}.`}>
        <i className="ok" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        <span className="fd-segs" style={{ width: `${fill}%` }}>
          {MEALS.filter((m) => byMeal[m] > 0).map((m) => (
            <span key={m} className={`fd-seg m-${m}`} style={{ flex: Math.round(byMeal[m]) }} />
          ))}
        </span>
      </div>
      <div className="fd-letters" aria-hidden="true">
        {MEALS.map((m) => (
          <span key={m} className={`m-${m}`}>{`${MEAL_NAMES[m][0]} ${byMeal[m] > 0 ? fmtInt(byMeal[m]) : '—'}`}</span>
        ))}
      </div>
    </>
  );
}
