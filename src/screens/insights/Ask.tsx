import { useState, type CSSProperties, type FormEvent } from 'react';
import { patchSettings } from '../../db/actions';
import { ASK_EXAMPLES, askData, type Answer, type AskInput, type Point } from '../../domain/askData';
import { fmtDayMonth } from '../../domain/format';
import { go } from '../../router';
import { Icon } from '../../ui/Icon';
import { Panel, Sect } from '../../ui/kit/Kit';

const MAX_DAYS_SHOWN = 12;
const CHIP_INK = ['#5fe3a1', '#b9a0ff', '#8fd8ff', '#ff9a5c', '#ffc94d'];
const W = 280;
const H = 150;

/** The answer's days as dots over time (board W7): each day pops in once; the day picked out is larger, green, and named in the legend. */
function DotChart({ points, mark, markWord }: { points: Point[]; mark?: string; markWord: string }) {
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const x = (n: number) => 16 + (n * (W - 32)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - 14 - ((v - lo) / (hi - lo || 1)) * (H - 34);
  const at = points.find((p) => p.date === mark);
  return (
    <svg className="yu-in-sc" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${points.length} days${at ? `; ${markWord.toLowerCase()} was ${fmtDayMonth(at.date)}` : ''}`}>
      <line x1="8" y1={H - 6} x2={W - 8} y2={H - 6} className="ax" />
      <line x1="8" y1="8" x2="8" y2={H - 6} className="ax" />
      {points.map((p, n) => (
        <circle key={p.date} className={`dot${p.date === mark ? ' mk' : ''}`} cx={x(n)} cy={y(p.v)} r={p.date === mark ? 7 : 5}
          style={{ '--d': `${Math.min(n, 30) * 40}ms` } as CSSProperties} />
      ))}
    </svg>
  );
}

/** One answer (board W7, y7-insights): your question as a bubble, then the plain sentence, then its chart and what it is based on. */
export function AnswerCard({ q, reply, kept, onKeep }: { q: string; reply: Answer; kept: boolean; onKeep: () => void }) {
  const markWord = /^lowest/i.test(reply.answer) ? 'The lowest day' : 'The best day';
  const chart = reply.points && reply.points.length > 1;
  return (
    <div className="yu-in-ans k-in">
      <span className="yu-in-q">{q}</span>
      <b aria-live="polite">{reply.answer}</b>
      {chart && (
        <>
          <DotChart points={reply.points!} mark={reply.mark} markWord={markWord} />
          <div className="yu-in-lg"><span style={{ '--c': '#72c2ff' } as CSSProperties}><i />A day</span>{reply.mark && <span style={{ '--c': '#5fe3a1' } as CSSProperties}><i className="mk" />{markWord}</span>}</div>
        </>
      )}
      {reply.points && reply.points.length > 0 && <p>Based on {reply.points.length} logged day{reply.points.length === 1 ? '' : 's'}.</p>}
      <DaysUsed days={reply.days} />
      {kept ? <span className="k-q">Kept below.</span> : <button type="button" className="k-more" onClick={onKeep}>Keep this question</button>}
    </div>
  );
}

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
        <span className="yu-in-lead">Ask anything about your own numbers.</span>
        <form className="yu-in-ask" onSubmit={submit} role="search">
          <label htmlFor="yu-ask" className="sr-only">Ask your data</label>
          <input id="yu-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask your data…" enterKeyHint="search" autoComplete="off" />
          <button type="submit" aria-label="Ask"><Icon name="search" size={22} stroke={2} /></button>
        </form>
        <div className="yu-in-chips">{ASK_EXAMPLES.slice(0, 4).map((q, n) => <button key={q} type="button" style={{ '--c': CHIP_INK[n] } as CSSProperties} onClick={() => send(q)}>{q}</button>)}</div>
        {asked && reply && (
          <AnswerCard key={asked} q={asked} reply={reply} kept={isKept}
            onKeep={() => void patchSettings({ keptAsks: [{ id: String(Date.now()), q: asked, at: Date.now() }, ...kept] })} />
        )}
        {asked && !reply && <div className="yu-in-ans k-in"><span className="yu-in-q">{asked}</span><b aria-live="polite">I can't read that one yet.</b><p>Try one of the questions above.</p></div>}
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
