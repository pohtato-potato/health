import { addDays, weekStart } from '../domain/dates';
import { fmtDayShort, fmtInt } from '../domain/format';
import { MEAL_NAMES, MEALS } from '../domain/types';
import { useAllDays, useEntries, useEntriesBetween, useSettings, useToday } from '../db/hooks';
import { back, go, openSheet, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { SwitchRow } from '../ui/controls';
import { patchDay } from '../db/actions';
import { dayRings, freeMealsThisWeek } from '../state/derived';

export function FoodToday() {
  const { params } = useRoute();
  const today = useToday();
  const date = params.get('d') ?? today;
  const settings = useSettings();
  const days = useAllDays();
  const entries = useEntries(date);
  const ws = weekStart(date);
  const week = useEntriesBetween(ws, addDays(ws, 6));
  if (!settings || !days || !entries || !week) return <div className="page" />;

  const day = days.find((d) => d.date === date);
  const { totals, targets, rings } = dayRings(settings, date, day, entries);
  const home = settings.homes.find((h) => h.id === day?.home);
  const freeUsed = freeMealsThisWeek(week, date) > 0;
  const kcalPct = Math.min(totals.kcal / targets.kcalMax, 1.08) * 100;
  const lo = (targets.kcalMin / targets.kcalMax) * 100;
  const setDate = (d: string) => go('/food', d === today ? {} : { d }, { replace: true });

  return (
    <>
      <div className="page" style={{ paddingBottom: 'calc(110px + var(--safe-bottom))' }}>
        <div className="row">
          <button type="button" className="backlink" onClick={() => back('/today')}>
            <Icon name="left" size={20} stroke={1.8} />
            Today
          </button>
          <div className="row" style={{ gap: 2 }}>
            <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              <Icon name="left" size={18} stroke={1.8} />
            </button>
            <div className="t14">{fmtDayShort(date)}</div>
            <button type="button" className="icon-btn" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
              <Icon name="right" size={18} stroke={1.8} />
            </button>
          </div>
        </div>

        <div className="row base">
          <h1 className="h1">{date === today ? 'Food today' : `Food · ${fmtDayShort(date)}`}</h1>
          <button type="button" className="chip sm" onClick={() => go('/diary')}>
            Diary
          </button>
        </div>

        <div className="card" style={{ gap: 16, padding: 20 }}>
          <div className="col gap8">
            <div className="row base">
              <div className="lbl apri" style={{ letterSpacing: '.12em' }}>
                Calories
              </div>
              <div className="t15 tn">
                {fmtInt(totals.kcal)}{' '}
                <span className="t13 q">
                  · aim {fmtInt(targets.kcalMin)}–{fmtInt(targets.kcalMax)}
                  {totals.freeMeal ? ' · free meal' : ''}
                </span>
              </div>
            </div>
            <div className="bar lg">
              <i style={{ width: `${Math.min(kcalPct, 100)}%`, background: 'var(--apricot)' }} />
              <span
                style={{ position: 'absolute', left: `${lo}%`, top: -3, bottom: -3, width: `${100 - lo}%`, borderRadius: 3, border: '1px solid var(--apricot)' }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="col gap8">
            <div className="row base">
              <div className="lbl lav" style={{ letterSpacing: '.12em' }}>
                Protein
              </div>
              <div className="t15 tn">
                {Math.round(totals.protein)} g <span className="t13 q">· aim {targets.proteinG} g</span>
              </div>
            </div>
            <div className="bar lg">
              <i style={{ width: `${rings.protein.progress * 100}%`, background: 'var(--lavender)' }} />
            </div>
          </div>
          <div className="row t13 q" style={{ paddingTop: 2 }}>
            <span>{home ? `${home.name}${date === today ? ' today' : ''}` : ''}</span>
            <span>Free meal: {freeUsed ? 'used this week' : 'unused this week'}</span>
          </div>
        </div>

        <div className="col">
          {MEALS.map((meal) => {
            const es = entries.filter((e) => e.meal === meal);
            const kcal = es.reduce((s, e) => s + e.kcal, 0);
            const protein = es.reduce((s, e) => s + e.protein, 0);
            return (
              <div key={meal} className="col">
                <div className="meal-h">
                  <span className={`lbl${es.length ? '' : ' f'}`}>{MEAL_NAMES[meal]}</span>
                  <span className={`t13 tn ${es.length ? 'q' : 'f'}`}>{es.length ? `${fmtInt(kcal)} · ${Math.round(protein)} g` : 'Not logged yet'}</span>
                </div>
                {es.filter((e) => e.kind === 'food' && e.foodId).length >= 2 && (
                  <button type="button" className="t12 d" style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 2 }} onClick={() => openSheet('savemeal', { meal, ...(date !== today ? { d: date } : {}) })}>
                    Save as a meal
                  </button>
                )}
                {es.map((e) => (
                  <button key={e.id} type="button" className="item" onClick={() => openSheet('entry', { id: e.id })}>
                    <div className="col gap2" style={{ minWidth: 0 }}>
                      <span className="t16">{e.name}</span>
                      <span className="t13 q">{e.portion}</span>
                    </div>
                    <div className="k">
                      {fmtInt(e.kcal)}
                      <div className="t13 lav">{Math.round(e.protein)} g</div>
                    </div>
                  </button>
                ))}
                {!es.length && (
                  <button type="button" className="item t14 q" onClick={() => openSheet('addfood', { meal, ...(date !== today ? { d: date } : {}) })}>
                    + Add {MEAL_NAMES[meal].toLowerCase()}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="list">
          <SwitchRow
            title="Day complete"
            sub={day?.foodDone ? 'Everything eaten is logged. Averages use complete days.' : 'Mark it once everything eaten is in.'}
            checked={!!day?.foodDone}
            onChange={(v) => void patchDay(date, { foodDone: v })}
          />
        </div>
      </div>

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, bottom: 0, padding: '12px 22px calc(20px + var(--safe-bottom))', display: 'flex', gap: 10, background: 'linear-gradient(transparent, var(--ink) 30%)', zIndex: 10 }}>
        <button type="button" className="btn lg grow" onClick={() => openSheet('addfood', date !== today ? { d: date } : {})}>
          Add food
        </button>
        {date === today && (
          <button type="button" className="btn lg ghost" style={{ background: 'var(--ink)' }} onClick={() => openSheet('whatsleft')}>
            What's left?
          </button>
        )}
      </div>
    </>
  );
}
