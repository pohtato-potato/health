// Five goal bursts, cycling across a match's goals (board 8). Drawn at the landing spot.
import type { Wave } from './Replay';

export const WAVE_NAMES: Record<Wave, string> = { rings: 'Rings', hex: 'Hex wave', net: 'Net wave', rays: 'Ray burst', shards: 'Colour shards' };

export function Shockwave({ kind, x, y }: { kind: Wave; x: number; y: number }) {
  const hex = (r: number) => Array.from({ length: 6 }, (_, i) => `${(r * Math.cos(-Math.PI / 2 + (i * Math.PI) / 3)).toFixed(1)},${(r * Math.sin(-Math.PI / 2 + (i * Math.PI) / 3)).toFixed(1)}`).join(' ');
  return (
    <g className={`fb-wave w-${kind}`} transform={`translate(${x} ${y})`} aria-hidden="true">
      {kind === 'rings' && [0, 1, 2].map((k) => <circle key={k} r="10" className={`s k${k}`} />)}
      {kind === 'hex' && [0, 1].map((k) => <polygon key={k} points={hex(10)} className={`s k${k}`} />)}
      {kind === 'net' && (
        <g className="s k0">
          {Array.from({ length: 7 }, (_, k) => <line key={`h${k}`} x1="-30" x2="30" y1={-30 + k * 10} y2={-30 + k * 10} />)}
          {Array.from({ length: 7 }, (_, k) => <line key={`v${k}`} y1="-30" y2="30" x1={-30 + k * 10} x2={-30 + k * 10} />)}
        </g>
      )}
      {kind === 'rays' && (
        <g className="rays">
          {Array.from({ length: 12 }, (_, k) => { const a = (k * Math.PI) / 6; return <line key={k} x1={8 * Math.cos(a)} y1={8 * Math.sin(a)} x2={22 * Math.cos(a)} y2={22 * Math.sin(a)} className={`ray c${k % 2}`} />; })}
        </g>
      )}
      {kind === 'shards' && Array.from({ length: 9 }, (_, k) => {
        const a = (k * 2 * Math.PI) / 9;
        return <path key={k} d="M0 -5 L4 3 L-4 3 Z" className={`shd c${k % 3}`} style={{ '--dx': `${Math.cos(a) * 70}px`, '--dy': `${Math.sin(a) * 70}px`, '--r': `${k * 47}deg` } as React.CSSProperties} />;
      })}
      <circle r="5" className="core" />
    </g>
  );
}
