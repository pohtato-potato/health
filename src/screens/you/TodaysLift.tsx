import type { CSSProperties } from 'react';
import type { Lift } from '../../domain/slowDay';
import { GOLD, HUE } from '../../ui/you/palette';

function Body({ lift }: { lift: Lift }) {
  if (lift.kind === 'ago') return <><b>A month ago today</b><span className="yu-q">{lift.text}</span></>;
  if (lift.kind === 'rank') {
    return (
      <>
        <b>Better than {lift.beat} of your {lift.of} weeks</b>
        <span className="yu-meter"><i style={{ '--w': `${Math.round((lift.beat / lift.of) * 100)}%`, '--c': HUE.steps } as CSSProperties} /></span>
      </>
    );
  }
  return <><b>Your best, from the record book</b><span className="yu-q"><b style={{ color: GOLD }}>{lift.value}</b>. {lift.note}.</span></>;
}

export function TodaysLift({ lift }: { lift: Lift | undefined }) {
  if (!lift) return null;
  return (
    <section className="yu-sec">
      <h2>Today's lift</h2>
      <div className="yu-card yu-tint" style={{ '--c': HUE.shape } as CSSProperties}><Body lift={lift} /></div>
    </section>
  );
}
