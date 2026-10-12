import { useEffect, useRef } from 'react';
import { dialSnap } from './pick';

const GAP = 12;

/** A horizontal ruler dial: drag the ticks under a fixed needle, or use the arrow keys. */
export function Dial({
  value,
  step,
  min,
  max,
  onChange,
  unit,
  label,
  major = 4,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
  label: string;
  /** A long tick every this many steps. */
  major?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const snapped = dialSnap(value, step, min, max);
  const count = Math.round((max - min) / step);
  const pos = Math.round((snapped - min) / step);
  const shown = snapped.toFixed((String(step).split('.')[1] ?? '').length);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollLeft - pos * GAP) > 2) el.scrollTo({ left: pos * GAP });
  }, [pos]);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const v = dialSnap(min + (el.scrollLeft / GAP) * step, step, min, max);
      if (v !== snapped) onChange(v);
    }, 90);
  };

  return (
    <div className="dial">
      <div className="dial-value num tn" aria-hidden>
        {shown}
        {unit && <span className="dial-unit">{unit}</span>}
      </div>
      <div
        className="dial-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={snapped}
        aria-valuetext={`${shown}${unit ? ` ${unit}` : ''}`}
        onKeyDown={(e) => {
          const by = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -major, PageUp: major } as Record<string, number>)[e.key];
          if (by) {
            e.preventDefault();
            onChange(dialSnap(snapped + by * step, step, min, max));
          } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            onChange(e.key === 'Home' ? min : max);
          }
        }}
      >
        <div className="dial-scroll" ref={ref} onScroll={onScroll}>
          <div className="dial-ticks" style={{ width: count * GAP }}>
            {Array.from({ length: count + 1 }, (_, i) => (
              <span key={i} className={i % major === 0 ? 'tick-mark major' : 'tick-mark'} style={{ left: i * GAP }} />
            ))}
          </div>
        </div>
        <div className="dial-needle" aria-hidden />
      </div>
    </div>
  );
}
