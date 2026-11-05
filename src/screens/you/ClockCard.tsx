import { useState, type CSSProperties } from 'react';
import { clockAt, type ClockPhase } from '../../domain/journeyClock';
import { MOMENTUM } from '../../ui/you/palette';

const SAYS: Record<ClockPhase, { line: string; note: string }> = {
  night: { line: "The whole journey as one day. Still dark, and you're already up.", note: 'Phase: building. Before dawn, the work nobody sees.' },
  dawn: { line: 'The whole journey as one day. First light.', note: 'Phase: showing. The early work starts to come through.' },
  day: { line: 'The whole journey as one day. Broad daylight now.', note: 'Phase: the long middle, where most of it gets done.' },
  dusk: { line: 'The whole journey as one day. The light is getting long.', note: 'Phase: the home stretch.' },
};

const R = 86;

export function ClockCard({ start, end, today }: { start: string; end: string; today: string }) {
  const [note, setNote] = useState(false);
  const c = clockAt(start, end, today);
  const a = c.fraction * 2 * Math.PI - Math.PI / 2;
  const large = c.fraction > 0.5 ? 1 : 0;
  const arc = `M100 ${100 - R} A${R} ${R} 0 ${large} 1 ${(100 + R * Math.cos(a)).toFixed(1)} ${(100 + R * Math.sin(a)).toFixed(1)}`;
  return (
    <button type="button" className="yu-clock" onClick={() => setNote(!note)} aria-expanded={note}>
      <svg width={96} height={96} viewBox="0 0 200 200" aria-hidden="true">
        <defs><linearGradient id="yuclk" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={MOMENTUM.from} /><stop offset="1" stopColor={MOMENTUM.to} /></linearGradient></defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#ede6da" strokeOpacity=".16" strokeWidth="10" />
        <path className="yu-draw2" pathLength={1} d={arc} fill="none" stroke="url(#yuclk)" strokeWidth="10" strokeLinecap="round" />
        <g className="yu-hand" style={{ '--a': `${c.fraction * 360}deg` } as CSSProperties}><line x1="100" y1="100" x2="100" y2="38" stroke="#ede6da" strokeWidth="4.5" strokeLinecap="round" /></g>
        <circle cx="100" cy="100" r="6.5" fill="#ede6da" />
      </svg>
      <span className="yu-col">
        <span className="yu-big">{c.label}</span>
        <span className="yu-q">{note ? SAYS[c.phase].note : SAYS[c.phase].line}</span>
      </span>
    </button>
  );
}
