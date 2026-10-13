import type { KeyboardEvent } from 'react';
import type { MuscleId } from '../domain/types';

export type Soreness = Partial<Record<MuscleId, 1 | 2 | 3>>;

type Shape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number };
interface Region {
  id: MuscleId;
  name: string;
  shapes: Shape[];
}

const pair = (cx: number, cy: number, rx: number, ry: number, gap: number): Shape[] => [
  { kind: 'ellipse', cx: cx - gap, cy, rx, ry },
  { kind: 'ellipse', cx: cx + gap, cy, rx, ry },
];

/** Front and back, drawn in the same simple figure the muscle map uses. */
const FRONT: Region[] = [
  { id: 'front-delts', name: 'Shoulders', shapes: pair(60, 62, 11, 9, 30) },
  { id: 'chest', name: 'Chest', shapes: pair(60, 76, 15, 10, 14) },
  { id: 'biceps', name: 'Arms', shapes: pair(60, 92, 7, 15, 39) },
  { id: 'forearms', name: 'Forearms', shapes: pair(60, 124, 6, 15, 43) },
  { id: 'abs', name: 'Core', shapes: [{ kind: 'rect', x: 47, y: 88, w: 26, h: 40, r: 9 }] },
  { id: 'quads', name: 'Quads', shapes: pair(60, 162, 11, 25, 13) },
];
const BACK: Region[] = [
  { id: 'upper-back', name: 'Upper back', shapes: [{ kind: 'rect', x: 42, y: 60, w: 36, h: 20, r: 9 }] },
  { id: 'lats', name: 'Lats', shapes: pair(60, 96, 10, 16, 15) },
  { id: 'triceps', name: 'Triceps', shapes: pair(60, 92, 7, 15, 39) },
  { id: 'glutes', name: 'Glutes', shapes: pair(60, 132, 12, 10, 11) },
  { id: 'hamstrings', name: 'Hamstrings', shapes: pair(60, 166, 10, 20, 13) },
  { id: 'calves', name: 'Calves', shapes: pair(60, 204, 8, 14, 13) },
];

const WORD = ['not sore', 'a little sore', 'sore', 'very sore'] as const;

/** The outline both figures share: head, torso, arms and legs as soft silhouettes. */
function Outline() {
  return (
    <g fill="var(--raised)" stroke="var(--hairline)" strokeWidth="1">
      <circle cx="60" cy="30" r="14" />
      <rect x="36" y="50" width="48" height="90" rx="20" />
      <rect x="15" y="56" width="16" height="88" rx="8" />
      <rect x="89" y="56" width="16" height="88" rx="8" />
      <rect x="38" y="132" width="20" height="92" rx="10" />
      <rect x="62" y="132" width="20" height="92" rx="10" />
    </g>
  );
}

function Figure({ regions, value, onTap, label, dx }: { regions: Region[]; value: Soreness; onTap: (id: MuscleId) => void; label: string; dx: number }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <Outline />
      {regions.map((r) => {
        const lvl = value[r.id] ?? 0;
        const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTap(r.id));
        return (
          <g key={r.id} role="button" tabIndex={0} aria-label={`${r.name}, ${WORD[lvl]}. Tap to change`} className="bodymap-region" onClick={() => onTap(r.id)} onKeyDown={key}>
            {r.shapes.map((s, i) =>
              s.kind === 'ellipse' ? (
                <ellipse key={`hit${i}`} cx={s.cx} cy={s.cy} rx={Math.max(s.rx, 15)} ry={Math.max(s.ry, 15)} fill="transparent" />
              ) : (
                <rect key={`hit${i}`} x={s.x - 4} y={s.y - 4} width={s.w + 8} height={s.h + 8} rx={s.r} fill="transparent" />
              ),
            )}
            {r.shapes.map((s, i) =>
              s.kind === 'ellipse' ? (
                <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="var(--rose)" fillOpacity={lvl ? 0.25 + lvl * 0.22 : 0.08} stroke={lvl ? 'var(--rose)' : 'var(--btn-border)'} strokeWidth="1" />
              ) : (
                <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill="var(--rose)" fillOpacity={lvl ? 0.25 + lvl * 0.22 : 0.08} stroke={lvl ? 'var(--rose)' : 'var(--btn-border)'} strokeWidth="1" />
              ),
            )}
          </g>
        );
      })}
      <text x="60" y="244" textAnchor="middle" fontSize="11" fill="var(--quiet)">
        {label}
      </text>
    </g>
  );
}

/** Tap an area to step it through a little sore, sore, very sore, and back to fine. */
export function BodyMap({ value, onChange }: { value: Soreness; onChange: (v: Soreness) => void }) {
  const tap = (id: MuscleId) => {
    const next = (((value[id] ?? 0) + 1) % 4) as 0 | 1 | 2 | 3;
    const copy = { ...value };
    if (next) copy[id] = next;
    else delete copy[id];
    onChange(copy);
  };
  const sore = [...FRONT, ...BACK].filter((r) => value[r.id]);
  return (
    <div className="col gap8">
      <svg viewBox="0 0 260 252" className="bodymap" role="group" aria-label="Soreness by body area">
        <Figure regions={FRONT} value={value} onTap={tap} label="Front" dx={6} />
        <Figure regions={BACK} value={value} onTap={tap} label="Back" dx={134} />
      </svg>
      <div className="t13 q" aria-live="polite">
        {sore.length ? sore.map((r) => `${r.name} ${WORD[value[r.id]!]}`).join(', ') : 'Nothing sore. Tap an area if it is.'}
      </div>
    </div>
  );
}
