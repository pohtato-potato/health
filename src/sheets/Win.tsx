import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { dayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { prefOn } from '../domain/types';
import { voiceFor, voiceLine } from '../domain/voice';
import { db, uid } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { closeSheet, openSheet } from '../router';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

const IDEAS = ['New notch on the belt', 'A t-shirt fits better', 'Stairs without stopping', 'Slept before midnight', 'Walked instead of scrolling', 'Said no to seconds, happily'];

/** Small wins, kept for the days that need them. */
export function WinSheet() {
  const settings = useSettings();
  const today = useToday();
  const toast = useToast();
  const [text, setText] = useState('');
  const count = useLiveQuery(() => db.wins.count(), []);
  if (!settings) return <Sheet title="Wins jar">{null}</Sheet>;

  const save = async () => {
    const t = text.trim();
    if (!t) return;
    const w = { id: uid(), date: dayKey(), at: Date.now(), text: t };
    await db.wins.put(w);
    closeSheet();
    const v = voiceFor(settings.voice, prefOn(settings.prefs, 'shuffleVoices'), today);
    toast({ kicker: 'Into the jar', text: t, sub: voiceLine(v, 'win', `${today}${w.id}`), tone: 'gold', action: { label: 'Undo', run: () => db.wins.delete(w.id) } });
  };

  return (
    <Sheet title="Wins jar" sub={`Small wins count. ${count ? `${count} in the jar so far.` : 'The first one goes in now.'}`}>
      <textarea className="field" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What went well?" autoFocus />
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
        {IDEAS.map((i) => (
          <button key={i} type="button" className="chip sm" style={{ color: 'var(--quiet)' }} onClick={() => setText(i)}>
            {i}
          </button>
        ))}
      </div>
      <button type="button" className="btn lg block" disabled={!text.trim()} onClick={save}>
        Into the jar
      </button>
      <div className="t12 d center lh">On a rough day, Journey can pull one out for you.</div>
    </Sheet>
  );
}

/** The jar on Journey: the latest wins, a way to add one, and one pulled at random. */
export function WinsCard() {
  const wins = useLiveQuery(async () => (await db.wins.toArray()).sort((a, b) => b.at - a.at), []);
  const [pulled, setPulled] = useState<string | null>(null);
  if (!wins) return null;
  const pull = () => {
    if (!wins.length) return;
    const w = wins[Math.floor(Math.random() * wins.length)];
    setPulled(`${w.text} · ${fmtDayMonth(w.date)}`);
  };
  return (
    <div className="card" style={{ gap: 0 }}>
      <div className="row" style={{ paddingBottom: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="win" size={18} color="var(--gold)" />
          <div className="lbl">Wins jar</div>
        </div>
        <button type="button" className="t13 q" onClick={() => openSheet('win')}>
          + Add a win
        </button>
      </div>
      {pulled && (
        <div className="t15 gold lh" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
          {pulled}
        </div>
      )}
      {wins.slice(0, 3).map((w) => (
        <div key={w.id} className="row base" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
          <span className="t15">{w.text}</span>
          <span className="t12 d" style={{ whiteSpace: 'nowrap' }}>
            {fmtDayMonth(w.date)}
          </span>
        </div>
      ))}
      {wins.length === 0 && <div className="t14 q lh" style={{ paddingTop: 4 }}>Nothing in the jar yet. A new belt notch, a t-shirt that fits better, stairs without stopping: they all count.</div>}
      {wins.length > 1 && (
        <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={pull}>
          Pull one out
        </button>
      )}
    </div>
  );
}
