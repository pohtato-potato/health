import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type CSSProperties } from 'react';
import { canUseFingerprint, unlockWithFingerprint, usePhotoUrl, usePhotosUnlocked } from '../checkin/lock';
import { addDays, daysBetween, dayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { prefOn, type CheckIn, type Pose } from '../domain/types';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { back, go } from '../router';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';

type Mode = 'side' | 'slider' | 'overlay';
const POSES: { id: Pose; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
  { id: 'tshirt', label: 'T-shirt' },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function nextCheckInDate(checkins: CheckIn[]): string | undefined {
  const last = [...checkins].sort((a, b) => a.date.localeCompare(b.date)).pop();
  return last ? addDays(last.date, 30) : undefined;
}

export function PhotosPage() {
  const settings = useSettings();
  const checkins = useLiveQuery(async () => (await db.checkins.toArray()).sort((a, b) => a.date.localeCompare(b.date)), []);
  const unlocked = usePhotosUnlocked();
  const [pose, setPose] = useState<Pose>('front');
  const [mode, setMode] = useState<Mode>('side');
  const [pair, setPair] = useState<[string | null, string | null]>([null, null]);
  const [revealed, setRevealed] = useState(false);
  const [split, setSplit] = useState(50);

  const withPhotos = (checkins ?? []).filter((c) => Object.keys(c.photos).length > 0);
  const a = withPhotos.find((c) => c.id === pair[0]) ?? withPhotos[0];
  const b = withPhotos.find((c) => c.id === pair[1]) ?? withPhotos[withPhotos.length - 1];

  useEffect(() => {
    if (a && b && a.id !== b.id && Math.abs(daysBetween(a.date, b.date)) >= 90 && revealed) void bump('compare-3mo');
  }, [a, b, revealed]);

  if (!settings || !checkins) return <div className="page bare" />;
  const locked = prefOn(settings.prefs, 'lockPhotos') && !!settings.photoKey && !unlocked;
  const blur = prefOn(settings.prefs, 'blurPhotos') && !revealed;
  const due = nextCheckInDate(checkins);

  if (locked) {
    return (
      <div className="page bare" style={{ alignItems: 'center', textAlign: 'center', gap: 18 }}>
        <button type="button" className="backlink" onClick={() => back('/tracks')} style={{ alignSelf: 'flex-start' }}>
          <Icon name="left" size={20} stroke={1.8} />
          Tracks
        </button>
        <Icon name="lock" size={44} color="var(--pearl)" />
        <div className="sf" style={{ fontSize: 26 }}>
          Photos are locked
        </div>
        <div className="t15 q lh">Use your fingerprint or screen lock to open them.</div>
        <button type="button" className="btn lg" onClick={() => settings.photoKey && void unlockWithFingerprint(settings.photoKey)}>
          Unlock
        </button>
      </div>
    );
  }

  const pick = (id: string) => {
    // Tap a month to compare it with the latest; tap the latest to compare with the first.
    if (b && id === b.id) setPair([withPhotos[0]?.id ?? null, id]);
    else setPair([id, b?.id ?? null]);
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/tracks')}>
        <Icon name="left" size={20} stroke={1.8} />
        Tracks
      </button>
      <div className="col gap6">
        <h1 className="h1" style={{ color: 'var(--pearl)' }}>
          Photos
        </h1>
        <div className="t14 q lh">Only on this phone, never in the Claude export.{prefOn(settings.prefs, 'blurPhotos') ? ' Blurred until you tap.' : ''}</div>
      </div>

      {withPhotos.length === 0 ? (
        <div className="card">
          <div className="t15 lh">No photos yet. The monthly check-in takes front, side and back, with last month's outline to line up with.</div>
          <button type="button" className="btn" onClick={() => go('/checkin')}>
            Start a check-in
          </button>
        </div>
      ) : (
        <>
          <Seg options={POSES.map((p) => ({ id: p.id, label: p.label }))} value={pose} onChange={setPose} />
          <div style={{ position: 'relative' }} onClick={() => setRevealed(true)}>
            <Compare aId={a?.photos[pose]} bId={b?.photos[pose]} aDate={a?.date} bDate={b?.date} mode={a?.id === b?.id ? 'single' : mode} split={split} blur={blur} />
            {blur && (
              <div className="row" style={{ position: 'absolute', inset: 0, justifyContent: 'center', color: '#fff', gap: 8, pointerEvents: 'none' }}>
                <Icon name="lock" size={18} color="#fff" />
                Tap to reveal
              </div>
            )}
          </div>
          {a && b && a.id !== b.id && (
            <>
              <Seg
                options={[
                  { id: 'side', label: 'Side by side' },
                  { id: 'slider', label: 'Slider' },
                  { id: 'overlay', label: 'Overlay' },
                ]}
                value={mode}
                onChange={setMode}
              />
              {mode !== 'side' && <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={mode === 'slider' ? 'Slider position' : 'Overlay strength'} />}
            </>
          )}

          <div className="col gap10">
            {[...withPhotos].reverse().map((c, i) => (
              <button key={c.id} type="button" className="card" style={{ gap: 10, borderColor: c.id === a?.id || c.id === b?.id ? 'var(--pearl)' : undefined }} onClick={() => pick(c.id)}>
                <div className="row base">
                  <div className="lbl">
                    {MONTHS[Number(c.date.slice(5, 7)) - 1]} {c.date.slice(0, 4)}
                    {i === withPhotos.length - 1 ? ' · baseline' : ''}
                  </div>
                  <div className="t12 q">{fmtDayMonth(c.date)}</div>
                </div>
                <div className="grid3" style={{ gap: 8 }}>
                  {(['front', 'side', 'back'] as Pose[]).map((p) => (
                    <SmallPhoto key={p} id={c.photos[p]} blur={blur} label={POSES.find((x) => x.id === p)!.label} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" className="btn block" onClick={() => go('/checkin')}>
        {due && due > dayKey() ? `Next check-in: ${fmtDayMonth(due)}` : "Take this month's photos"}
      </button>
      {!prefOn(settings.prefs, 'lockPhotos') && canUseFingerprint() && (
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => go('/settings', { at: 'privacy' })}>
          Lock photos behind your fingerprint
        </button>
      )}
    </div>
  );
}

function SmallPhoto({ id, blur, label }: { id?: string; blur: boolean; label: string }) {
  const url = usePhotoUrl(id);
  return (
    <div className="col gap4" style={{ alignItems: 'center' }}>
      <div style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden', background: 'var(--raised)' }}>
        {url && <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: blur ? 'blur(14px)' : undefined }} />}
      </div>
      <span className="t12 q">{label}</span>
    </div>
  );
}

function Compare({ aId, bId, aDate, bDate, mode, split, blur }: { aId?: string; bId?: string; aDate?: string; bDate?: string; mode: Mode | 'single'; split: number; blur: boolean }) {
  const aUrl = usePhotoUrl(aId);
  const bUrl = usePhotoUrl(bId);
  const img = (url: string | undefined, style: CSSProperties = {}) =>
    url ? <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: blur ? 'blur(18px)' : undefined, ...style }} /> : null;
  const tag = (text?: string, right?: boolean) =>
    text ? (
      <span className="t12" style={{ position: 'absolute', bottom: 10, [right ? 'right' : 'left']: 10, padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
        {fmtDayMonth(text)}
      </span>
    ) : null;
  const frame: CSSProperties = { position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 18, overflow: 'hidden', background: 'var(--raised)' };

  if (mode === 'side' || mode === 'single') {
    return (
      <div className="grid2" style={{ gap: 8, gridTemplateColumns: mode === 'single' ? '1fr' : undefined }}>
        {mode === 'side' && (
          <div style={frame}>
            {img(aUrl)}
            {tag(aDate)}
          </div>
        )}
        <div style={frame}>
          {img(bUrl)}
          {tag(bDate, true)}
        </div>
      </div>
    );
  }
  if (mode === 'slider') {
    return (
      <div style={frame}>
        {img(aUrl)}
        {img(bUrl, { clipPath: `inset(0 0 0 ${split}%)` })}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 2, background: 'var(--pearl)' }} />
        {tag(aDate)}
        {tag(bDate, true)}
      </div>
    );
  }
  return (
    <div style={frame}>
      {img(aUrl)}
      {img(bUrl, { opacity: split / 100 })}
      {tag(aDate)}
      {tag(bDate, true)}
    </div>
  );
}

