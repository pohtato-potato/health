import { RegionFrame } from '../ui/live/RegionFrame';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { scheduleDing, unlockAudio } from '../audio';
import { fromFile, grabFrame, openCamera, stopCamera } from '../checkin/camera';
import { usePhotoUrl } from '../checkin/lock';
import { addDays, dayKey } from '../domain/dates';
import { fmt1, fmtDayMonth } from '../domain/format';
import { weightTrend } from '../domain/streaks';
import { prefOn, type CheckIn, type Measurement, type Pose } from '../domain/types';
import { patchSettings } from '../db/actions';
import { db, uid } from '../db/db';
import { useAllDays, useSettings } from '../db/hooks';
import { go } from '../router';
import { Stepper } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { saveFullBackup } from '../db/fullBackup';
import { askConfirm } from '../ui/Confirm';
import { flipFor, TORSO_GUIDES } from '../checkin/framing';

type Shot = { blob: Blob; width: number; height: number };
type Step = 'photos' | 'tape' | 'tshirt' | 'result';
const POSES: Pose[] = ['front', 'side', 'back'];
const POSE_NAME: Record<Pose, string> = { front: 'Front', side: 'Side', back: 'Back', tshirt: 'T-shirt' };
const QUESTIONS: { id: 'shoulders' | 'arms' | 'stomach'; label: string }[] = [
  { id: 'shoulders', label: 'Shoulders fill it' },
  { id: 'arms', label: 'Arms fill the sleeves' },
  { id: 'stomach', label: 'Stomach flat under it' },
];

/** The last check-in and its tape readings, for ghosts and comparisons. */
function useLast() {
  return useLiveQuery(async () => {
    const checkins = (await db.checkins.toArray()).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    const ms = (await db.measurements.toArray()).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    const last = checkins[checkins.length - 1];
    const lastWaist = [...ms].reverse().find((m) => m.waistStanding !== undefined);
    const lastRelaxed = [...ms].reverse().find((m) => m.waistRelaxed !== undefined);
    const lastSlouch = [...ms].reverse().find((m) => m.waistSlouched !== undefined);
    const lastShoulders = [...ms].reverse().find((m) => m.shoulders !== undefined);
    return { last, count: checkins.length, lastWaist, lastRelaxed, lastSlouch, lastShoulders };
  }, []);
}

export function CheckInScreen() {
  const settings = useSettings();
  const days = useAllDays();
  const live = useLast();
  // Freeze what came before, so the results compare against last time, not against themselves.
  const frozen = useRef<typeof live>(undefined);
  if (live && !frozen.current) frozen.current = live;
  const last = frozen.current;
  const toast = useToast();
  const [step, setStep] = useState<Step>('photos');
  const [shots, setShots] = useState<Partial<Record<Pose, Shot>>>({});
  const [pose, setPose] = useState<Pose>('front');
  const [standing, setStanding] = useState<number | null>(null);
  const [relaxed, setRelaxed] = useState<number | null>(null);
  const [slouched, setSlouched] = useState<number | null>(null);
  const [shoulders, setShoulders] = useState<number | null>(null);
  const [tee, setTee] = useState<Record<'shoulders' | 'arms' | 'stomach', number>>({ shoulders: 0, arms: 0, stomach: 0 });
  const [line, setLine] = useState('');
  const [saved, setSaved] = useState<CheckIn | null>(null);
  const started = useRef(Date.now());

  if (!settings || !days || !last) return <RegionFrame className="bare" />;
  const std = standing ?? last.lastWaist?.waistStanding ?? 36;
  const rel = relaxed ?? last.lastRelaxed?.waistRelaxed ?? std + 1;
  const sl = slouched ?? last.lastSlouch?.waistSlouched ?? std + 1.5;
  const sh = shoulders ?? last.lastShoulders?.shoulders ?? 46;
  const stepNo = { photos: 1, tape: 2, tshirt: 3, result: 5 }[step];

  const save = async () => {
    const id = uid();
    const date = dayKey();
    const photos: CheckIn['photos'] = {};
    for (const [p, s] of Object.entries(shots) as [Pose, Shot][]) {
      const pid = uid();
      await db.photos.put({ id: pid, checkinId: id, date, pose: p, blob: s.blob, width: s.width, height: s.height });
      photos[p] = pid;
    }
    const m: Measurement = { id: uid(), date, at: Date.now(), waistStanding: std, waistRelaxed: rel, waistSlouched: sl, shoulders: sh };
    await db.measurements.put(m);
    const tshirt = tee.shoulders && tee.arms && tee.stomach ? { ...tee } : undefined;
    const c: CheckIn = { id, date, at: Date.now(), photos, measurementId: m.id, tshirt, line: line.trim() || undefined };
    await db.checkins.put(c);
    setSaved(c);
    setStep('result');
  };

  const header = (
    <div className="row">
      <button
        type="button"
        className="icon-btn"
        aria-label="Leave the check-in"
        onClick={async () => {
          if (step === 'result' || (await askConfirm({ title: 'Leave the check-in?', body: 'Nothing from it is saved yet.', yes: 'Leave', no: 'Stay' }))) go('/today', undefined, { replace: true });
        }}
      >
        <Icon name="close" size={20} stroke={1.8} />
      </button>
      <div className="lbl">
        Check-in · {step === 'tshirt' ? '3 and 4' : stepNo} of 5
      </div>
      <div style={{ width: 44 }} />
    </div>
  );

  if (step === 'photos') {
    const done = POSES.filter((p) => shots[p]).length;
    return (
      <RegionFrame className="bare" style={{ gap: 14, paddingTop: 'calc(12px + var(--safe-top))' }}>
        {header}
        <h1 className="h1">Photos</h1>
        <div className="seg" role="tablist">
          {POSES.map((p) => (
            <button key={p} type="button" role="tab" className={p === pose ? 'on' : undefined} onClick={() => setPose(p)}>
              {POSE_NAME[p]}
              {shots[p] ? ' ✓' : ''}
            </button>
          ))}
        </div>
        <Capture
          key={pose}
          pose={pose}
          ghostId={last.last?.photos[pose]}
          ghostDate={last.last?.date}
          shot={shots[pose]}
          onShot={(s) => {
            setShots((x) => ({ ...x, [pose]: s }));
            const next = POSES.find((p) => p !== pose && !shots[p]);
            if (next) setPose(next);
          }}
          onRetake={() => setShots((x) => ({ ...x, [pose]: undefined }))}
        />
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn ghost" onClick={() => setStep('tape')}>
            {done ? 'Skip the rest' : 'Skip photos'}
          </button>
          <button type="button" className="btn grow" disabled={done < 3} onClick={() => setStep('tape')}>
            Next: tape measure
          </button>
        </div>
      </RegionFrame>
    );
  }

  if (step === 'tape') {
    return (
      <RegionFrame className="bare" style={{ gap: 16, paddingTop: 'calc(12px + var(--safe-top))' }}>
        {header}
        <h1 className="h1">Tape measure</h1>
        <div className="card" style={{ gap: 6 }}>
          <div className="t14 lh">
            <b style={{ fontWeight: 500 }}>Waist:</b> <span className="q">at the navel. Tape level, snug but not tight, breathe out normally.</span>
          </div>
          <div className="t14 lh">
            <b style={{ fontWeight: 500 }}>Shoulders:</b> <span className="q">around the widest point, arms relaxed.</span>
          </div>
        </div>
        <Measure label="Waist, relaxed" hint={last.lastRelaxed ? `Last time ${last.lastRelaxed.waistRelaxed} · stand normally, breathe out, don't pull in` : "Stand normally, breathe out, don't pull in"} value={rel} onChange={setRelaxed} />
        <Measure label="Waist, stomach tucked" hint={last.lastWaist ? `Last time ${last.lastWaist.waistStanding}` : 'First reading'} value={std} onChange={setStanding} />
        <Measure label="Waist, slouched" hint={last.lastSlouch ? `Last time ${last.lastSlouch.waistSlouched} · the gap tracks posture` : 'The gap from standing tracks posture'} value={sl} onChange={setSlouched} />
        <Measure label="Shoulders" hint={last.lastShoulders ? `Last time ${last.lastShoulders.shoulders}` : 'First reading'} value={sh} onChange={setShoulders} />
        <div className="row card" style={{ flexDirection: 'row' }}>
          <span className="t15">Shoulder-to-waist</span>
          <span className="num" style={{ fontSize: 26 }}>
            {(sh / std).toFixed(2)}
          </span>
        </div>
        <button type="button" className="btn lg block" onClick={() => setStep('tshirt')}>
          Next: t-shirt test
        </button>
      </RegionFrame>
    );
  }

  if (step === 'tshirt') {
    const lastTee = last.last?.tshirt;
    return (
      <RegionFrame className="bare" style={{ gap: 16, paddingTop: 'calc(12px + var(--safe-top))' }}>
        {header}
        <h1 className="h1">T-shirt test and your line</h1>
        <Capture
          pose="tshirt"
          ghostId={last.last?.photos.tshirt}
          ghostDate={last.last?.date}
          shot={shots.tshirt}
          compact
          onShot={(s) => setShots((x) => ({ ...x, tshirt: s }))}
          onRetake={() => setShots((x) => ({ ...x, tshirt: undefined }))}
        />
        <div className="t13 q lh">The same fitted t-shirt every month, so the only thing that changes is you.</div>
        {QUESTIONS.map((q) => (
          <div key={q.id} className="col gap8">
            <div className="row base">
              <span className="t15">{q.label}</span>
              {lastTee && <span className="t12 q">last time {lastTee[q.id]}</span>}
            </div>
            <div className="row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`round${tee[q.id] === n ? ' on' : ''}`} onClick={() => setTee((t) => ({ ...t, [q.id]: n }))}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <label className="flabel">
          <span className="lbl">One line for reveal day</span>
          <input className="field" value={line} onChange={(e) => setLine(e.target.value)} placeholder="How does this month feel?" />
          <span className="t12 q">Sealed until {settings.goalDate ? fmtDayMonth(settings.goalDate) : 'reveal day'}, then read back in order.</span>
        </label>
        <button type="button" className="btn lg block" onClick={save}>
          See this month's results
        </button>
      </RegionFrame>
    );
  }

  // Results
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const trendNow = trend[trend.length - 1];
  const trendBefore = last.last ? [...trend].reverse().find((t) => t.date <= last.last!.date) : undefined;
  const prevW = last.lastWaist;
  const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
  const delta = (now: number, before?: number) => (before === undefined ? undefined : now - before);
  const fmtD = (d?: number) => (d === undefined ? '' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt1(Math.abs(d))}`);
  const rows: [string, string, string][] = [
    ['Waist, standing', `${std} in`, prevW ? `${fmtD(delta(std, prevW.waistStanding))} since ${fmtDayMonth(prevW.date)}` : 'first reading'],
    ['Waist, slouched', `${sl} in`, last.lastSlouch ? fmtD(delta(sl, last.lastSlouch.waistSlouched)) : 'first reading'],
    ['Posture gap', `${fmt1(sl - std)} in`, last.lastSlouch && last.lastWaist ? `${fmtD(sl - std - (last.lastSlouch.waistSlouched! - last.lastWaist.waistStanding!))}${sl - std < last.lastSlouch.waistSlouched! - last.lastWaist.waistStanding! ? ', standing taller' : ''}` : ''],
    ['Shoulders', `${sh} in`, last.lastShoulders ? fmtD(delta(sh, last.lastShoulders.shoulders)) : 'first reading'],
    ['Shoulder-to-waist', (sh / std).toFixed(2), last.lastShoulders && last.lastWaist ? fmtRatio(sh / std - last.lastShoulders.shoulders! / last.lastWaist.waistStanding!) : 'your starting point'],
    ...(saved?.tshirt ? ([['T-shirt test', `${saved.tshirt.shoulders} · ${saved.tshirt.arms} · ${saved.tshirt.stomach}`, last.last?.tshirt ? 'shoulders · arms · stomach' : 'first test']] as [string, string, string][]) : []),
    ...(trendNow ? ([['Weight, trend', `${fmt1(trendNow.trend)} kg`, trendBefore ? fmtD(trendNow.trend - trendBefore.trend) : '']] as [string, string, string][]) : []),
  ];
  const next = addDays(dayKey(), 30);

  return (
    <RegionFrame className="bare" style={{ gap: 16, paddingTop: 'calc(12px + var(--safe-top))' }}>
      {header}
      <div className="col gap6">
        <h1 className="h1" style={{ fontSize: 32 }}>
          Check-in complete
        </h1>
        <div className="t14 q">All done in {minutes} minute{minutes === 1 ? '' : 's'}. Here's the month.</div>
      </div>
      <div className="card" style={{ gap: 0 }}>
        {rows.map(([a, b, c]) => (
          <div key={a} className="row base" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
            <span className="t14 q">{a}</span>
            <span className="right">
              <span className="t16">{b}</span>
              {c && <div className="t12 q">{c}</div>}
            </span>
          </div>
        ))}
      </div>
      {saved?.line && (
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="lock" size={20} color="var(--gold)" />
          <div className="t14 lh">Your line is sealed until {settings?.goalDate ? fmtDayMonth(settings.goalDate) : 'reveal day'}, with the others. You'll read them back in order.</div>
        </div>
      )}
      {saved && Object.keys(saved.photos).length > 0 && (
        <div className="grid2" style={{ gridTemplateColumns: `repeat(${Object.keys(saved.photos).length}, minmax(0, 1fr))`, gap: 8 }}>
          {(Object.entries(saved.photos) as [Pose, string][]).map(([p, id]) => (
            <Thumb key={p} id={id} label={POSE_NAME[p]} />
          ))}
        </div>
      )}
      <div className="card gold">
        <div className="lbl gold">Back up the photos</div>
        <div className="t14 lh">Photos only change at check-ins, so a full backup now keeps this month safe. Save it to Google Drive.</div>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const r = await saveFullBackup();
            if (r !== 'cancelled') toast({ kicker: 'Full backup', text: r === 'shared' ? 'Handed over. Pick Drive to keep it safe.' : 'Saved to Downloads.', tone: 'sage' });
          }}
        >
          Full backup now
        </button>
      </div>
      <div className="t13 q center">Next check-in: {fmtDayMonth(next)}</div>
      <div className="row" style={{ gap: 10 }}>
        {last.count > 0 && (
          <button type="button" className="btn ghost grow" onClick={() => go('/photos', undefined, { replace: true })}>
            Compare
          </button>
        )}
        <button type="button" className="btn grow" onClick={() => go('/today', undefined, { replace: true })}>
          Done
        </button>
      </div>
    </RegionFrame>
  );
}

function fmtRatio(d: number): string {
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(2)}`;
}

function Measure({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="col gap8">
      <div className="row base">
        <span className="lbl pearl">{label}</span>
        <span className="t12 q">{hint}</span>
      </div>
      <Stepper value={value} onChange={onChange} step={0.1} min={20} max={70} decimals={1} unit="in" size={34} label={label} />
    </div>
  );
}

export function Thumb({ id, label }: { id: string; label?: string }) {
  const url = usePhotoUrl(id);
  return (
    <div className="col gap4" style={{ alignItems: 'center' }}>
      <div style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden', background: 'var(--raised)' }}>
        {url && <img src={url} alt={label ?? 'Check-in photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      {label && <span className="t12 q">{label}</span>}
    </div>
  );
}

/** The camera, framed head to hips: last month's photo as a faint outline, a shoulder line and a hip edge to line up with. */
function Capture({
  pose,
  ghostId,
  ghostDate,
  shot,
  onShot,
  onRetake,
  compact,
}: {
  pose: Pose;
  ghostId?: string;
  ghostDate?: string;
  shot?: Shot;
  onShot: (s: Shot) => void;
  onRetake: () => void;
  compact?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [timer, setTimer] = useState(true);
  const settings = useSettings();
  const mirror = !!settings && prefOn(settings.prefs, 'mirrorCheckIn');
  const flip = flipFor(facing, mirror);
  const ghost = usePhotoUrl(ghostId);
  const [shotUrl, setShotUrl] = useState<string>();

  useEffect(() => {
    if (!shot) {
      setShotUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(shot.blob);
    setShotUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [shot]);

  useEffect(() => {
    if (shot) return;
    let cancelled = false;
    openCamera(facing)
      .then((s) => {
        if (cancelled) return stopCamera(s);
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => {});
        }
        setError(null);
      })
      .catch(() => setError('The camera is off-limits here. Use the camera app instead.'));
    return () => {
      cancelled = true;
      stopCamera(stream.current);
      stream.current = null;
    };
  }, [facing, shot]);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      if (video.current) void grabFrame(video.current, flip).then(onShot);
      return;
    }
    const t = window.setTimeout(() => setCount(count - 1), 1000);
    return () => window.clearTimeout(t);
  }, [count, flip, onShot]);

  const take = () => {
    unlockAudio();
    if (timer) {
      scheduleDing(10);
      setCount(10);
    } else if (video.current) void grabFrame(video.current, flip).then(onShot);
  };

  const height = compact ? 'min(56vh, 420px)' : 'min(62vh, 520px)';
  return (
    <div className="col gap10">
      <div style={{ position: 'relative', height, borderRadius: 22, overflow: 'hidden', background: '#000', border: '1px solid var(--hairline)' }}>
        {shotUrl ? (
          <img src={shotUrl} alt={`${POSE_NAME[pose]} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <video ref={video} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: flip ? 'scaleX(-1)' : undefined }} />
            {ghost && <img src={ghost} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.32, mixBlendMode: 'screen', pointerEvents: 'none' }} />}
            <TorsoGuides />
            {count !== null && (
              <div className="num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120, color: 'rgba(255,255,255,.85)' }}>
                {count}
              </div>
            )}
            {error && (
              <div className="col gap10" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <div className="t15 q">{error}</div>
              </div>
            )}
          </>
        )}
        {!shotUrl && (
          <div className="t12" style={{ position: 'absolute', left: 12, bottom: 12, right: 12, color: 'rgba(255,255,255,.75)', textShadow: '0 1px 4px #000' }}>
            {ghost ? `Line up with ${ghostDate ? fmtDayMonth(ghostDate) : "last month"}'s outline. ` : ''}Head to hips: shoulders on the line, hips on the edge.{mirror ? ' Mirror mode is on.' : ''}
          </div>
        )}
      </div>
      {shotUrl ? (
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn ghost grow" onClick={onRetake}>
            Retake
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="tool" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>
            <Icon name="swap" size={16} stroke={1.8} />
            {facing === 'user' ? 'Front camera' : 'Back camera'}
          </button>
          <button
            type="button"
            className={`tool${mirror ? ' on' : ''}`}
            aria-pressed={mirror}
            title="For photos shot in a mirror: flips them back so left stays left"
            onClick={() => void patchSettings((s) => ({ prefs: { ...s.prefs, mirrorCheckIn: !mirror } }))}
          >
            <Icon name="swap" size={16} stroke={1.8} />
            Mirror
          </button>
          <button type="button" className={`tool${timer ? ' on' : ''}`} onClick={() => setTimer(!timer)} aria-pressed={timer}>
            <Icon name="clock" size={16} stroke={1.8} />
            10 s
          </button>
          <button type="button" className="btn grow" disabled={!!error || count !== null} onClick={take}>
            {count !== null ? `${count}…` : `Take ${POSE_NAME[pose].toLowerCase()}`}
          </button>
        </div>
      )}
      {!shotUrl && (
        <>
          <button type="button" className="link tap44" style={{ alignSelf: 'center', minHeight: 32 }} onClick={() => fileInput.current?.click()}>
            Use the camera app instead
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture={facing}
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onShot(await fromFile(f));
            }}
          />
        </>
      )}
    </div>
  );
}

/** The head-to-hips frame: a torso outline, the shoulder line and the hip edge. */
function TorsoGuides() {
  const { head, shoulder, hip } = TORSO_GUIDES;
  const y = (f: number) => f * 100;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <g fill="none" stroke="rgba(237,230,218,.5)" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
        <ellipse cx="50" cy={y((head + shoulder) / 2) - 1} rx="9" ry={y((shoulder - head) / 2) - 1} strokeDasharray="2 2" />
        <path
          d={`M28 ${y(shoulder)} C 22 ${y(shoulder) + 4}, 22 ${y(shoulder) + 22}, 30 ${y(shoulder) + 30} C 32 ${y(hip) - 22}, 30 ${y(hip) - 8}, 32 ${y(hip)} M72 ${y(shoulder)} C 78 ${y(shoulder) + 4}, 78 ${y(shoulder) + 22}, 70 ${y(shoulder) + 30} C 68 ${y(hip) - 22}, 70 ${y(hip) - 8}, 68 ${y(hip)}`}
          strokeDasharray="2 2"
        />
      </g>
      <g stroke="#F2C46D" strokeOpacity=".75" strokeWidth="1" vectorEffect="non-scaling-stroke">
        <line x1="14" x2="86" y1={y(shoulder)} y2={y(shoulder)} />
        <line x1="14" x2="86" y1={y(hip)} y2={y(hip)} strokeDasharray="4 3" />
      </g>
    </svg>
  );
}
