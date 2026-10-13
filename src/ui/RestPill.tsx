import { useEffect, useRef, useState } from 'react';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * The rest countdown. Time is read from the clock, not counted, so a rest that
 * ran while the screen was off still ends at the right moment.
 */
export function RestPill({
  endsAt,
  total,
  onEnd,
  onEndNow,
}: {
  endsAt: number;
  /** Planned rest in seconds. */
  total: number;
  onEnd: () => void;
  onEndNow: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const frac = total > 0 ? Math.min(1, left / total) : 0;

  useEffect(() => {
    ended.current = false;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const wake = () => setNow(Date.now());
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [endsAt]);

  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [left, onEnd]);

  return (
    <div className="restpill" role="timer" aria-label={`Rest, ${mmss(left)} left`}>
      <span className="restpill-fill" style={{ transform: `scaleX(${frac})` }} aria-hidden />
      <span className="restpill-label t13">Rest</span>
      <span className="restpill-time num tn">{mmss(left)}</span>
      <button type="button" className="restpill-end" onClick={onEndNow}>
        End rest
      </button>
    </div>
  );
}
