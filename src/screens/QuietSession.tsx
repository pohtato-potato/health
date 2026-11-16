// Finding 17 (O42): an open session with no set for four hours. On the next open the app asks once: finish it with
// the sets logged (the clock stops at the last set), carry on, or throw it away.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { discardSession, finishSession, patchSession } from '../db/actions';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { askQuiet, lastMoved } from '../domain/quietSession';
import { findSession } from '../domain/plan';
import { go } from '../router';
import { Sheet } from '../ui/Sheet';

const at = (t: number) => new Date(t).toLocaleString('en-GB', { weekday: 'long', hour: 'numeric', minute: '2-digit' });

export function QuietSession({ now = Date.now() }: { now?: number }) {
  const settings = useSettings();
  const got = useLiveQuery(async () => {
    const s = await db.sessions.where('status').equals('active').first();
    if (!s) return null;
    const sets = (await db.sets.where('sessionId').equals(s.id).toArray()).filter((x) => !x.skipped);
    return { s, sets };
  }, []);
  const [sure, setSure] = useState(false);
  const [gone, setGone] = useState(false);
  if (!got || gone || !askQuiet(got.s, got.sets, now)) return null;
  const { s, sets } = got;
  const last = lastMoved(s, sets);
  const name = (settings?.plan ? findSession(settings.plan, s.session)?.name : undefined) ?? `Session ${s.session}`;
  const n = sets.length;
  const close = () => setGone(true);
  return (
    <Sheet title={`${name} is still open`} sub={n ? `${n} ${n === 1 ? 'set' : 'sets'} logged, the last one ${at(last)}.` : `Started ${at(s.startedAt)}, no sets logged.`} onClose={close}>
      <div className="col" style={{ gap: 10 }}>
        {n > 0 && <button type="button" className="btn lg block" onClick={() => { void finishSession(s.id, [], '', undefined, undefined, last); close(); }}>Finish it with {n} {n === 1 ? 'set' : 'sets'}</button>}
        <button type="button" className="btn ghost block" onClick={() => { void patchSession(s.id, { quietAsked: last }); close(); go('/session'); }}>Carry on</button>
        {sure
          ? <button type="button" className="btn danger block" onClick={() => { void discardSession(s.id); close(); }}>Yes, throw it away{n ? ` and its ${n} ${n === 1 ? 'set' : 'sets'}` : ''}</button>
          : <button type="button" className="btn ghost block" onClick={() => setSure(true)}>Throw it away</button>}
        <p className="q" style={{ margin: 0, fontSize: 14 }}>Asked once. The clock stopped at the last set.</p>
      </div>
    </Sheet>
  );
}
