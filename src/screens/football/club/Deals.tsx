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
import { db } from '../../../db/db';
import { leadsFrom } from '../../../football/market/market';
import { loanLeads } from '../../../football/fog/fog';
import { go } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { Action, Door, Doors, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { Bar, CORAL, GOLD, GREEN, LAV, Note, PanelTop } from './Bits';

export interface DealsActions { renew?: (h: HabitId) => void; keep?: (h: HabitId) => void; sell?: (h: HabitId) => void }

const STATE: Record<Contract['state'], string> = { running: 'Running', due: 'Earned a renewal', listed: 'Transfer-listed' };
const STATE_INK: Record<Contract['state'], string> = { running: GREEN, due: GOLD, listed: LAV };

export function DealsView({ c, act = {} }: { c: Club; act?: DealsActions }) {
  const contracts = c.save.contracts ?? [];
  const listed = contracts.filter((x) => x.state === 'listed');
  const due = contracts.filter((x) => x.state === 'due').length;
  const firstDue = contracts.find((x) => x.state === 'due')?.habit;
  const leads = useLiveQuery(async () => { const s = await db.fbSave.get('save'); return leadsFrom(loanLeads(s?.desk)).length; }, []);
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={contracts.length} ink={GREEN} label={contracts.length === 1 ? 'contract' : 'contracts'} />
        <span className="k-r k-q">{due ? <b style={{ color: GOLD }}>{due} to renew</b> : '4 weeks each'}</span>
      </div>
      <Doors two label="Deals">
        <Door icon="deal" name="Loan market" family="money" value={leads ? `${leads} scouted` : 'scouts find players'} onClick={() => go('/football/market')} />
        <Door icon="people" name="Loans" family="money" value="from packs" onClick={() => go('/football/loans')} />
      </Doors>
      <Sect>Contracts</Sect>
      <div className="kb-rows">
        {contracts.map((k) => {
          const h = habitById(k.habit);
          const ink = STATE_INK[k.state];
          return (
            <Panel key={k.habit} ink={AXIS_INK[h.axis]}>
              <PanelTop name={h.label} c={AXIS_INK[h.axis]} right={<span style={{ color: ink }}>{STATE[k.state]}</span>} />
              <Bar pct={(k.kept / Math.max(1, k.days)) * 100} c={AXIS_INK[h.axis]} label={`Kept ${k.kept} of ${k.days} days`} />
              <span className="k-q">{h.axis} · to {formatDay(k.until)} · kept {k.kept} of {k.days} days</span>
              {k.state === 'due' && (
                <div className="kb-btns">
                  <Action quiet={k.habit !== firstDue} onClick={() => act.renew?.(k.habit)}>Renew</Action>
                  <Action quiet onClick={() => act.keep?.(k.habit)}>Let it run</Action>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      <Note>The line: kept on at least 5 days in 7. A renewal makes the habit's axis 5% heavier, up to 15% over a career. Missing it costs nothing in matches; the habit is listed.</Note>
      {listed.length > 0 && <Sect>Transfer window</Sect>}
      {listed.map((k) => <Trade key={k.habit} k={k} season={c.save.season} act={act} />)}
      {(c.save.sold ?? []).length > 0 && <Note>Sold: {(c.save.sold ?? []).map((h) => habitById(h).label).join(', ')}. Football stopped tracking them; Health still does.</Note>}
      <Youth youth={c.youth ?? []} />
    </div>
  );
}

function Trade({ k, season, act }: { k: Contract; season: number; act: DealsActions }) {
  const h = habitById(k.habit);
  const bid = bidFor(k.habit, season);
  return (
    <Panel ink={LAV}>
      <PanelTop name={h.label} c={LAV} right="Listed" />
      <span>Kept {k.kept} of {k.days} days on its last contract. {bid.buyer} have bid.</span>
      <div className="k-row"><span className="k-q">Their bid</span><b className="k-num" style={{ fontSize: 22, color: GOLD }}>{feeWords(bid.fee)}</b></div>
      <div className="kb-btns">
        <Action quiet onClick={() => act.sell?.(k.habit)}>Sell</Action>
        <Action onClick={() => act.keep?.(k.habit)}>Keep</Action>
      </div>
      <span className="k-q">Selling stops Football tracking it. Its history stays, and it may turn up against you later. Health keeps tracking it either way.</span>
    </Panel>
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
      <Sect>Youngsters</Sect>
      <span className="k-q">{youth.length ? `Intake, season ${youth[0].season}` : 'None growing'}</span>
      <div className="kb-rows">
        {youth.map((y) => (
          <Panel key={y.id} ink={AXIS_INK[y.axis]}>
            <PanelTop name={y.name} c={AXIS_INK[y.axis]} right={<span className="kb-stars" aria-label={`${y.potential} stars`}>{'★'.repeat(y.potential)}</span>} />
            <span className="k-q">{y.axis} · {y.what}{y.status === 'promoted' ? ' · in the squad' : ''}</span>
            {y.status === 'growing' && (
              <label className="k-col" style={{ gap: 4 }}>
                <span className="k-q">Tied to</span>
                <select className="kb-select" value={enc(y.link)} onChange={(e) => { const [kind, ...id] = e.target.value.split(':'); onLink(y.id, e.target.value ? { kind: kind as YouthLink['kind'], id: id.join(':') } : undefined); }}>
                  <option value="">Not tied yet: nothing counts</option>
                  {y.link && !(options?.[y.id] ?? []).some((o) => enc(o.link) === enc(y.link)) && <option value={enc(y.link)}>The current habit</option>}
                  {(options?.[y.id] ?? []).map((o) => <option key={enc(o.link)} value={enc(o.link)}>{o.name}</option>)}
                </select>
              </label>
            )}
            <Bar pct={((y.sessions?.length ?? 0) / PROMOTE_SESSIONS) * 100} c={AXIS_INK[y.axis]} label={`${y.sessions?.length ?? 0} of ${PROMOTE_SESSIONS} sessions`} />
            <span className="k-q">{y.sessions?.length ?? 0} of {PROMOTE_SESSIONS} sessions</span>
            <Bar pct={((y.growth ?? 0) / PROMOTE_GROWTH) * 100} c={CORAL} label={`Growth ${y.growth ?? 0} of ${PROMOTE_GROWTH}`} />
            <span className="k-q">Growth {y.growth ?? 0} of {PROMOTE_GROWTH}, from nights you kept your bedtime</span>
          </Panel>
        ))}
      </div>
      <Note>Tie each youngster to a new habit. A day of that habit is a session; a kept bedtime grows them, twice as much after a rest day. Twelve of each and they join the squad. Days with nothing done never count.</Note>
    </>
  );
}
