// The one transfer budget, last season's income, the sponsor slots and the offers.
import { useState } from 'react';
import { euros, KIT_SPONSOR_TECH, type Offer, type Risk, type Slot } from '../../../football/money';
import type { Club } from '../../../football/store/club';
import type { Tier } from '../../../football/types';
import { WagesCard } from '../tree/TreeScreens';
import { Action, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { BLUE, CORAL, GOLD, GREEN, LAV, Note, PanelTop } from './Bits';

const RISK_INK: Record<Risk, string> = { stable: GREEN, flashy: GOLD, dodgy: CORAL };

export const RISK: Record<Risk, string> = { stable: 'Stable', flashy: 'Flashy', dodgy: 'Dodgy' };
const RISK_WHY: Record<Risk, string> = { stable: 'Pays steadily.', flashy: 'Pays more, with a habit clause.', dodgy: 'Pays most. 1 in 4 a season it folds.' };
export const SLOT_NAME: Record<Slot, string> = { shirt: 'Shirt', kit: 'Kit maker', sleeve: 'Sleeve', ground: 'Ground naming', partner: 'Partner' };
const m = euros;

function slotRows(tier: Tier, groundBuilt: boolean, kit: boolean, world2: boolean): { slot: Slot; open: boolean; why?: string }[] {
  return [
    { slot: 'shirt', open: true },
    { slot: 'kit', open: kit, why: 'Opens with Kit sponsor, in the tree' },
    { slot: 'sleeve', open: tier <= 4, why: world2 ? 'Opens from Division Five up' : 'Opens in Division Four' },
    { slot: 'ground', open: groundBuilt, why: 'Naming rights, once Kaai 42 is built' },
    { slot: 'partner', open: true },
  ];
}

export function MoneyView({ c, groundBuilt = false, onAccept, onOwn }: { c: Club; groundBuilt?: boolean; onAccept?: (o: Offer) => void; onOwn?: (name: string, slot: Slot) => void }) {
  const s = c.save;
  const signed = s.sponsors ?? [];
  const [name, setName] = useState(s.ownSponsor?.name ?? '');
  const [slot, setSlot] = useState<Slot>((s.ownSponsor?.slot as Slot) ?? 'sleeve');
  // In world 2 the kit maker's slot opens with the tree's Kit sponsor (ledger O40); a kit deal signed before stays.
  const kit = s.world !== 2 || (s.treeUser?.researched ?? []).some((r) => r.id === KIT_SPONSOR_TECH) || signed.some((x) => x.slot === 'kit');
  return (
    <div className="k-page">
      <Hero value={m(s.budget)} ink={GOLD} label="the one budget" />
      {s.income ? (
        <Panel ink={GOLD}>
          <PanelTop name={`Income, season ${s.income.season}`} c={GOLD} />
          {s.income.lines.map((l) => <div key={l.name} className="k-row"><span>{l.name}</span><b className="k-num" style={{ fontSize: 18 }}>{m(l.amount)}</b></div>)}
        </Panel>
      ) : s.redrawn?.budget !== undefined ? (
        <Panel ink={GOLD}>
          <PanelTop name="Money on arrival" c={GOLD} />
          <div className="k-row"><span>Starting budget, Season {s.season}</span><b className="k-num" style={{ fontSize: 18 }}>{m(s.redrawn.budget)}</b></div>
          <span className="k-q">One careful season’s income at this level. This season’s own income lands at its end: TV, the gate, prize money and the sponsors.</span>
        </Panel>
      ) : <Note>Income lands at the end of each season: TV, the gate, prize money and the sponsors. It grows with promotion.</Note>}
      <WagesCard />
      <Sect>Sponsor slots</Sect>
      <Panel ink={BLUE}>
        {slotRows(c.stage ?? c.tier, groundBuilt, kit, s.world === 2).map((r) => {
          const who = signed.filter((x) => x.slot === r.slot);
          const own = s.ownSponsor?.slot === r.slot ? s.ownSponsor.name : undefined;
          const text = !r.open ? r.why : [...who.map((x) => `${x.brand} (${RISK[x.risk]})`), ...(own ? [`${own} (your own)`] : [])].join(', ') || 'Empty';
          return (
            <div key={r.slot} className="k-row" style={{ minHeight: 36, alignItems: 'baseline', gap: 12, padding: '4px 0' }}>
              <b>{SLOT_NAME[r.slot]}</b>
              <span className={r.open && text !== 'Empty' ? undefined : 'k-q'} style={{ textAlign: 'right' }}>{text}</span>
            </div>
          );
        })}
      </Panel>
      <Sect>Offers</Sect>
      {(s.offers ?? []).length === 0 && <Note>None now. New offers arrive between seasons for any open slot. Real brands come from Division Three up.</Note>}
      {(s.offers ?? []).length > 0 && <Note>Sign one now and it pays from this season, at the season’s end.</Note>}
      <div className="kb-rows">
        {(s.offers ?? []).map((o, i) => (
          <Panel key={`${o.slot}-${o.brand}-${i}`} ink={RISK_INK[o.risk]}>
            <PanelTop name={o.brand} c={RISK_INK[o.risk]} right={RISK[o.risk]} />
            <span className="k-q">{SLOT_NAME[o.slot]} · {m(o.perSeason)} a season · {o.seasons} {o.seasons === 1 ? 'season' : 'seasons'}</span>
            <span>{o.line} {RISK_WHY[o.risk]}</span>
            <Action onClick={() => onAccept?.(o)}>Sign {o.brand}</Action>
          </Panel>
        ))}
      </div>
      <Note>One habit clause at a time, at most. No betting or alcohol, ever.</Note>
      <form className="k-panel" style={{ ['--ink' as string]: LAV }} aria-label="Your own sponsor" onSubmit={(e) => { e.preventDefault(); onOwn?.(name, slot); }}>
        <PanelTop name="Add your own sponsor" c={LAV} />
        <input className="kb-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Sponsor name" placeholder="A name for the shirt" />
        <select className="kb-select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Which slot">
          {(['shirt', 'kit', 'sleeve', 'ground', 'partner'] as Slot[]).map((x) => <option key={x} value={x}>{SLOT_NAME[x]}</option>)}
        </select>
        <button type="submit" className="k-act quiet">Save</button>
      </form>
    </div>
  );
}
