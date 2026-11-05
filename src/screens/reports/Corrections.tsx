import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addCorrection } from '../../db/corrections';
import { db } from '../../db/db';
import { useToday } from '../../db/hooks';
import { fmtDayMonth } from '../../domain/format';
import { back } from '../../router';
import { Icon } from '../../ui/Icon';
import { RegionFrameView } from '../../ui/live/RegionFrame';

/** The ledger of numbers put right, each with why. */
export function Corrections() {
  const today = useToday();
  const list = useLiveQuery(() => db.corrections.toArray(), []);
  const [date, setDate] = useState(today);
  const [what, setWhat] = useState('');
  const [was, setWas] = useState('');
  const [now, setNow] = useState('');
  const [note, setNote] = useState('');
  if (!list) return <div className="page" />;
  const ready = what.trim() && now.trim() && note.trim() && date <= today;
  const save = async () => {
    await addCorrection({ date, what: what.trim(), was: was.trim() || 'not logged', now: now.trim(), note: note.trim() });
    setWhat(''); setWas(''); setNow(''); setNote('');
  };
  const rows = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <RegionFrameView km={0} className="yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/reports')}><Icon name="left" size={20} stroke={1.8} />Reports</button>
        <h1>Corrections</h1>
        <span className="yu-q">A number put right shows this note wherever that week or month is read.</span>
        <section className="yu-sec"><h2>Add one</h2>
          <div className="yu-card yu-form">
            <label>Day<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>What<input value={what} placeholder="Steps" onChange={(e) => setWhat(e.target.value)} /></label>
            <label>It said<input value={was} onChange={(e) => setWas(e.target.value)} /></label>
            <label>It should say<input value={now} onChange={(e) => setNow(e.target.value)} /></label>
            <label>Why<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button type="button" className="btn sm" disabled={!ready} onClick={save}>Save the correction</button>
          </div>
        </section>
        <section className="yu-sec"><h2>The ledger</h2>
          {!rows.length && <span className="yu-q">Nothing corrected so far.</span>}
          {rows.map((c) => (
            <div key={c.id} className="yu-card">
              <b>{c.what}, {fmtDayMonth(c.date)}: {c.now}</b>
              <span className="yu-q">Was {c.was}. {c.note}</span>
              <button type="button" className="link yu-left" onClick={() => db.corrections.delete(c.id)}>Remove</button>
            </div>
          ))}
        </section>
      </div>
    </RegionFrameView>
  );
}
