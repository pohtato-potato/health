// A sponsor signs (board 23, m23-sign; O41 #4): SIGNED stamps down over the brand, then four rows: what it is, what
// was paid today, the clause and the risk. Every sum is the stored deal's. Seen once, then gone.
import { kitSvg } from '../../../football/art/kit';
import { sponsorLogoSvg } from '../../../football/art/sponsorMark';
import { kitEntry } from '../../../football/kits';
import { euros } from '../../../football/money';
import { seasonLength } from '../../../football/calendar';
import { worldOf } from '../../../football/pyramid/shape';
import { markSigningSeen } from '../../../football/store/save';
import type { FbSave } from '../../../football/store/tables';
import { Art } from '../Tonight';
import { MomentLayer } from './Layer';
import { MomentPage, MomentRow } from './Orb';

const WHERE = { shirt: 'On the shirt', kit: 'Making the kit', sleeve: 'On the sleeve', ground: 'On the ground', partner: 'A club partner' } as const;
const N = ['', 'one season', 'two seasons', 'three seasons'];

const GREEN = '#5fe3a1';
const SHIRT = <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0b1022" strokeWidth="2" strokeLinejoin="round"><path d="M6 4l6 3 6-3 3 6-3 2v8H6v-8l-3-2z" /></svg>;

/** The page itself, without the layer it sits in. */
export function Signing({ save, onKeep }: { save: FbSave; onKeep: () => void }) {
  const d = save.signed;
  if (!d) return null;
  const home = save.kits?.filter((k) => k.slot === 'home').sort((a, b) => b.season - a.season)[0];
  const kit = (home && kitEntry(home.id)?.kit) ?? kitEntry('H1')!.kit;
  const onShirt = d.slot === 'shirt' || d.slot === 'sleeve';
  const days = seasonLength(worldOf(save));
  const [first, ...rest] = d.brand.split(' ');
  const hero = (
    <div className="mo-sign-hero">
      <div className="mo-sign-art">
        {onShirt ? <Art svg={kitSvg({ ...kit, sp: save.sponsorStyle ?? 'A' }, 'front', 120, { sponsor: d.slot === 'shirt' ? d.brand : undefined, label: `The home shirt with ${d.brand}` })} />
          : <Art svg={sponsorLogoSvg(d.brand, 120, '#fff6d6')} />}
      </div>
      <span className="mo-stamp" aria-hidden="true">SIGNED</span>
    </div>
  );
  return (
    <MomentPage colour={GREEN} titleId="fb-sign-t" title={rest.length ? first : 'Signed'} sub={rest.length ? rest.join(' ') : d.brand} action="Keep it" onAction={onKeep} hero={hero}>
      <div className="mo-rows">
        <MomentRow colour={GREEN} mark={SHIRT} title={d.brand} line={`${WHERE[d.slot]} · ${N[d.seasons] ?? `${d.seasons} seasons`} · from season ${d.since}`} end={`${euros(d.perSeason)} a season`} />
        <MomentRow colour="#ffd36b" mark="1" title="Paid today" line={`${euros(d.advance)}, a quarter. The rest at the season’s end, day ${days}.`} />
        <MomentRow colour="#c2b2ff" mark="!" title={d.risk === 'flashy' ? 'A habit clause' : 'No clause'} line={d.risk === 'flashy' ? 'One habit to keep while it runs.' : 'Nothing to keep up while it runs.'} />
        <MomentRow colour="#ff8a9a" mark="?" title={d.risk === 'dodgy' ? 'It may fold' : 'It will see the deal out'} line={d.risk === 'dodgy' ? '1 season in 4.' : 'A steady brand.'} />
      </div>
    </MomentPage>
  );
}

export function SigningView({ save }: { save: FbSave }) {
  if (!save.signed) return null;
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-sign-t">
      <Signing save={save} onKeep={() => void markSigningSeen()} />
    </MomentLayer>
  );
}
