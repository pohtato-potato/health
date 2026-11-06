// The squad: six members on a pitch, three attacking and three defending, in FM band colours.
import { abilityById, BUILT_INS } from '../../../football/data/abilities';
import type { Club, Member } from '../../../football/store/club';
import type { FbSquadRow } from '../../../football/store/tables';
import { MAX_SLOTS } from '../../../football/squad';
import type { Axis } from '../../../football/types';
import { go } from '../../../router';
import { band } from '../Radar';

const ATTACK: Axis[] = ['Pace', 'Power', 'Fuel'];

function Ring({ m }: { m: Member }) {
  return (
    <a
      href={`#/football/player?axis=${m.axis}`}
      className={`fb-member ${m.real ? band(m.shown) : 'none'}${m.knock ? ' knock' : ''}`}
      onClick={(e) => { e.preventDefault(); go('/football/player', { axis: m.axis }); }}
      aria-label={`${m.label}, ${m.axis}, rated ${m.shown || 'not yet'}${m.knock ? `, ${m.knock}` : ''}${m.captain ? ', captain' : ''}`}
    >
      <span className="fb-ring"><b className="fb-num">{m.real ? m.shown : '–'}</b>{m.captain && <i className="fb-capt" aria-hidden="true">C</i>}</span>
      <span className="fb-mname">{m.label}</span>
      <span className="fb-s">{m.axis}{m.knock ? ` · ${m.knock}` : ''}</span>
    </a>
  );
}

export function SquadView({ c, onCaptain, onEquip }: { c: Club; onCaptain?: (a: Axis) => void; onEquip?: (id: string, slot: number) => void }) {
  const att = c.members.filter((m) => ATTACK.includes(m.axis));
  const def = c.members.filter((m) => !ATTACK.includes(m.axis));
  const owned = [...BUILT_INS.map((b) => b.id), ...c.save.earned.map((e) => e.id)];
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">The squad</h2><span className="fb-s">3 attack · 3 defend</span></div>
      <section className="fb-squad" aria-label="The squad on the pitch">
        <span className="fb-lb">Attack</span>
        <div className="fb-line3">{att.map((m) => <Ring key={m.axis} m={m} />)}</div>
        <span className="fb-lb">Defend</span>
        <div className="fb-line3">{def.map((m) => <Ring key={m.axis} m={m} />)}</div>
      </section>
      <p className="fb-s">Each member is a habit. The number is its rating in this division, out of 20. A dashed ring is a knock. C is the armband. You are player-manager, shirt 42.</p>
      <Bench bench={c.bench} />
      <section className="fb-card pu" aria-label="The armband">
        <span className="fb-lb">The armband · this week</span>
        <div className="fb-chips">
          {c.members.map((m) => (
            <button key={m.axis} type="button" className={`fb-chip cap${c.save.captain === m.axis ? ' on' : ''}`} aria-pressed={c.save.captain === m.axis} onClick={() => onCaptain?.(m.axis)}>{m.label}</button>
          ))}
        </div>
        <p className="fb-s">Four different captains in four weeks earns Harmony: +1 on every axis for one match. The same captain two weeks running restarts the count.</p>
      </section>
      <section className="fb-card" aria-label="Ability slots">
        <span className="fb-lb">Ability slots · {Math.min(c.save.slots.length, MAX_SLOTS)} of {MAX_SLOTS}</span>
        {Array.from({ length: MAX_SLOTS }, (_, i) => {
          const id = c.save.slots[i];
          const a = id ? abilityById(id) : undefined;
          return (
            <label key={i} className="fb-slotrow">
              <span className="fb-col"><b>{a?.name ?? 'Empty slot'}</b><span className="fb-s">{a?.text ?? 'Pick an ability.'}</span></span>
              <select className="fb-select" aria-label={`Slot ${i + 1}`} value={id ?? ''} onChange={(e) => onEquip?.(e.target.value, i)}>
                {!id && <option value="">Empty</option>}
                {owned.map((o) => <option key={o} value={o}>{abilityById(o)?.name ?? o}</option>)}
              </select>
            </label>
          );
        })}
        <p className="fb-s">{c.save.earned.length} earned from moments. A fourth can't be worn: swap one out.</p>
      </section>
    </>
  );
}

function Bench({ bench }: { bench: FbSquadRow[] }) {
  return (
    <section className="fb-card" aria-label="The bench">
      <span className="fb-lb">The bench</span>
      {bench.length === 0 && <p className="fb-s">Empty for now. Youngsters who log 12 days in a season join it.</p>}
      {bench.map((y) => (
        <div key={y.id} className="fb-row">
          <span className="fb-col"><b>{y.name}</b><span className="fb-s">{y.axis} · {y.what}</span></span>
          <span className="fb-s">{'★'.repeat(y.potential)} <span className="fb-sr">{y.potential} stars</span></span>
        </div>
      ))}
    </section>
  );
}
