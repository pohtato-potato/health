import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { addDays, weekStart, type DayKey } from '../domain/dates';
import { fmt1, fmtInt } from '../domain/format';
import { flatWeeks, maintenanceModel, plateau, suggestTargets, weeklyGap, type MaintenanceModel } from '../domain/maintenance';
import { weightTrend } from '../domain/streaks';
import { prefOn, type Day, type FoodEntry, type Measurement, type Settings } from '../domain/types';
import { patchSettings, setTargets } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { useToast } from '../ui/Toasts';
import { FALLBACK_TARGETS, targetsFor } from '../state/derived';
import { targetsOn } from '../domain/rings';

/** Keeps the learned maintenance in settings fresh, for occasion mode and the cards. */
export function MaintenanceWatcher() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  useEffect(() => {
    if (!settings?.setupDone || !days || !entries) return;
    const stale = !settings.maintenance || Date.now() - settings.maintenance.at > 86_400_000;
    if (!stale) return;
    const m = modelFor(settings, days, entries, today);
    if (m.status !== 'updating' || m.kcal === undefined) return;
    void patchSettings({ maintenance: { kcal: m.kcal, at: Date.now(), weeks: Math.round(m.logged / 7) } });
  }, [settings?.setupDone, settings?.maintenance, days, entries, today]);
  return null;
}

/** The energy-balance model with the owner's height, age and latest waist. */
export function modelFor(settings: Settings, days: Day[], entries: FoodEntry[], today: DayKey, measurements: Measurement[] = []): MaintenanceModel {
  const waist = [...measurements].reverse().find((x) => x.waistStanding !== undefined)?.waistStanding;
  return maintenanceModel({
    days,
    entries,
    today,
    heightCm: settings.heightCm,
    age: settings.birthYear ? Number(today.slice(0, 4)) - settings.birthYear : undefined,
    waistIn: waist,
    previous: settings.maintenance?.kcal,
  });
}

export function MaintenanceCard({ m }: { m: MaintenanceModel }) {
  return (
    <div className="card">
      <div className="row base">
        <div className="lbl">Your maintenance</div>
        <div className="t12 q">{m.status === 'updating' ? 'updating' : 'holding'}</div>
      </div>
      {m.kcal !== undefined ? (
        <div className="num tn" style={{ fontSize: 30 }}>
          {fmtInt(m.kcal)} <span className="t14 q">{m.band ? `±${m.band} ` : ''}kcal a day</span>
        </div>
      ) : (
        <div className="t15 q">Not enough yet</div>
      )}
      <div className="t13 q lh">
        {m.status === 'updating' && m.perWeek !== undefined
          ? `What holds your weight steady, from ${m.logged} logged days and ${m.weighIns} weigh-ins (trend ${m.perWeek <= 0 ? '−' : '+'}${fmt1(Math.abs(m.perWeek))} kg a week).`
          : m.method}
      </div>
      {m.status === 'updating' && (
        <details>
          <summary className="t13" style={{ minHeight: 40, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            How this is worked out
          </summary>
          <div className="t13 q lh">{m.method}</div>
          <div className="t12 d lh" style={{ paddingTop: 6 }}>
            Maintenance = average intake − change in stored energy per day. Source: Hall KD et al., Lancet 2011, and the NIH Body Weight Planner.
          </div>
        </details>
      )}
    </div>
  );
}

/** Weight page: maintenance, plateaus, and a suggestion when one is due. */
export function WeightInsights({ settings, days, entries, measurements, today }: { settings: Settings; days: Day[]; entries: FoodEntry[]; measurements: Measurement[]; today: DayKey }) {
  const m = modelFor(settings, days, entries, today, measurements);
  const p = plateau(days, entries, measurements, today, (d) => targetsFor(settings, d).kcalMax);
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const kg = trend[trend.length - 1]?.trend;
  const t = targetsFor(settings, today);
  const s = m.status === 'updating' && m.perWeek !== undefined && kg && prefOn(settings.prefs, 'suggestTargets') ? suggestTargets(t, { perWeek: m.perWeek }, kg, flatWeeks(p)) : undefined;
  return (
    <>
      <MaintenanceCard m={m} />
      {p && <PlateauCard p={p} />}
      {s && <SuggestionCard settings={settings} today={today} id={s.id} title={s.title} text={s.text} change={s.change} />}
    </>
  );
}

function PlateauCard({ p }: { p: NonNullable<ReturnType<typeof plateau>> }) {
  const recomp = p.waistChange !== undefined && p.waistChange <= -0.25;
  return (
    <div className="card">
      <div className="lbl pearl">A flat stretch · {p.days} days</div>
      <div className="t15 lh">
        {recomp
          ? `Your weight has held within 0.2 kg, but your waist is down ${fmt1(Math.abs(p.waistChange!))} in over the same stretch. That’s recomposition: fat out, muscle in, same number on the scale.`
          : 'Your trend has held within 0.2 kg for a while. That’s normal: water, salt and hard training weeks can hide fat loss for a week or two, and then it shows up all at once.'}
      </div>
      <div className="t13 q lh">
        {p.logged ? `Calories ran over the range on ${p.overDays} of ${p.logged} logged days. ` : ''}
        If it stays flat past three weeks, more steps come before any change to food.
      </div>
    </div>
  );
}

function SuggestionCard({ settings, today, id, title, text, change }: { settings: Settings; today: DayKey; id: string; title: string; text: string; change: Partial<ReturnType<typeof targetsFor>> }) {
  const toast = useToast();
  const key = `suggest:${id}:${weekStart(today)}`;
  const dismissed = useLiveQuery(async () => !!(await db.seen.get(key)), [key]);
  if (dismissed !== false) return null;
  const t = targetsFor(settings, today);
  const parts = [
    change.kcalMin !== undefined && `calories ${fmtInt(change.kcalMin)}–${fmtInt(change.kcalMax ?? t.kcalMax)}`,
    change.steps !== undefined && `${fmtInt(change.steps)} steps`,
  ].filter(Boolean);
  return (
    <div className="card" style={{ borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }}>
      <div className="lbl gold">Suggestion · {title}</div>
      <div className="t15 lh">{text}</div>
      <div className="row gap10">
        <button
          type="button"
          className="btn sm grow"
          onClick={async () => {
            // The plain targets, without any occasion's raised ceiling.
            const base = targetsOn(settings.targets, today) ?? FALLBACK_TARGETS;
            await setTargets({ ...base, ...change }, today);
            await db.seen.put({ id: key, at: Date.now() });
            toast({ kicker: 'Targets', text: `Updated from today: ${parts.join(', ')}.`, sub: 'Past days keep their old targets.' });
          }}
        >
          Use {parts.join(', ')}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => db.seen.put({ id: key, at: Date.now() })}>
          Not now
        </button>
      </div>
    </div>
  );
}

/** Calories page: this week against maintenance. */
export function WeekGapCard({ entries, today }: { entries: FoodEntry[]; today: DayKey }) {
  const settings = useSettings();
  const days = useAllDays();
  if (!settings || !days) return null;
  const m = modelFor(settings, days, entries, today);
  const kcal = m.kcal ?? settings.maintenance?.kcal;
  if (!kcal) return null;
  const ws = weekStart(today);
  // Early in the week there may be no finished day yet: show last week instead.
  const thisWeek = weeklyGap(kcal, entries, ws, today);
  const g = thisWeek ?? weeklyGap(kcal, entries, addDays(ws, -7), ws);
  if (!g) return null;
  return (
    <div className="card">
      <div className="lbl apri">{thisWeek ? 'This week' : 'Last week'} against maintenance</div>
      <div className="num" style={{ fontSize: 30 }}>
        {g.gap >= 0 ? '−' : '+'}
        {fmtInt(Math.abs(g.gap))} <span className="t14 q">kcal a day</span>
      </div>
      <div className="t13 q lh">
        Averaging {fmtInt(g.avg)} over {g.days} full day{g.days === 1 ? '' : 's'}, against about {fmtInt(kcal)} to hold steady.{' '}
        {g.gap > 0 ? `At this pace that’s roughly ${fmt1(g.kgPerWeek)} kg a week.` : 'That’s at or above maintenance, which is fine now and then.'}
      </div>
    </div>
  );
}

