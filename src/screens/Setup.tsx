import { useRef, useState, type ReactNode } from 'react';
import { dayKey } from '../domain/dates';
import { fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import type { Settings, Targets } from '../domain/types';
import { VOICES } from '../domain/voice';
import { bump, patchDay, patchSettings, saveMeasurement, setTargets } from '../db/actions';
import { parseBackup, restoreData, summarise } from '../db/backup';
import { useMeasurements, useSettings, useAllDays } from '../db/hooks';
import { askPersist, promptInstall, usePwa } from '../pwa';
import { go } from '../router';
import { DecField, IntField } from '../ui/controls';
import { Icon, type IconName } from '../ui/Icon';
import { Mark } from '../ui/Rings';
import { useToast } from '../ui/Toasts';
import { targetsFor } from '../state/derived';

type Step = 'hello' | 'numbers' | 'ready';

/** First launch. Your numbers come from your starter file or are typed here; none are built in. */
export function Setup() {
  const settings = useSettings();
  const [step, setStep] = useState<Step>('hello');
  if (!settings) return <div className="page bare" />;
  if (step === 'hello') return <Hello onManual={() => setStep('numbers')} onLoaded={() => setStep('ready')} />;
  if (step === 'numbers') return <Numbers settings={settings} onDone={() => setStep('ready')} onBack={() => setStep('hello')} />;
  return <Ready settings={settings} onEdit={() => setStep('numbers')} />;
}

function Pledge({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div className="row top" style={{ justifyContent: 'flex-start', gap: 14 }}>
      <Icon name={icon} color="var(--pearl)" style={{ marginTop: 1 }} />
      <div className="col gap2">
        <div className="t15">{title}</div>
        <div className="t13 q">{sub}</div>
      </div>
    </div>
  );
}

function Hello({ onManual, onLoaded }: { onManual: () => void; onLoaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const load = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const b = parseBackup(await f.text());
      await restoreData(b);
      toast({ kicker: b.kind === 'starter' ? 'Starter file loaded' : 'Backup restored', text: summarise(b), tone: 'sage' });
      onLoaded();
    } catch (e) {
      toast({ text: (e as Error).message, ms: 6000 });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page bare" style={{ gap: 22, paddingTop: 'calc(28px + var(--safe-top))' }}>
      <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <Mark />
        <span className="sf" style={{ fontSize: 20 }}>
          Health
        </span>
      </div>
      <div className="col gap10">
        <div className="sf" style={{ fontSize: 40, lineHeight: 1.05 }}>
          Hello.
        </div>
        <div className="t15 q lh">Food, steps, sleep, training and body, in one calm place. Load your starter file and everything is set up from your plan and your numbers.</div>
      </div>
      <div className="col gap14">
        <Pledge icon="lock" title="Stays on this phone" sub="No account and no cloud. You keep the backups." />
        <Pledge icon="clock" title="Seconds to log" sub="Your usual foods are one tap away." />
        <Pledge icon="trend" title="Trends, not noise" sub="Every celebration is earned." />
      </div>
      <div className="col gap10" style={{ marginTop: 8 }}>
        <button type="button" className="btn lg block" disabled={busy} onClick={() => input.current?.click()}>
          Load my starter file
        </button>
        <button type="button" className="btn lg ghost block" onClick={onManual}>
          Set up by hand
        </button>
        <div className="t12 d center lh">A starter file or a backup: both are .json files you pick from your phone or Google Drive.</div>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => (load(e.target.files?.[0]), (e.target.value = ''))} />
      </div>
    </div>
  );
}

function Numbers({ settings, onDone, onBack }: { settings: Settings; onDone: () => void; onBack: () => void }) {
  const today = dayKey();
  const t = settings.targets.length ? targetsFor(settings, today) : undefined;
  const [name, setName] = useState(settings.name);
  const [height, setHeight] = useState<number | undefined>(settings.heightCm);
  const [weight, setWeight] = useState<number | undefined>();
  const [waist, setWaist] = useState<number | undefined>();
  const [kcalMin, setKcalMin] = useState<number | undefined>(t?.kcalMin);
  const [kcalMax, setKcalMax] = useState<number | undefined>(t?.kcalMax);
  const [protein, setProtein] = useState<number | undefined>(t?.proteinG);
  const [steps, setSteps] = useState<number | undefined>(t?.steps);
  const [water, setWater] = useState<number | undefined>(t ? t.waterMl / 1000 : undefined);
  const [sleep, setSleep] = useState<number | undefined>(t ? t.sleepMin / 60 : undefined);
  const [sessions, setSessions] = useState<number | undefined>(t?.sessionsPerWeek);
  const ok = !!name.trim() && !!kcalMin && !!kcalMax && kcalMax >= kcalMin && !!protein && !!steps && !!water && !!sleep && !!sessions;

  const save = async () => {
    const targets: Targets = {
      kcalMin: kcalMin!,
      kcalMax: kcalMax!,
      proteinG: protein!,
      steps: steps!,
      waterMl: Math.round(water! * 1000),
      sleepMin: Math.round(sleep! * 60),
      sessionsPerWeek: sessions!,
    };
    await patchSettings({ name: name.trim(), heightCm: height });
    await setTargets(targets, settings.targets[0]?.from ?? today);
    if (weight) await patchDay(today, { weightKg: weight, weighedAt: Date.now() });
    if (waist) await saveMeasurement({ date: today, waistStanding: waist });
    onDone();
  };

  const field = (label: string, cls: string, el: ReactNode) => (
    <label className="flabel">
      <span className={`lbl ${cls}`}>{label}</span>
      {el}
    </label>
  );

  return (
    <div className="page bare" style={{ paddingTop: 'calc(18px + var(--safe-top))' }}>
      <button type="button" className="backlink" onClick={onBack}>
        <Icon name="left" size={20} stroke={1.8} />
        Back
      </button>
      <h1 className="h1">Your numbers</h1>
      <div className="t14 q lh">They stay on this phone. You can change any of them later in Settings.</div>
      {field('Your name, for the greeting', '', <input className="field" value={name} onChange={(e) => setName(e.target.value)} />)}
      <div className="grid2">
        {field('Height, cm', '', <DecField value={height} onChange={setHeight} placeholder="Optional" />)}
        {field('Weight today, kg', 'pearl', <DecField value={weight} onChange={setWeight} placeholder="Optional" />)}
        {field('Waist, in', 'pearl', <DecField value={waist} onChange={setWaist} placeholder="Standing" />)}
      </div>
      <div className="grp" style={{ padding: '10px 0 0' }}>
        Daily targets
      </div>
      <div className="grid2">
        {field('Calories from', 'apri', <IntField value={kcalMin} onChange={setKcalMin} placeholder="e.g. 2,000" />)}
        {field('Calories to', 'apri', <IntField value={kcalMax} onChange={setKcalMax} placeholder="e.g. 2,300" />)}
        {field('Protein, g', 'lav', <IntField value={protein} onChange={setProtein} placeholder="e.g. 140" />)}
        {field('Steps', 'sage', <IntField value={steps} onChange={setSteps} placeholder="e.g. 10,000" />)}
        {field('Water, litres', 'blue', <DecField value={water} onChange={setWater} placeholder="e.g. 3" />)}
        {field('Sleep, hours', 'blue', <DecField value={sleep} onChange={setSleep} placeholder="e.g. 7" />)}
        {field('Sessions a week', '', <IntField value={sessions} onChange={setSessions} placeholder="e.g. 4" />)}
      </div>
      <div className="t13 q lh">Calories close inside a range, with a floor as well as a ceiling, so eating too little never counts as a win.</div>
      <button type="button" className="btn lg block" disabled={!ok} onClick={save}>
        Continue
      </button>
    </div>
  );
}

function Ready({ settings, onEdit }: { settings: Settings; onEdit: () => void }) {
  const pwa = usePwa();
  const days = useAllDays();
  const ms = useMeasurements();
  const t = targetsFor(settings, dayKey());
  const lastW = days?.filter((d) => d.weightKg !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg;
  const lastWaist = ms?.filter((m) => m.waistStanding !== undefined).pop();
  const voice = VOICES.find((v) => v.id === settings.voice) ?? VOICES[0];
  const rows: [string, string][] = [
    ...(settings.heightCm ? ([['Height', `${settings.heightCm} cm`]] as [string, string][]) : []),
    ...(lastW ? ([['Weight', `${lastW} kg`]] as [string, string][]) : []),
    ...(lastWaist ? ([['Waist', `${lastWaist.waistStanding} in standing${lastWaist.waistSlouched ? ` · ${lastWaist.waistSlouched} slouched` : ''}`]] as [string, string][]) : []),
    ['Calories', `${fmtInt(t.kcalMin)}–${fmtInt(t.kcalMax)} a day`],
    ['Protein', `${t.proteinG} g a day`],
    ['Steps · sleep', `${fmtInt(t.steps)} · ${fmtDuration(t.sleepMin)} or more`],
    ['Water', `${fmtLitres(t.waterMl)} L`],
    ['Training', settings.plan ? `${settings.plan.name}, ${t.sessionsPerWeek} a week` : `${t.sessionsPerWeek} a week, no plan yet`],
  ];

  const start = async () => {
    await patchSettings({ setupDone: true });
    await askPersist();
    go('/today', undefined, { replace: true });
  };

  return (
    <div className="page bare" style={{ gap: 18, paddingTop: 'calc(28px + var(--safe-top))' }}>
      <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <Mark />
        <span className="sf" style={{ fontSize: 20 }}>
          Health
        </span>
      </div>
      <div className="sf" style={{ fontSize: 40, lineHeight: 1.05 }}>
        Hello{settings.name ? `, ${settings.name}` : ''}.
      </div>
      <div className="t15 q lh">Check the numbers below, then you're ready.</div>

      <div className="col gap10">
        <div className="lbl">Pick a voice</div>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              className="chip"
              style={settings.voice === v.id ? { background: v.color, borderColor: v.color, color: '#15121f', fontWeight: 600, padding: 0, fontSize: 13 } : { color: v.color, padding: 0, fontSize: v.id === 'comm' ? 12 : 13 }}
              onClick={() => {
                void patchSettings({ voice: v.id });
                void bump('voices', { value: v.id });
              }}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="voice" style={{ fontSize: 15 }}>
          {voice.hello}
        </div>
      </div>

      <div className="list" style={{ padding: '16px 20px 6px' }}>
        <div className="row" style={{ paddingBottom: 4 }}>
          <div className="lbl">Your starting point</div>
          <button type="button" className="pearl t14" style={{ height: 44 }} onClick={onEdit}>
            Edit
          </button>
        </div>
        {rows.map(([a, b]) => (
          <div key={a} className="row t14" style={{ minHeight: 42, borderTop: '1px solid var(--divider)' }}>
            <span className="q">{a}</span>
            <span className="right">{b}</span>
          </div>
        ))}
      </div>

      {!pwa.installed && (
        <div className="row top" style={{ gap: 14, padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 18, justifyContent: 'flex-start' }}>
          <Icon name="phone" color="var(--quiet)" style={{ marginTop: 1 }} />
          <div className="col gap10">
            <div className="t14 q lh">One-time step: in Chrome, tap the ⋮ menu, then Add to Home screen. Open Health from its new icon so it runs full-screen.</div>
            {pwa.canInstall && (
              <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => promptInstall()}>
                Install now
              </button>
            )}
          </div>
        </div>
      )}

      <button type="button" className="btn lg block" onClick={start}>
        Start
      </button>
    </div>
  );
}
