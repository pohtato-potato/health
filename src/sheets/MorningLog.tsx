import { useState } from 'react';
import { addDays } from '../domain/dates';
import { fmtDayLong, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { homePlace } from '../domain/places';
import { sleepMinutes } from '../domain/rings';
import type { Day, MuscleId, Settings } from '../domain/types';
import { saveMorningLog } from '../db/actions';
import { useAllDays, useAllSets, useSessions, useSettings } from '../db/hooks';
import { DateChip, useLogDate } from '../ui/DateChip';
import { closeSheet } from '../router';
import { IntField } from '../ui/controls';
import { Dial } from '../ui/Dial';
import { Wheel } from '../ui/Wheel';
import { BodyMap } from '../ui/BodyMap';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { morningQuestions, swapSentence } from '../state/derived';
import { placeOptions } from '../domain/places';
import { ensurePlace } from '../db/actions';
import { PlaceIcon } from '../ui/PlaceIcon';
import { StatusRow } from '../ui/StatusRow';
import { undoEdit } from '../db/edits';

export function MorningLog() {
  const settings = useSettings();
  const [date, setDate] = useLogDate();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  if (!settings || !days || !sessions || !sets) return <Sheet title="Morning log">{null}</Sheet>;
  return <MorningForm key={date} settings={settings} today={date} onDate={setDate} days={days} questions={morningQuestions(settings.plan, sessions, sets, date)} />;
}

function MorningForm({ settings, today, onDate, days, questions }: { settings: Settings; today: string; onDate: (d: string) => void; days: Day[]; questions: ReturnType<typeof morningQuestions> }) {
  const toast = useToast();
  const day = days.find((d) => d.date === today);
  const yesterdayKey = addDays(today, -1);
  const yesterday = days.find((d) => d.date === yesterdayKey);
  const before = [...days].filter((d) => d.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const lastWeight = before.find((d) => d.weightKg !== undefined)?.weightKg;
  const lastSleep = before.find((d) => d.sleep)?.sleep;
  const places = settings.places?.length ? settings.places : [homePlace(settings)];

  // Nothing is pre-filled from earlier days: an untouched field stays empty and is not saved.
  const [weight, setWeight] = useState<number | undefined>(day?.weightKg);
  const [asleep, setAsleep] = useState<number | undefined>(day?.sleep?.asleep);
  const [woke, setWoke] = useState<number | undefined>(day?.sleep?.woke);
  const [carried, setCarried] = useState(day?.sleep?.carried ?? false);
  const [rested, setRested] = useState<number | undefined>(day?.sleep?.rested);
  const [steps, setSteps] = useState<number | undefined>(yesterday?.steps);
  const [place, setPlace] = useState<string>(day?.place ?? before.find((d) => d.place)?.place ?? places[0].id);
  const [energy, setEnergy] = useState<number | undefined>(day?.energy);
  const [stomach, setStomach] = useState<boolean | undefined>(day?.stomach);
  const [sore, setSore] = useState<Partial<Record<MuscleId, 1 | 2 | 3>>>(day?.soreness ?? {});
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, day?.answers?.[q.id] ?? false])));
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(day?.energy !== undefined || day?.stomach !== undefined);

  const sleepLen = asleep !== undefined && woke !== undefined ? sleepMinutes(asleep, woke) : undefined;

  const sameAsYesterday = () => {
    if (!lastSleep) return;
    setAsleep(lastSleep.asleep);
    setWoke(lastSleep.woke);
    setCarried(true);
  };
  const editAsleep = (m: number) => {
    setAsleep(m);
    setCarried(false);
  };
  const editWoke = (m: number) => {
    setWoke(m);
    setCarried(false);
  };
  const save = async () => {
    setSaving(true);
    const editId = await saveMorningLog(
      today,
      {
        weightKg: weight,
        sleep: asleep !== undefined && woke !== undefined ? { asleep, woke, rested, ...(carried ? { carried: true } : {}) } : undefined,
        yesterdaySteps: settings.prefs.confirmSteps && steps !== undefined && steps !== yesterday?.steps ? steps : undefined,
        place,
        energy,
        stomach,
        soreness: Object.keys(sore).length ? sore : undefined,
        answers,
      },
      yesterdayKey,
    );
    closeSheet();
    const flagged = questions.filter((q) => answers[q.id]);
    if (flagged.length) {
      const f = flagged[0];
      toast({ kicker: `${f.group} flagged`, text: swapSentence(settings.plan, f.swap) ?? 'Noted.', sub: f.advice, ms: 7000 });
    } else {
      toast({ text: day?.morning ? 'Morning log updated' : 'Morning log saved', action: { label: 'Undo', run: () => void undoEdit(editId) } });
    }
  };

  return (
    <Sheet title="Morning log" sub={fmtDayLong(today)}>
      <DateChip value={today} onChange={onDate} />
      <div className="panel col gap10">
        <div className="row base">
          <span className="lbl">Where today</span>
          <span className="t12 q">change any time</span>
        </div>
        {(() => {
          const o = placeOptions(settings);
          const big = [o.home, o.office];
          return (
            <>
              <div className="grid2">
                {big.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`place-big ${p.kind}${place === p.id && !p.virtual ? ' on' : ''}`}
                    aria-pressed={place === p.id && !p.virtual}
                    onClick={async () => setPlace(p.virtual ? await ensurePlace(p.kind as 'home' | 'office') : p.id)}
                  >
                    <PlaceIcon place={p} size={18} />
                    {p.name}
                  </button>
                ))}
              </div>
              {o.rest.length > 0 && (
                <div className="place-row" style={{ gridTemplateColumns: `repeat(${Math.min(o.rest.length, 3)}, minmax(0, 1fr))` }}>
                  {o.rest.map((p) => (
                    <button key={p.id} type="button" className={`chip sm${place === p.id ? ' on' : ''}`} aria-pressed={place === p.id} onClick={() => setPlace(p.id)}>
                      <PlaceIcon place={p} size={14} /> {p.name}
                    </button>
                  ))}
                </div>
              )}
              <span className="lbl">Status</span>
              <StatusRow today={today} current={day?.status} />
            </>
          );
        })()}
      </div>

      <div className="panel col gap8">
        <div className="row base">
          <span className="lbl">Weight</span>
          <span className="t12 q">{weight === undefined ? 'drag to set' : lastWeight ? `last ${lastWeight.toFixed(1)}` : ''}</span>
        </div>
        <div style={{ opacity: weight === undefined ? 0.45 : 1 }}>
          <Dial value={weight ?? lastWeight ?? 75} step={0.1} min={35} max={200} major={10} onChange={setWeight} label="Weight in kg" unit="kg" />
        </div>
        <div className="t12 q">After the toilet, before food or water. Leave it if you didn't weigh.</div>
      </div>

      <div className="panel col gap10">
        <div className="row base">
          <span className="lbl" style={{ color: 'var(--sleep)' }}>
            Sleep
          </span>
          {lastSleep && (
            <button type="button" className={`chip sm${carried ? ' on' : ''}`} aria-pressed={carried} onClick={sameAsYesterday}>
              Same as yesterday
            </button>
          )}
        </div>
        <div className="grid2">
          <SleepWheel label="Asleep" value={asleep} hint={lastSleep?.asleep ?? 23 * 60} from={19 * 60} to={29 * 60} onChange={editAsleep} />
          <SleepWheel label="Woke" value={woke} hint={lastSleep?.woke ?? 7 * 60} from={4 * 60} to={13 * 60} onChange={editWoke} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="t13 q tn" style={{ whiteSpace: 'nowrap' }}>
            {sleepLen !== undefined ? `${fmtDuration(sleepLen)} · how rested` : 'How rested'}
          </span>
          <div className="row" role="radiogroup" aria-label="How rested" style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rested === n} className={`round sm${rested === n ? ' on' : ''}`} onClick={() => setRested(rested === n ? undefined : n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {settings.prefs.confirmSteps && (
        <label className="panel flabel">
          <span className="lbl" style={{ color: 'var(--steps)' }}>
            Yesterday's final steps
          </span>
          <IntField value={steps} onChange={setSteps} placeholder="From Samsung Health" label="Yesterday's final steps" />
          <span className="t12 q lh">
            {yesterday?.steps !== undefined && yesterday.stepsAt ? `You logged ${fmtInt(yesterday.steps)} at ${fmtTime(yesterday.stepsAt)}. The final count is ready by now.` : 'The final count is ready by now.'}
          </span>
        </label>
      )}

      <div className="panel col gap10">
        <button type="button" className="row" aria-expanded={more} onClick={() => setMore(!more)} style={{ minHeight: 40 }}>
          <span className="t15">Energy, stomach, soreness</span>
          <span className="t12 q">{energy !== undefined || stomach !== undefined || Object.keys(sore).length ? 'answered' : '3 quick taps'}</span>
        </button>
        {more && (
          <>
            <div className="col gap8">
              <div className="lbl">Energy</div>
              <Scale value={energy} onChange={setEnergy} low="Flat" high="Charged" label="Energy" />
            </div>
            <div className="row">
              <div className="t15">Stomach settled?</div>
              <div className="row" style={{ gap: 8 }}>
                {([true, false] as const).map((v) => (
                  <button key={String(v)} type="button" className={`chip${stomach === v ? ' on' : ''}`} aria-pressed={stomach === v} onClick={() => setStomach(stomach === v ? undefined : v)}>
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
            <div className="col gap8">
              <div className="lbl">Anything sore?</div>
              <BodyMap value={sore} onChange={setSore} />
            </div>
          </>
        )}
      </div>

      {questions.map((q) => (
        <div key={q.id} className="row">
          <div className="col gap2">
            <div className="t15">{q.question ?? q.label}</div>
            {q.hint && <div className="t12 q">{q.hint}</div>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className={`chip${!answers[q.id] ? ' on' : ''}`} onClick={() => setAnswers({ ...answers, [q.id]: false })}>
              No
            </button>
            <button type="button" className={`chip${answers[q.id] ? ' on' : ''}`} onClick={() => setAnswers({ ...answers, [q.id]: true })}>
              Yes
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn lg block" onClick={save} disabled={saving}>
        Save
      </button>
    </Sheet>
  );
}

function Scale({ value, onChange, low, high, label }: { value: number | undefined; onChange: (v: number | undefined) => void; low: string; high: string; label: string }) {
  return (
    <>
      <div className="row" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className={`round${value === n ? ' on' : ''}`} style={{ fontSize: 16, color: value === n ? undefined : 'var(--quiet)' }} onClick={() => onChange(value === n ? undefined : n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="row t12 d">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </>
  );
}

function fmtClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/**
 * One wheel of times in five-minute steps. Last night's time sits in the middle, greyed,
 * until the wheel is touched: nothing is saved unless it is set.
 */
function SleepWheel({ label, value, hint, from, to, onChange }: { label: string; value: number | undefined; hint: number; from: number; to: number; onChange: (m: number) => void }) {
  const items: number[] = [];
  for (let m = from; m <= to; m += 5) items.push(m);
  const norm = (m: number) => (m < from ? m + 1440 : m);
  const shown = norm(value ?? hint);
  return (
    <div className="col" style={{ alignItems: 'center', gap: 4 }}>
      <span className="t12 q">{label}</span>
      <div style={{ opacity: value === undefined ? 0.45 : 1 }}>
        <Wheel width={110} label={label} items={items} value={items.reduce((best, m) => (Math.abs(m - shown) < Math.abs(best - shown) ? m : best), items[0])} format={(m) => fmtClock(m % 1440)} onChange={(m) => onChange(m % 1440)} />
      </div>
    </div>
  );
}
