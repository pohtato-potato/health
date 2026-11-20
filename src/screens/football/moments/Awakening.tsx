// An awakening (board 23, m23-awake): the unit's best card in an orb of the axis colour, dead centre, then the new
// trait in words and the axis before and after. Only that axis stretched.
import type { ReactNode } from 'react';
import { TRAIT } from '../../../football/squad';
import { usePlayers } from '../../../football/store/hooks';
import type { Axis, AxisValues } from '../../../football/types';
import { AXIS_INK } from '../../../ui/inks';
import { PlayerCard } from '../players/Card';
import { MomentLayer } from './Layer';
import { MomentPage, MomentRow, Orb } from './Orb';

/** The page itself, without the layer it sits in. The card (the unit's best player) comes in as children. */
export function Awakening({ axis, at, values, children, onDone }: { axis: Axis; at: number; values: AxisValues; children?: ReactNode; onDone: () => void }) {
  const was = values[axis];
  const now = Math.max(was, at);
  const ink = AXIS_INK[axis];
  return (
    <MomentPage colour={ink} titleId="fb-awake-t" title={axis} sub="awakens" action="Back to the club" onAction={onDone}
      hero={<Orb colour={ink} rays={10}>{children ? <span className="mo-card">{children}</span> : <b className="mo-big">{now}</b>}</Orb>}>
      <p className="mo-lead">The 28-day average reaches {at}. Only {axis} stretched: {was} before, {now} now.</p>
      <MomentRow colour={ink} mark="+" title={`New trait: ${TRAIT[axis]}`} line={`+1 on ${axis}’s own chance type, every match from now on.`} />
    </MomentPage>
  );
}

export function AwakeningView({ axis, at, values, onDone }: { axis: Axis; at: number; values: AxisValues; onDone: () => void }) {
  const players = usePlayers();
  const best = players?.filter((p) => p.status === 'squad' && p.unit === axis).sort((a, b) => b.overall - a.overall)[0];
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-awake-t">
      <Awakening axis={axis} at={at} values={values} onDone={onDone}>
        {best && <PlayerCard card={best.card} art={best.art} seed={best.id} player={best} />}
      </Awakening>
    </MomentLayer>
  );
}
