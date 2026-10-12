import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { fmtDayMonth } from '../domain/format';
import { prefOn, type Clip } from '../domain/types';
import { bump } from '../db/actions';
import { db, uid } from '../db/db';
import { useSettings } from '../db/hooks';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { askConfirm } from '../ui/Confirm';

/** Reads a video's length without playing it. */
function videoSeconds(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(blob);
    const done = (n?: number) => {
      URL.revokeObjectURL(url);
      resolve(n);
    };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : undefined);
    v.onerror = () => done(undefined);
    window.setTimeout(() => done(undefined), 4000);
    v.src = url;
  });
}

const mb = (n: number) => `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)} MB`;

/** Film a set with the phone's camera app, and keep it next to the exercise. */
export function ClipButtons({ sessionId, exerciseId, exercise, date }: { sessionId: string; exerciseId: string; exercise: string; date: string }) {
  const input = useRef<HTMLInputElement>(null);
  const count = useLiveQuery(() => db.clips.where('exerciseId').equals(exerciseId).count(), [exerciseId]);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const seconds = await videoSeconds(f);
    await db.clips.put({ id: uid(), sessionId, exerciseId, exercise, date, at: Date.now(), blob: f, type: f.type || 'video/mp4', seconds });
    void bump('clip', { day: date });
    toast({ kicker: 'Form clip', text: `Saved: ${exercise}`, sub: `${seconds ? `${seconds} s · ` : ''}${mb(f.size)}, on this phone only.` });
  };

  return (
    <>
      <button type="button" className="tool" onClick={() => input.current?.click()}>
        <Icon name="camera" size={16} stroke={1.8} />
        Film a set
      </button>
      {count ? (
        <button type="button" className="tool" onClick={() => setOpen(true)}>
          <Icon name="play" size={16} stroke={1.8} />
          {count} clip{count === 1 ? '' : 's'}
        </button>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {open && <ClipsSheet exerciseId={exerciseId} title={exercise} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ClipsSheet({ exerciseId, title, onClose }: { exerciseId: string; title: string; onClose: () => void }) {
  const clips = useLiveQuery(async () => (await db.clips.where('exerciseId').equals(exerciseId).toArray()).sort((a, b) => b.at - a.at), [exerciseId]);
  const total = clips?.reduce((n, c) => n + c.blob.size, 0) ?? 0;
  return (
    <Sheet title={title} sub={clips ? `${clips.length} clip${clips.length === 1 ? '' : 's'} · ${mb(total)}` : undefined} onClose={onClose} tall>
      {clips?.map((c) => (
        <ClipRow key={c.id} clip={c} />
      ))}
      <div className="t12 q lh">Clips stay on this phone and go into the full backup. Short ones, 10 to 20 seconds, keep the backup small.</div>
    </Sheet>
  );
}

export function ClipRow({ clip }: { clip: Clip }) {
  const settings = useSettings();
  const [url, setUrl] = useState<string>();
  const [hidden, setHidden] = useState(true);
  const blur = settings ? prefOn(settings.prefs, 'blurPhotos') : true;
  useEffect(() => {
    const u = URL.createObjectURL(clip.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [clip.blob]);
  return (
    <div className="col gap6">
      <div className="row base t13">
        <span>
          {fmtDayMonth(clip.date)}
          {clip.seconds ? ` · ${clip.seconds} s` : ''}
        </span>
        <button
          type="button"
          className="link"
          style={{ color: '#e38a7c' }}
          onClick={async () => {
            if (await askConfirm({ title: 'Delete this clip?', body: 'It cannot be undone.', yes: 'Delete', danger: true })) await db.clips.delete(clip.id);
          }}
        >
          Delete
        </button>
      </div>
      {url && (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          onPlay={() => setHidden(false)}
          style={{ width: '100%', maxHeight: 420, borderRadius: 14, background: '#000', filter: blur && hidden ? 'blur(18px)' : undefined }}
        />
      )}
    </div>
  );
}

/** The clips filmed in one session, for its details page. */
export function SessionClips({ sessionId }: { sessionId: string }) {
  const clips = useLiveQuery(async () => (await db.clips.where('sessionId').equals(sessionId).toArray()).sort((a, b) => a.at - b.at), [sessionId]);
  if (!clips?.length) return null;
  return (
    <div className="card">
      <div className="lbl">Form clips</div>
      {clips.map((c) => (
        <div key={c.id} className="col gap4">
          <div className="t14">{c.exercise}</div>
          <ClipRow clip={c} />
        </div>
      ))}
    </div>
  );
}
