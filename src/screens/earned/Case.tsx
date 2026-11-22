import type { CSSProperties } from 'react';
import type { Category, Tier } from '../../domain/achievements';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { Icon, type IconName } from '../../ui/Icon';

export interface CaseItem { id: string; name: string; cat: Category; tier: Tier; earned: boolean; date?: DayKey; progress?: [number, number] }

type Shape = 'circle' | 'hex' | 'rosette';
const SHAPE: Partial<Record<Category, Shape>> = { steps: 'circle', india: 'circle', start: 'circle', training: 'hex', strength: 'hex', streaks: 'hex' };
const ICON: Partial<Record<Category, IconName>> = { steps: 'steps', india: 'journey', training: 'train', strength: 'trend', food: 'food', water: 'water', sleep: 'sleep', body: 'tape', streaks: 'shield', nights: 'night', joints: 'check', data: 'save', secret: 'win', start: 'sun' };
/** Each medal's metal (board W5): bronze, silver and gold by tier, platinum in ice, secrets in rose; one still to earn is grey. */
const METAL: Record<Tier | 'secret' | 'none', string> = { b: '#e0874e', s: '#c4d3ea', g: '#ffc94d', p: '#4fd2ff', secret: '#ff6fa8', none: '#6a6282' };
const ROSETTE = Array.from({ length: 16 }, (_, k) => {
  const r = k % 2 ? 36 : 45;
  const t = (k * Math.PI) / 8 - Math.PI / 2;
  return `${(50 + r * Math.cos(t)).toFixed(1)} ${(50 + r * Math.sin(t)).toFixed(1)}`;
}).join(' L');
const OUTER: Record<Shape, string> = {
  circle: 'M50 6 a44 44 0 1 0 0.1 0',
  hex: 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z',
  rosette: `M${ROSETTE} Z`,
};
const INNER: Record<Shape, string> = {
  circle: 'M50 18 a32 32 0 1 0 0.1 0',
  hex: 'M50 19 L77 34.5 L77 65.5 L50 81 L23 65.5 L23 34.5 Z',
  rosette: 'M50 22 a28 28 0 1 0 0.1 0',
};

/** One medal, drawn as line art (board W5): its shape from its kind, an outline and a dashed inner ring in its metal; one still to earn is grey, ringed by how close it is. */
export function Medal({ item, size = 72 }: { item: CaseItem; size?: number }) {
  const shape = SHAPE[item.cat] ?? 'rosette';
  const c = METAL[item.earned ? (item.cat === 'secret' ? 'secret' : item.tier) : 'none'];
  const pct = !item.earned && item.progress && item.progress[1] > 0 ? Math.min(item.progress[0] / item.progress[1], 1) : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="cs-svg" data-shape={shape}>
      {pct !== undefined && <circle cx="50" cy="50" r="48" fill="none" stroke="#ffc94d" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct * 100} 100`} transform="rotate(-90 50 50)" />}
      <path d={OUTER[shape]} transform="translate(50 50) scale(.88) translate(-50 -50)" fill="#17122a" stroke={c} strokeWidth="3" strokeLinejoin="round" />
      <path d={INNER[shape]} transform="translate(50 50) scale(.88) translate(-50 -50)" fill={c} fillOpacity={item.earned ? 0.1 : 0} stroke={c} strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      <foreignObject x="32" y="32" width="36" height="36">
        <span className="cs-ic"><Icon name={item.earned || item.cat !== 'secret' ? ICON[item.cat] ?? 'win' : 'help'} size={26} stroke={2} color={c} /></span>
      </foreignObject>
    </svg>
  );
}

/** The count, and a bar of how much of the case is filled. */
export function CaseHead({ got, total }: { got: number; total: number }) {
  return (
    <div className="cs-hd">
      <span className="cs-of">{fmtInt(got)} of {fmtInt(total)} in the case</span>
      <span className="cs-bar" role="progressbar" aria-valuenow={got} aria-valuemin={0} aria-valuemax={total} aria-label="How full the case is"><i style={{ width: `${total ? (got / total) * 100 : 0}%` }} /></span>
    </div>
  );
}

/** The newest award on a stage, with light turning behind it. */
export function Spotlight({ item, line }: { item: CaseItem; line: string }) {
  return (
    <div className="cs-spot">
      <span className="cs-rays" aria-hidden="true" />
      <span className="cs-new">Newest</span>
      <Medal item={item} size={120} />
      <b>{item.name}</b>
      <span>{line}{item.date ? ` · ${fmtDayMonth(item.date)}` : ''}</span>
    </div>
  );
}

/** The case itself: each medal with its name; one to earn says how close in words. */
export function CaseGrid({ items }: { items: CaseItem[] }) {
  return (
    <div className="cs-grid">
      {items.map((x, i) => {
        const hidden = !x.earned && x.cat === 'secret';
        return (
          <div key={x.id} className={`cs-m ${x.earned ? 'earned' : 'locked'}`} style={{ '--i': i } as CSSProperties}>
            <Medal item={x} />
            <b>{hidden ? 'A secret' : x.name}</b>
            <span>{x.earned ? (x.date ? fmtDayMonth(x.date) : 'Earned') : x.progress ? `${fmtInt(Math.min(x.progress[0], x.progress[1]))} of ${fmtInt(x.progress[1])}` : hidden ? 'Not found yet' : 'To earn'}</span>
          </div>
        );
      })}
    </div>
  );
}
