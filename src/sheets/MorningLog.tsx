import { useEffect, useRef, useState } from 'react';
import { addDays } from '../domain/dates';
import { fmtDayLong, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { sleepMinutes } from '../domain/rings';
import type { Day, Settings } from '../domain/types';
import { saveMorningLog } from '../db/actions';
import { useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { closeSheet } from '../router';
import { DecField, IntField, Stepper, TimeTile } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { morningQuestions, swapSentence } from '../state/derived';

export function MorningLog() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  if (!settings || !days || !sessions || !sets) return <Sheet title="Morning log">{null}</Sheet>;
  return <MorningForm settings={settings} today={today} days={days} questions={morningQuestions(settings.plan, sessions, sets, today)} />;
}

function MorningForm({ settings, today, days, questions }: { settings: Settings; today: string; days: Day[]; questions: ReturnType<typeof morningQuestions> }) {
  const toast = useToast();
  const started = useRef(performance.now());
  const day = days.find((d) => d.date === today);
  const yesterdayKey = addDays(today, -1);
  const yesterday = days.find((d) => d.date === yesterdayKey);
  const before = [...days].filter((d) => d.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const lastWeight = before.find((d) => d.weightKg !== undefined)?.weightKg;
  const lastSleep = before.find((d) => d.sleep)?.sleep;

  const [weight, setWeight] = useState<number | undefined>(day?.weightKg ?? lastWeight);
  // Typing a first weight keeps the plain field; the stepper is for nudging a known one.
  const [typing, setTyping] = useState(weight === undefined);
  const [asleep, setAsleep] = useState<number | undefined>(day?.sleep?.asleep ?? lastSleep?.asleep);
  const [woke, setWoke] = useState<number | undefined>(day?.sleep?.woke ?? lastSleep?.woke);
  const [rested, setRested] = useState<number | undefined>(day?.sleep?.rested);
  const [steps, setSteps] = useState<number | undefined>(yesterday?.steps);
  const [home, setHome] = useState<string | undefined>(day?.home ?? before.find((d) => d.home)?.home ?? settings.homes[0]?.id);
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, day?.answers?.[q.id] ?? false])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    started.current = performance.now();
  }, []);

  const sleepLen = asleep !== undefined && woke !== undefined ? sleepMinutes(asleep, woke) : undefined;

  const save = async () => {
    setSaving(true);
    const seconds = Math.round((performance.now() - started.current) / 100) / 10;
    const { newBest } = await saveMorningLog(
      today,
      {
        weightKg: weight,
        sleep: asleep !== undefined && woke !== undefined ? { asleep, woke, rested } : undefined,
        yesterdaySteps: settings.prefs.confirmSteps && steps !== undefined && steps !== yesterday?.steps ? steps : undefined,
        home,
        answers,
        seconds: day?.morning ? undefined : seconds,
      },
      yesterdayKey,
    );
    closeSheet();
    const flagged = questions.filter((q) => answers[q.id]);
    if (flagged.length) {
      const f = flagged[0];
      toast({ kicker: `${f.group} flagged`, text: swapSentence(settings.plan, f.swap) ?? 'Noted.', sub: f.advice, ms: 7000 });
    } else if (!day?.morning) {
      toast(newBest ? { kicker: 'New best', text: `Morning log in ${seconds.toFixed(1)} s`, tone: 'gold' } : { text: `Morning log saved in ${seconds.toFixed(1)} s` });
    } else {
      toast({ text: 'Morning log updated' });
    }
  };

  return (
    <Sheet title="Morning log" sub={fmtDayLong(today)}>
      <div className="col gap8">
        <div className="lbl pearl">Weight</div>
        {!typing && weight !== undefined ? (
          <>
            <Stepper value={weight} onChange={setWeight} step={0.1} min={30} max={250} decimals={1} unit="kg" label="Weight in kg" />
            <div className="row t13 q" style={{ justifyContent: 'center', gap: 14 }}>
              <span>After the toilet, before food or water</span>
              <button
                type="button"
                className="d"
                style={{ textDecoration: 'underline' }}
                onClick={() => {
                  setWeight(undefined);
                  setTyping(true);
                }}
              >
                Skip
              </button>
            </div>
          </>
        ) : (
          <DecField value={weight} onChange={setWeight} placeholder={lastWeight ? 'Not weighed today: leave empty' : 'Your weight in kg'} label="Weight in kg" />
        )}
      </div>

      <div className="rule" />

      <div className="col gap8">
        <div className="row base">
          <div className="lbl blue">Sleep</div>
          <div className="t15 blue tn">{sleepLen !== undefined ? fmtDuration(sleepLen) : ''}</div>
        </div>
        <div className="grid2">
          <TimeTile label="Asleep" minutes={asleep} onChange={setAsleep} />
          <TimeTile label="Woke" minutes={woke} onChange={setWoke} />
        </div>
      </div>

      <div className="col gap8">
        <div className="lbl">How rested do you feel?</div>
        <div className="row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={`round${rested === n ? ' on' : ''}`} style={{ fontSize: 16, color: rested === n ? undefined : 'var(--quiet)' }} onClick={() => setRested(rested === n ? undefined : n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="row t12 d">
          <span>Drained</span>
          <span>Great</span>
        </div>
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

      {settings.homes.length > 1 && (
        <div className="row">
          <div className="t15">Where are you today?</div>
          <div className="row" style={{ gap: 8 }}>
            {settings.homes.map((h) => (
              <button key={h.id} type="button" className={`chip${home === h.id ? ' on' : ''}`} onClick={() => setHome(h.id)}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
