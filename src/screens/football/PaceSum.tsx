// Pace's sum (finding 7 and the owner's Pace question, O42): wherever tonight's Pace is shown, what makes it: your
// steps, the squad, the plan and morale. The same figure on Tonight, Today and Walk.
import type { Tonight } from '../../football/store/hooks';
import { NUDGE_CAP } from '../../football/rotation/night';
import type { CSSProperties } from 'react';
import { useSeenBefore } from '../../ui/motion/motion';
import { Roll } from '../../ui/motion/Roll';

export interface PaceSum { steps: number; squad?: number; full: boolean; nudges: { why: string; d: number }[]; total: number }

type T = Pick<Tonight, 'today' | 'squad' | 'nudges' | 'liveValues' | 'flags' | 'paceFull'>;
/** Tonight's Pace, part by part. Undefined while steps are not logged (Pace then plays in fog). */
export function paceSum(t: T): PaceSum | undefined {
  if (t.flags.Pace) return undefined;
  const nudges = t.nudges.filter((n) => n.axis === 'Pace').map((n) => ({ why: n.why, d: n.d }));
  const raw = nudges.reduce((s, n) => s + n.d, 0);
  const capped = Math.max(-NUDGE_CAP, Math.min(NUDGE_CAP, raw));
  const sq = t.squad.Pace;
  return { steps: t.today.Pace, ...(sq != null && !t.paceFull ? { squad: Math.round(sq) } : {}), full: t.paceFull, nudges: capped === raw ? nudges : [...nudges, { why: 'the cap', d: capped - raw }], total: t.liveValues.Pace };
}

const signed = (d: number) => (d > 0 ? `+${d}` : `−${-d}`);
const cap = (w: string) => w.replace(/^./, (c) => c.toUpperCase());
/** "your steps 20 · the squad 16 · Hold −1 · morale High +1 = 19". */
export const paceSumWords = (p: PaceSum) =>
  [`your steps ${p.steps}`, ...(p.squad != null ? [`the squad ${p.squad}`] : []), ...p.nudges.map((n) => `${cap(n.why)} ${signed(n.d)}`)].join(' · ') + ` = ${p.total}`;
export const paceSumNote = (p: PaceSum) => (p.full ? 'Past 20,000 steps your steps count in full, with no squad share.' : p.squad != null ? 'Your steps count 70%, the starters 30%. Steps top out at 20 at 20,000; past that they count in full.' : 'Your steps count in full: no Pace players start tonight.');

/**
 * The night's sum (motion board two, O44): when the sum changed since it was last seen, each part drops in, one after
 * another, and then the total counts up to meet them. Otherwise it simply shows.
 */
export function PaceSumView({ p }: { p: PaceSum }) {
  const words = paceSumWords(p);
  const before = useSeenBefore<string>('pacesum', words);
  const play = before !== words;
  const parts = [`your steps|${p.steps}`, ...(p.squad != null ? [`the squad|${p.squad}`] : []), ...p.nudges.map((n) => `${cap(n.why)}|${signed(n.d)}`)];
  const drop = (i: number) => (play ? { className: 'mo-drop', style: { '--d': `${150 + i * 220}ms` } as CSSProperties } : {});
  return (
    <div className="fb-pacesum" role="group" aria-label={`Pace tonight: ${words}`}>
      <span className="fb-pacesum-h"><b>Pace {play ? <Roll value={p.total} countIn delay={150 + parts.length * 220} /> : p.total}</b> tonight</span>
      <span className="fb-pacesum-row" aria-hidden="true">
        {parts.map((x, i) => { const [w, n] = x.split('|'); return <span key={w} {...drop(i)}>{w} <b>{n}</b></span>; })}
      </span>
      <span className="fb-pacesum-n">{paceSumNote(p)}</span>
    </div>
  );
}
