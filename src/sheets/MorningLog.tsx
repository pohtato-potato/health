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
import { DecField, IntField, TimeTile } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { morningQuestions, swapSentence } from '../state/derived';

/** Soreness areas until the body map (E5) arrives: one chip per area, tap to step through how sore. */
const SORE_AREAS: { id: MuscleId; name: string }[] = [
  { id: 'chest', name: 'Chest' },
  { id: 'upper-back', name: 'Upper back' },
  { id: 'lats', name: 'Lats' },
  { id: 'front-delts', name: 'Shoulders' },
  { id: 'biceps', name: 'Arms' },
  { id: 'abs', name: 'Core' },
  { id: 'glutes', name: 'Glutes' },
  { id: 'quads', name: 'Quads' },
  { id: 'hamstrings', name: 'Hamstrings' },
  { id: 'calves', name: 'Calves' },
];
const SORE_WORD = ['', 'mild', 'sore', 'very'] as const;

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
  const stepSore = (id: MuscleId) => {
    const next = (((sore[id] ?? 0) + 1) % 4) as 0 | 1 | 2 | 3;
    const copy = { ...sore };
    if (next) copy[id] = next;
    else delete copy[id];
    setSore(copy);
  };

  const save = async () => {
    setSaving(true);
    await saveMorningLog(
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
      toast({ text: day?.morning ? 'Morning log updated' : 'Morning log saved' });
    }
  };

  return (
    <Sheet title="Morning log" sub={fmtDayLong(today)}>
      <DateChip value={today} onChange={onDate} />
      <div className="col gap8">
        <div className="lbl pearl">Where are you today?</div>
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {places.map((p) => (
            <button key={p.id} type="button" className={`chip${p.kind === 'home' || p.kind === 'office' ? '' : ' sm'}${place === p.id ? ' on' : ''}`} aria-pressed={place === p.id} onClick={() => setPlace(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rule" />

      <div className="col gap8">
        <div className="lbl pearl">Weight</div>
        <DecField value={weight} onChange={setWeight} placeholder={lastWeight ? `Last: ${lastWeight.toFixed(1)} kg. Leave empty if not weighed` : 'Your weight in kg'} label="Weight in kg" />
        <div className="t12 q">After the toilet, before food or water.</div>
      </div>

      <div className="rule" />

      <div className="col gap8">
        <div className="row base">
          <div className="lbl blue">Sleep</div>
          <div className="t15 blue tn">{sleepLen !== undefined ? fmtDuration(sleepLen) : ''}</div>
        </div>
        <div className="grid2">
          <TimeTile label="Asleep" minutes={asleep} onChange={editAsleep} />
          <TimeTile label="Woke" minutes={woke} onChange={editWoke} />
        </div>
        {lastSleep && (
          <button type="button" className={`chip sm${carried ? ' on' : ''}`} style={{ alignSelf: 'flex-start' }} aria-pressed={carried} onClick={sameAsYesterday}>
            Same as last night: {fmtClock(lastSleep.asleep)} to {fmtClock(lastSleep.woke)}
          </button>
        )}
      </div>

      <div className="col gap8">
        <div className="lbl">How rested do you feel?</div>
        <Scale value={rested} onChange={setRested} low="Drained" high="Great" label="Rested" />
      </div>

      {settings.prefs.confirmSteps && (
        <>
          <div className="rule" />
          <label className="flabel">
            <span className="lbl sage">Yesterday's final steps</span>
            <IntField value={steps} onChange={setSteps} placeholder="From Samsung Health" label="Yesterday's final steps" />
            <span className="t13 q lh">
              {yesterday?.steps !== undefined && yesterday.stepsAt
                ? `You logged ${fmtInt(yesterday.steps)} at ${fmtTime(yesterday.stepsAt)}. Samsung Health has the final count by now.`
                : 'Samsung Health has the final count by now.'}
            </span>
          </label>
        </>
      )}

      <div className="rule" />

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
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {SORE_AREAS.map((a) => {
            const lvl = sore[a.id] ?? 0;
            return (
              <button key={a.id} type="button" className={`chip sm${lvl ? ' on' : ''}`} aria-label={`${a.name}${lvl ? `, ${SORE_WORD[lvl]}` : ', not sore'}. Tap to change`} onClick={() => stepSore(a.id)}>
                {a.name}
                {lvl ? <span className="t12"> · {SORE_WORD[lvl]}</span> : null}
              </button>
            );
          })}
        </div>
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
