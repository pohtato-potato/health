import { useEffect, useRef } from 'react';
import { fmtKg } from '../../domain/loads';
import type { HeavierOffer } from '../../domain/progression';

/** "Ready for 7.5 kg?" — full screen, before the set. Nothing is pre-filled until it is answered. */
export function HeavierMoment({ exercise, offer, onYes, onNo }: { exercise: string; offer: HeavierOffer; onYes: () => void; onNo: () => void }) {
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => yes.current?.focus(), []);
  const fromText = offer.from > 0 ? `${fmtKg(offer.from)} kg` : 'no weight';
  return (
    <div className="heavier" role="dialog" aria-modal="true" aria-labelledby="heavier-title">
      <div className="heavier-glow" aria-hidden />
      <div className="col gap12" style={{ position: 'relative' }}>
        <div className="t15 q">{exercise}</div>
        <h2 id="heavier-title" className="heavier-title">
          Ready for <span className="gold">{fmtKg(offer.to)} kg</span>?
        </h2>
        <ul className="heavier-case">
          {offer.case.map((line) => (
            <li key={line} className="t15 lh">
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="col gap8" style={{ position: 'relative' }}>
        <button ref={yes} type="button" className="btn lg block" onClick={onYes}>
          Go heavier
        </button>
        <button type="button" className="btn ghost lg block" onClick={onNo}>
          Stay at {fromText}
        </button>
      </div>
    </div>
  );
}
