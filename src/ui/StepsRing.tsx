import { fmtInt } from '../domain/format';

/** Yesterday's final steps beside a steps ring (board 6 `m6-also`): the ring fills to the goal, the words say where it stands. */
export function StepsRing({ steps, goal }: { steps: number | undefined; goal: number }) {
  const p = steps === undefined || goal <= 0 ? 0 : Math.min(1, steps / goal);
  const met = steps !== undefined && steps >= goal;
  return (
    <div className={`ml-stepsring${met ? ' met' : ''}`}>
      <svg viewBox="0 0 48 48" width={48} height={48} aria-hidden="true">
        <circle cx={24} cy={24} r={19} className="sr-track" />
        {p > 0 && <circle cx={24} cy={24} r={19} pathLength={100} className="sr-fill" strokeDasharray={`${p * 100} 100`} transform="rotate(-90 24 24)" />}
      </svg>
      <span>
        <b className="tn">{steps === undefined ? '—' : fmtInt(steps)}</b>
        {steps !== undefined && <span className="k-q"> · {met ? 'goal met' : `${fmtInt(goal - steps)} to the goal`}</span>}
      </span>
    </div>
  );
}
