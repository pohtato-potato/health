// The signing moment (O41 #4, letter A): full screen, the shirt with the brand on it, the logo as an outline, what it
// pays, what came today, when the rest comes, and any clause. Seen once, then gone.
import { kitSvg } from '../../../football/art/kit';
import { sponsorLogoSvg } from '../../../football/art/sponsorMark';
import { kitEntry } from '../../../football/kits';
import { euros } from '../../../football/money';
import { seasonLength } from '../../../football/calendar';
import { worldOf } from '../../../football/pyramid/shape';
import { markSigningSeen } from '../../../football/store/save';
import type { FbSave } from '../../../football/store/tables';
import { Aurora } from '../FootballHome';
import { Art } from '../Tonight';
import { MomentLayer } from './Layer';

const WHERE = { shirt: 'On the shirt', kit: 'Making the kit', sleeve: 'On the sleeve', ground: 'On the ground', partner: 'A club partner' } as const;
const N = ['', 'one season', 'two seasons', 'three seasons'];

export function SigningView({ save }: { save: FbSave }) {
  const d = save.signed;
  if (!d) return null;
  const home = save.kits?.filter((k) => k.slot === 'home').sort((a, b) => b.season - a.season)[0];
  const kit = (home && kitEntry(home.id)?.kit) ?? kitEntry('H1')!.kit;
  const onShirt = d.slot === 'shirt' || d.slot === 'sleeve';
  const days = seasonLength(worldOf(save));
  const clause = d.risk === 'flashy' ? 'A habit clause: one habit to keep while it runs.' : d.risk === 'dodgy' ? 'It may fold: 1 season in 4.' : 'None.';
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-sign-t">
      <Aurora c="#f2c46d">
        <main className="fb-page fb-sign">
          <span className="fb-lb">Signed · Season {d.since}</span>
          <div className="fb-sign-art">
            {onShirt && <Art svg={kitSvg({ ...kit, sp: save.sponsorStyle ?? 'A' }, 'front', 150, { sponsor: d.slot === 'shirt' ? d.brand : undefined, label: `The home shirt with ${d.brand}` })} />}
            <Art svg={sponsorLogoSvg(d.brand, onShirt ? 110 : 160, '#fff6d6')} />
          </div>
          <h2 id="fb-sign-t" className="fb-momtitle">{d.brand}: {WHERE[d.slot].toLowerCase()} for {N[d.seasons] ?? `${d.seasons} seasons`}</h2>
          <div className="fb-sign-rows">
            <p><span>Pays</span><b>{euros(d.perSeason)} a season</b></p>
            <p><span>Paid today</span><b>{euros(d.advance)}, a quarter</b></p>
            <p><span>The rest</span><b>at the season’s end, day {days}</b></p>
            <p><span>Clause</span><b>{clause}</b></p>
          </div>
          <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={() => void markSigningSeen()}>Keep it</button></div>
        </main>
      </Aurora>
    </MomentLayer>
  );
}
