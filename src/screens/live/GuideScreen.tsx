import { useState, type ReactNode } from 'react';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import type { ExerciseDef, FormCheck } from '../../domain/plan';
import { LiveFrame, Primary } from './Frame';

interface Props {
  ex: ExerciseDef;
  name: string;
  kg: number | null;
  lead?: 'L' | 'R';
  tempo: boolean;
  setup?: { text: string; from?: DayKey };
  onSetup: (text: string) => void;
  checks: FormCheck[];
  onGo: () => void;
  saver: boolean;
  top?: ReactNode;
}

const range = (ex: ExerciseDef) => {
  const r = ex.seconds ?? ex.reps;
  if (!r || (ex.open && !ex.seconds)) return 'clean reps';
  return `${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}${ex.seconds ? ' s' : ''}`;
};

/** Before an exercise's first set tonight: the guide, the side and why, your setup, and what you'll check. */
export function GuideScreen(p: Props) {
  const [editing, setEditing] = useState(false);
  const g = p.ex.guide;
  const sections = [
    ['Set up', g?.setup],
    ['Move', g?.movement],
    ['Feel', g?.feel],
    ['Stop', g?.stop],
  ].filter((x): x is [string, string] => !!x[1]);
  const side = p.lead === 'L' ? 'Left' : p.lead === 'R' ? 'Right' : undefined;
  return (
    <LiveFrame state="calm" saver={p.saver} top={p.top} scroll>
      <div className="lv-kicker">Before the first set</div>
      <h1 className="lv-h1">{p.name}</h1>
      <div className="lv-meta">
        <span className="lv-pill">
          {p.ex.sets} × {range(p.ex)}
          {p.ex.perSide ? ' each side' : ''}
        </span>
        {p.kg !== null && <span className="lv-pill">{p.kg} kg</span>}
        {p.ex.perSide && side && <span className="lv-side lead">{side.toUpperCase()} FIRST</span>}
        {p.tempo && <span className="lv-pill tempo">Tempo: lower 3 s, lift 1 s</span>}
      </div>
      {p.ex.perSide && side && p.ex.leadWhy && (
        <p className="lv-small">
          {side} first: {p.ex.leadWhy}.
        </p>
      )}
      {sections.length > 0 && (
        <div className="lv-guide">
          {sections.map(([h, t]) => (
            <div key={h} className={h === 'Stop' ? 'stop' : undefined}>
              <b>{h}</b>
              {t}
            </div>
          ))}
        </div>
      )}
      <div className="lv-card">
        <div className="lv-card-h">{p.setup ? `Your setup${p.setup.from ? ` · from ${fmtDayMonth(p.setup.from)}` : ''}` : 'Your setup'}</div>
        {editing ? (
          <textarea
            className="lv-note"
            aria-label="Your setup"
            defaultValue={p.setup?.text}
            autoFocus
            onBlur={(e) => {
              const t = e.target.value.trim();
              if (t && t !== p.setup?.text) p.onSetup(t);
              setEditing(false);
            }}
          />
        ) : (
          p.setup && <div className="lv-small">{p.setup.text}</div>
        )}
        <button type="button" className="lv-link" onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : p.setup ? 'Change my setup' : 'Add my setup'}
        </button>
      </div>
      {p.checks.length > 0 && (
        <div className="lv-card">
          <div className="lv-card-h">You'll check after each set</div>
          {p.checks.map((c) => (
            <div key={c.id} className="lv-small">
              {c.kind === 'avoid' ? '✕ ' : '✓ '}
              {c.text}
            </div>
          ))}
        </div>
      )}
      <div style={{ flex: 'none', paddingBottom: 8 }}>
        <Primary onClick={p.onGo}>Start set 1</Primary>
      </div>
    </LiveFrame>
  );
}
