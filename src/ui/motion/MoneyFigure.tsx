// Money (motion board two, Money take two; O44): when money arrives, coins spin in from both sides, are swallowed by
// the figure and it bumps; when money goes (wages), they drain out below. The figure rolls to its new value.
import type { CSSProperties } from 'react';
import { useChange } from './motion';
import { Roll } from './Roll';

const COINS: [number, number][] = [[-90, 0], [70, 120], [-30, 240], [110, 360], [-120, 480]];

export function MoneyFigure({ value, id, format }: { value: number; id: string; format: (n: number) => string }) {
  const ch = useChange(id, value);
  const dir = ch.n && ch.from !== undefined ? (value > ch.from ? 'up' : value < ch.from ? 'down' : '') : '';
  return (
    <span key={ch.n} className={`mo-money${dir ? ` ${dir}` : ''}`}>
      <Roll value={value} format={format} step={0.01} id={`${id}:n`} ms={1300} />
      {dir && COINS.map(([x, d], i) => <i key={i} className="mo-coin" aria-hidden="true" style={{ '--x': `${x}px`, '--d': `${d}ms` } as CSSProperties} />)}
    </span>
  );
}
