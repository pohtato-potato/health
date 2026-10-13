import { useEffect, useState } from 'react';
import { restState } from '../domain/rest';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The battery saver's rest: true black, a big dim countdown, the screen kept on. Tap to see the session. */
export function RestScreen({ endsAt, total, onEndNow, onHide }: { endsAt: number; total: number; onEndNow: () => void; onHide: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const { left } = restState({ endsAt, total }, now);
  return (
    <div className="restscreen" role="timer" aria-label={`Rest, ${mmss(left)} left`} onClick={onHide}>
      <div className="restscreen-time num tn">{mmss(left)}</div>
      <div className="t14" style={{ color: '#6b6890' }}>
        Rest. Tap to see the session.
      </div>
      <button
        type="button"
        className="btn ghost"
        style={{ background: '#000', color: '#aeabbd', borderColor: '#2a2f55' }}
        onClick={(e) => {
          e.stopPropagation();
          onEndNow();
        }}
      >
        End rest
      </button>
    </div>
  );
}

/** The phone's battery level, when the browser will say; undefined otherwise. */
export function useBatteryLevel(): number | undefined {
  const [level, setLevel] = useState<number | undefined>();
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void }> };
    if (!nav.getBattery) return;
    let gone = false;
    let battery: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | undefined;
    const update = () => !gone && battery && setLevel(battery.level);
    nav
      .getBattery()
      .then((b) => {
        battery = b;
        update();
        b.addEventListener('levelchange', update);
      })
      .catch(() => {});
    return () => {
      gone = true;
      battery?.removeEventListener('levelchange', update);
    };
  }, []);
  return level;
}
