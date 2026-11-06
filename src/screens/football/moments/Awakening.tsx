// An axis awakens: only that axis stretches, its label turns gold, and it gains a trait.
import { Aurora } from '../FootballHome';
import { TRAIT } from '../../../football/squad';
import { AXES, type Axis, type AxisValues } from '../../../football/types';
import { Radar } from '../Radar';

export function AwakeningView({ axis, at, values, onDone }: { axis: Axis; at: number; values: AxisValues; onDone: () => void }) {
  const before = { ...values };
  const after = Object.fromEntries(AXES.map((a) => [a, a === axis ? Math.max(values[a], at) : values[a]])) as AxisValues;
  return (
    <div className="fb-moment" role="dialog" aria-modal="true" aria-labelledby="fb-awake-t">
      <Aurora a="#f2c46d" c="#6c3fc4">
        <main className="fb-page">
          <span className="fb-lb">{axis} · the 28-day average reaches {at}</span>
          <h2 id="fb-awake-t" className="fb-momtitle fb-goldtext">{axis} awakens</h2>
          <div className="fb-awake">
            <Radar values={after} gold={axis} label={`${axis} stretched`} size={260} />
          </div>
          <section className="fb-card gold">
            <span className="fb-lb">New trait</span>
            <b>{TRAIT[axis]}</b>
            <span className="fb-s">+1 on {axis}'s own chance type, every match from now on. Was {before[axis]}, now {after[axis]}.</span>
          </section>
          <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={onDone}>Back to the club</button></div>
        </main>
      </Aurora>
    </div>
  );
}
