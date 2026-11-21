import type { CSSProperties } from 'react';
import { Stepper } from '../../ui/controls';

/** The monthly check-in's pure parts (board W8, y8-body). No router here, so they render in tests. */
export type CheckStep = 'photos' | 'tape' | 'tshirt' | 'result';
const STEPS: { id: CheckStep; name: string }[] = [
  { id: 'photos', name: 'Photos' },
  { id: 'tape', name: 'Tape' },
  { id: 'tshirt', name: 'T-shirt' },
  { id: 'result', name: 'Done' },
];

/** The four steps along the top: done ones green, the current one gold and marked, each named in words. */
export function CheckSteps({ at }: { at: CheckStep }) {
  const n = STEPS.findIndex((s) => s.id === at);
  return (
    <ol className="ck-st" aria-label={`Step ${n + 1} of 4`}>
      {STEPS.map((s, k) => (
        <li key={s.id} className={k < n ? 'on' : k === n ? 'now' : undefined} aria-current={k === n ? 'step' : undefined}><i aria-hidden="true" />{s.name}</li>
      ))}
    </ol>
  );
}

/** One tape reading: its name, a yellow tape that slides to the number, the number large between − and + (type it or step it), and last time. */
export function TapeCard({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ck-m">
      <span className="ck-m-h">{label}</span>
      <div className="ck-tape" aria-hidden="true"><span style={{ '--x': `${-((value * 100) % 100)}px` } as CSSProperties} /></div>
      <Stepper value={value} onChange={onChange} step={0.1} min={20} max={70} decimals={1} unit="in" size={36} label={label} />
      <span className="ck-m-lt">{hint}</span>
    </div>
  );
}

/** Shoulder to waist in gold, and which way it moved since last time. */
export function RatioCard({ ratio, was }: { ratio: number; was?: number }) {
  const line = was === undefined ? 'Shoulder to waist: your starting point.'
    : `Shoulder to waist, ${ratio > was ? 'up' : ratio < was ? 'down' : 'level'} from ${was.toFixed(2)}.${ratio > was ? ' The V is widening.' : ''}`;
  return <div className="ck-ratio"><b>{ratio.toFixed(2)}</b><span>{line}</span></div>;
}

/** One T-shirt question as five round buttons, 1 to 5, with last time's answer. */
export function TeeRow({ label, last, value, onPick }: { label: string; last?: number; value: number; onPick: (n: number) => void }) {
  return (
    <div className="ck-tee" role="group" aria-label={label}>
      <div className="ck-tee-h">{label}{last !== undefined && <span>last time {last}</span>}</div>
      <div className="ck-tee-d">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>)}
      </div>
    </div>
  );
}
