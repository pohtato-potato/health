import type { CSSProperties } from 'react';
import type { Lift } from '../../domain/slowDay';
import { Panel } from '../../ui/kit/Kit';

const STEPS = '#8fdcb6';
const GOLD = '#f2c46d';

/** Today's lift (look pass): one filled panel in the colour of what it is about. */
export function TodaysLift({ lift }: { lift: Lift | undefined }) {
  if (!lift) return null;
  if (lift.kind === 'ago') return <Panel ink={STEPS}><span className="k-lb">A month ago today</span><span>{lift.text}</span></Panel>;
  if (lift.kind === 'rank') {
    return (
      <Panel ink={STEPS}>
        <span className="k-lb">Better than {lift.beat} of your {lift.of} weeks</span>
        <span className="k-meter" style={{ '--w': `${Math.round((lift.beat / lift.of) * 100)}%` } as CSSProperties}><i /></span>
      </Panel>
    );
  }
  return (
    <Panel ink={GOLD}>
      <span className="k-lb">Your best, from the record book</span>
      <span><b className="k-num ink">{lift.value}</b></span>
      <span className="k-q">{lift.note}.</span>
    </Panel>
  );
}
