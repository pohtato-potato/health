// A rival is born (board 23, m23-rival): their crest in a turning ring of their colour with rays, the date, the modifier.
import { clubCrest } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { howText, twistOf, type Rival } from '../../../football/rivals';
import { rivalInk } from '../../../ui/inks';
import { Art } from '../Tonight';
import { MomentLayer } from './Layer';
import { BOLT, MomentPage, MomentRow, Orb } from './Orb';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMonth = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}` : '');

/** The page itself, without the layer it sits in. */
export function RivalBorn({ r, onDone }: { r: Rival; onDone: () => void }) {
  const c = clubById(r.clubId);
  const tw = twistOf(r);
  const colour = rivalInk(c.colours);
  const when = dayMonth(r.since);
  return (
    <MomentPage colour={colour} titleId="fb-rival-t" title="A rival" sub="is born" action="Noted" onAction={onDone}
      hero={<Orb colour={colour}><Art svg={clubCrest(c, 96)} /></Orb>}>
      <p className="mo-lead">{c.name}{when ? `, ${when}` : ''}. {howText(r)} Every match against them is a derby now.</p>
      <MomentRow colour={colour} mark={BOLT} title={`The rivalry’s modifier: ${tw.name}`} line={tw.text} />
    </MomentPage>
  );
}

export function RivalBornView({ r, onDone }: { r: Rival; onDone: () => void }) {
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-rival-t">
      <RivalBorn r={r} onDone={onDone} />
    </MomentLayer>
  );
}
