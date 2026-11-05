import { useState, type CSSProperties } from 'react';
import { almanac, blanket, blanketKey, dayOneAgainstToday, mostOf, yearReplay, type BlanketBand, type ReplayFrame } from '../domain/yearPage';
import { spokenLine } from '../domain/voice';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { RegionFrameView } from '../ui/live/RegionFrame';
import { useMonthInput } from './reports/useMonthInput';

/** Colour and height both carry the band, so it reads without colour too. */
const BAND: Record<BlanketBand, { c: string; t: string }> = {
  frost: { c: '#7fb4ff', t: '30%' },
  cool: { c: '#7fe0d4', t: '48%' },
  mild: { c: '#e8e27a', t: '66%' },
  warm: { c: '#ffb05c', t: '84%' },
  blaze: { c: '#ff6f6f', t: '100%' },
};
const bandStyle = (b: BlanketBand) => ({ '--b': BAND[b].c, '--t': BAND[b].t }) as CSSProperties;

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

/** The year at a glance: by month, the most-ofs, a replay, day one against today, and a blanket of your days. */
export function YearPage() {
  const input = useMonthInput();
  const [playing, setPlaying] = useState(false);
  if (!input) return <div className="page" />;
  const months = almanac(input);
  const lists = mostOf(input);
  const compare = dayOneAgainstToday(input);
  const weeks = blanket(input);
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
        {months.length > 0 && (
          <section className="yu-sec">
            <h2>The blanket</h2>
            <span className="yu-q">A row a week, Monday to Sunday. Each stitch is how a day ran against your step goal, and a day not logged stays bare.</span>
            <div className="yu-blanket" role="img" aria-label={`${weeks.length} weeks of days, by how they ran against your step goal`}>
              {weeks.map((w) => (
                <div key={w.week}>
                  {w.days.map((d) => (d.date > input.today ? <i key={d.date} className="future" /> : d.band ? <i key={d.date} style={bandStyle(d.band)} /> : <i key={d.date} className="none" />))}
                </div>
              ))}
            </div>
            <div className="yu-key-list">
              {blanketKey.map((k) => <span key={k.band}><span style={{ display: 'flex', alignItems: 'center' }}><i style={{ ...bandStyle(k.band), width: '100%' }} /></span><b style={{ fontWeight: 500 }}>{k.word}</b><em>{k.note}</em></span>)}
            </div>
          </section>
        )}
      </div>
    </RegionFrameView>
  );
}
