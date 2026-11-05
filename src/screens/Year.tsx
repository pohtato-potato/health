import { useState } from 'react';
import { almanac, dayOneAgainstToday, mostOf, yearReplay, type ReplayFrame } from '../domain/yearPage';
import { spokenLine } from '../domain/voice';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { RegionFrameView } from '../ui/live/RegionFrame';
import { useMonthInput } from './reports/useMonthInput';

function Replay({ frames, onClose }: { frames: ReplayFrame[]; onClose: () => void }) {
  const [n, setN] = useState(0);
  const f = frames[n];
  const last = n === frames.length - 1;
  return (
    <button type="button" className="yu-replay-full" aria-label={last ? 'Close the replay' : 'Next month'} onClick={() => (last ? onClose() : setN(n + 1))}>
      <h2 key={`t${n}`}>{f.title}</h2>
      {f.lines.map((l) => <p key={`${n}${l}`}>{l}</p>)}
      <span className="yu-q">{last ? 'Tap to close' : 'Tap for the next month'}</span>
    </button>
  );
}

/** The year at a glance: by month, the most-ofs, a replay, and day one against today. */
export function YearPage() {
  const input = useMonthInput();
  const [playing, setPlaying] = useState(false);
  if (!input) return <div className="page" />;
  const months = almanac(input);
  const lists = mostOf(input);
  const compare = dayOneAgainstToday(input);
  const frames = yearReplay(input);
  const line = spokenLine(input.settings, input.today, 'milestone', `year${input.today}`);
  if (playing && frames.length) return <Replay frames={frames} onClose={() => setPlaying(false)} />;
  return (
    <RegionFrameView km={0} className="yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/you')}><Icon name="left" size={20} stroke={1.8} />You</button>
        <h1>Your year</h1>
        {line && <div className="voice">{line}</div>}
        {!months.length && <div className="yu-card"><b>Nothing here yet</b><span className="yu-q">Your year fills in as you log.</span></div>}
        {frames.length > 0 && <button type="button" className="btn" onClick={() => setPlaying(true)}>Play the replay</button>}
        {months.length > 0 && (
          <section className="yu-sec">
            <h2>Day one against today</h2>
            <div className="yu-card">
              <div className="yu-thennow">
                <span /><span className="head">First two weeks</span><span className="head">Latest</span>
                {compare.map((r) => <div key={r.label} style={{ display: 'contents' }}><span>{r.label}</span><b>{r.then}</b><b>{r.now}</b></div>)}
              </div>
            </div>
          </section>
        )}
        {months.length > 0 && (
          <section className="yu-sec">
            <h2>The almanac</h2>
            <ul className="yu-almanac" style={{ margin: 0, padding: 0 }}>
              {months.map((m) => (
                <li key={m.month} className="yu-card">
                  <b>{m.label}</b>
                  {m.empty ? <span className="yu-q">{m.empty}</span> : m.lines.map((l) => <span key={l} className="yu-q">{l}</span>)}
                </li>
              ))}
            </ul>
          </section>
        )}
        {lists.map((l) => (
          <section key={l.title} className="yu-sec">
            <h2>{l.title}</h2>
            <div className="yu-card">
              {l.rows.map((r) => <div key={r.name} className="yu-diary-row" style={{ gridTemplateColumns: '1fr auto' }}><span style={{ color: 'var(--text)', fontSize: 15 }}>{r.name}</span><span className="yu-q">{r.value}</span></div>)}
            </div>
          </section>
        ))}
      </div>
    </RegionFrameView>
  );
}
