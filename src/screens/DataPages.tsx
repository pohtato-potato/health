import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { patchSettings } from '../db/actions';
import { applyFix } from '../db/checkup';
import { db } from '../db/db';
import { undoEdit } from '../db/edits';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { listSnapshots, restoreSnapshot } from '../db/snapshots';
import { dataCheckup, type CheckupFinding } from '../domain/checkup';
import { dayKey } from '../domain/dates';
import { fmtDayMonth, fmtTime } from '../domain/format';
import { back } from '../router';
import { askConfirm } from '../ui/Confirm';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';

const Frame = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="page bare yu-page yu-stack">
    <button type="button" className="backlink" onClick={() => back('/settings')}><Icon name="left" size={20} stroke={1.8} />Settings</button>
    <h1>{title}</h1>
    {children}
  </div>
);

/** Things in the data that look like slips, each with a fix you can undo. */
export function Checkup() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const toast = useToast();
  if (!settings || !days || !entries || !sessions) return <div className="page bare" />;
  const list = dataCheckup({ today, settings, days, entries, sessions });
  const fix = async (f: CheckupFinding) => {
    try {
      const id = await applyFix(f);
      if (id === undefined) toast({ text: 'Fixed. You can tick it again from the checklist.' });
      else toast({ text: 'Fixed', action: { label: 'Undo', run: () => void undoEdit(id) } });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  };
  return (
    <Frame title="Data check-up">
      {list.length === 0 && <div className="yu-card"><b>Nothing looks off.</b><span className="yu-q">Empty days, double entries, odd weights and steps, open sessions and doses ticked twice all come up clear.</span></div>}
      {list.map((f) => (
        <div key={f.id} className="yu-card">
          <span>{f.text}</span>
          <div className="yu-seg">
            <button type="button" aria-pressed="true" onClick={() => void fix(f)}>{f.fix.label}</button>
            <button type="button" onClick={() => void patchSettings((s) => ({ checkupOk: [...(s.checkupOk ?? []), f.id] }))}>That's right</button>
          </div>
        </div>
      ))}
    </Frame>
  );
}

const SHOWN_AT_FIRST = 100;

/** Every recorded change, by day, each with undo. */
export function EditHistory() {
  const edits = useLiveQuery(async () => (await db.edits.toArray()).sort((a, b) => b.at - a.at), []);
  const [all, setAll] = useState(false);
  const toast = useToast();
  const undo = async (id: number) => {
    if (!(await undoEdit(id))) toast({ text: 'That was changed again since, so it stays as it is.' });
  };
  if (!edits) return <div className="page bare" />;
  const shown = all ? edits : edits.slice(0, SHOWN_AT_FIRST);
  const byDay = new Map<string, typeof edits>();
  for (const e of shown) {
    const k = dayKey(new Date(e.at));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  return (
    <Frame title="Edit history">
      {!edits.length && <div className="yu-card"><span className="yu-q">No edits yet. Changes to your logs will list here.</span></div>}
      {[...byDay].map(([day, list]) => (
        <section key={day} className="yu-sec">
          <h2>{fmtDayMonth(day)}</h2>
          <div className="yu-card">
            {list.map((x) => {
              const r = (x.after ?? x.before) as { name?: string; exercise?: string; date?: string } | undefined;
              const verb = x.before === undefined ? 'Added' : x.after === undefined ? 'Deleted' : 'Changed';
              return (
                <div key={x.id} className="yu-diary-row" style={{ gridTemplateColumns: '1fr auto' }}>
                  <span>{verb} {r?.name ?? r?.exercise ?? x.table}<br /><span className="yu-q">{r?.date ? `for ${fmtDayMonth(r.date)}, ` : ''}{fmtTime(x.at)}</span></span>
                  <button type="button" className="btn ghost sm" onClick={() => x.id !== undefined && void undo(x.id)}>Undo</button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {!all && edits.length > SHOWN_AT_FIRST && <button type="button" className="btn ghost" onClick={() => setAll(true)}>Show all {edits.length}</button>}
    </Frame>
  );
}

/** The copies this phone keeps of itself. */
export function Snapshots() {
  const list = useLiveQuery(listSnapshots, []);
  const toast = useToast();
  if (!list) return <div className="page bare" />;
  const restore = async (id: string, when: string) => {
    if (!(await askConfirm({ title: `Go back to ${when}?`, body: "Your numbers return to how they were then. A snapshot of today is taken first, so you can come back.", yes: 'Go back' }))) return;
    try {
      await restoreSnapshot(id);
      toast({ text: `Back to ${when}`, tone: 'sage' });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  };
  return (
    <Frame title="Snapshots">
      <span className="yu-q">Your numbers, copied each day. Seven are kept, plus one from before the last big change. They live on this phone, so they don't replace a backup. Photos aren't included.</span>
      {!list.length && <div className="yu-card"><span className="yu-q">The first snapshot is taken today.</span></div>}
      {list.length > 0 && (
        <div className="yu-card">
          {list.map((s) => {
            const when = fmtDayMonth(s.day);
            return (
              <div key={s.id} className="yu-diary-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <span>{when}<br /><span className="yu-q">{s.reason ?? 'Daily copy'}</span></span>
                <button type="button" className="btn ghost sm" onClick={() => void restore(s.id, when)}>Go back</button>
              </div>
            );
          })}
        </div>
      )}
    </Frame>
  );
}
