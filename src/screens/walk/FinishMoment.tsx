import { daysBetween, type DayKey } from '../../domain/dates';
import { kindOf, type RouteDef } from '../../walk/catalogue';
import { signatureOf } from '../../walk/signature';
import { inkStyle } from '../../walk/ui/RouteArt';
import { RouteMap } from '../../walk/ui/RouteMap';
import { endsOf } from './JoinMoment';
import { Visa } from './Visa';
import { WalkFrame } from './WalkFrame';
import { auroraForInk } from '../../walk/page';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** The finish: the road drawn whole in its ink, the visa with its gold exit stamp (earned), and what you did. */
export function FinishView({ def, doneOn, from, onPage, onClose }: { def: RouteDef; doneOn: DayKey; from: DayKey; onPage: () => void; onClose: () => void }) {
  const days = daysBetween(from, doneOn) + 1;
  const sig = signatureOf(def);
  return (
    <WalkFrame as="main" className="walk-moment walk-finish" tint={auroraForInk(def.ink)} style={inkStyle(def.id)}>
      <div className="walk-join-road done" aria-hidden="true">
        <RouteMap id={def.id} km={def.km} />
      </div>
      <div className="walk-join-visa">
        <Visa def={def} stamp={doneOn} />
      </div>
      <h1 className="walk-moment-title">You finished {def.name}</h1>
      <p className="walk-para center">
        {fmt(def.km)} km, {endsOf(def)}, in {fmt(days)} {days === 1 ? 'day' : 'days'}. Every one of the {fmt(sig.marks.length)} {sig.title.replace(/^The /, '').toLowerCase()} is yours.
      </p>
      <p className="walk-sub">{kindOf(def) === 'expedition' ? 'Its place is free for a new expedition.' : 'Its place is free for a new challenge.'}</p>
      <div className="walk-end-btns">
        <button type="button" className="walk-primary" onClick={onPage}>
          See its page
        </button>
        <button type="button" className="walk-ghost" onClick={onClose}>
          Back to the walk
        </button>
      </div>
    </WalkFrame>
  );
}
