// The one transfer budget, last season's income, the sponsor slots and the offers.
import { useState, type CSSProperties } from 'react';
import { MoneyFigure } from '../../../ui/motion/MoneyFigure';
import { euros, KIT_SPONSOR_TECH, oneBrandEach, type Offer, type Risk, type Slot } from '../../../football/money';
import { seasonMoneyScale } from '../../../football/pyramid/shape';
import { useModel } from '../tree/model';
import { SigningView } from '../moments/Signing';
import type { Club } from '../../../football/store/club';
import type { Tier } from '../../../football/types';
import { WagesCard } from '../tree/TreeScreens';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { BLUE, CORAL, GOLD, GREEN, LAV, Note, PanelTop } from './Bits';

const RISK_INK: Record<Risk, string> = { stable: GREEN, flashy: GOLD, dodgy: CORAL };

export const RISK: Record<Risk, string> = { stable: 'Stable', flashy: 'Flashy', dodgy: 'Dodgy' };
const RISK_WHY: Record<Risk, string> = { stable: 'Pays steadily.', flashy: 'Pays more, with a habit clause.', dodgy: 'Pays most. 1 in 4 a season it folds.' };
export const SLOT_NAME: Record<Slot, string> = { shirt: 'Shirt', kit: 'Kit maker', sleeve: 'Sleeve', ground: 'Ground naming', partner: 'Partner' };
const m = euros;

/** Money's lead (O41 #5): what is coming and going at the season's end, under the bank. Nothing is re-priced here. */
function SeasonEnd({ c }: { c: Club }) {
  const model = useModel();
  const s = c.save;
  const live = (s.sponsors ?? []).filter((x) => x.since <= s.season && s.season - x.since < x.seasons);
  const k = seasonMoneyScale(s);
  const coming = Math.round(live.reduce((t, x) => t + x.perSeason * k - (x.advance?.season === s.season ? x.advance.amount : 0), 0) * 1000) / 1000;
  const wages = model?.wages ?? 0;
  return (
    <Panel ink={GOLD}>
      <PanelTop name="At the season’s end" c={GOLD} />
      <div className="k-row"><span>Coming in: sponsors</span><b className="k-num" style={{ fontSize: 18, color: GREEN }}>+ {m(coming)}</b></div>
      <div className="k-row"><span>Coming in: TV, the gate, prize money</span><b style={{ color: GREEN }}>by where you finish</b></div>
      <div className="k-row"><span>Going out: staff wages</span><b className="k-num" style={{ fontSize: 18, color: CORAL }}>− {m(wages)}</b></div>
    </Panel>
  );
}

function slotRows(tier: Tier, groundBuilt: boolean, kit: boolean, world2: boolean): { slot: Slot; open: boolean; why?: string }[] {
  return [
    { slot: 'shirt', open: true },
    { slot: 'kit', open: kit, why: 'Opens with Kit sponsor, in the tree' },
    { slot: 'sleeve', open: tier <= 4, why: world2 ? 'Opens from Division Five up' : 'Opens in Division Four' },
    { slot: 'ground', open: groundBuilt, why: 'Naming rights, once Kaai 42 is built' },
    { slot: 'partner', open: true },
  ];
}

type Signed = NonNullable<Club['save']['sponsors']>[number];
/** An offer as a letter to sign (board 19, m19-ledger): brand, the sum a season, the slot, risk and length in words. */
export function OfferLetter({ o, i, onSign }: { o: Offer; i: number; onSign?: () => void }) {
  return (
    <div className="of19-l" style={{ '--r': `${i % 2 ? 1 : -1.2}deg`, '--d': `${0.4 + i * 0.2}s` } as CSSProperties}>
      <b>{o.brand}</b><em>{m(o.perSeason)}<span>a season</span></em>
      <small>{SLOT_NAME[o.slot]} · {RISK[o.risk]} · {o.seasons} {o.seasons === 1 ? 'season' : 'seasons'}</small>
      <p>{o.line} {RISK_WHY[o.risk]}</p>
      <button type="button" onClick={onSign}>Sign {o.brand}</button>
    </div>
  );
}
/** The sponsors signed now: what each brings a season, the slot, how long, and the risk in its colour and in words. */
export function SponsorList({ sponsors, scale }: { sponsors: Signed[]; scale: number }) {
  return (
    <div className="sl19">
      {sponsors.map((x, i) => (
        <div key={`${x.slot}-${x.brand}`} style={{ '--d': `${0.8 + i * 0.08}s`, '--rk': RISK_INK[x.risk] } as CSSProperties}>
          <b>{x.brand}</b><em>{m(x.perSeason * scale)}</em>
          <small>{SLOT_NAME[x.slot]} · {x.seasons} {x.seasons === 1 ? 'season' : 'seasons'}</small><span className="rk">{RISK[x.risk]}</span>
        </div>
      ))}
    </div>
  );
}
const COINS = Array.from({ length: 10 }, (_, k) => <i key={k} style={{ '--x': `${(k * 37 + 8) % 92}%`, '--d': `${((k * 0.45) % 5).toFixed(2)}s` } as CSSProperties} />);

export function MoneyView({ c, groundBuilt = false, onAccept, onOwn }: { c: Club; groundBuilt?: boolean; onAccept?: (o: Offer) => void; onOwn?: (name: string, slot: Slot) => void }) {
  const s = c.save;
  const signed = s.sponsors ?? [];
  const live = signed.filter((x) => x.since <= s.season && s.season - x.since < x.seasons);
  const [name, setName] = useState(s.ownSponsor?.name ?? '');
  const [slot, setSlot] = useState<Slot>((s.ownSponsor?.slot as Slot) ?? 'sleeve');
  // In world 2 the kit maker's slot opens with the tree's Kit sponsor (ledger O40); a kit deal signed before stays.
  const kit = s.world !== 2 || (s.treeUser?.researched ?? []).some((r) => r.id === KIT_SPONSOR_TECH) || signed.some((x) => x.slot === 'kit');
  return (
    <div className="k-page">
      {s.signed && <SigningView save={s} />}
      <div className="coins19" aria-hidden="true">{COINS}</div>
      <div className="mh19"><b><MoneyFigure value={s.budget} format={m} id="club:bank" /></b><small>in the bank now, to spend on transfers and building</small></div>
      <SeasonEnd c={c} />
      <Sect>{(s.offers ?? []).length ? `${(s.offers ?? []).length} ${(s.offers ?? []).length === 1 ? 'offer' : 'offers'} to sign` : 'Offers'}</Sect>
      {(s.offers ?? []).length === 0 && <Note>None now. New offers arrive between seasons for any open slot. Real brands come from Division Three up.</Note>}
      {(s.offers ?? []).length > 0 && <Note>Sign one now: a quarter of its first season is paid on the day, the rest at the season’s end.</Note>}
      <div className="of19">
        {oneBrandEach(s.offers ?? [], signed).map((o, i) => <OfferLetter key={`${o.slot}-${o.brand}-${i}`} o={o} i={i} onSign={() => onAccept?.(o)} />)}
      </div>
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
      {live.length > 0 && <><Sect>Your sponsors</Sect><SponsorList sponsors={live} scale={seasonMoneyScale(s)} /></>}
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
