// Opening night (board 23, m23-open): the new ground or building in a warm orb, its icon dead centre, then what it does.
import { bundleById } from '../../../football/ground';
import { projectById } from '../../../football/content/projects';
import { MomentLayer } from './Layer';
import { MomentPage, Orb } from './Orb';

const WARM = '#ffb347';
const BUILDING = <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke={WARM} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" /></svg>;

/** What opened: the move to Kaai 42, a shipped bundle, or a layer 3 stage by its name and reward. */
export function openingOf(id: string): { name: string; effect: string } {
  if (id === 'moving-day') return { name: 'Kaai 42', effect: 'Moving day. The first match at Kaai 42 is a big night, and the groundshare ends.' };
  const b = bundleById(id);
  if (b) return { name: b.name, effect: b.effect };
  const p = projectById(id);
  return { name: p?.name ?? 'A new building', effect: p?.reward ?? 'Built.' };
}

/** The page itself, without the layer it sits in. */
export function OpeningNight({ id, onDone }: { id: string; onDone: () => void }) {
  const b = openingOf(id);
  return (
    <MomentPage colour={WARM} titleId="fb-open-t" title="Opening" sub="night" action="Lights on" onAction={onDone} hero={<Orb colour={WARM} rays={18}>{BUILDING}</Orb>}>
      <p className="mo-name">{b.name}</p>
      <p className="mo-lead">{b.effect}</p>
    </MomentPage>
  );
}

export function OpeningNightView({ id, onDone }: { id: string; onDone: () => void }) {
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-open-t">
      <OpeningNight id={id} onDone={onDone} />
    </MomentLayer>
  );
}
