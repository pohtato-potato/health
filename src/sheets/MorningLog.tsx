import { useState } from 'react';
import { addDays } from '../domain/dates';
import { fmtDayLong, fmtInt, fmtTime } from '../domain/format';
import { homePlace } from '../domain/places';
import type { Day, MuscleId, Settings } from '../domain/types';
import { saveMorningLog, setTick } from '../db/actions';
import { alsoThisMorning, isMorningSlot } from '../domain/morningLog';
import { useAllDays, useAllSets, useBody, useSessions, useSettings } from '../db/hooks';
import { bodyTileWords } from '../domain/bodyLog';
import { weightTrend } from '../domain/streaks';
import { BodyChart } from '../ui/BodyChart';
import { DateChip, useLogDate } from '../ui/DateChip';
import { closeSheet } from '../router';
import { IntField } from '../ui/controls';
import { Dial } from '../ui/Dial';
import { NightDial } from '../ui/NightDial';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { checklistSlots, morningQuestions, swapSentence } from '../state/derived';
import { isEased, placeFor, placeOptions } from '../domain/places';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { targetsFor } from '../state/derived';
import { Icon } from '../ui/Icon';
import { StepsRing } from '../ui/StepsRing';
import { MorningLogged, morningParts } from '../ui/MorningLogged';
import { ensurePlace, setOfficeDay } from '../db/actions';
import { isOfficeDay } from '../domain/officeUsual';
import { CaughtWindow, clockOf } from '../screens/Pledge';
import { PlaceIcon } from '../ui/PlaceIcon';
import { StatusRow } from '../ui/StatusRow';
import { undoEdit } from '../db/edits';
import '../styles/food.css';

export function MorningLog() {
  const settings = useSettings();
  const [date, setDate] = useLogDate();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  if (!settings || !days || !sessions || !sets) return <Sheet title="Good morning">{null}</Sheet>;
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
  const [sleepTimesEdited, setSleepTimesEdited] = useState(false);
  const [carried, setCarried] = useState(day?.sleep?.carried ?? false);
  const [rested, setRested] = useState<number | undefined>(day?.sleep?.rested);
  const [stepsEdited, setStepsEdited] = useState(false);
  const [steps, setSteps] = useState<number | undefined>(yesterday?.steps);
  const [place, setPlace] = useState<string>(day?.place ?? before.find((d) => d.place)?.place ?? places[0].id);
  const energy = day?.energy;
  const stomach = day?.stomach;
  const sore: Partial<Record<MuscleId, 1 | 2 | 3>> = day?.soreness ?? {};
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, day?.answers?.[q.id] ?? false])));
  const [saving, setSaving] = useState(false);
  // The morning round of the checklist saves with the log (y-morning).
  const morningSlots = checklistSlots(settings, today).filter((s) => isMorningSlot(s.slot));
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => Object.fromEntries(morningSlots.map((s) => [s.key, day?.ticks?.[s.key] !== undefined])));
  // Readiness's energy, stomach and soreness are retired from the form (R3 x-ready); answers already stored are kept.
  const [more, setMore] = useState(false);
  const [placeSet, setPlaceSet] = useState(day?.place !== undefined);
  const [asked, setAsked] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, day?.answers?.[q.id] !== undefined])));
  const answer = (id: string, yes: boolean) => {
    setAnswers({ ...answers, [id]: yes });
    setAsked({ ...asked, [id]: true });
  };
  const o = placeOptions(settings);
  const officeDay = isOfficeDay(day, settings.places ?? []);
  const yPlace = placeFor(yesterday, settings);
  const stepGoal = stepsGoal(targetsFor(settings, yesterdayKey), isEased(yesterday, yPlace));
  const also = alsoThisMorning({
    place: placeSet,
    status: day?.status !== undefined || !!day?.morning,
    ...Object.fromEntries(questions.map((q) => [`q:${q.id}`, !!asked[q.id]])),
    ...(morningSlots.length ? { checklist: morningSlots.every((s) => ticks[s.key]) } : {}),
    ...(settings.prefs.confirmSteps ? { steps: steps !== undefined } : {}),
  });
  const body = useBody();
  const trendNow = weight !== undefined ? weightTrend([...before.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })), { date: today, kg: weight }]).pop()?.trend : undefined;

  const sameAsYesterday = () => {
    if (!lastSleep) return;
    setAsleep(lastSleep.asleep);
    setWoke(lastSleep.woke);
    setCarried(true);
    setSleepTimesEdited(true);
  };
  const editAsleep = (m: number) => {
    setAsleep(m);
    setCarried(false);
    setSleepTimesEdited(true);
  };
  const editWoke = (m: number) => {
    setWoke(m);
    setCarried(false);
    setSleepTimesEdited(true);
  };
  const save = async () => {
    setSaving(true);
    const editId = await saveMorningLog(
      today,
      {
        weightKg: weight,
        sleep: asleep !== undefined && woke !== undefined ? { asleep, woke, rested, ...(carried ? { carried: true } : {}) } : undefined,
        sleepTimesEdited,
        yesterdaySteps: settings.prefs.confirmSteps && stepsEdited ? steps : undefined,
        place,
        energy,
        stomach,
        soreness: Object.keys(sore).length ? sore : undefined,
        answers,
      },
      yesterdayKey,
    );
    for (const s of morningSlots) if ((day?.ticks?.[s.key] !== undefined) !== !!ticks[s.key]) await setTick(today, s.key, !!ticks[s.key]);
    closeSheet();
    const flagged = questions.filter((q) => answers[q.id]);
    if (flagged.length) {
      const f = flagged[0];
      toast({ kicker: `${f.group} flagged`, text: swapSentence(settings.plan, f.swap) ?? 'Noted.', sub: f.advice, ms: 7000 });
    } else {
      const sleepMin = asleep !== undefined && woke !== undefined ? sleepMinutes(asleep, woke) : undefined;
      const parts = morningParts({ sleepMin, rested: sleepMin !== undefined ? rested : undefined, weightKg: weight, place: [o.home, o.office, ...o.rest].find((p) => p.id === place)?.name });
      toast({
        text: day?.morning ? 'Morning updated' : 'Morning logged',
        sub: weight === undefined ? `${fmtTime(Date.now())} · the weigh-in can follow: tap “Weigh-in to come” on Today.` : fmtTime(Date.now()),
        body: <MorningLogged parts={parts} sleepMin={sleepMin} sleepTarget={targetsFor(settings, today).sleepMin} />,
        ms: 6500,
        action: { label: 'Undo', run: () => void undoEdit(editId) },
      });
    }
  };

  const pledged = yesterday?.pledge?.at;
  return (
    <Sheet title="Good morning" sub={day?.bridgeSleep ? `${fmtDayLong(today)} · Sleep via Apple Health` : fmtDayLong(today)}>
      <div className="ml-sheet">
        <DateChip value={today} onChange={onDate} />
        <div className="k-row ml-sleephead">
          <h3 className="k-sect">Sleep</h3>
          {lastSleep && (
            <button type="button" className={`af-pill ml-same${carried ? ' on' : ''}`} aria-pressed={carried} onClick={sameAsYesterday}>
              Same as yesterday
            </button>
          )}
        </div>
        {/* Both ends take any time of day: a sleepless night can mean asleep at 7 am and awake at 2 pm. */}
        <NightDial asleep={asleep} woke={woke} hintAsleep={lastSleep?.asleep ?? 23 * 60} hintWoke={lastSleep?.woke ?? 7 * 60} onAsleep={editAsleep} onWoke={editWoke} />
        {typeof pledged === 'number' && <span className="k-q tn ml-pledged">Pledged lights out at {clockOf(pledged)}</span>}

        <h3 className="k-sect">How rested?</h3>
        <div className="ml-seg" role="radiogroup" aria-label="How rested">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rested === n} onClick={() => setRested(rested === n ? undefined : n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="ml-window">
          <CaughtWindow date={today} days={days} />
        </div>

      <div className="k-panel ml-weigh" style={{ '--ink': 'var(--k-gold)' } as React.CSSProperties}>
        <div className="k-row">
          <span className="k-col">
            <b className="ml-wlb">Weigh-in</b>
            <span className="k-q">{weight === undefined ? 'Not yet? Save now, add it after.' : lastWeight ? `last ${lastWeight.toFixed(1)} kg` : 'drag to set'}</span>
          </span>
          <b className="ml-kg tn">{weight === undefined ? '—' : weight.toFixed(1)} kg</b>
        </div>
        <div style={{ opacity: weight === undefined ? 0.45 : 1 }}>
          <Dial value={weight ?? lastWeight ?? 75} step={0.1} min={35} max={200} major={10} onChange={setWeight} label="Weight in kg" unit="kg" />
        </div>
        {trendNow !== undefined && weight !== undefined && (
          <div className="ml-trend" aria-live="polite">
            <span><b className="tn">{trendNow.toFixed(1)}</b> kg trend</span>
            <small>today’s reading {weight.toFixed(1)} kg</small>
          </div>
        )}
        <div className="k-q">After the toilet, before food or water. Leave it if you didn't weigh. The trend is the number that matters; a single morning moves with water.</div>
      </div>

      <div className="k-panel">
        <button type="button" className="row tap44" aria-expanded={more} onClick={() => setMore(!more)} style={{ minHeight: 44 }}>
          <span className="t15">Body</span>
          <span className="t14 q">{bodyTileWords(body ?? [], today)}</span>
        </button>
        {more && <BodyChart date={today} entries={body ?? []} />}
      </div>

      <section className="k-panel ml-also" aria-labelledby="ml-also-h">
        <div className="k-row ml-alsohead">
          <h3 id="ml-also-h" className="ml-alsoh">Also this morning</h3>
          <span className="ml-alsochip tn">{also.done} of {also.of}</span>
        </div>

        <span className="ml-lb">Where today</span>
        <div className="ml-places">
          {[o.home, o.office, ...o.rest].map((p) => {
            const on = place === p.id && !('virtual' in p && p.virtual);
            return (
              <button
                key={p.id}
                type="button"
                className={`ml-pl k-${p.kind}${on ? ' on' : ''}`}
                aria-pressed={on}
                onClick={async () => {
                  setPlace('virtual' in p && p.virtual ? await ensurePlace(p.kind as 'home' | 'office') : p.id);
                  setPlaceSet(true);
                }}
              >
                <PlaceIcon place={p} size={18} /> {p.name}
              </button>
            );
          })}
        </div>
        {/* Office days are away games (matchday §5): mark one by hand, or let the place do it. */}
        <button type="button" className={`chip sm ml-away${officeDay ? ' on' : ''}`} aria-pressed={officeDay} onClick={() => void setOfficeDay(today, !officeDay)}>
          Office day: an away game
        </button>

        <span className="ml-lb">How are you</span>
        <StatusRow today={today} current={day?.status} fine />

        {questions.map((q) => (
          <div key={q.id} className="ml-q">
            <span className="ml-lb">{q.question ?? q.label}</span>
            {q.hint && <span className="k-q">{q.hint}</span>}
            <div className="ml-yn" role="radiogroup" aria-label={q.question ?? q.label}>
              <button type="button" role="radio" aria-checked={!answers[q.id]} className={`chip sm${!answers[q.id] ? ' on' : ''}`} onClick={() => answer(q.id, false)}>
                No
              </button>
              <button type="button" role="radio" aria-checked={!!answers[q.id]} className={`chip sm${answers[q.id] ? ' on' : ''}`} onClick={() => answer(q.id, true)}>
                Yes
              </button>
            </div>
          </div>
        ))}

        {morningSlots.length > 0 && (
          <>
            <span className="ml-lb">Morning checklist</span>
            <div className="ml-ticks">
              {morningSlots.map((s) => (
                <button key={s.key} type="button" role="switch" aria-checked={!!ticks[s.key]} className={`chip sm ml-tick${ticks[s.key] ? ' on' : ''}`} onClick={() => setTicks({ ...ticks, [s.key]: !ticks[s.key] })}>
                  {ticks[s.key] && <Icon name="check" size={16} stroke={2.4} />}
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}

        {settings.prefs.confirmSteps && (
          <label className="flabel ml-steps">
            <span className="ml-lb">Yesterday's final steps</span>
            <StepsRing steps={steps} goal={stepGoal} />
            <IntField value={steps} onChange={(value) => { setSteps(value); setStepsEdited(true); }} placeholder="From your phone" label="Yesterday's final steps" />
            <span className="k-q lh">
              {yesterday?.steps !== undefined && yesterday.stepsAt ? `You logged ${fmtInt(yesterday.steps)} at ${fmtTime(yesterday.stepsAt)}. The final count is ready by now.` : 'The final count is ready by now.'}
            </span>
          </label>
        )}
      </section>


        <div className="ml-save">
          <button type="button" className="k-act wide" onClick={save} disabled={saving}>
            Save the morning
          </button>
        </div>
      </div>
    </Sheet>
  );
}
