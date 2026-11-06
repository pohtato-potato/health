// The one transfer budget, last season's income, the sponsor slots and the offers.
import { useState } from 'react';
import { euros, type Offer, type Risk, type Slot } from '../../../football/money';
import type { Club } from '../../../football/store/club';
import type { Tier } from '../../../football/types';

export const RISK: Record<Risk, string> = { stable: 'Stable', flashy: 'Flashy', dodgy: 'Dodgy' };
const RISK_WHY: Record<Risk, string> = { stable: 'Pays steadily.', flashy: 'Pays more, with a habit clause.', dodgy: 'Pays most. 1 in 4 a season it folds.' };
export const SLOT_NAME: Record<Slot, string> = { shirt: 'Shirt', kit: 'Kit maker', sleeve: 'Sleeve', ground: 'Ground naming', partner: 'Partner' };
const m = euros;

function slotRows(tier: Tier, groundBuilt: boolean): { slot: Slot; open: boolean; why?: string }[] {
  return [
    { slot: 'shirt', open: true },
    { slot: 'kit', open: true },
    { slot: 'sleeve', open: tier <= 4, why: 'Opens in Division Four' },
    { slot: 'ground', open: groundBuilt, why: 'Naming rights, once Kaai 42 is built' },
    { slot: 'partner', open: true },
  ];
}

export function MoneyView({ c, groundBuilt = false, onAccept, onOwn }: { c: Club; groundBuilt?: boolean; onAccept?: (o: Offer) => void; onOwn?: (name: string, slot: Slot) => void }) {
  const s = c.save;
  const signed = s.sponsors ?? [];
  const [name, setName] = useState(s.ownSponsor?.name ?? '');
  const [slot, setSlot] = useState<Slot>((s.ownSponsor?.slot as Slot) ?? 'sleeve');
  return (
    <>
      <section className="fb-card hot" aria-label="The budget">
        <span className="fb-lb">The one budget</span>
        <b className="fb-num fb-huge">{m(s.budget)}</b>
        {s.income ? s.income.lines.map((l) => <div key={l.name} className="fb-row"><span className="fb-s">{l.name}, season {s.income!.season}</span><b className="fb-num">{m(l.amount)}</b></div>)
          : <p className="fb-s">Income lands at the end of each season: TV, the gate, prize money and the sponsors. It grows with promotion.</p>}
      </section>
      <section className="fb-card" aria-label="Sponsor slots">
        <span className="fb-lb">Slots</span>
        {slotRows(c.tier, groundBuilt).map((r) => {
          const who = signed.filter((x) => x.slot === r.slot);
          const own = s.ownSponsor?.slot === r.slot ? s.ownSponsor.name : undefined;
          return (
            <div key={r.slot} className="fb-row">
              <span className="fb-lb">{SLOT_NAME[r.slot]}</span>
              <span className="fb-s fb-right">{!r.open ? r.why : [...who.map((x) => `${x.brand} (${RISK[x.risk]})`), ...(own ? [`${own} (your own)`] : [])].join(', ') || 'Empty'}</span>
            </div>
          );
        })}
      </section>
      <div className="fb-row"><h2 className="fb-t">Offers</h2><span className="fb-s">{(s.offers ?? []).length ? 'between seasons' : 'none now'}</span></div>
      {(s.offers ?? []).length === 0 && <p className="fb-s">Offers arrive in the days between seasons. Real brands come from Division Three up.</p>}
      {(s.offers ?? []).map((o, i) => (
        <section key={`${o.slot}-${o.brand}-${i}`} className={`fb-card fb-offer ${o.risk}`} aria-label={`${o.brand}, ${RISK[o.risk]}`}>
          <div className="fb-row"><b>{o.brand}</b><span className="fb-tag">{RISK[o.risk]}</span></div>
          <span className="fb-s">{SLOT_NAME[o.slot]} · {m(o.perSeason)} a season · {o.seasons} {o.seasons === 1 ? 'season' : 'seasons'}</span>
          <span className="fb-s">{o.line} {RISK_WHY[o.risk]}</span>
          <button type="button" className="fb-btn sm" onClick={() => onAccept?.(o)}>Sign {o.brand}</button>
        </section>
      ))}
      <p className="fb-s">One habit clause at a time, at most. No betting or alcohol, ever.</p>
      <form className="fb-card" aria-label="Your own sponsor" onSubmit={(e) => { e.preventDefault(); onOwn?.(name, slot); }}>
        <span className="fb-lb">Add your own sponsor</span>
        <input className="fb-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Sponsor name" placeholder="A name for the shirt" />
        <select className="fb-select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Which slot">
          {(['shirt', 'kit', 'sleeve', 'ground', 'partner'] as Slot[]).map((x) => <option key={x} value={x}>{SLOT_NAME[x]}</option>)}
        </select>
        <button type="submit" className="fb-btn pri sm">Save</button>
      </form>
    </>
  );
}
