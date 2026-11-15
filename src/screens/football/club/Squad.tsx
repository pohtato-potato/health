// The squad, on the kit: the six members (three attack, three defend) as filled panels with their rating in its value
// colour, the bench, the armband and the ability slots. Same taps as before; only the look is new.
import { abilityById, BUILT_INS } from '../../../football/data/abilities';
import type { Club, Member } from '../../../football/store/club';
import type { FbSquadRow } from '../../../football/store/tables';
import { MAX_SLOTS } from '../../../football/squad';
import type { Axis } from '../../../football/types';
import { go } from '../../../router';
import { AXIS_INK, VALUE_INK, valueTier } from '../../../ui/inks';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { GOLD, LAV, Note, PanelTop } from './Bits';

const ATTACK: Axis[] = ['Pace', 'Power', 'Fuel'];

/** One member: its rating in its value colour, in a panel of its axis's ink. */
function Member({ m }: { m: Member }) {
  const v = m.real ? VALUE_INK[valueTier(m.shown, 20)] : '#a9a7b8';
  return (
    <Panel ink={AXIS_INK[m.axis]} onClick={() => go('/football/player', { axis: m.axis })}
      label={`${m.label}, ${m.axis}, rated ${m.shown || 'not yet'}${m.knock ? `, ${m.knock}` : ''}${m.captain ? ', captain' : ''}`}>
      <span className="kb-mrow">
        <span className={`kq-ring${m.knock ? ' knock' : ''}`} style={{ ['--v' as string]: v }}><b>{m.real ? m.shown : '–'}</b>{m.captain && <i aria-hidden="true">C</i>}</span>
        <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: AXIS_INK[m.axis] }}>{m.label}</b><br /><span className="k-q">{m.axis}{m.knock ? ` · ${m.knock}` : ''}</span></span>
      </span>
    </Panel>
  );
}

export function SquadView({ c, onCaptain, onEquip }: { c: Club; onCaptain?: (a: Axis) => void; onEquip?: (id: string, slot: number) => void }) {
  const att = c.members.filter((m) => ATTACK.includes(m.axis));
  const def = c.members.filter((m) => !ATTACK.includes(m.axis));
  const owned = [...BUILT_INS.map((b) => b.id), ...c.save.earned.map((e) => e.id)];
  return (
    <>
      <Sect>Attack</Sect>
      <div className="kb-rows">{att.map((m) => <Member key={m.axis} m={m} />)}</div>
      <Sect>Defend</Sect>
      <div className="kb-rows">{def.map((m) => <Member key={m.axis} m={m} />)}</div>
      <Note>Each member is a habit. The number is its rating in this division, out of 20. A dashed ring is a knock. C is the armband. You are player-manager, shirt 42.</Note>
      <Bench bench={c.bench} />
      <Panel ink={LAV}>
        <PanelTop name="The armband" c={LAV} right="this week" />
        <div className="kb-chiprow">
          {c.members.map((m) => (
            <button key={m.axis} type="button" className="kb-chipbtn" style={{ ['--ink' as string]: LAV }} aria-pressed={c.save.captain === m.axis} onClick={() => onCaptain?.(m.axis)}>{m.label}</button>
          ))}
        </div>
        <span className="k-q">Four different captains in four weeks earns Harmony: +1 on every axis for one match. The same captain two weeks running restarts the count.</span>
      </Panel>
      <Panel ink={GOLD}>
        <PanelTop name="Ability slots" c={GOLD} right={`${Math.min(c.save.slots.length, MAX_SLOTS)} of ${MAX_SLOTS}`} />
        {Array.from({ length: MAX_SLOTS }, (_, i) => {
          const id = c.save.slots[i];
          const a = id ? abilityById(id) : undefined;
          return (
            <label key={i} className="k-col" style={{ gap: 4 }}>
              <span><b>{a?.name ?? 'Empty slot'}</b><br /><span className="k-q">{a?.text ?? 'Pick an ability.'}</span></span>
              <select className="kb-select" aria-label={`Slot ${i + 1}`} value={id ?? ''} onChange={(e) => onEquip?.(e.target.value, i)}>
                {!id && <option value="">Empty</option>}
                {owned.map((o) => <option key={o} value={o}>{abilityById(o)?.name ?? o}</option>)}
              </select>
            </label>
          );
        })}
        <span className="k-q">{c.save.earned.length} earned from moments. A fourth can't be worn: swap one out.</span>
      </Panel>
    </>
  );
}

function Bench({ bench }: { bench: FbSquadRow[] }) {
  return (
    <Panel ink="#8fdcb6">
      <PanelTop name="The bench" c="#8fdcb6" right={bench.length ? String(bench.length) : undefined} />
      {bench.length === 0 && <span className="k-q">Empty for now. Youngsters who log 12 days in a season join it.</span>}
      {bench.map((y) => (
        <div key={y.id} className="k-row">
          <span><b>{y.name}</b><br /><span className="k-q">{y.axis} · {y.what}</span></span>
          <span className="kb-stars" aria-label={`${y.potential} stars`}>{'★'.repeat(y.potential)}</span>
        </div>
      ))}
    </Panel>
  );
}
