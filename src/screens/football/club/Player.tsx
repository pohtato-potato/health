// One squad member, FM-style, on the kit: the football rating leads in its value colour, the real value beside it.
import type { Member } from '../../../football/store/club';
import { AXIS_INK, VALUE_INK, valueTier } from '../../../ui/inks';
import { Hero, Panel } from '../../../ui/kit/Kit';
import { GOLD, LAV, Note, PanelTop, Stat } from './Bits';

export function PlayerView({ m, tierName }: { m: Member; tierName: string }) {
  const ink = AXIS_INK[m.axis];
  const v = m.real ? VALUE_INK[valueTier(m.shown, 20)] : '#a9a7b8';
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={m.real ? m.shown : '–'} ink={v} label={`of 20 in ${tierName}`} />
        <span className="k-r"><b style={{ color: ink }}>{m.axis}</b><span className="k-q">{[m.captain ? 'captain' : '', m.knock ?? ''].filter(Boolean).join(' · ') || 'in the squad'}</span></span>
      </div>
      <div className="kb-g2">
        <Stat label="The real value" value={m.real || '–'} c={ink} under={m.real ? undefined : 'no matches yet'} />
        <Stat label="Contract" value="5 in 7" c={GOLD} under={m.contract} />
      </div>
      <Note>The rating is the real value against this division's average. Go up a division and the same habit rates lower.</Note>
      <Panel ink={ink}>
        <PanelTop name="Form" c={ink} right={`last ${m.form.length} matches`} />
        {m.form.length ? <span className="k-num" style={{ fontSize: 20 }}>{m.form.join(' · ')}</span> : <span className="k-q">No matches yet.</span>}
      </Panel>
      <Panel ink={m.awakened.length ? GOLD : LAV}>
        <PanelTop name="Traits" c={m.awakened.length ? GOLD : LAV} right={m.awakened.length ? `${m.awakened.length} in the career` : undefined} />
        {m.trait ? <span><b style={{ color: m.awakened.length ? GOLD : undefined }}>{m.trait}</b> <span className="k-q">+1 on its own chance type</span></span> : <span className="k-q">None yet. An axis awakens when its 28-day average first reaches 11, 16 or 18.</span>}
        {m.awakened.length > 0 && <span className="k-q">Awakened at {m.awakened.join(', ')}</span>}
      </Panel>
    </div>
  );
}
