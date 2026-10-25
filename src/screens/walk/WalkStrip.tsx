import type { Strip } from '../../walk/strip';

const X0 = 12;
const X1 = 304;
const SANS = 'DM Sans Variable, system-ui, sans-serif';

/**
 * The strip under the scene: the stretch's road with the part walked in sage, you on it, a dot for each small stop
 * with its kind in words (the next one brighter), and the start and the end with the distance left. Opens the map.
 */
export function WalkStrip({ strip, onOpen }: { strip: Strip; onOpen: () => void }) {
  const x = (f: number) => X0 + (X1 - X0) * f;
  const words = strip.stops.map((s) => s.word.toLowerCase());
  return (
    <button type="button" className="walk-strip2" onClick={onOpen} aria-label={`The stretch from ${strip.from} to ${strip.to}, ${strip.toKm} km left${words.length ? `, with stops: ${words.join(', ')}` : ''}. Open the map`}>
      <svg viewBox="0 0 316 70" aria-hidden="true">
        <line x1={X0} y1="20" x2={X1} y2="20" className="road" strokeWidth="8" strokeLinecap="round" />
        <line x1={x(strip.todayFrom)} y1="20" x2={x(strip.youFrac)} y2="20" className="today" strokeWidth="8" strokeLinecap="round" />
        <line x1={X0} y1="20" x2={x(strip.todayFrom)} y2="20" className="walked" strokeWidth="8" strokeLinecap="round" />
        {strip.stops.map((s, i) => (
          <circle key={i} cx={x(s.frac)} cy="20" r="6" className={s.passed ? 'stop passed' : 'stop'} strokeWidth="2" />
        ))}
        <circle cx={X0} cy="20" r="7" className="end passed" />
        <circle cx={X1} cy="20" r="7" className="end" strokeWidth="2" />
        <circle cx={x(strip.youFrac)} cy="20" r="8" className="you" strokeWidth="3" />
        {strip.stops.map(
          (s, i) =>
            s.label && (
              <text key={i} x={x(s.frac)} y="46" textAnchor="middle" fontFamily={SANS} fontSize="14" className={s.next ? 'word next' : 'word'}>
                {s.word}
              </text>
            ),
        )}
        <text x={X0} y="66" fontFamily={SANS} fontSize="14" className="word">
          {strip.from}
        </text>
        <text x={X1} y="66" textAnchor="end" fontFamily={SANS} fontSize="14" className="word">
          {strip.to} · {strip.toKm.toLocaleString('en-IN')} km
        </text>
      </svg>
    </button>
  );
}
