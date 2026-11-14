import { MaintenanceRead } from './today/MaintenanceRead';
import { FoodPledge } from './Pledge';
import { addDays, weekStart } from '../domain/dates';
import { fmtDayShort, fmtInt } from '../domain/format';
import { MEAL_NAMES, MEALS } from '../domain/types';
import { useAllDays, useEntries, useEntriesBetween, useSettings, useToday } from '../db/hooks';
import { back, go, openSheet, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { SwitchRow } from '../ui/controls';
import { lateHeavy, proteinSpread, weekBudget } from '../domain/budgets';
import { patchDay } from '../db/actions';
import { dayRings, freeMealsThisWeek } from '../state/derived';
import { phaseLine } from '../domain/phase';
import { Panel, PageHead, Sect, type HowThisWorks } from '../ui/kit/Kit';
import '../styles/food.css';

const HOW: HowThisWorks = {
  title: 'Food',
  steps: [
    { icon: 'food', ink: 'var(--kcal)', head: 'Log as you go', line: 'Add food opens on the meal for the time; your usuals are one tap.' },
    { icon: 'check', ink: '#8fc9b0', head: 'Land in the green', line: 'The green part of the bar is the aim for today. Anywhere in it counts.' },
    { icon: 'bolt', ink: 'var(--protein)', head: 'Protein to the line', line: 'The lavender bar fills to the day’s protein.' },
    { icon: 'night', ink: 'var(--sleep)', head: 'Day complete', line: 'Mark it once everything eaten is in. Averages use complete days.' },
  ],
};

/** Food (board four, "Food, in the maintenance weeks"): the phase, the day's calories as the lead, protein, the meals, Add food. */
export function FoodToday() {
  const { params } = useRoute();
  const today = useToday();
  const date = params.get('d') ?? today;
  const settings = useSettings();
  const days = useAllDays();
  const entries = useEntries(date);
  const ws = weekStart(date);
  const week = useEntriesBetween(ws, addDays(ws, 6));
  if (!settings || !days || !entries || !week) return <div className="page k-page k-light today fd-page" />;

  const day = days.find((d) => d.date === date);
  const { totals, targets, rings } = dayRings(settings, date, day, entries);
  const home = settings.homes.find((h) => h.id === day?.home);
  const freeUsed = freeMealsThisWeek(week, date) > 0;
  // The bar runs to a quarter past the top of the aim, rounded up to a thousand; the green part is the aim.
  const scale = Math.max(1000, Math.ceil((targets.kcalMax * 1.25) / 500) * 500);
  const kcalPct = Math.min(totals.kcal / scale, 1) * 100;
  const lo = (targets.kcalMin / scale) * 100;
  const hi = (targets.kcalMax / scale) * 100;
  const setDate = (d: string) => go('/food', d === today ? {} : { d }, { replace: true });
  const budget = weekBudget(targets, new Map(days.map((x) => [x.date, x])), week, ws, date);
  const spread = proteinSpread(entries);
  const phase = date === today ? phaseLine(settings.targets, date) : undefined;
  const dParam: Record<string, string> = date !== today ? { d: date } : {};

  return (
    <>
      <div className="page k-page k-light today fd-page">
        <PageHead back="Today" onBack={() => back('/today')} title="Food" help={HOW} />
        <div className="fd-date">
          <button type="button" className="fd-dbtn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
            <Icon name="left" size={20} stroke={2} />
          </button>
          <span>{date === today ? 'Today' : fmtDayShort(date)}</span>
          <button type="button" className="fd-dbtn" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
            <Icon name="right" size={20} stroke={2} />
          </button>
        </div>

        {phase && (
          <Panel ink="var(--k-pearl)">
            <b>{phase.title}</b>
            <span className="k-q">{phase.line}</span>
          </Panel>
        )}

        <div className="k-row end fd-lead">
          <span className="k-hero-row">
            <span className="k-hero fd-kcal" style={{ '--ink': 'var(--kcal)' } as React.CSSProperties}>{fmtInt(totals.kcal)}</span>
            <b>kcal</b>
          </span>
          <span className="k-col k-r">
            <b className="k-num" style={{ color: 'var(--protein)' }}>{Math.round(totals.protein)} g</b>
            <span className="k-q">of {fmtInt(targets.proteinG)} protein</span>
          </span>
        </div>
        <div className="fd-cal" role="img" aria-label={`${fmtInt(totals.kcal)} kcal; the aim is ${fmtInt(targets.kcalMin)} to ${fmtInt(targets.kcalMax)}`}>
          <i className="ok" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
          <i className="v" style={{ width: `${kcalPct}%` }} />
        </div>
        <div className="k-row fd-scale" aria-hidden="true">
          <span className="k-q tn">0</span>
          <span className="tn" style={{ color: '#8fc9b0' }}>aim {fmtInt(targets.kcalMin)} to {fmtInt(targets.kcalMax)}{totals.freeMeal ? ' · free meal' : ''}</span>
          <span className="k-q tn">{fmtInt(scale)}</span>
        </div>
        <div className={`fd-pro${rings.protein.closed ? ' closed' : ''}`} role="img" aria-label={`Protein ${Math.round(totals.protein)} of ${targets.proteinG} g`}>
          <i style={{ width: `${rings.protein.progress * 100}%` }} />
        </div>

        {date === today && <MaintenanceRead />}
        {date === today && <FoodPledge date={today} />}

        {MEALS.map((meal) => {
          const es = entries.filter((e) => e.meal === meal);
          const kcal = es.reduce((s, e) => s + e.kcal, 0);
          const protein = es.reduce((s, e) => s + e.protein, 0);
          if (!es.length) {
            return (
              <Panel key={meal} flat onClick={() => openSheet('addfood', { meal, ...dParam })} label={`Add ${MEAL_NAMES[meal].toLowerCase()}`} className="fd-meal empty">
                <span className="k-lb fd-mname">{MEAL_NAMES[meal]}</span>
                <span className="k-q">Not logged yet · add</span>
              </Panel>
            );
          }
          return (
            <section key={meal} className="k-panel fd-meal" aria-label={MEAL_NAMES[meal]}>
              <div className="k-row">
                <span className="k-lb fd-mname">{MEAL_NAMES[meal]}</span>
                <b className="tn">{fmtInt(kcal)} · {Math.round(protein)} g</b>
              </div>
              {es.map((e) => (
                <button key={e.id} type="button" className="fd-row" onClick={() => openSheet('entry', { id: e.id })}>
                  <span className="k-col"><span>{e.name}</span><span className="k-q fd-portion">{e.portion}</span></span>
                  <span className="k-col k-r tn"><b>{fmtInt(e.kcal)}</b><span className="fd-p">{Math.round(e.protein)} g</span></span>
                </button>
              ))}
              <div className="fd-mfoot">
                <button type="button" className="fd-link" onClick={() => openSheet('addfood', { meal, ...dParam })}>Add to {MEAL_NAMES[meal].toLowerCase()}</button>
                {es.filter((e) => e.kind === 'food' && e.foodId).length >= 2 && (
                  <button type="button" className="fd-link" onClick={() => openSheet('savemeal', { meal, ...dParam })}>Save as a meal</button>
                )}
              </div>
            </section>
          );
        })}

        <Sect>This week</Sect>
        <Panel ink="var(--sleep)">
          <div className="fd-week">
            <span className="k-col">
              <span className="k-q">Calories left</span>
              <b className="k-num" style={{ color: 'var(--kcal)' }}>{fmtInt(budget.kcal.left)}</b>
              <span className="k-q">about {fmtInt(Math.max(0, budget.kcal.perDayLeft))} a day for the rest of the week</span>
            </span>
            <span className="k-col">
              <span className="k-q">Protein to go</span>
              <b className="k-num" style={{ color: 'var(--protein)' }}>{fmtInt(Math.max(0, budget.protein.left))} g</b>
              <span className="k-q">{budget.protein.left <= 0 ? 'the week is covered' : `about ${fmtInt(budget.protein.perDayLeft)} g a day`}</span>
            </span>
          </div>
          <span className="k-q">{home ? `${home.name}${date === today ? ' today' : ''} · ` : ''}Free meal: {freeUsed ? 'used this week' : 'unused this week'}</span>
        </Panel>
        {totals.protein > 0 && (
          <Panel ink="var(--protein)">
            <b>Protein by meal</b>
            <ul className="fd-meals" aria-label="Protein by meal">
              {MEALS.map((m) => (
                <li key={m}>
                  <span>{MEAL_NAMES[m]}</span>
                  <span className="fd-mbar" aria-hidden="true"><i style={{ width: `${Math.min(100, (spread[m] / Math.max(1, totals.protein)) * 100)}%` }} /></span>
                  <b className="tn">{Math.round(spread[m])} g</b>
                </li>
              ))}
            </ul>
            {lateHeavy(entries) && <span className="k-q">Most of today's protein landed after 9 pm. Some of it earlier in the day helps it count for more.</span>}
          </Panel>
        )}

        <div className="k-panel fd-done" style={{ '--ink': 'var(--k-pearl)' } as React.CSSProperties}>
          <SwitchRow
            title="Day complete"
            sub={day?.foodDone ? 'Everything eaten is logged. Averages use complete days.' : 'Mark it once everything eaten is in.'}
            checked={!!day?.foodDone}
            onChange={(v) => void patchDay(date, { foodDone: v })}
          />
        </div>
      </div>

      <div className="fd-acts">
        <button type="button" className="k-act fd-add" onClick={() => openSheet('addfood', dParam)}>
          Add food
        </button>
        <button type="button" className="k-act quiet fd-night" onClick={() => openSheet('nightout', dParam)}>
          Night out
        </button>
      </div>
    </>
  );
}
