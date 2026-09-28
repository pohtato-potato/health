import { useState } from 'react';
import { addDays, daysBetween, type DayKey } from '../domain/dates';
import { festivalOn, nextFestival } from '../domain/festivals';
import { fmt1, fmtDayMonth, fmtInt } from '../domain/format';
import { OCCASION_KINDS, heldSteady, maintenanceKcal, occasionOn } from '../domain/occasions';
import { weightTrend } from '../domain/streaks';
import { targetsOn } from '../domain/rings';
import type { Occasion, OccasionKind, Settings } from '../domain/types';
import { bump, patchSettings } from '../db/actions';
import { uid } from '../db/db';
import { useAllDays, useSettings, useToday } from '../db/hooks';
import { closeSheet, openSheet, useRoute } from '../router';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { Icon } from '../ui/Icon';
import { FALLBACK_TARGETS } from '../state/derived';

const PLACEHOLDER: Record<OccasionKind, string> = {
  festival: 'Diwali',
  wedding: 'A cousin’s wedding',
  travel: 'Trip home',
  sick: 'Down with a cold',
  other: 'Exams week',
};

/** A festival in the next week, to suggest occasion mode for. */
export function festivalSoon(today: DayKey) {
  const f = festivalOn(today) ?? nextFestival(today);
  return f && f.from <= addDays(today, 7) ? f : undefined;
}

export function maintenanceFor(settings: Settings, date: DayKey): number {
  return maintenanceKcal(settings, targetsOn(settings.targets, date) ?? FALLBACK_TARGETS);
}

/** Festivals, weddings, travel: calories up to maintenance, streaks paused. */
export function OccasionSheet() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const { params } = useRoute();
  const toast = useToast();
  const fest = festivalSoon(today);
  const [kind, setKind] = useState<OccasionKind>((params.get('kind') as OccasionKind) || (fest ? 'festival' : 'wedding'));
  const [name, setName] = useState(params.get('name') ?? fest?.name ?? '');
  const [from, setFrom] = useState<DayKey>(params.get('from') ?? (fest && fest.from > today ? fest.from : today));
  const [to, setTo] = useState<DayKey>(params.get('to') ?? fest?.to ?? addDays(today, 2));
  if (!settings || !days) return <Sheet title="Occasion mode">{null}</Sheet>;

  const current = occasionOn(settings, today);
  const all = [...(settings.occasions ?? [])].sort((a, b) => b.from.localeCompare(a.from));
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const maint = maintenanceFor(settings, from);
  const valid = !!name.trim() && to >= from && daysBetween(from, to) <= 30;

  const save = async () => {
    const o: Occasion = { id: uid(), kind, name: name.trim(), from, to };
    await patchSettings((s) => ({ occasions: [...(s.occasions ?? []), o] }));
    void bump('occasion', { value: kind });
    closeSheet();
    toast({
      kicker: 'Occasion mode',
      text: from <= today ? `${o.name} mode is on.` : `${o.name} mode starts ${fmtDayMonth(from)}.`,
      sub: `Calories up to ${fmtInt(maintenanceFor(settings, from))}. Streaks paused until ${fmtDayMonth(to)}.`,
      tone: 'gold',
      action: { label: 'Undo', run: () => void patchSettings((s) => ({ occasions: (s.occasions ?? []).filter((x) => x.id !== o.id) })) },
    });
  };

  const end = async (o: Occasion) => {
    const yesterday = addDays(today, -1);
    // Ending on its first day removes it; otherwise it ends yesterday, so today is back to normal.
    await patchSettings((s) => ({ occasions: (s.occasions ?? []).flatMap((x) => (x.id !== o.id ? [x] : o.from >= today ? [] : [{ ...x, to: yesterday }])) }));
    closeSheet();
    toast({ kicker: 'Occasion mode', text: `${o.name} mode is off.`, sub: 'Targets and streaks are back to normal from today.' });
  };

  const remove = async (o: Occasion) => {
    await patchSettings((s) => ({ occasions: (s.occasions ?? []).filter((x) => x.id !== o.id) }));
  };

  return (
    <Sheet title="Occasion mode" sub="Festivals, weddings, travel" tall>
      {current ? (
        <div className="card" style={{ borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }}>
          <div className="lbl gold">On now</div>
          <div className="sf" style={{ fontSize: 26 }}>
            {current.name}
          </div>
          <div className="t14 q lh">
            {fmtDayMonth(current.from)} to {fmtDayMonth(current.to)}. Calories up to {fmtInt(maintenanceFor(settings, today))}, and your step and training streaks are paused. Protein, water and sleep carry on as usual.
          </div>
          <button type="button" className="btn ghost block" onClick={() => end(current)}>
            End it today
          </button>
        </div>
      ) : (
        <>
          <div className="t14 q lh">
            For the days when life takes over. Calories go up to maintenance, about {fmtInt(maint)}, so the goal is holding steady rather than losing. Step and training streaks pause, and pick up where they left off afterwards.
          </div>
          <div className="col gap8">
            <div className="lbl">What’s the occasion?</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
              {OCCASION_KINDS.map((k) => (
                <button key={k.id} type="button" className={`chip sm${kind === k.id ? ' on' : ''}`} onClick={() => setKind(k.id)}>
                  {k.name}
                </button>
              ))}
            </div>
            <div className="t12 q">{OCCASION_KINDS.find((k) => k.id === kind)?.hint}</div>
          </div>
          <label className="flabel">
            <span className="lbl">Name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={PLACEHOLDER[kind]} />
          </label>
          <div className="row gap10">
            <label className="flabel grow">
              <span className="lbl">From</span>
              <input className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flabel grow">
              <span className="lbl">To</span>
              <input className="field" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          {to < from && <div className="t13 apri">The end is before the start.</div>}
          {daysBetween(from, to) > 30 && <div className="t13 apri">Occasions last a month at most. For longer, change your targets in Settings.</div>}
          <button type="button" className="btn lg block" disabled={!valid} onClick={save}>
            {from > today ? `Schedule for ${fmtDayMonth(from)}` : 'Turn it on'}
          </button>
        </>
      )}

      {all.filter((o) => o !== current).length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Your occasions
          </div>
          {all
            .filter((o) => o !== current)
            .map((o) => {
              const held = heldSteady(o, trend, today);
              const upcoming = o.from > today;
              return (
                <div key={o.id} className="sess" style={{ minHeight: 52 }}>
                  <span className="col gap2">
                    <span className="t15">{o.name}</span>
                    <span className="t12 q">
                      {fmtDayMonth(o.from)}–{fmtDayMonth(o.to)} · {OCCASION_KINDS.find((k) => k.id === o.kind)?.name}
                    </span>
                  </span>
                  {upcoming ? (
                    <button type="button" className="icon-btn" aria-label={`Remove ${o.name}`} onClick={() => remove(o)}>
                      <Icon name="trash" size={18} />
                    </button>
                  ) : held ? (
                    <span className={`t12 ${held.change <= 0.5 ? 'gold' : 'q'}`}>{held.change <= 0.5 ? `Held steady · ${held.change > 0 ? '+' : ''}${fmt1(held.change)} kg` : `Trend +${fmt1(held.change)} kg`}</span>
                  ) : (
                    <span className="t12 q">{o.to < today ? 'Result in a day or two' : ''}</span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </Sheet>
  );
}

/** On Today while an occasion is on, or when a festival is close. */
export function OccasionCard({ settings, today }: { settings: Settings; today: DayKey }) {
  const current = occasionOn(settings, today);
  const fest = festivalSoon(today);
  const covered = fest && (settings.occasions ?? []).some((o) => o.from <= fest.to && o.to >= fest.from);
  if (current) {
    const left = daysBetween(today, current.to);
    return (
      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }} onClick={() => openSheet('occasion')}>
        <Icon name="calendar" size={24} color="var(--gold)" />
        <span className="col gap2" style={{ minWidth: 0 }}>
          <span className="lbl gold">{current.name} mode</span>
          <span className="t14 lh">
            Calories up to {fmtInt(maintenanceFor(settings, today))}. Streaks paused {left === 0 ? 'through today' : `through ${fmtDayMonth(current.to)}`}.
          </span>
        </span>
      </button>
    );
  }
  if (fest && !covered) {
    const until = daysBetween(today, fest.from);
    return (
      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} onClick={() => openSheet('occasion', { kind: 'festival', name: fest.name, from: fest.from > today ? fest.from : today, to: fest.to })}>
        <Icon name="calendar" size={24} color="var(--gold)" />
        <span className="col gap2" style={{ minWidth: 0 }}>
          <span className="lbl gold">{until <= 0 ? `${fest.name} is here` : `${fest.name} in ${until} day${until === 1 ? '' : 's'}`}</span>
          <span className="t14 lh">Turn on occasion mode? Calories go up to maintenance and streaks pause, so you can enjoy it.</span>
        </span>
        <Icon name="right" size={18} color="var(--quiet)" />
      </button>
    );
  }
  return null;
}
