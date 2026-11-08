// Contracts, youth and the transfer window: one line per member, the renewal tap, the trade flow.
import { bidFor, feeWords, type Contract } from '../../../football/contracts';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadHealth } from '../../../football/store/gather';
import { linkYouth } from '../../../football/store/save';
import { linkOptions, PROMOTE_GROWTH, PROMOTE_SESSIONS, type YouthLink } from '../../../football/players/youth';
import { habitById } from '../../../football/squad';
import type { Club } from '../../../football/store/club';
import type { FbSquadRow } from '../../../football/store/tables';
import { parseDay } from '../../../domain/dates';

const formatDay = (d: string) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
import type { HabitId } from '../../../football/squad';

export interface DealsActions { renew?: (h: HabitId) => void; keep?: (h: HabitId) => void; sell?: (h: HabitId) => void }

const STATE: Record<Contract['state'], string> = { running: 'Running', due: 'Earned a renewal', listed: 'Transfer-listed' };

export function DealsView({ c, act = {} }: { c: Club; act?: DealsActions }) {
  const contracts = c.save.contracts ?? [];
  const listed = contracts.filter((x) => x.state === 'listed');
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">Contracts</h2><span className="fb-s">4 weeks each</span></div>
      <section className="fb-card" aria-label="Contracts">
        {contracts.map((k) => {
          const h = habitById(k.habit);
          return (
            <div key={k.habit} className={`fb-deal ${k.state}`}>
              <div className="fb-row">
                <span className="fb-col"><b>{h.label}</b><span className="fb-s">{h.axis} · to {formatDay(k.until)} · kept {k.kept} of {k.days} days</span></span>
                <span className={`fb-tag${k.state === 'due' ? ' or' : k.state === 'listed' ? ' pu' : ''}`}>{STATE[k.state]}</span>
              </div>
              {k.state === 'due' && (
                <div className="fb-btns two">
                  <button type="button" className="fb-btn pri sm" onClick={() => act.renew?.(k.habit)}>Renew {h.label}</button>
                  <button type="button" className="fb-btn sm" onClick={() => act.keep?.(k.habit)}>Let it run</button>
                </div>
              )}
            </div>
          );
        })}
        <p className="fb-s">The line: kept on at least 5 days in 7. A renewal makes the habit's axis 5% heavier, up to 15% over a career. Missing it costs nothing in matches; the habit is listed.</p>
      </section>
      {listed.length > 0 && <h2 className="fb-t">Transfer window</h2>}
      {listed.map((k) => <Trade key={k.habit} k={k} season={c.save.season} act={act} />)}
      {(c.save.sold ?? []).length > 0 && <p className="fb-s">Sold: {(c.save.sold ?? []).map((h) => habitById(h).label).join(', ')}. Football stopped tracking them; Health still does.</p>}
      <Youth youth={c.youth ?? []} />
    </>
  );
}

function Trade({ k, season, act }: { k: Contract; season: number; act: DealsActions }) {
  const h = habitById(k.habit);
  const bid = bidFor(k.habit, season);
  return (
    <section className="fb-card pu" aria-label={`Bid for ${h.label}`}>
      <div className="fb-row"><b className="fb-t sm">{h.label}</b><span className="fb-tag pu">Listed</span></div>
      <p className="fb-s">Kept {k.kept} of {k.days} days on its last contract. {bid.buyer} have bid.</p>
      <div className="fb-row"><span className="fb-lb">Their bid</span><b>{feeWords(bid.fee)}</b></div>
      <div className="fb-btns two">
        <button type="button" className="fb-btn sm" onClick={() => act.sell?.(k.habit)}>Sell</button>
        <button type="button" className="fb-btn pri sm" onClick={() => act.keep?.(k.habit)}>Keep</button>
      </div>
      <p className="fb-s">Selling stops Football tracking it. Its history stays, and it may turn up against you later. Health keeps tracking it either way.</p>
    </section>
  );
}

/** A youngster grows only through the real habit it is tied to: sessions from that habit, growth from kept bedtimes. */
function Youth({ youth, onLink = (id, l) => void linkYouth(id, l) }: { youth: FbSquadRow[]; onLink?: (id: string, l: YouthLink | undefined) => void }) {
  const options = useLiveQuery(async () => {
    const h = await loadHealth();
    return Object.fromEntries(youth.map((y) => [y.id, linkOptions(h, y, youth, y.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? '0000-00-00')]));
  }, [youth.map((y) => `${y.id}:${y.link?.id ?? ''}`).join(',')]);
  const enc = (l?: YouthLink) => (l ? `${l.kind}:${l.id}` : '');
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">Youngsters</h2><span className="fb-s">{youth.length ? `intake, season ${youth[0].season}` : 'none growing'}</span></div>
      {youth.map((y) => (
        <section key={y.id} className="fb-card" aria-label={y.name}>
          <div className="fb-row"><b>{y.name}</b><span className="fb-s">{'★'.repeat(y.potential)}<span className="fb-sr"> {y.potential} stars</span></span></div>
          <span className="fb-s">{y.axis} · {y.what}</span>
          {y.status === 'growing' && (
            <label className="fb-col">
              <span className="fb-s">Tied to</span>
              <select className="fb-select" value={enc(y.link)} onChange={(e) => { const [kind, ...id] = e.target.value.split(':'); onLink(y.id, e.target.value ? { kind: kind as YouthLink['kind'], id: id.join(':') } : undefined); }}>
                <option value="">Not tied yet: nothing counts</option>
                {y.link && !(options?.[y.id] ?? []).some((o) => enc(o.link) === enc(y.link)) && <option value={enc(y.link)}>The current habit</option>}
                {(options?.[y.id] ?? []).map((o) => <option key={enc(o.link)} value={enc(o.link)}>{o.name}</option>)}
              </select>
            </label>
          )}
          <div className="fb-bar" role="img" aria-label={`${y.sessions?.length ?? 0} of ${PROMOTE_SESSIONS} sessions`}><i style={{ width: `${Math.min(100, ((y.sessions?.length ?? 0) / PROMOTE_SESSIONS) * 100)}%` }} /></div>
          <span className="fb-s">{y.sessions?.length ?? 0} of {PROMOTE_SESSIONS} sessions</span>
          <div className="fb-bar" role="img" aria-label={`Growth ${y.growth ?? 0} of ${PROMOTE_GROWTH}`}><i style={{ width: `${Math.min(100, ((y.growth ?? 0) / PROMOTE_GROWTH) * 100)}%` }} /></div>
          <span className="fb-s">Growth {y.growth ?? 0} of {PROMOTE_GROWTH}, from nights you kept your bedtime{y.status === 'promoted' ? ' · in the squad' : ''}</span>
        </section>
      ))}
      <p className="fb-s">Tie each youngster to a new habit. A day of that habit is a session; a kept bedtime grows them, twice as much after a rest day. Twelve of each and they join the squad. Days with nothing done never count.</p>
    </>
  );
}
