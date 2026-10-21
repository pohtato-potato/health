import { useState, type CSSProperties, type ReactNode } from 'react';
import type { SetState } from '../../domain/liveSet';
import { LiveFrame, mmss, Primary } from './Frame';

interface Props {
  endsAt: number;
  total: number;
  now: number;
  /** The colour the last set ended in; rest fades from it to blue. */
  from: SetState;
  just: string[];
  next: { label: string; kg: number | null; aim?: string; tempo: boolean; cue?: string } | null;
  onMore: () => void;
  onReady: () => void;
  saver: boolean;
  rings: [string, string, string];
  /** The note kept on the exercise just done, for next time and the coach. */
  note?: string;
  onNote?: (text: string) => void;
  /** Why the rest is this long. */
  why?: string;
  top?: ReactNode;
}

const tagClass = (t: string) => (t === 'record' ? 'gold' : t.startsWith('burn') ? 'burn' : t.endsWith('went well') ? 'ok' : t.endsWith('slipped') ? 'slip' : '');

/** Rest: the time in a ring that empties while the background fades from the set's colour to blue. */
export function RestLive(p: Props) {
  const [noting, setNoting] = useState(false);
  const left = Math.max(0, Math.ceil((p.endsAt - p.now) / 1000));
  const fade = p.total ? Math.min(1, Math.max(0, 1 - left / p.total)) : 1;
  const R = 118;
  const C = 2 * Math.PI * R;
  const style = { '--fade': fade, '--ring1': p.rings[0], '--ring2': p.rings[1], '--ring3': p.rings[2] } as CSSProperties;
  const foot = (
    <div className="lv-actions" style={{ marginTop: 'auto' }}>
      <button type="button" className="lv-ghost" onClick={p.onMore}>
        +30 s
      </button>
      <Primary tone="rest" onClick={p.onReady}>
        Ready
      </Primary>
    </div>
  );

  if (p.saver)
    return (
      <LiveFrame state="rest" saver className={`from-${p.from}`} style={style} top={p.top}>
        <div className="lv-rest-time num tn" style={{ marginTop: 60 }}>
          {mmss(left)}
        </div>
        {p.next && (
          <div className="lv-saver-next">
            Next: <b>{p.next.label}</b>
            {p.next.kg !== null && <> · {p.next.kg} kg</>}
          </div>
        )}
        <div className="lv-small" style={{ textAlign: 'center' }}>
          Battery saver · no motion · the screen stays on
        </div>
        {foot}
      </LiveFrame>
    );

  return (
    <LiveFrame state="rest" saver={false} className={`from-${p.from}`} style={style} top={p.top}>
      <div className="lv-rest-ring">
        <svg viewBox="0 0 260 260" width="250" height="250" aria-hidden="true">
          <circle cx="130" cy="130" r={R} className="track" />
          <circle cx="130" cy="130" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * fade} transform="rotate(-90 130 130)" />
        </svg>
        <div className="lv-rest-ring-in">
          <b className="num tn">{mmss(left)}</b>
          <span className="lv-small">{left > 0 ? 'rest' : 'rest is up'}</span>
        </div>
      </div>
      {p.just.length > 0 && (
        <div className="lv-justnow">
          Just now
          {p.just.map((t) => (
            <span key={t} className={`lv-tag ${tagClass(t)}`}>
              {t}
            </span>
          ))}
        </div>
      )}
      {p.next && (
        <div className="lv-card">
          <div className="lv-card-h">Next</div>
          <div className="lv-next-row">
            <span className="lv-next-title">{p.next.label}</span>
            {p.next.kg !== null && <span className="num tn lv-next-kg">{p.next.kg} kg</span>}
          </div>
          {(p.next.aim || p.next.tempo) && (
            <div className="lv-small">
              {p.next.aim ? `aim ${p.next.aim}` : ''}
              {p.next.tempo ? `${p.next.aim ? ' · ' : ''}tempo on` : ''}
            </div>
          )}
          {p.next.cue && <div className="lv-cue">{p.next.cue}</div>}
        </div>
      )}
      {p.why && <div className="lv-adapt">{p.why}</div>}
      {p.onNote &&
        (noting ? (
          <textarea
            className="lv-note"
            aria-label="Note on this exercise"
            placeholder="For next time and the coach…"
            defaultValue={p.note}
            autoFocus
            onBlur={(e) => {
              p.onNote!(e.target.value.trim());
              setNoting(false);
            }}
          />
        ) : (
          <button type="button" className="lv-link" onClick={() => setNoting(true)}>
            {p.note ? `Note: ${p.note}` : '+ Note on this exercise'}
          </button>
        ))}
      {foot}
    </LiveFrame>
  );
}
