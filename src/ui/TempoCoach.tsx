import { useEffect, useRef, useState } from 'react';
import { buzz } from '../audio';
import { tempoPhase } from '../domain/tempo';
import { useNow } from '../db/hooks';

/**
 * Paces a slow-lowering set with the phone's buzz: one tap as you start down,
 * two as you drive up. The screen shows the same thing for a glance.
 */
export function TempoCoach({ reps, onStop, vibrate }: { reps: number; onStop: () => void; vibrate: boolean }) {
  const [start] = useState(() => Date.now() + 2500);
  const now = useNow(100);
  const elapsed = now - start;
  const phase = elapsed >= 0 ? tempoPhase(elapsed) : undefined;
  const last = useRef('');

  useEffect(() => {
    if (!phase) return;
    if (phase.rep > reps) {
      if (vibrate) buzz([60, 60, 60, 60, 160]);
      onStop();
      return;
    }
    const key = `${phase.rep}:${phase.down ? 'down' : 'up'}`;
    if (key === last.current) return;
    last.current = key;
    if (vibrate) buzz(phase.down ? 45 : [25, 60, 25]);
  });

  const label = !phase ? 'Get set' : phase.down ? 'Lower' : 'Lift';
  return (
    <div className="card" role="status" aria-live="polite" style={{ gap: 10, borderColor: 'var(--blue)', background: '#131827' }}>
      <div className="row base">
        <span className="lbl blue">Tempo coach · 3 down, 1 up</span>
        <span className="t13 tn q">{phase ? `Rep ${Math.min(phase.rep, reps)} of ${reps}` : `${Math.ceil(-elapsed / 1000)}…`}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <span className="sf" style={{ fontSize: 40, lineHeight: 1, color: phase?.down === false ? 'var(--sage)' : 'var(--text)' }}>
          {label}
        </span>
        <span className="num tn" style={{ fontSize: 44, lineHeight: 1 }}>
          {phase ? phase.count : ''}
        </span>
      </div>
      <div className="bar lg">
        <i style={{ width: `${(phase?.progress ?? 0) * 100}%`, background: phase?.down === false ? 'var(--sage)' : 'var(--blue)', transition: 'width 100ms linear' }} />
      </div>
      <button type="button" className="btn ghost block" onClick={onStop}>
        Stop the coach
      </button>
    </div>
  );
}
