// Contracts, youth and the transfer window: one line per member, the renewal tap, the trade flow.
import { bidFor, feeWords, type Contract } from '../../../football/contracts';
import { PROMOTE_AT } from '../../../football/contracts';
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

function Youth({ youth }: { youth: FbSquadRow[] }) {
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">Youngsters</h2><span className="fb-s">{youth.length ? `intake, season ${youth[0].season}` : 'none growing'}</span></div>
      {youth.map((y) => (
        <section key={y.id} className="fb-card" aria-label={y.name}>
          <div className="fb-row"><b>{y.name}</b><span className="fb-s">{'★'.repeat(y.potential)}<span className="fb-sr"> {y.potential} stars</span></span></div>
          <span className="fb-s">{y.axis} · {y.what}</span>
          <div className="fb-bar" role="img" aria-label={`${y.logged.length} of ${PROMOTE_AT} days logged`}><i style={{ width: `${Math.min(100, (y.logged.length / PROMOTE_AT) * 100)}%` }} /></div>
          <span className="fb-s">{y.logged.length} of {PROMOTE_AT} days logged{y.exercise ? ' · joins the bench once the coach’s plan includes it' : ''}</span>
        </section>
      ))}
      <p className="fb-s">Twelve logged days in a season take a youngster to the bench. Fewer than four and they leave on a free.</p>
    </>
  );
}
