import type { CSSProperties } from 'react';
import type { Category, Tier } from '../../domain/achievements';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { Icon, type IconName } from '../../ui/Icon';

export interface CaseItem { id: string; name: string; cat: Category; tier: Tier; earned: boolean; date?: DayKey; progress?: [number, number] }

type Shape = 'circle' | 'hex' | 'shield';
const SHAPE: Partial<Record<Category, Shape>> = { steps: 'circle', india: 'circle', start: 'circle', training: 'hex', strength: 'hex', streaks: 'hex' };
const ICON: Partial<Record<Category, IconName>> = { steps: 'steps', india: 'journey', training: 'train', strength: 'trend', food: 'food', water: 'water', sleep: 'sleep', body: 'tape', streaks: 'shield', nights: 'night', joints: 'check', data: 'save', secret: 'win', start: 'sun' };
/** Light, body and edge of each metal: bronze, silver and gold by tier, platinum in ice, secrets in rose. */
const METAL: Record<Tier | 'secret' | 'none', [string, string, string]> = {
  b: ['#ffd2b0', '#e0874e', '#7a3a14'],
  s: ['#ffffff', '#c4d3ea', '#6a7a94'],
  g: ['#fff3c4', '#ffc94d', '#b97a12'],
  p: ['#d8fbff', '#4fd2ff', '#0f5a7a'],
  secret: ['#ffd6e8', '#ff6fa8', '#8a1e4e'],
  none: ['#5a5470', '#3a3450', '#2a2540'],
};
const PATH: Record<Shape, string> = {
  circle: 'M50 6 a44 44 0 1 0 0.1 0',
  hex: 'M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z',
  shield: 'M50 4 L88 16 L88 50 Q88 80 50 96 Q12 80 12 50 L12 16 Z',
};

/** One medal, drawn: its shape from its kind, its metal from its tier; one still to earn is grey, ringed by how close it is. */
export function Medal({ item, size = 72 }: { item: CaseItem; size?: number }) {
  const shape = SHAPE[item.cat] ?? 'shield';
  const [a, b, c] = METAL[item.earned ? (item.cat === 'secret' ? 'secret' : item.tier) : 'none'];
  const g = `cs-g-${item.id}`;
  const pct = !item.earned && item.progress && item.progress[1] > 0 ? Math.min(item.progress[0] / item.progress[1], 1) : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="cs-svg">
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient></defs>
      {pct !== undefined && <circle cx="50" cy="50" r="48" fill="none" stroke="#ffc94d" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct * 100} 100`} transform="rotate(-90 50 50)" />}
      <path d={PATH[shape]} transform="translate(50 50) scale(.84) translate(-50 -50)" fill={`url(#${g})`} stroke={c} strokeWidth="3" />
      <foreignObject x="30" y="30" width="40" height="40">
        <span className="cs-ic"><Icon name={item.earned || item.cat !== 'secret' ? ICON[item.cat] ?? 'win' : 'help'} size={30} stroke={2.2} color={item.earned ? c : '#9a92b4'} /></span>
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
