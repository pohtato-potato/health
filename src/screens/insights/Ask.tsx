import { useState, type FormEvent } from 'react';
import { patchSettings } from '../../db/actions';
import { ASK_EXAMPLES, askData, type AskInput } from '../../domain/askData';
import { fmtDayMonth } from '../../domain/format';
import { go } from '../../router';
import { Icon } from '../../ui/Icon';
import { Panel, Sect } from '../../ui/kit/Kit';

const MAX_DAYS_SHOWN = 12;

function DaysUsed({ days }: { days: string[] }) {
  if (!days.length) return null;
  const shown = [...days].reverse().slice(0, MAX_DAYS_SHOWN);
  return (
    <div className="k-pills" aria-label="The days this used">
      {shown.map((d) => <button key={d} type="button" className="k-pill sm" onClick={() => go('/food', { d })}>{fmtDayMonth(d)}</button>)}
      {days.length > shown.length && <span className="k-q" style={{ alignSelf: 'center' }}>and {days.length - shown.length} earlier</span>}
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
      <section className="k-col" style={{ gap: 8 }}>
        <form className="k-search" onSubmit={submit} role="search">
          <label htmlFor="yu-ask" className="sr-only">Ask your data</label>
          <input id="yu-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask your data…" enterKeyHint="search" autoComplete="off" />
          <button type="submit" aria-label="Ask"><Icon name="search" size={22} stroke={2} /></button>
        </form>
        {asked && reply && (
          <Panel ink="#93c3dc" className="k-in">
            <b aria-live="polite">{reply.answer}</b>
            <DaysUsed days={reply.days} />
            {isKept ? <span className="k-q">Kept below.</span> : (
              <button type="button" className="k-more" onClick={() => void patchSettings({ keptAsks: [{ id: String(Date.now()), q: asked, at: Date.now() }, ...kept] })}>Keep this question</button>
            )}
          </Panel>
        )}
        {asked && !reply && <Panel className="k-in"><b aria-live="polite">I can't read that one yet.</b><span className="k-q">Try one of these.</span></Panel>}
        {(!asked || !reply) && (
          <div className="k-pills">{ASK_EXAMPLES.slice(0, 3).map((q) => <button key={q} type="button" className="k-pill" onClick={() => send(q)}>{q}</button>)}</div>
        )}
      </section>
      {kept.length > 0 && (
        <>
          <Sect>Kept answers</Sect>
          {kept.map((k) => {
            const a = askData(k.q, input);
            return (
              <Panel key={k.id} ink="#93c3dc">
                <span className="k-q">{k.q}</span>
                <b>{a?.answer ?? 'No answer right now.'}</b>
                {a && <DaysUsed days={a.days} />}
                <button type="button" className="k-more" onClick={() => void patchSettings({ keptAsks: kept.filter((x) => x.id !== k.id) })}>Remove</button>
              </Panel>
            );
          })}
      </>
      )}
    </>
  );
}
