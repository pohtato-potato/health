import type { CSSProperties, ReactNode } from 'react';
import type { TrackKey } from '../../domain/trackRules';

const v = (o: Record<string, string | number>) => o as CSSProperties;
const r = (i: number, m: number) => ((i * 37 + 11) * ((i % 5) + 3)) % m;
const many = (n: number, cls: string, f: (i: number) => Record<string, string | number>) => Array.from({ length: n }, (_, i) => <i key={`${cls}${i}`} className={cls} style={v(f(i))} />);

/** A small living thing for each track: decoration only, behind everything, never carrying meaning. */
export function Ambient({ t }: { t: TrackKey }) {
  let kids: ReactNode = null;
  if (t === 'drinks') kids = <>
    {many(14, 'bub', (i) => ({ '--x': `${r(i, 96)}%`, '--s': `${5 + r(i, 11)}px`, '--t': `${5 + r(i, 6)}s`, '--d': `-${r(i, 9)}s` }))}
    <span className="foamline">{many(11, 'foam', (i) => ({ '--x': `${i * 10 - 3}%`, '--s': `${34 + r(i, 30)}px`, '--t': `${3 + r(i, 4)}s`, '--d': `-${r(i, 5)}s` }))}</span>
  </>;
  if (t === 'food') kids = <svg className="a-art a-bowl" viewBox="0 0 120 100">
    {[38, 60, 82].map((x, i) => <path key={x} className="a-steam" pathLength={1} d={`M${x} 50 c-9 -9 9 -15 0 -24 c-9 -9 9 -13 0 -22`} style={v({ '--d': `${i * -1.3}s` })} />)}
    <path d="M12 56 h96 c0 24 -20 38 -48 38 s-48 -14 -48 -38 z" fill="#ffe7cf" fillOpacity=".72" />
    <path d="M8 56 h104" stroke="#fff4e6" strokeWidth="5" strokeLinecap="round" />
  </svg>;
  if (t === 'steps') kids = many(14, 'print', (i) => ({ '--x': `${(i % 2 ? 58 : 66) + Math.sin(i / 2) * 18}%`, '--y': `${94 - i * 6.6}%`, '--d': `${i * 0.42}s` }));
  if (t === 'sleep') kids = <><i className="moon" />{many(22, 'star', (i) => ({ '--x': `${r(i, 97)}%`, '--y': `${r(i * 3 + 1, 90)}%`, '--s': `${2 + r(i, 3)}px`, '--t': `${2.5 + r(i, 4)}s`, '--d': `-${r(i, 6)}s` }))}</>;
  if (t === 'training') kids = <span className="barline">{many(13, 'beat', (i) => ({ '--h': `${24 + r(i, 60)}%`, '--t': `${0.9 + r(i, 8) / 10}s`, '--d': `-${r(i, 12) / 10}s` }))}</span>;
  if (t === 'shape') kids = <i className="a-tape" />;
  if (t === 'readiness') kids = <svg className="a-art a-batt" viewBox="0 0 120 60">
    <rect x="3" y="3" width="104" height="54" rx="10" fill="none" stroke="#f0ffc0" strokeWidth="5" />
    <rect x="109" y="20" width="9" height="20" rx="3" fill="#f0ffc0" />
    {[0, 1, 2, 3].map((i) => <rect key={i} className="a-cell" x={11 + i * 23} y="11" width="18" height="38" rx="4" style={v({ '--d': `${i * 0.5}s` })} />)}
  </svg>;
  if (t === 'joints') kids = <svg className="a-art a-joint" viewBox="0 0 120 130">
    <rect x="51" y="2" width="18" height="60" rx="9" fill="#dcefff" fillOpacity=".8" />
    <g className="a-shin"><rect x="51" y="60" width="18" height="62" rx="9" fill="#dcefff" fillOpacity=".8" /></g>
    <circle className="a-pulse" cx="60" cy="60" r="20" fill="none" stroke="#dcefff" strokeWidth="2.5" />
    <circle cx="60" cy="60" r="14" fill="#f4faff" />
  </svg>;
  if (t === 'meds') kids = many(8, 'cap', (i) => ({ '--x': `${r(i, 90)}%`, '--t': `${9 + r(i, 7)}s`, '--d': `-${r(i, 13)}s`, '--r': `${r(i, 180)}deg` }));
  if (t === 'own') kids = many(11, 'bit', (i) => ({ '--x': `${r(i, 94)}%`, '--t': `${8 + r(i, 7)}s`, '--d': `-${r(i, 12)}s`, '--rad': i % 3 === 0 ? '50%' : i % 3 === 1 ? '3px' : '50% 0', '--k': ['#ffd27a', '#ff9fd0', '#8ff0d8'][i % 3] }));
  if (t === 'compare') kids = <><i className="orbit" /><i className="orb a" /><i className="orb b" /></>;
  return <div className={`yu-amb yu-amb-${t}`} aria-hidden="true">{kids}</div>;
}
