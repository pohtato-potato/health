import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { unlockWithFingerprint, usePhotosUnlocked } from '../checkin/lock';
import { addDays, daysBetween } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtInt } from '../domain/format';
import { MONTH_NAMES } from '../domain/period';
import { findExercise } from '../domain/plan';
import { periodStats } from '../domain/period';
import { prefOn, type CheckIn, type Pose } from '../domain/types';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { journeyStart } from './Journey';
import { benchmarkOn, benchmarkProgress } from '../domain/benchmark';

const POSES: { id: Pose; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
];

/** Object URLs for a list of stored photos, released when they change. */
function usePhotoUrls(ids: string[]): (string | undefined)[] {
  const key = ids.join(',');
  const blobs = useLiveQuery(async () => (await db.photos.bulkGet(ids)).map((p) => p?.blob), [key]);
  const [urls, setUrls] = useState<(string | undefined)[]>([]);
  useEffect(() => {
    if (!blobs) return;
    const made = blobs.map((b) => (b ? URL.createObjectURL(b) : undefined));
    setUrls(made);
    return () => made.forEach((u) => u && URL.revokeObjectURL(u));
  }, [blobs]);
  return urls;
}

/** The year played back, a photo at a time. */
function Timelapse({ frames }: { frames: { id: string; date: string }[] }) {
  const urls = usePhotoUrls(frames.map((f) => f.id));
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % frames.length), 900);
    return () => window.clearInterval(t);
  }, [playing, frames.length]);
  if (!frames.length) return null;
  const f = frames[Math.min(i, frames.length - 1)];
  return (
    <div className="col gap8">
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 18, overflow: 'hidden', background: 'var(--raised)' }}>
        {urls.map((u, k) => u && <img key={k} src={u} alt={k === i ? `Check-in on ${fmtDayMonth(frames[k].date)}` : ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: k === i ? 1 : 0, transition: 'opacity .45s ease' }} />)}
        <span className="t13" style={{ position: 'absolute', left: 12, bottom: 12, padding: '4px 10px', borderRadius: 10, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
          {MONTH_NAMES[Number(f.date.slice(5, 7)) - 1]} {f.date.slice(0, 4)}
        </span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn ghost sm" onClick={() => setPlaying(!playing)}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
          {playing ? 'Pause' : 'Play'}
        </button>
        <input type="range" min={0} max={frames.length - 1} value={i} onChange={(e) => (setPlaying(false), setI(Number(e.target.value)))} aria-label="Scrub through the year" style={{ flex: 1 }} />
        <span className="t12 q tn">
          {i + 1}/{frames.length}
        </span>
      </div>
    </div>
  );
}

function FirstLast({ first, last }: { first: { id: string; date: string }; last: { id: string; date: string } }) {
  const [a, b] = usePhotoUrls([first.id, last.id]);
  const frame = (u: string | undefined, date: string) => (
    <div style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden', background: 'var(--raised)' }}>
      {u && <img src={u} alt={`Check-in on ${fmtDayMonth(date)}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <span className="t12" style={{ position: 'absolute', left: 8, bottom: 8, padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
        {fmtDayMonth(date)}
      </span>
    </div>
  );
  return (
    <div className="grid2" style={{ gap: 8 }}>
      {frame(a, first.date)}
      {frame(b, last.date)}
    </div>
  );
}

/** Sealed until the goal date; then the lines, the photos and the year's numbers, all at once. */
export function RevealPage() {
  const settings = useSettings();
  const today = useToday();
  const checkins = useLiveQuery(async () => (await db.checkins.toArray()).sort((a, b) => a.date.localeCompare(b.date)), []);
  const unlockedPhotos = usePhotosUnlocked();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const measurements = useMeasurements();
  const unlocks = useLiveQuery(() => db.achievements.toArray(), []);
  const [pose, setPose] = useState<Pose>('front');
  if (!settings || !checkins || !days || !entries || !sessions || !sets || !measurements || !unlocks) return <div className="page bare" />;
  const goal = settings.goalDate;
  const lines = checkins.filter((c): c is CheckIn & { line: string } => !!c.line?.trim());
  const backLink = (
    <button type="button" className="backlink" onClick={() => back('/you')}>
      <Icon name="left" size={20} stroke={1.8} />
      You
    </button>
  );

  if (!goal || today < goal) {
    const b = goal && settings.heightCm ? benchmarkProgress(measurements, settings.heightCm, today) : undefined;
    const f = b && goal ? benchmarkOn(b, today, goal) : undefined;
    const start = checkins[0]?.date ?? today;
    const monthly = goal ? Math.max(1, Math.round(daysBetween(start, goal) / 30.4) + 1) : 0;
    const waiting: [string, string][] = [
      ['Photo timelapse', `${checkins.length} of ${monthly} check-ins so far`],
      ['First and last photo', 'side by side'],
      ['Sealed lines', `${lines.length} sealed · read back in order`],
      ...(f ? ([['Your benchmark', `forecast ${f.range[0].toFixed(2)}–${f.range[1].toFixed(2)}`]] as [string, string][]) : []),
    ];
    return (
      <div className="page bare">
        {backLink}
        {goal ? (
          <>
            <div className="col gap2">
              <div className="serif tn" style={{ fontSize: 64, lineHeight: 1 }}>
                {fmtInt(daysBetween(today, goal))}
              </div>
              <div className="t15 q">days to reveal day, {fmtDayMonth(goal)}</div>
            </div>
            <div className="card" style={{ gap: 0, padding: '4px 16px' }}>
              {waiting.map(([k, v]) => (
                <div key={k} className="diary-row" style={{ textAlign: 'left' }}>
                  <span className="row" style={{ gap: 10 }}>
                    <Icon name="lock" size={16} color="var(--gold)" />
                    <span className="t15">{k}</span>
                  </span>
                  <span className="t13 q right">{v}</span>
                </div>
              ))}
            </div>
            <div className="voice">Nothing here opens early. That’s the point.</div>
          </>
        ) : (
          <div className="t15 q lh">Set a goal date in Settings, and everything you seal opens on that day.</div>
        )}
      </div>
    );
  }

  if (prefOn(settings.prefs, 'lockPhotos') && settings.photoKey && !unlockedPhotos) {
    return (
      <div className="page bare" style={{ alignItems: 'center', textAlign: 'center', gap: 16 }}>
        <div style={{ alignSelf: 'flex-start' }}>{backLink}</div>
        <Icon name="lock" size={44} color="var(--gold)" />
        <div className="sf" style={{ fontSize: 28 }}>
          It's reveal day
        </div>
        <div className="t15 q lh">Your photos are behind your fingerprint. Unlock to see the year.</div>
        <button type="button" className="btn lg" onClick={() => void unlockWithFingerprint(settings.photoKey!)}>
          Unlock
        </button>
      </div>
    );
  }

  const frames = checkins.filter((c) => c.photos[pose]).map((c) => ({ id: c.photos[pose]!, date: c.date }));
  const start = journeyStart(settings, days);
  const s = periodStats(settings, start, addDays(today, -1) < goal ? addDays(today, -1) : goal, {
    days,
    entries,
    sessions,
    sets,
    measurements,
    unlocks,
    pairs: (id) => !!settings.plan && findExercise(settings.plan, id)?.load === 'pair',
  });
  const numbers: [string, string][] = [
    ...(s.trendStart !== undefined && s.trendEnd !== undefined ? [[`${s.trendEnd <= s.trendStart ? '−' : '+'}${fmt1(Math.abs(s.trendEnd - s.trendStart))} kg`, 'weight trend'] as [string, string]] : []),
    ...(s.waistStart !== undefined && s.waistEnd !== undefined ? [[`${s.waistEnd <= s.waistStart ? '−' : '+'}${fmt1(Math.abs(s.waistEnd - s.waistStart))} in`, 'waist'] as [string, string]] : []),
    [`${fmtInt(s.km)} km`, 'walked'],
    [fmtInt(s.sessions), 'sessions'],
    [fmtInt(s.perfect), 'perfect days'],
    [fmtInt(unlocks.length), 'achievements'],
  ];

  return (
    <div className="page bare">
      {backLink}
      <div className="col gap6">
        <div className="lbl gold">Reveal day · {fmtDayMonth(goal)}</div>
        <h1 className="h1">The year, opened</h1>
        <div className="t15 q lh">
          From {fmtDayMonth(start)} {start.slice(0, 4)}: {checkins.length} check-ins and {lines.length} sealed line{lines.length === 1 ? '' : 's'}.
        </div>
      </div>

      {frames.length > 0 && (
        <>
          <Seg options={POSES.map((p) => ({ id: p.id, label: p.label }))} value={pose} onChange={setPose} />
          <Timelapse key={pose} frames={frames} />
          {frames.length > 1 && (
            <>
              <div className="lbl">First and last</div>
              <FirstLast first={frames[0]} last={frames[frames.length - 1]} />
            </>
          )}
        </>
      )}

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {numbers.map(([n, label]) => (
          <div key={label} className="col gap2">
            <b className="num" style={{ fontSize: 26 }}>
              {n}
            </b>
            <span className="t12 q">{label}</span>
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <div className="card" style={{ gap: 14 }}>
          <div className="lbl gold">Your lines, in order</div>
          {lines.map((c) => (
            <div key={c.id} className="col gap4">
              <span className="t12 q">
                {MONTH_NAMES[Number(c.date.slice(5, 7)) - 1]} {c.date.slice(0, 4)}
              </span>
              <span className="voice" style={{ fontSize: 17 }}>
                {c.line}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
