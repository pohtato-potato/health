import { useEffect, useRef } from 'react';
import { wheelIndexFor } from './pick';

const ROW = 40;

/** A vertical wheel picker. Scroll, tap a row or use the arrow keys; it settles on the nearest row. */
export function Wheel<T extends string | number>({
  value,
  onChange,
  items,
  format = String,
  label,
  width = 64,
}: {
  value: T;
  onChange: (v: T) => void;
  items: readonly T[];
  format?: (v: T) => string;
  label: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const idx = Math.max(0, wheelIndexFor(value, items));

  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - idx * ROW) > 2) el.scrollTo({ top: idx * ROW });
  }, [idx]);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (items[i] !== value) onChange(items[i]);
    }, 90);
  };

  const move = (by: number) => onChange(items[Math.min(items.length - 1, Math.max(0, idx + by))]);

  return (
    <div
      className="wheel"
      style={{ width }}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={idx}
      aria-valuemin={0}
      aria-valuemax={items.length - 1}
      aria-valuetext={format(items[idx])}
      onKeyDown={(e) => {
        const by = ({ ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 } as Record<string, number>)[e.key];
        if (by) {
          e.preventDefault();
          move(by);
        } else if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          onChange(items[e.key === 'Home' ? 0 : items.length - 1]);
        }
      }}
    >
      <div className="wheel-scroll" ref={ref} onScroll={onScroll} aria-hidden>
        <div style={{ height: ROW * 2 }} />
        {items.map((it, i) => (
          <div key={String(it)} className={i === idx ? 'wheel-row on' : 'wheel-row'} onClick={() => onChange(it)}>
            {format(it)}
          </div>
        ))}
        <div style={{ height: ROW * 2 }} />
      </div>
      <div className="wheel-lens" aria-hidden />
    </div>
  );
}
