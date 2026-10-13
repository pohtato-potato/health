import { useState } from 'react';
import { fmtDayShort, fmtInt } from '../../domain/format';
import { MEAL_NAMES, MEALS } from '../../domain/types';
import { lateShare, placeSplit, proteinByMeal, todayAndChange, usualRange } from '../../domain/trackStats';
import { targetsFor } from '../../state/derived';
import { MaintenanceCard, modelFor, WeekGapCard } from '../MaintenanceCards';
import { SourcesCard } from '../TrackExtras';
import { dayLabel, foodByDay, kindOn, placeMarkOn, spanDays, type Span, type TrackData } from './data';
import { changeText, HeroChart, TrackShell } from './Template';

/** Food: calories and protein on one chart against the range, then the budget, office against home, late protein, sources and maintenance. */
export function FoodTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState<Span>('7');
  const { settings, today } = data;
  const t = targetsFor(settings, today);
  const food = foodByDay(data.entries);
  const range = spanDays(today, span);
  const logged = range.filter((d) => food.has(d));
  const kcal = new Map([...food].map(([d, v]) => [d, v.kcal]));
  const protein = new Map([...food].map(([d, v]) => [d, v.protein]));
  const ch = todayAndChange(kcal, today);
  const avgK = logged.length ? logged.reduce((n, d) => n + food.get(d)!.kcal, 0) / logged.length : undefined;
  const avgP = logged.length ? logged.reduce((n, d) => n + food.get(d)!.protein, 0) / logged.length : undefined;
  const label = dayLabel(range.length);
  const inRange = data.entries.filter((e) => e.date >= range[0] && e.date <= today);
  const split = placeSplit(logged, (d) => protein.get(d), kindOn(data));
  const late = lateShare(inRange);
  const meals = proteinByMeal(inRange);
  const totalP = Object.values(meals).reduce((a, b) => a + (b ?? 0), 0);
  const usual = usualRange([...kcal.values()]);
  const model = modelFor(settings, [...data.days.values()], data.entries, today, data.measurements);

  return (
    <TrackShell
      title="Food"
      color="var(--apricot)"
      value={
        avgK !== undefined ? (
          <>
            {fmtInt(avgK)}
            <small className="t16 q"> kcal · </small>
            <span style={{ color: 'var(--lavender)' }}>{Math.round(avgP!)}</span>
            <small className="t16 q"> g</small>
          </>
        ) : (
          '—'
        )
      }
      sub={`${logged.length} of ${range.length} days logged`}
      change={changeText(ch.delta, (n) => `${fmtInt(n)} kcal`)}
      span={span}
      onSpan={(s) => setSpan(s as Span)}
      hero={
        <HeroChart
          label={`Calories and protein over ${range.length} days`}
          color="var(--apricot)"
          secondColor="var(--lavender)"
          fmt={(n) => fmtInt(n)}
          band={[t.kcalMin, t.kcalMax]}
          points={range.map((d) => ({ label: label(d), value: food.get(d)?.kcal ?? null, second: food.get(d)?.protein ?? null, place: placeMarkOn(data, d), nightOut: !!data.days.get(d)?.nightOut }))}
        />
      }
      insights={[
        split.diff !== undefined && Math.abs(split.diff) >= 5 && `Office days: ${fmtInt(Math.abs(split.diff))} g ${split.diff < 0 ? 'less' : 'more'} protein than home.`,
        late.days >= 3 && late.share >= 0.4 && `After 9 pm: ${Math.round(late.share * 100)}% of protein, most of it on ${late.lateDays} of ${late.days} days.`,
        usual && usual[1] - usual[0] >= 50 && `Your usual day lands between ${fmtInt(usual[0])} and ${fmtInt(usual[1])} kcal.`,
      ]}
      history={{
        title: 'Day by day',
        rows: [...logged].reverse().slice(0, 30).map((d) => [fmtDayShort(d), `${fmtInt(food.get(d)!.kcal)} kcal · ${Math.round(food.get(d)!.protein)} g`]),
      }}
    >
      <WeekGapCard entries={data.entries} today={today} />
      {totalP > 0 && (
        <div className="card">
          <div className="lbl lav">Protein by meal</div>
          {MEALS.filter((m) => meals[m]).map((m) => (
            <div key={m} className="col gap4">
              <div className="row t14">
                <span>{MEAL_NAMES[m]}</span>
                <span className="tn q">{Math.round(((meals[m] ?? 0) / totalP) * 100)}%</span>
              </div>
              <div className="bar">
                <i style={{ width: `${((meals[m] ?? 0) / totalP) * 100}%`, background: 'var(--lavender)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <SourcesCard entries={data.entries} range={range} kind="protein" />
      <MaintenanceCard m={model} />
    </TrackShell>
  );
}
