import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { KIND_NAMES, fmtTrackValue, meets, trackStats } from '../domain/customTracks';
import { addDays, dayRange, type DayKey } from '../domain/dates';
import { fmtDayMonth, fmtDayShort } from '../domain/format';
import type { CustomTrack } from '../domain/types';
import { patchSettings } from '../db/actions';
import { db, uid } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { BarChart, MiniBars } from '../ui/Charts';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

export async function setTrackValue(trackId: string, date: DayKey, value: number | null) {
  const existing = await db.trackValues.where('[trackId+date]').equals([trackId, date]).first();
  if (value === null) {
    if (existing) await db.trackValues.delete(existing.id);
    return;
  }
  await db.trackValues.put({ id: existing?.id ?? uid(), trackId, date, value, at: Date.now() });
}

/** Adds to a count in one transaction, so quick taps never read a stale value. */
export async function addTrackValue(trackId: string, date: DayKey, delta: number) {
  await db.transaction('rw', db.trackValues, async () => {
    const existing = await db.trackValues.where('[trackId+date]').equals([trackId, date]).first();
    const value = Math.max(0, (existing?.value ?? 0) + delta);
    await db.trackValues.put({ id: existing?.id ?? uid(), trackId, date, value, at: Date.now() });
  });
}

const useValues = () => useLiveQuery(() => db.trackValues.toArray(), []);

/** The control for one day's value: a stepper, five dots, or yes and no. */
export function TrackInput({ track, date, value }: { track: CustomTrack; date: DayKey; value?: number }) {
  if (track.kind === 'yesno') {
    return (
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
        {[1, 0].map((v) => (
          <button key={v} type="button" className={`chip sm${value === v ? ' on' : ''}`} onClick={() => setTrackValue(track.id, date, value === v ? null : v)}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    );
  }
  if (track.kind === 'scale') {
    return (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-start' }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" className={`round${value === v ? ' on' : ''}`} style={{ fontSize: 15 }} aria-label={`${v} of 5`} onClick={() => setTrackValue(track.id, date, value === v ? null : v)}>
            {v}
          </button>
        ))}
      </div>
    );
  }
  const v = value ?? 0;
  return (
    <div className="row" style={{ gap: 10, justifyContent: 'flex-start' }}>
      <button type="button" className="round" aria-label="One less" disabled={v <= 0} onClick={() => addTrackValue(track.id, date, -1)}>
        −
      </button>
      <span className="num tn" style={{ fontSize: 24, minWidth: 44, textAlign: 'center' }}>
        {value ?? '–'}
      </span>
      <button type="button" className="round" aria-label="One more" onClick={() => addTrackValue(track.id, date, 1)}>
        +
      </button>
      {track.unit && <span className="t13 q">{track.unit}</span>}
    </div>
  );
}

/** On the Tracks page: a tile for each of your own tracks, and one to add another. */
export function CustomTrackTiles() {
  const settings = useSettings();
  const today = useToday();
  const values = useValues();
  const [editing, setEditing] = useState<CustomTrack | 'new' | null>(null);
  if (!settings || !values) return null;
  const tracks = (settings.customTracks ?? []).filter((t) => t.active);
  return (
    <>
      <div className="row base">
        <div className="lbl">Your own tracks</div>
        <button type="button" className="link t13" onClick={() => setEditing('new')}>
          + Add a track
        </button>
      </div>
      {tracks.length ? (
        <div className="grid2">
          {tracks.map((t) => {
            const s = trackStats(t, values, today, 14);
            return (
              <button key={t.id} type="button" className="ttile" onClick={() => go('/track', { k: 'custom', id: t.id })}>
                <div className="row base" style={{ gap: 6 }}>
                  <span className="nm" style={{ color: 'var(--pearl)' }}>
                    {t.name}
                  </span>
                  <span className="sub">{s.logged7 ? `${s.hit7} of ${s.logged7} good` : 'this week'}</span>
                </div>
                <div className="row" style={{ alignItems: 'flex-end', gap: 6 }}>
                  <span className="v" style={{ fontSize: 22 }}>
                    {s.today !== undefined ? fmtTrackValue(t, s.today) : '—'}
                  </span>
                  {t.kind !== 'yesno' && <MiniBars values={s.series} color="var(--pearl)" target={t.lowerIsBetter ? undefined : t.target} width={50} />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="t13 q lh">Anything else worth a daily note: caffeine, stretching, screen time after 11, how your knee feels. A number, a 1-to-5 or a yes or no.</div>
      )}
      {editing && <TrackEditor track={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export function TrackEditor({ track, onClose }: { track?: CustomTrack; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(track?.name ?? '');
  const [kind, setKind] = useState<CustomTrack['kind']>(track?.kind ?? 'count');
  const [unit, setUnit] = useState(track?.unit ?? '');
  const [target, setTarget] = useState(track?.target?.toString() ?? '');
  const [lower, setLower] = useState(!!track?.lowerIsBetter);
  const save = async () => {
    const t: CustomTrack = {
      id: track?.id ?? uid(),
      name: name.trim(),
      kind,
      unit: kind === 'count' && unit.trim() ? unit.trim() : undefined,
      target: kind !== 'yesno' && target ? Number(target) : undefined,
      lowerIsBetter: lower || undefined,
      active: true,
      createdAt: track?.createdAt ?? Date.now(),
    };
    await patchSettings((s) => ({ customTracks: track ? (s.customTracks ?? []).map((x) => (x.id === t.id ? t : x)) : [...(s.customTracks ?? []), t] }));
    toast({ text: track ? `${t.name} updated` : `${t.name} added to Tracks` });
    onClose();
  };
  const remove = async () => {
    if (!track || !window.confirm(`Stop tracking ${track.name}? Its history stays in your backups.`)) return;
    await patchSettings((s) => ({ customTracks: (s.customTracks ?? []).map((x) => (x.id === track.id ? { ...x, active: false } : x)) }));
    onClose();
    go('/tracks', undefined, { replace: true });
  };
  return (
    <Sheet title={track ? 'Edit track' : 'New track'} onClose={onClose}>
      <label className="flabel">
        <span className="lbl">Name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Stretching" />
      </label>
      <div className="col gap8">
        <span className="lbl">Kind</span>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {(Object.keys(KIND_NAMES) as CustomTrack['kind'][]).map((k) => (
            <button key={k} type="button" className={`chip sm${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>
              {KIND_NAMES[k]}
            </button>
          ))}
        </div>
      </div>
      {kind === 'count' && (
        <label className="flabel">
          <span className="lbl">Unit, optional</span>
          <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="minutes, cups" />
        </label>
      )}
      {kind !== 'yesno' && (
        <label className="flabel">
          <span className="lbl">Daily target, optional</span>
          <input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))} placeholder={kind === 'scale' ? '4' : '10'} />
        </label>
      )}
      <label className="row" style={{ minHeight: 52 }}>
        <span className="col gap2">
          <span className="t15">Less is better</span>
          <span className="t12 q">{kind === 'yesno' ? 'A “no” day is the good one' : 'At or under the target counts'}</span>
        </span>
        <input type="checkbox" className="sw" checked={lower} onChange={(e) => setLower(e.target.checked)} />
      </label>
      <button type="button" className="btn lg block" disabled={!name.trim()} onClick={save}>
        {track ? 'Save' : 'Add track'}
      </button>
      {track && (
        <button type="button" className="btn danger block" onClick={remove}>
          Stop tracking
        </button>
      )}
    </Sheet>
  );
}

/** A custom track's page: today's value, a month of history, and the days as a list. */
export function CustomTrackPage({ id }: { id: string }) {
  const settings = useSettings();
  const today = useToday();
  const values = useValues();
  const [edit, setEdit] = useState(false);
  if (!settings || !values) return <div className="page bare" />;
  const t = settings.customTracks?.find((x) => x.id === id);
  if (!t) {
    return (
      <div className="page bare">
        <button type="button" className="backlink" onClick={() => back('/tracks')}>
          <Icon name="left" size={20} stroke={1.8} />
          Tracks
        </button>
        <div className="t15 q">This track isn't here any more.</div>
      </div>
    );
  }
  const s = trackStats(t, values, today);
  const range = dayRange(addDays(today, -29), today);
  const mine = values.filter((v) => v.trackId === t.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="page bare">
      <div className="row">
        <button type="button" className="backlink" onClick={() => back('/tracks')}>
          <Icon name="left" size={20} stroke={1.8} />
          Tracks
        </button>
        <button type="button" className="link t14" onClick={() => setEdit(true)}>
          Edit
        </button>
      </div>
      <div className="col gap6">
        <h1 className="h1" style={{ color: 'var(--pearl)' }}>
          {t.name}
        </h1>
        <div className="t14 q">
          {KIND_NAMES[t.kind]}
          {t.target !== undefined ? ` · target ${t.lowerIsBetter ? 'at most' : 'at least'} ${fmtTrackValue(t, t.target)}` : ''}
          {s.streak > 1 ? ` · ${s.streak} good days in a row` : ''}
        </div>
      </div>
      <div className="card">
        <div className="lbl">Today</div>
        <TrackInput track={t} date={today} value={s.today} />
      </div>
      {t.kind === 'yesno' ? (
        <div className="card">
          <div className="lbl">The last 30 days</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
            {range.map((d, i) => {
              const v = s.series[i];
              return <i key={d} title={fmtDayMonth(d)} style={{ aspectRatio: '1', borderRadius: 6, background: v === null ? 'var(--track)' : meets(t, v) ? 'var(--sage)' : 'var(--apricot)', opacity: v === null ? 1 : 0.8 }} />;
            })}
          </div>
          <div className="t12 q">{s.logged7 ? `${s.hit7} good days of ${s.logged7} logged this week.` : 'Nothing logged this week yet.'}</div>
        </div>
      ) : (
        <div className="card">
          <BarChart points={range.map((d, i) => ({ label: fmtDayMonth(d), value: s.series[i] }))} color="var(--pearl)" target={t.target} fmt={(v) => fmtTrackValue(t, v)} />
          {s.avg7 !== undefined && <div className="t13 q">7-day average: {fmtTrackValue(t, Math.round(s.avg7 * 10) / 10)}</div>}
        </div>
      )}
      {mine.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Day by day
          </div>
          {mine.slice(0, 30).map((v) => (
            <div key={v.id} className="sess" style={{ minHeight: 44 }}>
              <span className="t14">{fmtDayShort(v.date)}</span>
              <span className={`t14 tn ${meets(t, v.value) ? '' : 'q'}`}>{fmtTrackValue(t, v.value)}</span>
            </div>
          ))}
        </div>
      )}
      {edit && <TrackEditor track={t} onClose={() => setEdit(false)} />}
    </div>
  );
}

/** From the Log sheet: every active track for today, in one place. */
export function MyTracksSheet() {
  const settings = useSettings();
  const today = useToday();
  const values = useValues();
  if (!settings || !values) return <Sheet title="Your tracks">{null}</Sheet>;
  const tracks = (settings.customTracks ?? []).filter((t) => t.active);
  return (
    <Sheet title="Your tracks" sub={fmtDayShort(today)}>
      {tracks.map((t) => (
        <div key={t.id} className="col gap8">
          <span className="t15">{t.name}</span>
          <TrackInput track={t} date={today} value={values.find((v) => v.trackId === t.id && v.date === today)?.value} />
        </div>
      ))}
      {!tracks.length && (
        <button type="button" className="btn block" onClick={() => go('/tracks')}>
          Add a track in Tracks
        </button>
      )}
    </Sheet>
  );
}

