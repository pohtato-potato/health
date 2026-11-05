import { useState, type FormEvent } from 'react';
import { patchSettings } from '../../db/actions';
import { ASK_EXAMPLES, askData, type AskInput } from '../../domain/askData';
import { fmtDayMonth } from '../../domain/format';
import { go } from '../../router';

const MAX_DAYS_SHOWN = 12;

function DaysUsed({ days }: { days: string[] }) {
  if (!days.length) return null;
  const shown = [...days].reverse().slice(0, MAX_DAYS_SHOWN);
  return (
    <div className="yu-chips" aria-label="The days this used">
      {shown.map((d) => <button key={d} type="button" onClick={() => go('/diary', { d })}>{fmtDayMonth(d)}</button>)}
      {days.length > shown.length && <span className="yu-q">and {days.length - shown.length} earlier</span>}
    </div>
  );
}

/** Ask your own data. Every answer shows the days it came from, and a question you keep answers afresh next time. */
export function Ask({ input }: { input: AskInput }) {
  const [text, setText] = useState('');
  const [asked, setAsked] = useState<string>();
  const kept = input.settings.keptAsks ?? [];
  const reply = asked ? askData(asked, input) : undefined;
  const isKept = kept.some((k) => k.q.toLowerCase() === asked?.toLowerCase());

  const send = (q: string) => {
    setText(q);
    setAsked(q.trim() || undefined);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <>
      <section className="yu-sec">
        <h2><label htmlFor="yu-ask">Ask your data</label></h2>
        <form className="yu-ask" onSubmit={submit}>
          <input id="yu-ask" className="yu-note" value={text} onChange={(e) => setText(e.target.value)} placeholder="When did I last train?" enterKeyHint="search" autoComplete="off" />
          <button type="submit" className="btn sm">Ask</button>
        </form>
        {asked && reply && (
          <div className="yu-card yu-card-in" aria-live="polite">
            <b>{reply.answer}</b>
            <DaysUsed days={reply.days} />
            {isKept ? <span className="yu-q">Kept below.</span> : (
              <button type="button" className="yu-why" onClick={() => void patchSettings({ keptAsks: [{ id: String(Date.now()), q: asked, at: Date.now() }, ...kept] })}>Keep this question</button>
            )}
          </div>
        )}
        {asked && !reply && <div className="yu-card yu-card-in" aria-live="polite"><b>I can't read that one yet.</b><span className="yu-q">Try one of these.</span></div>}
        {(!asked || !reply) && (
          <div className="yu-chips">{ASK_EXAMPLES.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>
        )}
      </section>
      {kept.length > 0 && (
        <section className="yu-sec">
          <h2>Kept answers</h2>
          {kept.map((k) => {
            const a = askData(k.q, input);
            return (
              <div key={k.id} className="yu-card">
                <span className="yu-q">{k.q}</span>
                <b>{a?.answer ?? 'No answer right now.'}</b>
                {a && <DaysUsed days={a.days} />}
                <button type="button" className="yu-why" onClick={() => void patchSettings({ keptAsks: kept.filter((x) => x.id !== k.id) })}>Remove</button>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
