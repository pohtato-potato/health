// Settings: five rows only (spec §5.6). Times and the mapping are fixed and shown; three things change.
import { useState } from 'react';
import { NATIONS, nationBar } from '../../../football/events';
import type { Slot } from '../../../football/money';
import { setFbSetting, setOwnSponsor } from '../../../football/store/save';
import type { FbSave } from '../../../football/store/tables';
import { SLOT_NAME } from '../club/Money';

export const MAPPING: [string, string][] = [
  ['Pace', 'Your steps'],
  ['Power', 'Training sessions'],
  ['Fuel', 'Food: calories in range, plus protein'],
  ['Rest', 'Sleep'],
  ['Routine', 'The daily checklist'],
  ['Shape', 'Weigh-ins and waist'],
];
const BY_NAME = [...NATIONS].sort((a, b) => a.name.localeCompare(b.name));

export function SettingsView({ s, onBuzz = (v) => void setFbSetting('buzz', v), onCountry = (id) => void setFbSetting('wcCountry', id), onOwn = (n, sl) => void setOwnSponsor(n, sl) }: {
  s: FbSave; onBuzz?: (v: boolean) => void; onCountry?: (id: string | undefined) => void; onOwn?: (name: string, slot: Slot) => void;
}) {
  const [name, setName] = useState(s.ownSponsor?.name ?? '');
  const [slot, setSlot] = useState<Slot>((s.ownSponsor?.slot as Slot) ?? 'sleeve');
  const nation = NATIONS.find((n) => n.id === s.wcCountry);
  return (
    <>
      <section className="fb-card fb-setrow" aria-label="Match times">
        <span className="fb-lb">Match times</span>
        <p className="fb-s">Closing the day kicks off that night’s match. A day not closed plays itself at 4 am and waits for you. One match a night; double-headers play two from the same night.</p>
      </section>
      <section className="fb-card fb-setrow" aria-label="Which habit plays which axis">
        <span className="fb-lb">Which habit plays which axis</span>
        {MAPPING.map(([a, h]) => <div key={a} className="fb-row"><b>{a}</b><span className="fb-s fb-right">{h}</span></div>)}
        <p className="fb-s">Fixed for now.</p>
      </section>
      <section className="fb-card fb-setrow" aria-label="Buzz on goals">
        <div className="fb-row">
          <span className="fb-lb">Buzz on goals</span>
          <button type="button" className={`fb-btn sm ${s.buzz ? 'pri' : ''}`} aria-pressed={s.buzz} onClick={() => onBuzz(!s.buzz)}>{s.buzz ? 'On' : 'Off'}</button>
        </div>
        <p className="fb-s">A long buzz when you score, a short one when they do. No sound.</p>
      </section>
      <section className="fb-card fb-setrow" aria-label="World Cup country">
        <label className="fb-lb" htmlFor="fb-wc">World Cup country</label>
        <select id="fb-wc" className="fb-select" value={s.wcCountry ?? ''} onChange={(e) => onCountry(e.target.value || undefined)}>
          <option value="">None: just follow it</option>
          {BY_NAME.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <p className="fb-s">{nation ? `A call-up needs a 28-day average of ${nationBar(nation.strength).toFixed(1)}. Stronger nations ask more.` : 'Pick a country to be in with a shout of a call-up.'}</p>
      </section>
      <form className="fb-card fb-setrow" aria-label="Your own sponsor" onSubmit={(e) => { e.preventDefault(); onOwn(name, slot); }}>
        <span className="fb-lb">Your own sponsor</span>
        <input className="fb-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Sponsor name" placeholder="A name for the shirt" />
        <select className="fb-select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Which slot">
          {(['shirt', 'kit', 'sleeve', 'ground', 'partner'] as Slot[]).map((x) => <option key={x} value={x}>{SLOT_NAME[x]}</option>)}
        </select>
        <button type="submit" className="fb-btn pri sm">Save</button>
      </form>
    </>
  );
}
