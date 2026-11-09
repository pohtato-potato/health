import { useState } from 'react';
import '../styles/body.css';
import { addBodyEntry, deleteBodyEntry } from '../db/actions';
import { BODY_KINDS, BODY_REGIONS, kindOf, marksOn, type BodyView } from '../domain/bodyLog';
import type { DayKey } from '../domain/dates';
import type { BodyEntry, BodyKind } from '../domain/types';

// The figure from the approved drawings (pages rounds 3–5), 120 × 250 a view.
const SIL = 'M60 14 C68 14 73 20 73 28 C73 36 68 42 64 43 L64 48 C74 50 86 52 92 58 C97 63 98 72 99 84 L103 122 C104 132 104 140 101 146 C99 150 94 150 93 145 L89 110 C88 102 86 96 84 92 L83 128 C83 138 84 146 85 158 L88 208 C89 220 88 230 84 234 L74 234 C72 228 72 220 72 210 L64 152 L60 150 L56 152 L48 210 C48 220 48 228 46 234 L36 234 C32 230 31 220 32 208 L35 158 C36 146 37 138 37 128 L36 92 C34 96 32 102 31 110 L27 145 C26 150 21 150 19 146 C16 140 16 132 17 122 L21 84 C22 72 23 63 28 58 C34 52 46 50 56 48 L56 43 C52 42 47 36 47 28 C47 20 52 14 60 14 Z';
const PATHS: Record<BodyView, Record<string, string>> = {
  front: {
    'Eyes or head': 'M60 15 C67 15 72 21 72 28 C72 35 67 41 60 41 C53 41 48 35 48 28 C48 21 53 15 60 15 Z',
    Neck: 'M55 42 H65 L65 50 H55 Z',
    Shoulder: 'M36 56 C30 58 27 64 27 72 L40 70 C42 62 40 58 36 56 Z M84 56 C90 58 93 64 93 72 L80 70 C78 62 80 58 84 56 Z',
    Chest: 'M44 62 C50 60 58 62 59 66 L59 80 C52 84 44 82 41 76 C40 70 41 64 44 62 Z M76 62 C70 60 62 62 61 66 L61 80 C68 84 76 82 79 76 C80 70 79 64 76 62 Z',
    Arms: 'M26 74 C23 84 22 90 23 92 L31 92 C33 86 35 81 38 73 Z M94 74 C97 84 98 90 97 92 L89 92 C87 86 85 81 82 73 Z',
    Elbow: 'M20 98 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M90 98 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
    Forearms: 'M21 106 C19 116 18 126 19 136 L26 137 C28 126 30 116 31 105 Z M99 106 C101 116 102 126 101 136 L94 137 C92 126 90 116 89 105 Z',
    Wrist: 'M16 141 h10 v6 h-10 Z M94 141 h10 v6 h-10 Z',
    Core: 'M47 86 H73 L72 124 C66 130 54 130 48 124 Z',
    Hip: 'M38 134 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M72 134 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
    Quads: 'M40 142 C46 138 54 140 56 148 L54 188 C50 192 44 192 42 188 Z M80 142 C74 138 66 140 64 148 L66 188 C70 192 76 192 78 188 Z',
    Knee: 'M40 197 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M68 197 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z',
    Ankle: 'M36 226 h12 v6 h-12 Z M72 226 h12 v6 h-12 Z',
  },
  back: {
    'Eyes or head': 'M60 15 C67 15 72 21 72 28 C72 35 67 41 60 41 C53 41 48 35 48 28 C48 21 53 15 60 15 Z',
    Neck: 'M55 42 H65 L65 50 H55 Z',
    Shoulder: 'M36 56 C30 58 27 64 27 70 L36 70 C38 62 38 58 36 56 Z M84 56 C90 58 93 64 93 70 L84 70 C82 62 82 58 84 56 Z',
    'Upper back': 'M42 58 C52 54 68 54 78 58 L76 76 C66 80 54 80 44 76 Z',
    Lats: 'M42 80 C48 82 54 84 57 86 L56 110 C50 108 44 104 41 96 Z M78 80 C72 82 66 84 63 86 L64 110 C70 108 76 104 79 96 Z',
    'Lower back': 'M47 113 H73 L72 126 H48 Z',
    Triceps: 'M26 72 C23 82 22 88 23 92 L31 92 C33 86 35 80 38 72 Z M94 72 C97 82 98 88 97 92 L89 92 C87 86 85 80 82 72 Z',
    Elbow: 'M20 98 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M90 98 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
    Wrist: 'M16 141 h10 v6 h-10 Z M94 141 h10 v6 h-10 Z',
    Glutes: 'M40 130 C46 124 56 126 59 134 L58 148 C52 152 42 150 40 142 Z M80 130 C74 124 64 126 61 134 L62 148 C68 152 78 150 80 142 Z',
    Hamstrings: 'M42 156 C48 152 55 154 56 162 L54 188 C50 192 45 192 43 188 Z M78 156 C72 152 65 154 64 162 L66 188 C70 192 75 192 77 188 Z',
    Knee: 'M40 197 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M68 197 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z',
    Calves: 'M38 206 C36 212 37 218 40 222 L46 222 C48 216 48 210 46 204 Z M82 206 C84 212 83 218 80 222 L74 222 C72 216 72 210 74 204 Z',
    Ankle: 'M36 226 h12 v6 h-12 Z M72 226 h12 v6 h-12 Z',
  },
};

type Mark = Pick<BodyEntry, 'part' | 'kind' | 'side' | 'id'>;

function Figure({ view, marks, sel, onTap }: { view: BodyView; marks: Map<string, Mark>; sel?: string; onTap: (part: string) => void }) {
  return (
    <svg className="bc-fig" viewBox="0 0 120 250" aria-hidden="true">
      <path className="bc-sil" d={SIL} />
      {Object.entries(PATHS[view]).map(([part, d]) => {
        const m = marks.get(part);
        const r = BODY_REGIONS.find((x) => x.part === part)!;
        return <path key={part} d={d} className={`bc-rg${r.joint ? ' jt' : ''}${m ? ' on' : ''}${sel === part ? ' sel' : ''}`} style={m ? ({ '--sv': kindOf(m.kind).ink } as React.CSSProperties) : undefined} onClick={() => onTap(part)} />;
      })}
      <text x="60" y="248">{view === 'front' ? 'Front' : 'Back'}</text>
    </svg>
  );
}

/**
 * The body chart: tap a region on the figure, or its chip below (every chip is a 44 px target), then pick the kind.
 * Marks save at once into the body log; Clear takes one back off. Nothing tapped means all good.
 */
export function BodyChart({ date, entries }: { date: DayKey; entries: BodyEntry[] }) {
  const marks = marksOn(entries, date);
  const [sel, setSel] = useState<string | undefined>();
  const [side, setSide] = useState<'L' | 'R' | 'both'>('both');
  const region = BODY_REGIONS.find((r) => r.part === sel);
  const current = sel ? marks.get(sel) : undefined;
  const pick = (part: string) => { setSel(part === sel ? undefined : part); setSide(marks.get(part)?.side ?? 'both'); };
  const mark = async (kind: BodyKind) => {
    if (!region) return;
    if (current) await deleteBodyEntry(current.id);
    await addBodyEntry({ part: region.part, kind, side: region.paired ? side : undefined, date });
  };
  return (
    <div className="bc">
      <div className="bc-figs">
        <Figure view="front" marks={marks} sel={sel} onTap={pick} />
        <Figure view="back" marks={marks} sel={sel} onTap={pick} />
      </div>
      <div className="bc-chips" role="group" aria-label="Body regions">
        {BODY_REGIONS.map((r) => {
          const m = marks.get(r.part);
          return (
            <button key={r.part} type="button" aria-pressed={sel === r.part} className={`bc-chip${m ? ' on' : ''}${sel === r.part ? ' sel' : ''}`} style={m ? ({ '--sv': kindOf(m.kind).ink } as React.CSSProperties) : undefined} onClick={() => pick(r.part)}>
              {r.label}{m ? ` · ${kindOf(m.kind).label}` : ''}
            </button>
          );
        })}
      </div>
      {region && (
        <div className="bc-act" role="group" aria-label={`${region.label}: what kind`}>
          <p className="bc-tt"><b>{region.label}</b> <span>{current ? `marked ${kindOf(current.kind).label.toLowerCase()}` : 'not marked'}</span></p>
          {region.paired && (
            <div className="bc-row" role="radiogroup" aria-label="Which side">
              {(['L', 'R', 'both'] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={side === s} className={`chip${side === s ? ' on' : ''}`} onClick={() => setSide(s)}>{s === 'L' ? 'Left' : s === 'R' ? 'Right' : 'Both'}</button>
              ))}
            </div>
          )}
          <div className="bc-kinds" role="radiogroup" aria-label="Kind">
            {BODY_KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={current?.kind === k.id} className={`bc-kind${current?.kind === k.id ? ' on' : ''}`} style={{ '--s': k.ink } as React.CSSProperties} onClick={() => void mark(k.id)}>{k.label}</button>
            ))}
          </div>
          {current && <button type="button" className="btn ghost sm" onClick={() => { void deleteBodyEntry(current.id); setSel(undefined); }}>Clear {region.label.toLowerCase()}</button>}
        </div>
      )}
    </div>
  );
}
